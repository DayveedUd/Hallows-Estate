// ================================================
// HALLOWS ESTATE - Main Server
// ================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./Backend/config/db');

// Import routes
const adminRoutes = require('./Backend/routes/adminRoutes');
const residentRoutes = require('./Backend/routes/residentRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Prevents CSP from blocking inline styles or assets when hosting HTML statically
}));

// Dynamic CORS Configuration (Allows localhost during development and deployed origins in production)
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or direct browser loads)
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
.then(() => {
    console.log("MongoDB connected successfully");
})
.catch((error) => {
    console.log("MongoDB connection failed:");
    console.log(error);
});

// Root route handler (Prevents 404 on base URL launch)
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    // Check if an index.html exists in public directory; send file if present, else JSON health status
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).json({
                success: true,
                message: 'Hallows Estate API is running successfully!',
                timestamp: new Date().toISOString()
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
    console.log(`Database: ${process.env.MONGO_URI || process.env.MONGODB_URI || 'Local MongoDB'}`);
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