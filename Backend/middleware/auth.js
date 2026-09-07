// ================================================
// Authentication Middleware
// ================================================

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Resident = require('../models/Resident');

// Verify admin token
const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.body.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hallows-admin-secret-key');
        
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
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Verify resident token
const verifyResidentToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.body.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hallows-resident-secret-key');
        
        // Get resident from database
        const resident = await Resident.findById(decoded.id);
        
        if (!resident) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }
        
        if (!resident.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Resident account is inactive'
            });
        }
        
        req.resident = resident;
        req.residentId = decoded.id;
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
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