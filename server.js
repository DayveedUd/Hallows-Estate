// ================================================
// HALLOWS ESTATE - Main Server
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

// Resolve public directory dynamically across Vercel environments
const getPublicPath = () => {
    const cwdPath = path.join(process.cwd(), 'public');
    const dirPath = path.join(__dirname, 'public');
    
    if (fs.existsSync(cwdPath)) return cwdPath;
    if (fs.existsSync(dirPath)) return dirPath;
    return cwdPath; // Fallback
};

const publicPath = getPublicPath();
app.use(express.static(publicPath));

// MongoDB connection
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (mongoURI) {
    mongoose.connect(mongoURI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.log("MongoDB connection failed:");
        console.log(error);
    });
} else {
    console.warn("⚠️ MONGO_URI is not defined in environment variables.");
}

// Explicit Page Routes for HTML files
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/resident-login.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'resident-login.html'));
});

app.get('/resident-portal.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'resident-portal.html'));
});

app.get('/admin-portal.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'admin-portal.html'));
});

// Root Route - Serves Landing Page (index.html) first
app.get('/', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    const loginPath = path.join(publicPath, 'resident-login.html');

    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    } else if (fs.existsSync(loginPath)) {
        return res.sendFile(loginPath);
    } else {
        return res.status(404).json({
            success: false,
            message: 'Landing page (index.html) and fallback pages not found in runtime directory',
            resolvedPath: publicPath,
            cwd: process.cwd(),
            dirname: __dirname
        });
    }
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

// 404 handler for unmatched routes
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

// Start server locally (Vercel exports the app as a serverless module)
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