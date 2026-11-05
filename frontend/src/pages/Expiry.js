import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Expiry() {
  const [expiredProducts, setExpiredProducts] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpiryData();
  }, []);

  const fetchExpiryData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/inventory/expiring`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      const data = Array.isArray(raw) ? raw : (raw.data || raw.products || []);
      
      console.log('Expiry data received:', data.length);

      // Separate into expired and expiring
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expired = [];
      const expiring = [];

      data.forEach((prod) => {
        if (prod.expiry_date) {
          const expiry = new Date(prod.expiry_date);
          expiry.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

          if (daysUntil < 0) {
            expired.push({ ...prod, daysOverdue: Math.abs(daysUntil) });
          } else if (daysUntil <= 7) {
            expiring.push({ ...prod, daysUntil });
          }
        }
      });

      setExpiredProducts(expired);
      setExpiringProducts(expiring);
      setError(null);
    } catch (err) {
      console.error('Expiry fetch error:', err);
      setError('Error loading expiry data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
            ⏰ Expiry Management
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Monitor expired and expiring products to maintain inventory quality.
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Expired Products Card */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #dc2626' }}>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>EXPIRED PRODUCTS</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626' }}>{expiredProducts.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              {expiredProducts.reduce((sum, p) => sum + p.current_stock, 0)} total units
            </div>
          </div>

          {/* Expiring Soon Card */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #ea580c' }}>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>EXPIRING SOON (≤7 days)</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ea580c' }}>{expiringProducts.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              {expiringProducts.reduce((sum, p) => sum + p.current_stock, 0)} total units
            </div>
          </div>

          {/* Total at Risk Card */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>TOTAL AT RISK</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c3aed' }}>{expiredProducts.length + expiringProducts.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              {expiredProducts.reduce((sum, p) => sum + p.current_stock, 0) + expiringProducts.reduce((sum, p) => sum + p.current_stock, 0)} units
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '10px', color: '#64748b' }}>
            ⏳ Loading expiry data...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{ padding: '16px 20px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Expired Products Section */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '28px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>❌ Expired Products ({expiredProducts.length})</span>
              </div>

              {expiredProducts.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  ✅ No expired products - Inventory is fresh!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Product Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>SKU</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Stock</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Expiry Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiredProducts.map((prod) => (
                        <tr key={prod.id} style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{prod.name}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{prod.sku}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>{prod.current_stock}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{new Date(prod.expiry_date).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '600', fontSize: '12px' }}>
                              {prod.daysOverdue} days
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expiring Soon Section */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '28px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ backgroundColor: '#ea580c', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>⚠️ Expiring Within 7 Days ({expiringProducts.length})</span>
              </div>

              {expiringProducts.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  ✅ No products expiring soon!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Product Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>SKU</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Stock</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Expiry Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Days Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringProducts.map((prod) => (
                        <tr key={prod.id} style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{prod.name}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{prod.sku}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#0f172a' }}>{prod.current_stock}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{new Date(prod.expiry_date).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#ffedd5', color: '#c2410c', fontWeight: '600', fontSize: '12px' }}>
                              {prod.daysUntil} days
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}