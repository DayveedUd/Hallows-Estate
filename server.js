// ================================================
// HALLOWS ESTATE - Main Monolithic Server
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

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from /public using absolute path resolution
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(() => console.log("MongoDB connected successfully"))
        .catch((error) => {
            console.log("MongoDB connection failed:");
            console.log(error);
        });
} else {
    console.warn("⚠️ MONGO_URI is not defined in environment variables.");
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// Explicit Page Routes
app.get('/resident-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'resident-login.html'));
});

app.get('/resident-portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'resident-portal.html'));
});

app.get('/admin-portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-portal.html'));
});

// Fallback Root Route (Serves Landing Page)
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint not found',
            path: req.originalUrl
        });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Local listener (Only runs during direct local execution via "node server.js")
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
    });
}

module.exports = app;