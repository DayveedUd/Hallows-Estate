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

// ================================================
// VERCEL COMPATIBLE STATIC FILE SERVING
// ================================================

// Find the public directory
let publicPath = path.join(__dirname, 'public');

// Check if public exists, if not try alternative paths
if (!fs.existsSync(publicPath)) {
    const altPaths = [
        path.join(process.cwd(), 'public'),
        path.join('/var/task', 'public'),
        path.join(__dirname, '..', 'public')
    ];
    
    for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
            publicPath = altPath;
            break;
        }
    }
}

console.log(`📁 Public directory: ${publicPath}`);
console.log(`📁 Public exists: ${fs.existsSync(publicPath)}`);

// Serve static files
app.use(express.static(publicPath));

// Function to get file content (reads file or returns null)
const getFileContent = (fileName) => {
    const filePath = path.join(publicPath, fileName);
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (err) {
        console.error(`Error reading ${fileName}:`, err.message);
    }
    return null;
};

// Serve HTML pages
const serveHtml = (res, fileName) => {
    const content = getFileContent(fileName);
    if (content) {
        res.setHeader('Content-Type', 'text/html');
        return res.send(content);
    }
    
    // Fallback HTML if file not found
    return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hallows Estate</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #721c24; background: #f8d7da; padding: 20px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>⚠️ File Not Found</h1>
                <p>Requested file: <strong>${fileName}</strong></p>
                <p>Public directory: <strong>${publicPath}</strong></p>
                <p>Please check your deployment configuration.</p>
            </div>
        </body>
        </html>
    `);
};

// Database Connection
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

app.use(async (req, res, next) => {
    try {
        await connectDB();
    } catch (err) {
        console.error("Non-blocking DB error:", err.message);
    }
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const files = fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : [];
    res.json({
        status: 'Server is running',
        dbConnected: Boolean(dbConnected),
        publicPath: publicPath,
        publicExists: fs.existsSync(publicPath),
        filesInPublic: files,
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// HTML Routes
app.get(['/resident-login', '/resident-login.html'], (req, res) => serveHtml(res, 'resident-login.html'));
app.get(['/resident-portal', '/resident-portal.html'], (req, res) => serveHtml(res, 'resident-portal.html'));
app.get(['/admin-portal', '/admin-portal.html'], (req, res) => serveHtml(res, 'admin-portal.html'));

// Root route
app.get('/', (req, res) => serveHtml(res, 'index.html'));

// Fallback
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.originalUrl
        });
    }
    serveHtml(res, 'index.html');
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Runtime Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
        console.log(`📁 Public directory: ${publicPath}`);
    });
}

module.exports = app;