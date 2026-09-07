// ================================================
// Resident Controller
// ================================================

const jwt = require('jsonwebtoken');
const Resident = require('../models/Resident');
const { validateResidentRegistration, validateResidentLogin } = require('../utils/validation');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'hallows-resident-secret-key', {
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
        } = req.body;
        
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
        
        // Check if username already exists
        const existingUsername = await Resident.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: 'Username already taken'
            });
        }
        
        // Check if email already exists
        const existingEmail = await Resident.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }
        
        // Check if phone already exists
        const existingPhone = await Resident.findOne({ phone });
        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: 'Phone number already registered'
            });
        }
        
        // Create new resident
        const newResident = new Resident({
            firstName: firstName.trim(),
            middleName: middleName?.trim() || '',
            lastName: lastName.trim(),
            username: username.toLowerCase().trim(),
            password, // Will be hashed by pre-save middleware
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            status,
            propertyType,
            isActive: true,
            isVerified: false,
            paymentStatus: 'Pending'
        });
        
        // Save to database
        await newResident.save();
        
        // Generate token
        const token = generateToken(newResident._id);
        
        // Return success response
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            residentId: newResident._id,
            residentName: newResident.getFullName(),
            email: newResident.email
        });
        
    } catch (error) {
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
        const { username, password } = req.body;
        
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
        
        // Check if resident is active
        if (!resident.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Resident account is inactive'
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
        const resident = await Resident.findById(req.residentId)
            .select('-password')
            .populate('complaints')
            .populate('facilities');
        
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
            { new: true, runValidators: true }
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
        // This would typically fetch from an Announcement model
        // For now, returning sample data
        res.status(200).json({
            success: true,
            data: [
                {
                    id: 1,
                    title: 'Community Meeting',
                    category: 'Announcement',
                    content: 'Join us for our monthly community meeting',
                    date: new Date()
                }
            ]
        });
        
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = exports;