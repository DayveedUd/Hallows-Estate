// ...existing code...
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

const app = express();
const isVercelRuntime = Boolean(process.env.VERCEL);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || process.env.NODE_ENV === 'production' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const candidates = [
    process.cwd(),
    __dirname,
    path.join(process.cwd(), 'public'),
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, 'dist')
];

const resolvePublicPath = () => {
    const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

    for (const candidate of uniqueCandidates) {
        if (!fs.existsSync(candidate)) continue;

        const htmlFiles = [
            'index.html',
            'resident-login.html',
            'resident-portal.html',
            'admin-portal.html'
        ];

        const hasHtml = htmlFiles.some((file) => fs.existsSync(path.join(candidate, file)));
        if (hasHtml) return candidate;

        const publicDir = path.join(candidate, 'public');
        if (fs.existsSync(publicDir)) return publicDir;
    }

    return path.join(process.cwd(), 'public');
};

const publicPath = resolvePublicPath();
app.use(express.static(publicPath));

const findExistingFile = (fileNames) => {
    const searchRoots = [
        process.cwd(),
        __dirname,
        path.join(process.cwd(), 'public'),
        path.join(__dirname, 'public'),
        path.join(process.cwd(), 'dist'),
        path.join(__dirname, 'dist')
    ];

    for (const root of searchRoots) {
        for (const fileName of fileNames) {
            const filePath = path.join(root, fileName);
            if (fs.existsSync(filePath)) return filePath;
        }
    }

    return null;
};

const sendHtmlFile = (res, fileNames, fallbackMessage) => {
    const foundFile = findExistingFile(fileNames);

    if (foundFile) {
        return res.sendFile(foundFile);
    }

    return res.status(404).json({
        success: false,
        message: fallbackMessage,
        resolvedPath: publicPath,
        cwd: process.cwd(),
        dirname: __dirname
    });
};

// MongoDB connection
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

const connectMongo = async () => {
    if (!mongoURI) {
        console.warn("⚠️ MONGO_URI is not defined in environment variables.");
        return;
    }

    try {
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message || error);
    }
};

connectMongo();

// Explicit page routes
app.get('/index.html', (req, res) => {
    sendHtmlFile(res, ['index.html'], 'index.html not found in runtime directory');
});

app.get('/resident-login.html', (req, res) => {
    sendHtmlFile(res, ['resident-login.html'], 'resident-login.html not found in runtime directory');
});

app.get('/resident-portal.html', (req, res) => {
    sendHtmlFile(res, ['resident-portal.html'], 'resident-portal.html not found in runtime directory');
});

app.get('/admin-portal.html', (req, res) => {
    sendHtmlFile(res, ['admin-portal.html'], 'admin-portal.html not found in runtime directory');
});

// Root route
app.get('/', (req, res) => {
    const foundFile = findExistingFile(['index.html', 'resident-login.html']);

    if (foundFile) {
        return res.sendFile(foundFile);
    }

    return res.status(404).json({
        success: false,
        message: 'Landing page (index.html) and fallback pages not found in runtime directory',
        resolvedPath: publicPath,
        cwd: process.cwd(),
        dirname: __dirname
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

// Start local server only if not in Vercel
const PORT = process.env.PORT || 5000;
const shouldStartLocalServer = !isVercelRuntime && process.env.NODE_ENV !== 'production';

if (shouldStartLocalServer) {
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