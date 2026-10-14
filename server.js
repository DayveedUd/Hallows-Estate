require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB, getDbStatus } = require('./Backend/config/db');
const { isProduction } = require('./Backend/config/env');
require('./Backend/models'); // register every model before the first request

const adminRoutes = require('./Backend/routes/adminRoutes');
const residentRoutes = require('./Backend/routes/residentRoutes');

const app = express();
const isVercelRuntime = Boolean(process.env.VERCEL);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'production' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation'), false);
  },
  credentials: true
}));
app.use(express.json({ limit: '7mb' }));
app.use(express.urlencoded({ extended: true }));

// Static frontend — with includeFiles bundling "public/**" alongside this
// file, __dirname reliably points at the right folder both locally and
// inside the Vercel function, now that the casing matches on disk.
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ------------------------------------------------------------------
// Database guard
// Every /api route passes through here, so no controller or auth middleware can
// run a query before the connection is ready. On a warm Vercel instance this is a
// no-op (the cached connection is reused); on a cold start it awaits the connect.
// If the database is unreachable we answer 503 quickly instead of letting the
// query sit in Mongoose's buffer for 10s and surface as a 500.
// ------------------------------------------------------------------
const ensureDb = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error(`Database unavailable [${error.code || error.name}]:`, error.message);
    res.status(503).json({
      success: false,
      code: error.code === 'NO_DB_URI' ? 'DB_NOT_CONFIGURED' : 'DB_UNAVAILABLE',
      message: 'The service is temporarily unavailable. Please try again in a moment.',
      ...(!isProduction() && { detail: error.message })
    });
  }
};

// API responses are live data: never let a browser or CDN serve a stale copy.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Health checks
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Deep check: actually connects. Open /api/health/db in a browser after deploying;
// on failure the response says whether the URI is missing or Atlas refused the connection.
app.get('/api/health/db', async (req, res) => {
  try {
    await connectDB();
    res.json({ success: true, ...getDbStatus() });
  } catch (error) {
    res.status(503).json({
      success: false,
      code: error.code || error.name,
      message: error.message,
      ...getDbStatus()
    });
  }
});

app.use('/api', ensureDb);

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// Fallback: send index.html for any other non-API GET request
// (covers "/", "/resident-login", etc. with clean URLs).
// Written as a plain middleware (no path string) to avoid Express 5's
// stricter path-to-regexp wildcard syntax (bare '*' now throws).
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 404 handler (API routes that don't match anything above)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
const shouldStartLocalServer = !isVercelRuntime && process.env.NODE_ENV !== 'production';

if (shouldStartLocalServer) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
    // Warm the connection locally so config problems show up at startup.
    connectDB()
      .then(() => console.log('MongoDB connected successfully'))
      .catch((error) => console.error('MongoDB connection failed:', error.message));
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}

module.exports = app;
