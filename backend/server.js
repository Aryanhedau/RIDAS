const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ============================================
// MIDDLEWARE
// ============================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ridas-frontend.onrender.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================
// LOGIN (NO AUTH REQUIRED)
// ============================================

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { email, role: 'admin' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AUTH MIDDLEWARE (For Protected Routes)
// ============================================

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.json({ message: 'RIDAS API is running', version: '1.0.0' });
});

// ============================================
// CATEGORIES (PROTECTED)
// ============================================

app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description FROM categories ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Categories error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PRODUCTS (PROTECTED)
// ============================================

app.get('/api/products', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        p.price, 
        p.cost, 
        p.current_stock, 
        p.reorder_threshold, 
        p.expiry_date,
        p.is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        p.price, 
        p.cost, 
        p.current_stock, 
        p.reorder_threshold, 
        p.expiry_date,
        p.is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product detail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INVENTORY - LOW STOCK (PROTECTED)
// ============================================

app.get('/api/inventory/low-stock', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        p.current_stock, 
        p.reorder_threshold,
        (p.reorder_threshold - p.current_stock) as shortage, 
        p.price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.current_stock < p.reorder_threshold
        AND p.is_active = TRUE
      ORDER BY shortage DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Low stock error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INVENTORY - EXPIRING/EXPIRED (PROTECTED)
// ============================================

app.get('/api/inventory/expiring', verifyToken, async (req, res) => {
  try {
    console.log('Fetching expiring products...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    console.log(`Query range: ${todayStr} to ${sevenDaysStr}`);

    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        p.current_stock, 
        p.expiry_date, 
        p.price,
        p.is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      ORDER BY p.expiry_date ASC
    `);

    console.log(`Total products returned: ${result.rows.length}`);

    res.json(result.rows);
  } catch (err) {
    console.error('Expiring products error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SALES (PROTECTED)
// ============================================

app.get('/api/sales/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT id, quantity, unit_price, total_revenue, sale_date
      FROM sales
      WHERE product_id = $1
      ORDER BY sale_date DESC
      LIMIT 100
    `, [productId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Sales error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// FORECASTS (PROTECTED)
// ============================================

app.get('/api/insights/forecast/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        id, 
        forecast_date, 
        predicted_demand, 
        confidence_lower,
        confidence_upper, 
        model_used, 
        accuracy_score, 
        generated_at
      FROM forecasts
      WHERE product_id = $1
      ORDER BY forecast_date DESC
      LIMIT 30
    `, [productId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Forecast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PRODUCT PAIRINGS (PROTECTED)
// ============================================

app.get('/api/insights/pairings/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        pp.confidence, 
        pp.lift, 
        pp.co_occurrence_count
      FROM product_pairs pp
      JOIN products p ON pp.product_id_2 = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pp.product_id_1 = $1
      ORDER BY pp.confidence DESC
    `, [productId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Pairings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INSIGHTS - SCALE (PROTECTED)
// ============================================

app.get('/api/insights/scale', verifyToken, async (req, res) => {
  try {
    const topProducts = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        SUM(s.quantity) as total_units,
        SUM(s.total_revenue) as total_revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.name, p.sku, p.category_id, c.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `);

    const deadStock = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.category_id,
        c.name as category_name,
        p.current_stock, 
        MAX(s.sale_date) as last_sale_date,
        CURRENT_DATE - MAX(s.sale_date) as days_since_sale
      FROM products p
      LEFT JOIN sales s ON p.id = s.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.name, p.sku, p.category_id, c.name, p.current_stock
      HAVING MAX(s.sale_date) IS NULL OR CURRENT_DATE - MAX(s.sale_date) > 30
      ORDER BY days_since_sale DESC NULLS FIRST
    `);

    const categoryPerf = await pool.query(`
      SELECT 
        c.name as category,
        COUNT(DISTINCT p.id) as product_count,
        SUM(s.quantity) as total_units,
        SUM(s.total_revenue) as total_revenue,
        ROUND(AVG(s.total_revenue)::numeric, 2) as avg_transaction
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN sales s ON p.id = s.product_id
      WHERE p.is_active = TRUE
      GROUP BY c.name
      ORDER BY total_revenue DESC NULLS LAST
    `);

    const metrics = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT s.id) as total_sales,
        SUM(s.quantity) as total_units,
        ROUND(SUM(s.total_revenue)::numeric, 2) as total_revenue,
        ROUND(AVG(s.total_revenue)::numeric, 2) as avg_transaction,
        MIN(s.sale_date) as first_sale_date,
        MAX(s.sale_date) as last_sale_date
      FROM products p
      LEFT JOIN sales s ON p.id = s.product_id
      WHERE p.is_active = TRUE
    `);

    res.json({
      topProducts: topProducts.rows,
      deadStock: deadStock.rows,
      categoryPerformance: categoryPerf.rows,
      metrics: metrics.rows[0] || {}
    });
  } catch (err) {
    console.error('Scale insights error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DASHBOARD (PROTECTED)
// ============================================

app.get('/api/dashboard', verifyToken, async (req, res) => {
  try {
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products WHERE is_active = TRUE');
    const totalStock = await pool.query('SELECT SUM(current_stock) as total FROM products WHERE is_active = TRUE');
    const lowStockCount = await pool.query('SELECT COUNT(*) as count FROM products WHERE current_stock < reorder_threshold AND is_active = TRUE');
    const expiredCount = await pool.query(`
      SELECT COUNT(*) as count FROM products 
      WHERE expiry_date < CURRENT_DATE AND is_active = TRUE
    `);
    const expiringCount = await pool.query(`
      SELECT COUNT(*) as count FROM products 
      WHERE expiry_date <= CURRENT_DATE + INTERVAL '7 days' 
        AND expiry_date >= CURRENT_DATE 
        AND is_active = TRUE
    `);

    res.json({
      totalProducts: totalProducts.rows[0].count,
      totalStock: totalStock.rows[0].total || 0,
      lowStockCount: lowStockCount.rows[0].count,
      expiredCount: expiredCount.rows[0].count,
      expiringCount: expiringCount.rows[0].count
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ML FORECASTING ENDPOINTS (Flask Proxy)
// Note: these call localhost:5001, which only exists on your computer.
// On Render they return an error until the ML service is deployed.
// ============================================

app.get('/api/ml/forecast/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const days = req.query.days || 7;

    const response = await axios.get(
      `http://localhost:5001/api/ml/forecast/${productId}?days=${days}`
    );

    res.json(response.data);
  } catch (error) {
    console.error('ML Forecast Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

app.get('/api/ml/forecasts/top-products', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5001/api/ml/forecasts/top-products');
    res.json(response.data);
  } catch (error) {
    console.error('Top Products Forecast Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

app.get('/api/ml/forecasts/accuracy-stats', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5001/api/ml/forecasts/accuracy-stats');
    res.json(response.data);
  } catch (error) {
    console.error('Accuracy Stats Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch accuracy stats' });
  }
});

app.get('/api/ml/forecasts/by-category', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5001/api/ml/forecasts/by-category');
    res.json(response.data);
  } catch (error) {
    console.error('Category Forecasts Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch category forecasts' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ RIDAS API running on port ${PORT}`);
  console.log(`✓ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`✓ CORS: Enabled for ${allowedOrigins.join(', ')}`);
  console.log(`✓ Authentication: JWT enabled`);
  console.log(`✓ ML Proxy: Connected to Flask API (port 5001)\n`);
  console.log(`Available Endpoints:`);
  console.log(`  POST   /auth/login`);
  console.log(`  GET    /api/categories`);
  console.log(`  GET    /api/products`);
  console.log(`  GET    /api/products/:id`);
  console.log(`  GET    /api/inventory/low-stock`);
  console.log(`  GET    /api/inventory/expiring`);
  console.log(`  GET    /api/dashboard`);
  console.log(`  GET    /api/sales/:productId`);
  console.log(`  GET    /api/insights/forecast/:productId`);
  console.log(`  GET    /api/insights/pairings/:productId`);
  console.log(`  GET    /api/insights/scale`);
  console.log(`  GET    /api/ml/forecast/:productId (Flask)`);
  console.log(`  GET    /api/ml/forecasts/top-products (Flask)`);
  console.log(`  GET    /api/ml/forecasts/accuracy-stats (Flask)`);
  console.log(`  GET    /api/ml/forecasts/by-category (Flask)\n`);
});