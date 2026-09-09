// ================================================
// HALLOWS ESTATE - Main Express Server (Serverless Ready)
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

const app = express();

// Security and CORS Middleware
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Non-blocking MongoDB Connection
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
let dbConnected = false;

const connectDB = async () => {
    if (dbConnected) return;
    if (!mongoURI) {
        console.warn("⚠️ MONGO_URI is missing in environment variables.");
        return;
    }
    try {
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
        dbConnected = true;
        console.log("✓ MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
    }
};

// Ensure DB connects on API invocations
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Health Check Endpoint
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

// Unmatched API route handler (Express 5 compatible syntax)
app.use('/api/{*splat}', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Runtime Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Serve static assets ONLY during local development (Vercel CDN handles this in production)
if (process.env.NODE_ENV !== 'production') {
    const publicPath = path.join(__dirname, 'public');
    app.use(express.static(publicPath));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Local server running at http://localhost:${PORT}`);
    });
}

module.exports = app;