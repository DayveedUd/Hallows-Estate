// ================================================
// HALLOWS ESTATE - Main Monolithic Express Server
// ================================================

require('dotenv').config();
const fs = require('fs');
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
    contentSecurityPolicy: false
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

// Safe Public Directory Resolution across Vercel environments
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

// Database Connection Helper for Serverless
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
let dbConnected = false;

const connectDB = async () => {
    if (dbConnected || mongoose.connection.readyState === 1) {
        dbConnected = true;
        return;
    }
    if (!mongoURI) {
        console.warn("⚠️ MONGO_URI is missing in environment variables.");
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

// Database Connection Middleware (Never blocks or crashes the app)
app.use(async (req, res, next) => {
    try {
        await connectDB();
    } catch (err) {
        console.error("Non-blocking DB error:", err.message);
    }
    next();
});

// Helper to safely send static files without crashing
const safeSendFile = (res, fileName) => {
    const filePath = path.join(publicPath, fileName);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    return res.status(404).json({
        success: false,
        message: `Requested file (${fileName}) not found in runtime directory`,
        publicPath
    });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        dbConnected: Boolean(dbConnected),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// Explicit Static HTML Routes (Express 5 Syntax)
app.get(['/resident-login', '/resident-login.html'], (req, res) => safeSendFile(res, 'resident-login.html'));
app.get(['/resident-portal', '/resident-portal.html'], (req, res) => safeSendFile(res, 'resident-portal.html'));
app.get(['/admin-portal', '/admin-portal.html'], (req, res) => safeSendFile(res, 'admin-portal.html'));

// Root / Fallback Landing Page Route
app.get('{*splat}', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.originalUrl
        });
    }
    safeSendFile(res, 'index.html');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Runtime Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start local server during non-production runs
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
    });
}

module.exports = app;