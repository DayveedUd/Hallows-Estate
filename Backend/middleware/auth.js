// ================================================
// Authentication Middleware
// ================================================

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Resident = require('../models/Resident');
const { getJwtSecret } = require('../config/env');

// Only genuine token problems are 401s. Anything else (database error, missing
// JWT_SECRET, ...) is a server fault: reporting it as 401 would make the portals
// log users out whenever the database hiccups.
const sendAuthError = (error, res) => {
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Authentication check failed. Please try again.' });
};

// Verify admin token
const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.body?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, getJwtSecret());
        
        // Get admin from database
        const admin = await Admin.findById(decoded.id);
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Admin account is inactive'
            });
        }
        
        req.admin = admin;
        req.adminId = decoded.id;
        next();
        
    } catch (error) {
        return sendAuthError(error, res);
    }
};

// Verify resident token
const verifyResidentToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.body?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, getJwtSecret());
        
        // Get resident from database
        const resident = await Resident.findById(decoded.id);
        
        if (!resident) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }
        
        if ((resident.accountStatus && resident.accountStatus !== 'active') || !resident.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Resident account is inactive'
            });
        }
        
        req.resident = resident;
        req.residentId = decoded.id;
        next();
        
    } catch (error) {
        return sendAuthError(error, res);
    }
};

// Check admin permissions
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }
            
            if (!req.admin.permissions[permission]) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }
            
            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

module.exports = {
    verifyAdminToken,
    verifyResidentToken,
    checkPermission
};
