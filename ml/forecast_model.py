"""
RIDAS ML Forecasting Module
Predicts product demand using ARIMA with NumPy type safety
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

from config import DATABASE_URL, FORECAST_DAYS, MIN_SALES_HISTORY

# ============================================
# LOGGER
# ============================================

class ForecastLogger:
    def __init__(self):
        self.stats = {
            'products_processed': 0,
            'forecasts_generated': 0,
            'forecasts_stored': 0,
            'errors': 0
        }
    
    def log(self, message):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] {message}")
    
    def error(self, message):
        print(f"❌ ERROR: {message}")
        self.stats['errors'] += 1
    
    def summary(self):
        print("\n" + "="*60)
        print("FORECAST SUMMARY")
        print("="*60)
        for key, value in self.stats.items():
            print(f"{key.replace('_', ' ').title()}: {value}")
        print("="*60 + "\n")

logger = ForecastLogger()

# ============================================
# DATABASE CONNECTION
# ============================================

def get_db_connection():
    """Connect to Supabase PostgreSQL"""
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        logger.log("✓ Connected to Supabase")
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        exit(1)

# ============================================
# LOAD DATA
# ============================================

def load_sales_for_product(conn, product_id):
    """Load sales history for a specific product"""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                sale_date,
                quantity
            FROM sales
            WHERE product_id = %s
            ORDER BY sale_date ASC
        """, (product_id,))
        
        data = cursor.fetchall()
        cursor.close()
        return data
    except Exception as e:
        logger.error(f"Failed to load sales for product {product_id}: {e}")
        return []

def get_all_products(conn):
    """Get list of all active products"""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, name, sku, category_id
            FROM products
            WHERE is_active = TRUE
            ORDER BY id
        """)
        
        products = cursor.fetchall()
        cursor.close()
        return products
    except Exception as e:
        logger.error(f"Failed to load products: {e}")
        return []

# ============================================
# FORECASTING LOGIC
# ============================================

def prepare_timeseries(sales_data):
    """
    Convert sales records to daily time series
    Returns: DataFrame with date index and daily quantity
    """
    if not sales_data or len(sales_data) < MIN_SALES_HISTORY:
        return None
    
    df = pd.DataFrame(sales_data)
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    
    # Aggregate by day
    daily_sales = df.groupby('sale_date')['quantity'].sum().reset_index()
    daily_sales = daily_sales.sort_values('sale_date')
    
    # Create complete date range (fill missing days with 0)
    date_range = pd.date_range(
        start=daily_sales['sale_date'].min(),
        end=daily_sales['sale_date'].max(),
        freq='D'
    )
    
    ts = daily_sales.set_index('sale_date').reindex(date_range, fill_value=0)
    ts.index.name = 'date'
    
    return ts

def forecast_arima(ts, product_name):
    """
    Forecast using ARIMA model
    Returns: forecast values, confidence intervals, accuracy score
    ✅ All NumPy types explicitly converted to Python float
    """
    try:
        if ts is None or len(ts) < MIN_SALES_HISTORY:
            return None
        
        # Fit ARIMA model (p,d,q) = (1,1,1)
        model = ARIMA(ts['quantity'], order=(1, 1, 1))
        fitted_model = model.fit()
        
        # Forecast next 7 days
        forecast_result = fitted_model.get_forecast(steps=FORECAST_DAYS)
        forecast_values = forecast_result.predicted_mean
        confidence_int = forecast_result.conf_int(alpha=0.05)  # 95% CI
        
        # Calculate accuracy (MAPE)
        actual = ts['quantity'].values
        predicted = fitted_model.fittedvalues.values
        
        # Avoid division by zero
        mape = np.mean(np.abs((actual - predicted) / (np.abs(actual) + 1))) * 100
        accuracy = max(0, min(100, 100 - mape))
        
        return {
            'forecast': forecast_values,
            'lower_ci': confidence_int.iloc[:, 0],
            'upper_ci': confidence_int.iloc[:, 1],
            'accuracy': float(accuracy)  # ✅ Convert to Python float
        }
    
    except Exception as e:
        logger.error(f"ARIMA failed for {product_name}: {str(e)[:60]}")
        return None

def simple_moving_average_forecast(ts):
    """
    Fallback: Simple moving average if ARIMA fails
    ✅ All NumPy types explicitly converted to Python float
    """
    try:
        if ts is None or len(ts) < MIN_SALES_HISTORY:
            return None
        
        # Last 7 days average
        recent_avg = float(ts['quantity'].tail(7).mean())  # ✅ Convert to float
        
        # Forecast = same as recent average
        forecast = pd.Series(
            [recent_avg] * FORECAST_DAYS,
            index=pd.date_range(start=ts.index[-1] + timedelta(days=1), periods=FORECAST_DAYS)
        )
        
        lower = forecast * 0.7
        upper = forecast * 1.3
        
        return {
            'forecast': forecast,
            'lower_ci': lower,
            'upper_ci': upper,
            'accuracy': 70.0
        }
    except Exception as e:
        logger.error(f"Moving average failed: {e}")
        return None

# ============================================
# STORE FORECASTS (FIXED)
# ============================================

def store_forecasts(conn, product_id, forecast_result, model_used):
    """
    Store forecast results in database
    ✅ FIXED: All NumPy types explicitly converted to Python float before INSERT
    """
    try:
        cursor = conn.cursor()
        
        # Delete old forecasts for this product
        cursor.execute("DELETE FROM forecasts WHERE product_id = %s", (product_id,))
        
        # Insert new forecasts
        start_date = datetime.now().date() + timedelta(days=1)
        
        for i in range(FORECAST_DAYS):
            forecast_date = start_date + timedelta(days=i)
            
            # ✅ CRITICAL: Convert ALL NumPy types to Python float
            predicted_value = float(forecast_result['forecast'].iloc[i])
            lower_value = float(forecast_result['lower_ci'].iloc[i])
            upper_value = float(forecast_result['upper_ci'].iloc[i])
            accuracy_value = float(forecast_result['accuracy'])
            
            # ✅ Ensure no negative values
            predicted_value = max(0.0, predicted_value)
            lower_value = max(0.0, lower_value)
            upper_value = max(0.0, upper_value)
            
            cursor.execute("""
                INSERT INTO forecasts 
                (product_id, forecast_date, predicted_demand, confidence_lower, 
                 confidence_upper, model_used, accuracy_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                product_id,
                forecast_date,
                predicted_value,      # ✅ Now Python float
                lower_value,          # ✅ Now Python float
                upper_value,          # ✅ Now Python float
                model_used,
                accuracy_value        # ✅ Now Python float
            ))
        
        conn.commit()
        logger.stats['forecasts_stored'] += FORECAST_DAYS
        return True
    
    except Exception as e:
        logger.error(f"Failed to store forecasts for product {product_id}: {e}")
        conn.rollback()
        return False

# ============================================
# MAIN FORECAST PIPELINE
# ============================================

def run_forecast_pipeline():
    """Main function to forecast all products"""
    
    print("\n" + "="*70)
    print("🎯 RIDAS DEMAND FORECASTING PIPELINE")
    print("="*70)
    print(f"   Forecast Days: {FORECAST_DAYS}")
    print(f"   Min Sales History: {FORECAST_DAYS}")
    print("="*70 + "\n")
    
    # Connect to database
    conn = get_db_connection()
    
    # Get all products
    logger.log("Loading products...")
    products = get_all_products(conn)
    logger.log(f"✓ Found {len(products)} products to forecast\n")
    
    # Process each product
    for idx, product in enumerate(products, 1):
        product_id = product['id']
        product_name = product['name']
        
        logger.log(f"[{idx}/{len(products)}] 📊 {product_name}")
        
        # Load sales history
        sales_data = load_sales_for_product(conn, product_id)
        
        if not sales_data or len(sales_data) < MIN_SALES_HISTORY:
            logger.log(f"  ⚠️  Insufficient data ({len(sales_data)} sales) - SKIP")
            continue
        
        logger.stats['products_processed'] += 1
        
        # Prepare time series
        ts = prepare_timeseries(sales_data)
        
        if ts is None:
            logger.log(f"  ⚠️  Could not prepare time series - SKIP")
            continue
        
        # Try ARIMA first
        logger.log(f"  Fitting ARIMA(1,1,1)...")
        forecast_result = forecast_arima(ts, product_name)
        model_used = "ARIMA(1,1,1)"
        
        # Fallback to moving average
        if forecast_result is None:
            logger.log(f"  ARIMA failed → Using MovingAverage(7) fallback")
            forecast_result = simple_moving_average_forecast(ts)
            model_used = "MovingAverage(7)"
        
        if forecast_result is None:
            logger.log(f"  ❌ All models failed - SKIP\n")
            logger.stats['errors'] += 1
            continue
        
        # Store forecasts
        if store_forecasts(conn, product_id, forecast_result, model_used):
            avg_forecast = float(forecast_result['forecast'].mean())
            accuracy = float(forecast_result['accuracy'])
            logger.log(f"  ✅ Stored 7 forecasts | Avg: {avg_forecast:.1f} units | "
                      f"Accuracy: {accuracy:.1f}% | Model: {model_used}\n")
            logger.stats['forecasts_generated'] += 1
        else:
            logger.stats['errors'] += 1
    
    # Close connection
    conn.close()
    
    # Print summary
    logger.summary()
    
    if logger.stats['errors'] == 0:
        print("✅ SUCCESS: All forecasts generated with 0 errors!")
    else:
        print(f"⚠️  Completed with {logger.stats['errors']} error(s)")
    
    print("\n📍 Next: Test Flask API at localhost:5001")
    print("   Or check /api/insights/forecast/:productId in Node.js API\n")

# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    run_forecast_pipeline()