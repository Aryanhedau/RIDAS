import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategoriesAndProducts();
  }, []);

  // Helper: Extract array from various response shapes
  const normalizeArray = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData && Array.isArray(responseData.data)) return responseData.data;
    if (responseData && Array.isArray(responseData.products)) return responseData.products;
    if (responseData && Array.isArray(responseData.categories)) return responseData.categories;
    if (responseData && Array.isArray(responseData.rows)) return responseData.rows;
    console.warn('Unexpected API response format:', responseData);
    return [];
  };

  const fetchCategoriesAndProducts = async () => {
    await fetchCategories();
    await fetchProducts();
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const raw = await response.json();
        const data = normalizeArray(raw);
        console.log('Categories loaded:', data.length);
        setCategories(data);
      } else {
        console.error('Categories HTTP error:', response.status);
        setError('Failed to load categories');
      }
    } catch (err) {
      console.error('Categories fetch error:', err);
      setError('Error loading categories: ' + err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/products`, {
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
      const data = normalizeArray(raw);
      console.log('Products loaded:', data.length);
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error('Products fetch error:', err);
      setError('Error loading products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'all' || String(product.category_id) === String(selectedCategory);
    const matchesSearch =
      (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Group by category name
  const groupedByCategory = {};
  filteredProducts.forEach((product) => {
    const cat = categories.find((c) => String(c.id) === String(product.category_id));
    const catName = cat ? cat.name : 'General';
    if (!groupedByCategory[catName]) groupedByCategory[catName] = [];
    groupedByCategory[catName].push(product);
  });

  const getStatus = (product) => {
    if (!product.expiry_date) return { label: '✅ Fresh / OK', bg: '#dcfce7', color: '#15803d' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(product.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: '❌ Expired', bg: '#fee2e2', color: '#b91c1c' };
    if (diffDays <= 7) return { label: `⚠️ Expiring (${diffDays}d)`, bg: '#ffedd5', color: '#c2410c' };
    if (product.current_stock <= product.reorder_threshold) {
      return { label: '📉 Low Stock', bg: '#fef3c7', color: '#b45309' };
    }
    return { label: '✅ Fresh / OK', bg: '#dcfce7', color: '#15803d' };
  };

  const getRowBg = (product) => {
    if (!product.expiry_date) return '#ffffff';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(product.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#fff1f2';
    if (diffDays <= 7) return '#fffbeb';
    return '#ffffff';
  };

  const countByCategory = (categoryId) => {
    return products.filter((p) => String(p.category_id) === String(categoryId)).length;
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
            🛒 Grocery Inventory Management
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Filter products by category, monitor stock levels, and track expiry dates.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          display: 'flex', gap: '16px', flexWrap: 'wrap',
          backgroundColor: '#ffffff', padding: '18px 20px',
          borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: '24px', alignItems: 'flex-end'
        }}>
          {/* Category Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '300px', flex: 1 }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              📂 Select Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '6px', border: '2px solid #cbd5e1',
                fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer', fontWeight: '500'
              }}
            >
              <option value="all">All Categories ({products.length} Products)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({countByCategory(cat.id)})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px', flex: 1 }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              🔍 Search Product or SKU:
            </label>
            <input
              type="text"
              placeholder="e.g., Maggi, Basmati, Milk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '6px', border: '2px solid #cbd5e1',
                fontSize: '14px', outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Reset Button */}
          {(selectedCategory !== 'all' || searchTerm !== '') && (
            <button
              onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}
              style={{
                padding: '10px 18px', borderRadius: '6px', backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px'
              }}
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '10px', color: '#64748b' }}>
            ⏳ Loading products...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{ padding: '16px 20px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Products Content */}
        {!loading && !error && (
          <div>
            <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px', backgroundColor: '#f0f4f8', padding: '12px 16px', borderRadius: '6px' }}>
              📊 Showing <strong style={{ color: '#0f172a' }}>{filteredProducts.length}</strong> of <strong style={{ color: '#0f172a' }}>{products.length}</strong> total products
            </div>

            {Object.keys(groupedByCategory).length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', padding: '50px 20px', textAlign: 'center', borderRadius: '10px', color: '#64748b' }}>
                🔍 No products found
              </div>
            ) : (
              Object.entries(groupedByCategory).map(([catName, items]) => (
                <div key={catName} style={{ backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '28px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  {/* Category Header */}
                  <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600' }}>📦 {catName}</span>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '600' }}>
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Product Name</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>SKU</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Price (₹)</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Cost (₹)</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Stock</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Reorder</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((prod) => {
                          const status = getStatus(prod);
                          const rowBg = getRowBg(prod);
                          return (
                            <tr key={prod.id} style={{ backgroundColor: rowBg, borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{prod.name}</td>
                              <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{prod.sku}</td>
                              <td style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>₹{Number(prod.price).toFixed(2)}</td>
                              <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right' }}>₹{Number(prod.cost).toFixed(2)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: prod.current_stock <= prod.reorder_threshold ? 'bold' : '500', color: prod.current_stock <= prod.reorder_threshold ? '#dc2626' : '#0f172a' }}>{prod.current_stock}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>{prod.reorder_threshold}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: status.bg, color: status.color, whiteSpace: 'nowrap', display: 'inline-block' }}>
                                  {status.label}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', textAlign: 'center' }}>{prod.expiry_date ? new Date(prod.expiry_date).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}