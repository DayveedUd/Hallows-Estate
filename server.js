// ================================================
// HALLOWS ESTATE - Main Server
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
app.use(helmet({
    contentSecurityPolicy: false // Allows rendering static assets without strict CSP blocking
}));

// CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allows direct browser loads, local dev, or production deployments
        if (!origin || process.env.NODE_ENV === 'production' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public/ directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// MongoDB connection
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoURI)
.then(() => {
    console.log("MongoDB connected successfully");
})
.catch((error) => {
    console.log("MongoDB connection failed:");
    console.log(error);
});

// Explicit Page Routes for HTML files
app.get('/resident-login.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'resident-login.html'));
});

app.get('/resident-portal.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'resident-portal.html'));
});

app.get('/admin-portal.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'admin-portal.html'));
});

// Root Route Fallback
app.get('/', (req, res) => {
    const loginPath = path.join(publicPath, 'resident-login.html');
    const indexPath = path.join(publicPath, 'index.html');

    // Tries to serve resident-login.html first, then index.html, then API fallback message
    res.sendFile(loginPath, (err) => {
        if (err) {
            res.sendFile(indexPath, (err2) => {
                if (err2) {
                    res.status(200).json({
                        success: true,
                        message: 'Hallows Estate API is running successfully!',
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
    });
});

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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(async () => {
        console.log('Server closed');
        await mongoose.disconnect();
        process.exit(0);
    });
});

module.exports = app;