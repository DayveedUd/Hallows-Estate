require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend — with includeFiles bundling "public/**" alongside this
// file, __dirname reliably points at the right folder both locally and
// inside the Vercel function, now that the casing matches on disk.
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// MongoDB
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

const connectMongo = async () => {
  if (!mongoURI) {
    console.warn('⚠️ MONGO_URI is not defined in environment variables.');
    return;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message || error);
  }
};

connectMongo();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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