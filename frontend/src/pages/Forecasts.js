import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Forecasts.css';
import { API_BASE } from '../config';

export default function Forecasts() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [accuracyStats, setAccuracyStats] = useState(null);
  const [categoryForecasts, setCategoryForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  // Load all products on mount
  useEffect(() => {
    fetchProducts();
    fetchTopProducts();
    fetchAccuracyStats();
    fetchCategoryForecasts();
  }, []);

  // Fetch products list
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data);
      if (data.length > 0) {
        setSelectedProduct(data[0].id);
      }
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    }
  };

  // Fetch forecast for selected product
  const fetchForecast = async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/ml/forecast/${productId}?days=7`);
      if (!response.ok) throw new Error('Forecast not found');
      const data = await response.json();
      setForecastData(data.forecast_data || []);
    } catch (err) {
      setError(err.message);
      setForecastData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch top products
  const fetchTopProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ml/forecasts/top-products`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setTopProducts(data.top_products || []);
    } catch (err) {
      console.error('Error fetching top products:', err);
    }
  };

  // Fetch accuracy stats
  const fetchAccuracyStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ml/forecasts/accuracy-stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAccuracyStats(data);
    } catch (err) {
      console.error('Error fetching accuracy stats:', err);
    }
  };

  // Fetch category forecasts
  const fetchCategoryForecasts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ml/forecasts/by-category`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCategoryForecasts(data.categories || []);
    } catch (err) {
      console.error('Error fetching category forecasts:', err);
    }
  };

  // Handle product selection change
  useEffect(() => {
    if (selectedProduct) {
      fetchForecast(selectedProduct);
    }
  }, [selectedProduct]);

  const selectedProductName = products.find(p => p.id === selectedProduct)?.name || 'Product';

  return (
    <div className="forecasts-container">
      <h1>📊 Demand Forecasts</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Accuracy Stats Overview */}
      {accuracyStats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Forecasts</div>
            <div className="stat-value">{accuracyStats.total_forecasts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Accuracy</div>
            <div className="stat-value">{accuracyStats.avg_accuracy.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Max Accuracy</div>
            <div className="stat-value">{accuracyStats.max_accuracy.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Min Accuracy</div>
            <div className="stat-value">{accuracyStats.min_accuracy.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Product Selection */}
      <div className="forecast-section">
        <h2>Select Product to Forecast</h2>
        <select 
          value={selectedProduct || ''} 
          onChange={(e) => setSelectedProduct(Number(e.target.value))}
          className="product-select"
        >
          <option value="">-- Choose Product --</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} (SKU: {p.sku})
            </option>
          ))}
        </select>
      </div>

      {/* Forecast Chart */}
      {forecastData.length > 0 && (
        <div className="forecast-section">
          <h2>7-Day Forecast: {selectedProductName}</h2>
          
          {/* Line Chart with Confidence Intervals */}
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value) => value.toFixed(2)}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="predicted_demand" 
                stroke="#3b82f6" 
                name="Predicted Demand"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="confidence_lower" 
                stroke="#ef4444" 
                name="Lower Bound (95% CI)"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
              <Line 
                type="monotone" 
                dataKey="confidence_upper" 
                stroke="#10b981" 
                name="Upper Bound (95% CI)"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Forecast Table */}
          <div className="forecast-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Predicted Demand</th>
                  <th>Confidence Lower</th>
                  <th>Confidence Upper</th>
                  <th>Accuracy</th>
                  <th>Model</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td className="value-highlight">{row.predicted_demand.toFixed(2)}</td>
                    <td>{row.confidence_lower.toFixed(2)}</td>
                    <td>{row.confidence_upper.toFixed(2)}</td>
                    <td>{row.accuracy.toFixed(1)}%</td>
                    <td><span className="badge">{row.model}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <p className="loading">⏳ Loading forecast...</p>}

      {/* Top Products by Predicted Demand */}
      {topProducts.length > 0 && (
        <div className="forecast-section">
          <h2>🏆 Top Products by Predicted Demand</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product_name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Avg Predicted Demand', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => value.toFixed(2)} />
              <Bar dataKey="avg_predicted_demand" fill="#3b82f6" name="Avg Predicted Demand" />
            </BarChart>
          </ResponsiveContainer>

          <div className="top-products-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Avg Predicted Demand</th>
                  <th>Avg Accuracy</th>
                  <th>Forecast Count</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, idx) => (
                  <tr key={idx}>
                    <td>{product.product_name}</td>
                    <td className="value-highlight">{product.avg_predicted_demand.toFixed(2)}</td>
                    <td>{product.avg_accuracy.toFixed(1)}%</td>
                    <td>{product.forecast_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Forecasts */}
      {categoryForecasts.length > 0 && (
        <div className="forecast-section">
          <h2>📦 Forecasts by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryForecasts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category_name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
              <YAxis yAxisId="left" label={{ value: 'Avg Predicted Demand', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Products Count', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avg_predicted_demand" fill="#3b82f6" name="Avg Predicted Demand" />
              <Bar yAxisId="right" dataKey="products_count" fill="#10b981" name="Products Count" />
            </BarChart>
          </ResponsiveContainer>

          <div className="category-table">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Products</th>
                  <th>Avg Predicted Demand</th>
                  <th>Avg Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {categoryForecasts.map((cat, idx) => (
                  <tr key={idx}>
                    <td>{cat.category_name}</td>
                    <td>{cat.products_count}</td>
                    <td className="value-highlight">{cat.avg_predicted_demand.toFixed(2)}</td>
                    <td>{cat.avg_accuracy.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}