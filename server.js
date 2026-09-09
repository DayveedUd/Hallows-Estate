// ================================================
// HALLOWS ESTATE - Main Monolithic Express Server
// ================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Import routes
const adminRoutes = require('./Backend/routes/adminRoutes');
const residentRoutes = require('./Backend/routes/residentRoutes');

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allows rendering static assets inline
}));

// CORS Configuration
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Static Middleware for public folder
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

// MongoDB Connection Helper for Serverless Runtimes
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
let dbConnected = false;

const connectDB = async () => {
    if (dbConnected || mongoose.connection.readyState === 1) {
        dbConnected = true;
        return;
    }
    if (!mongoURI) {
        console.warn("⚠️ MONGO_URI is not defined in environment variables.");
        return;
    }
    try {
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
        dbConnected = true;
        console.log("✓ MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
};

// Database Connection Middleware
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        dbConnected: Boolean(dbConnected),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// Explicit Static HTML Routes
app.get('/resident-login(.html)?', (req, res) => {
    res.sendFile(path.join(publicPath, 'resident-login.html'));
});

app.get('/resident-portal(.html)?', (req, res) => {
    res.sendFile(path.join(publicPath, 'resident-portal.html'));
});

app.get('/admin-portal(.html)?', (req, res) => {
    res.sendFile(path.join(publicPath, 'admin-portal.html'));
});

// Root / Fallback Landing Page Route
app.get('*', (req, res, next) => {
    // If request starts with /api, pass to error handler instead of sending index.html
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.originalUrl
        });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start local server during non-production runs
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
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