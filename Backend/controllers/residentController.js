// ================================================
// Resident Controller
// ================================================

const jwt = require('jsonwebtoken');
const Resident = require('../models/Resident');
const Announcement = require('../models/Announcement');
const MaintenanceTicket = require('../models/MaintenanceTicket');
const { getJwtSecret } = require('../config/env');
const { validateResidentRegistration, validateResidentLogin } = require('../utils/validation');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id, type: 'resident' }, getJwtSecret(), {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Register resident
exports.register = async (req, res) => {
    try {
        const {
            firstName,
            middleName,
            lastName,
            username,
            password,
            email,
            phone,
            status,
            propertyType
        } = req.body || {};
        
        // Validate input
        const validation = validateResidentRegistration({
            firstName,
            lastName,
            username,
            password,
            email,
            phone,
            status,
            propertyType
        });
        
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }
        
        // Normalise once so the duplicate check and the saved record always agree
        // ("0801 234 5678" and "08012345678" are the same phone number).
        const normalized = {
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            phone: String(phone).replace(/\s+/g, '')
        };

        // One round-trip instead of three
        const existing = await Resident.findOne({
            $or: [
                { username: normalized.username },
                { email: normalized.email },
                { phone: normalized.phone }
            ]
        }).select('username email phone').lean();

        if (existing) {
            if (existing.username === normalized.username) {
                return res.status(409).json({ success: false, message: 'Username already taken' });
            }
            if (existing.email === normalized.email) {
                return res.status(409).json({ success: false, message: 'Email already registered' });
            }
            return res.status(409).json({ success: false, message: 'Phone number already registered' });
        }
        
        // Create new resident
        const newResident = new Resident({
            firstName: firstName.trim(),
            middleName: middleName?.trim() || '',
            lastName: lastName.trim(),
            username: normalized.username,
            password, // Will be hashed by pre-save middleware
            email: normalized.email,
            phone: normalized.phone,
            status,
            propertyType,
            isActive: true,
            isVerified: false,
            accountStatus: 'pending',
            paymentStatus: 'Pending'
        });
        
        // Save to database
        await newResident.save();
        
        // Return success response
        res.status(201).json({
            success: true,
            message: 'Registration successful. Your account is awaiting admin approval.',
            residentId: newResident._id,
            residentName: newResident.getFullName(),
            email: newResident.email,
            accountStatus: newResident.accountStatus
        });
        
    } catch (error) {
        // Two simultaneous sign-ups can both pass the check above; the unique index decides.
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'record';
            return res.status(409).json({ success: false, message: `That ${field} is already registered` });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors)[0]?.message || 'Validation failed',
                errors: Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]))
            });
        }
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Resident Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};
        
        // Validate input
        const validation = validateResidentLogin({ username, password });
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }
        
        // Find resident by username
        const resident = await Resident.findOne({ username: username.toLowerCase() }).select('+password');
        
        if (!resident) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        if (resident.accountStatus === 'pending') {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_PENDING',
                message: 'Your account is awaiting admin approval'
            });
        }

        if ((resident.accountStatus && resident.accountStatus !== 'active') || !resident.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Resident account is not active'
            });
        }
        
        // Compare passwords
        const isPasswordValid = await resident.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        // Update last login
        resident.lastLogin = new Date();
        await resident.save();
        
        // Generate token
        const token = generateToken(resident._id);
        
        // Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            residentId: resident._id,
            residentName: resident.getFullName(),
            email: resident.email,
            unit: resident.unit || 'Not Assigned'
        });
        
    } catch (error) {
        console.error('Resident login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get resident profile
exports.getProfile = async (req, res) => {
    try {
        const resident = await Resident.findById(req.residentId).select('-password');
        
        if (!resident) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: resident
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Update resident profile
exports.updateProfile = async (req, res) => {
    try {
        const updateData = req.body;
        
        // Don't allow certain fields to be updated
        delete updateData.password;
        delete updateData.username;
        delete updateData.email;
        delete updateData.phone;
        
        const resident = await Resident.findByIdAndUpdate(
            req.residentId,
            updateData,
            { returnDocument: 'after', runValidators: true }
        ).select('-password');
        
        if (!resident) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: resident
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }
        
        const resident = await Resident.findById(req.residentId).select('+password');
        
        if (!resident) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }
        
        // Verify current password
        const isPasswordValid = await resident.comparePassword(currentPassword);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Update password
        resident.password = newPassword;
        await resident.save();
        
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get payment details
exports.getPaymentDetails = async (req, res) => {
    try {
        const resident = await Resident.findById(req.residentId).select('firstName lastName dueAmount amountPaid paymentStatus lastPaymentDate');
        
        if (!resident) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }
        
        const outstanding = resident.dueAmount - resident.amountPaid;
        
        res.status(200).json({
            success: true,
            data: {
                name: resident.getFullName(),
                dueAmount: resident.dueAmount,
                amountPaid: resident.amountPaid,
                outstanding: outstanding > 0 ? outstanding : 0,
                paymentStatus: resident.paymentStatus,
                lastPaymentDate: resident.lastPaymentDate
            }
        });
        
    } catch (error) {
        console.error('Get payment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get announcements (public, all residents can access)
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({
            isPublished: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
        }).sort({ publishedAt: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: announcements
        });
        
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.createTicket = async (req, res) => {
    try {
        const { category, description, priority = 'normal' } = req.body;
        if (!category || !description) {
            return res.status(400).json({ success: false, message: 'Category and description are required' });
        }
        if (!['normal', 'urgent'].includes(priority)) {
            return res.status(400).json({ success: false, message: 'Invalid priority' });
        }

        const ticket = await MaintenanceTicket.create({
            resident: req.residentId,
            category,
            description,
            priority
        });
        res.status(201).json({ success: true, data: ticket });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, message: 'Server error creating ticket' });
    }
};

exports.getTickets = async (req, res) => {
    try {
        const tickets = await MaintenanceTicket.find({ resident: req.residentId }).sort({ createdAt: -1 });
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error loading tickets' });
    }
};

module.exports = exports;
