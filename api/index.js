// ================================================
// HALLOWS ESTATE - Main API Handler for Vercel
// ================================================

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle CORS preflight
app.options('*', cors());

// ========================================
// DATABASE CONNECTION
// ========================================

const mongoUri = process.env.MONGODB_URI;
let dbConnected = false;

async function connectDB() {
    if (dbConnected) return;
    
    try {
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        
        dbConnected = true;
        console.log('✓ MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        // Continue anyway - some routes don't need DB
    }
}

// Connect to database
connectDB();

// ========================================
// IMPORT MODELS & CONTROLLERS
// ========================================

let Resident, Admin, adminController, residentController;

async function loadModels() {
    try {
        Resident = require('../Backend/models/Resident');
        Admin = require('../Backend/models/Admin');
        adminController = require('../Backend/controllers/adminController');
        residentController = require('../Backend/controllers/residentController');
    } catch (error) {
        console.warn('Warning: Could not load models/controllers:', error.message);
    }
}

loadModels();

// ========================================
// AUTH MIDDLEWARE
// ========================================

const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'hallows-secret-key';

const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, jwtSecret);
        req.userId = decoded.id;
        req.userType = decoded.type || 'resident';
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// ========================================
// HEALTH CHECK
// ========================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        mongodb: dbConnected ? 'connected' : 'disconnected'
    });
});

// ========================================
// AUTH ROUTES
// ========================================

// Resident Register
app.post('/api/resident/register', async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.register(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Resident Login
app.post('/api/resident/login', async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.login(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========================================
// RESIDENT ROUTES
// ========================================

// Get Resident Profile
app.get('/api/resident/profile', verifyToken, async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.getProfile(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update Resident Profile
app.put('/api/resident/profile', verifyToken, async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.updateProfile(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Payment Details
app.get('/api/resident/payment-details', verifyToken, async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.getPaymentDetails(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Announcements
app.get('/api/resident/announcements', async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.getAnnouncements(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Change Password
app.post('/api/resident/change-password', verifyToken, async (req, res) => {
    try {
        if (!residentController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await residentController.changePassword(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========================================
// ADMIN ROUTES
// ========================================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.login(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Admin Profile
app.get('/api/admin/profile', verifyToken, async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.getProfile(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard-stats', verifyToken, async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.getDashboardStats(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Residents (Admin)
app.get('/api/admin/residents', verifyToken, async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.getResidents(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Resident Details (Admin)
app.get('/api/admin/residents/:residentId', verifyToken, async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.getResidentDetails(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update Resident (Admin)
app.put('/api/admin/residents/:residentId', verifyToken, async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.updateResident(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Record Payment (Admin)
app.post('/api/admin/residents/:residentId/payment', verifyToken, async (req, res) => {
    try {
        if (!adminController) {
            return res.status(500).json({ success: false, message: 'Server not ready' });
        }
        await adminController.recordPayment(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========================================
// 404 & ERROR HANDLERS
// ========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ========================================
// EXPORT FOR VERCEL
// ========================================

module.exports = app;