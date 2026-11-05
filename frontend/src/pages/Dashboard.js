import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    expiredCount: 0,
    expiringCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/dashboard`, {
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
      console.log('Dashboard data:', data);
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Error loading dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon, color, subtitle }) => (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: `2px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color, marginTop: '8px' }}>
            {value.toLocaleString()}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ fontSize: '32px' }}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0' }}>
            📊 Dashboard
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Welcome to RIDAS - Real-time Inventory & Demand Analytics System
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            Loading dashboard metrics...
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

        {/* Metrics Grid */}
        {!loading && !error && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <MetricCard
                title="Total Products"
                value={metrics.totalProducts}
                icon="📦"
                color="#3b82f6"
                subtitle="Active products in inventory"
              />
              <MetricCard
                title="Total Stock"
                value={metrics.totalStock}
                icon="📈"
                color="#10b981"
                subtitle="Units across all products"
              />
              <MetricCard
                title="Low Stock Alert"
                value={metrics.lowStockCount}
                icon="⚠️"
                color="#f59e0b"
                subtitle="Products below reorder level"
              />
              <MetricCard
                title="Expired Products"
                value={metrics.expiredCount}
                icon="❌"
                color="#dc2626"
                subtitle="Products past expiry date"
              />
              <MetricCard
                title="Expiring Soon"
                value={metrics.expiringCount}
                icon="⏰"
                color="#ea580c"
                subtitle="Expiring within 7 days"
              />
            </div>

            {/* Summary Info Box */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginTop: 0, marginBottom: '16px' }}>
                📋 Quick Actions
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                <a href="/inventory" style={{
                  display: 'inline-block',
                  padding: '12px 16px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  textAlign: 'center',
                  transition: 'background-color 0.2s'
                }}>
                  📦 View Inventory
                </a>
                <a href="/expiry" style={{
                  display: 'inline-block',
                  padding: '12px 16px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  textAlign: 'center',
                  transition: 'background-color 0.2s'
                }}>
                  ⏰ Check Expiry
                </a>
                <a href="/forecasts" style={{
                  display: 'inline-block',
                  padding: '12px 16px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  textAlign: 'center',
                  transition: 'background-color 0.2s'
                }}>
                  📊 View Forecasts
                </a>
                <a href="/insights" style={{
                  display: 'inline-block',
                  padding: '12px 16px',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  textAlign: 'center',
                  transition: 'background-color 0.2s'
                }}>
                  💡 View Insights
                </a>
              </div>
            </div>

            {/* Last Updated */}
            <div style={{
              marginTop: '24px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '12px'
            }}>
              Last updated: {new Date().toLocaleString()}
            </div>
          </>
        )}

      </div>
    </div>
  );
}