"""
RIDAS ML API
Exposes forecasting endpoints via Flask
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import os

from config import DATABASE_URL

# ============================================
# FLASK APP SETUP
# ============================================

app = Flask(__name__)
CORS(app)

# ============================================
# DATABASE CONNECTION
# ============================================

def get_db_connection():
    """Connect to Supabase"""
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        return conn
    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        return None

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'online',
        'service': 'RIDAS ML API',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/api/ml/forecast/<int:product_id>', methods=['GET'])
def get_forecast(product_id):
    """
    Get forecast for a specific product
    
    Query params:
    - days: number of days to return (default: 7)
    
    Response:
    {
        'product_id': 814,
        'product_name': 'Basmati Rice 1kg',
        'forecast_data': [
            {
                'date': '2025-01-15',
                'predicted_demand': 15.50,
                'confidence_lower': 12.30,
                'confidence_upper': 18.70,
                'accuracy': 85.5,
                'model': 'ARIMA(1,1,1)'
            },
            ...
        ]
    }
    """
    try:
        days = request.args.get('days', 7, type=int)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get product name
        cursor.execute("""
            SELECT id, name, sku FROM products WHERE id = %s
        """, (product_id,))
        product = cursor.fetchone()
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Get forecasts
        cursor.execute("""
            SELECT 
                forecast_date,
                predicted_demand,
                confidence_lower,
                confidence_upper,
                accuracy_score,
                model_used
            FROM forecasts
            WHERE product_id = %s
            ORDER BY forecast_date ASC
            LIMIT %s
        """, (product_id, days))
        
        forecasts = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Format response
        forecast_data = [
            {
                'date': f['forecast_date'].isoformat(),
                'predicted_demand': float(f['predicted_demand']),
                'confidence_lower': float(f['confidence_lower']),
                'confidence_upper': float(f['confidence_upper']),
                'accuracy': float(f['accuracy_score']),
                'model': f['model_used']
            }
            for f in forecasts
        ]
        
        return jsonify({
            'product_id': product['id'],
            'product_name': product['name'],
            'sku': product['sku'],
            'forecast_count': len(forecast_data),
            'forecast_data': forecast_data
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/forecasts/top-products', methods=['GET'])
def get_top_products_forecasts():
    """
    Get forecasts for top 5 selling products
    
    Response:
    {
        'top_products': [
            {
                'product_id': 835,
                'product_name': 'Whole Milk 1L',
                'avg_predicted_demand': 15.2,
                'avg_accuracy': 88.5
            },
            ...
        ]
    }
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                p.id,
                p.name,
                ROUND(AVG(f.predicted_demand)::numeric, 2) as avg_predicted_demand,
                ROUND(AVG(f.accuracy_score)::numeric, 2) as avg_accuracy,
                COUNT(f.id) as forecast_count
            FROM forecasts f
            JOIN products p ON f.product_id = p.id
            GROUP BY p.id, p.name
            ORDER BY avg_predicted_demand DESC
            LIMIT 5
        """)
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        top_products = [
            {
                'product_id': r['id'],
                'product_name': r['name'],
                'avg_predicted_demand': float(r['avg_predicted_demand']),
                'avg_accuracy': float(r['avg_accuracy']),
                'forecast_count': r['forecast_count']
            }
            for r in results
        ]
        
        return jsonify({'top_products': top_products}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/forecasts/accuracy-stats', methods=['GET'])
def get_accuracy_stats():
    """
    Get overall forecast accuracy statistics
    
    Response:
    {
        'total_forecasts': 1064,
        'avg_accuracy': 75.3,
        'models_used': {
            'ARIMA(1,1,1)': 900,
            'MovingAverage(7)': 164
        }
    }
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get overall stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_forecasts,
                ROUND(AVG(accuracy_score)::numeric, 2) as avg_accuracy,
                MIN(accuracy_score) as min_accuracy,
                MAX(accuracy_score) as max_accuracy
            FROM forecasts
        """)
        stats = cursor.fetchone()
        
        # Get model distribution
        cursor.execute("""
            SELECT model_used, COUNT(*) as count
            FROM forecasts
            GROUP BY model_used
        """)
        models = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        models_dict = {m['model_used']: m['count'] for m in models}
        
        return jsonify({
            'total_forecasts': stats['total_forecasts'],
            'avg_accuracy': float(stats['avg_accuracy']),
            'min_accuracy': float(stats['min_accuracy']),
            'max_accuracy': float(stats['max_accuracy']),
            'models_used': models_dict
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/forecasts/by-category', methods=['GET'])
def get_forecasts_by_category():
    """
    Get forecast summary by category
    
    Response:
    {
        'categories': [
            {
                'category_id': 1,
                'category_name': 'Staples',
                'products_count': 10,
                'avg_predicted_demand': 12.5,
                'avg_accuracy': 82.3
            },
            ...
        ]
    }
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                c.id,
                c.name,
                COUNT(DISTINCT p.id) as products_count,
                ROUND(AVG(f.predicted_demand)::numeric, 2) as avg_predicted_demand,
                ROUND(AVG(f.accuracy_score)::numeric, 2) as avg_accuracy
            FROM forecasts f
            JOIN products p ON f.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY avg_predicted_demand DESC
        """)
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        categories = [
            {
                'category_id': r['id'],
                'category_name': r['name'],
                'products_count': r['products_count'],
                'avg_predicted_demand': float(r['avg_predicted_demand']),
                'avg_accuracy': float(r['avg_accuracy'])
            }
            for r in results
        ]
        
        return jsonify({'categories': categories}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================
# RUN
# ============================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 RIDAS ML API")
    print("="*60)
    print("   Port: 5001")
    print("   Environment: development")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )