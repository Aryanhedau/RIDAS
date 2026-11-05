import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/insights/scale`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Insights data:', data);
      setInsights(data);
      setError(null);
    } catch (err) {
      console.error('Insights fetch error:', err);
      setError('Error loading insights: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
            💡 Business Insights
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Key metrics, trends, and recommendations for your inventory.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            color: '#64748b'
          }}>
            ⏳ Loading insights...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '24px',
            borderLeft: '4px solid #dc2626'
          }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Content */}
        {!loading && !error && insights && (
          <>
            {/* Overall Metrics */}
            {insights.metrics && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginTop: 0 }}>
                  📊 Overall Metrics
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginTop: '16px'
                }}>
                  <div style={{ padding: '16px', backgroundColor: '#f0f4f8', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Products</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px' }}>
                      {insights.metrics.total_products || 0}
                    </div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f0f4f8', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Sales</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px' }}>
                      {insights.metrics.total_sales || 0}
                    </div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f0f4f8', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Revenue</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px' }}>
                      ₹{Number(insights.metrics.total_revenue || 0).toFixed(0)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f0f4f8', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Avg Transaction</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px' }}>
                      ₹{Number(insights.metrics.avg_transaction || 0).toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Performing Products */}
            {insights.topProducts && insights.topProducts.length > 0 && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginTop: 0 }}>
                  🏆 Top Performing Products
                </h3>
                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'left' }}>Product</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>SKU</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Units Sold</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.topProducts.map((prod, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{prod.name}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center' }}>{prod.sku}</td>
                          <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>
                            {prod.total_units || 0}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>
                            ₹{Number(prod.total_revenue || 0).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Category Performance */}
            {insights.categoryPerformance && insights.categoryPerformance.length > 0 && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginTop: 0 }}>
                  📂 Category Performance
                </h3>
                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'left' }}>Category</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Products</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Units</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.categoryPerformance.map((cat, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{cat.category}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'center' }}>{cat.product_count || 0}</td>
                          <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>
                            {cat.total_units || 0}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>
                            ₹{Number(cat.total_revenue || 0).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}