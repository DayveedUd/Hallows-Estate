// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Import routes from Backend directory
const adminRoutes = require('./Backend/routes/adminRoutes');
const residentRoutes = require('./Backend/routes/residentRoutes');

const app = express();

// Security and CORS
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection helper for serverless
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
let dbConnected = false;

const connectDB = async () => {
    if (dbConnected) return;
    if (!mongoURI) return;
    try {
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
        dbConnected = true;
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
    }
};

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server active',
        dbConnected: Boolean(dbConnected),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// Catch-all 404 for unmatched API routes
app.use('/api/{*splat}', (req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Local development listener
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Local server running on port ${PORT}`);
    });
}

module.exports = app;