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
// STATIC FILE SERVING FOR VERCEL
// ================================================

// Try multiple paths to find the public directory
let publicPath = path.join(__dirname, 'public');

// If public doesn't exist at __dirname, try other locations
if (!fs.existsSync(publicPath)) {
    const altPaths = [
        path.join(process.cwd(), 'public'),
        '/var/task/public',
        path.join('/var/task', 'public')
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

// HTML file cache (fallback if static serving fails)
const htmlCache = {};
const htmlFiles = ['index.html', 'resident-login.html', 'resident-portal.html', 'admin-portal.html'];

// Try to load HTML files into memory
for (const fileName of htmlFiles) {
    const filePath = path.join(publicPath, fileName);
    try {
        if (fs.existsSync(filePath)) {
            htmlCache[fileName] = fs.readFileSync(filePath, 'utf8');
            console.log(`✅ Loaded ${fileName} into cache`);
        }
    } catch (err) {
        console.log(`⚠️ Could not cache ${fileName}`);
    }
}

// Helper function to serve HTML
const serveHtml = (res, fileName) => {
    // Try to serve from cache first
    if (htmlCache[fileName]) {
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlCache[fileName]);
    }
    
    // Try to serve from file system
    const filePath = path.join(publicPath, fileName);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    
    // Fallback HTML
    const fallbackHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Hallows Estate</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏰 Hallows Estate</h1>
            <p>Welcome to the Hallows Estate Management System</p>
            <p><em>Requested: ${fileName}</em></p>
            <hr>
            <p><a href="/">Home</a> | <a href="/resident-login">Resident Login</a></p>
        </div>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(fallbackHtml);
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
        cachedFiles: Object.keys(htmlCache),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// HTML Routes
app.get('/', (req, res) => serveHtml(res, 'index.html'));
app.get(['/resident-login', '/resident-login.html'], (req, res) => serveHtml(res, 'resident-login.html'));
app.get(['/resident-portal', '/resident-portal.html'], (req, res) => serveHtml(res, 'resident-portal.html'));
app.get(['/admin-portal', '/admin-portal.html'], (req, res) => serveHtml(res, 'admin-portal.html'));

// Fallback for all other routes
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

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Runtime Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start local server
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
        console.log(`📁 Public directory: ${publicPath}`);
        console.log(`📁 Files cached: ${Object.keys(htmlCache).join(', ')}`);
    });
}

module.exports = app;