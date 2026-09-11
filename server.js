// ...existing code...
require('dotenv').config();
const fs = require('fs');
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

// Keep only API behavior here.
// Do not try to serve the HTML pages from the serverless function at runtime.
// Vercel static assets are handled by the build config above.
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

// API endpoints only
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// This is the root request for the app.
// On Vercel, the actual HTML page is served by the static asset config.
app.get('/', (req, res) => {
  const fallback = path.join(__dirname, 'public', 'index.html');

  if (fs.existsSync(fallback)) {
    return res.sendFile(fallback);
  }

  return res.status(404).json({
    success: false,
    message: 'index.html not found in runtime directory',
    cwd: process.cwd(),
    dirname: __dirname
  });
});

// 404 handler
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