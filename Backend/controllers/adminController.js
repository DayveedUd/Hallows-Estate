// ================================================
// Admin Controller
// ================================================

const User = require('../models/Admin'); // Adjust path to your User model
const Resident = require('../models/Resident');

exports.login = async (req, res) => {
    // Admin login logic
    res.json({ success: true, token: 'demo-admin-jwt-token' });
};

exports.getProfile = async (req, res) => {
    res.json({ success: true, data: { name: 'Estate Admin', role: 'admin' } });
};

// Returns total residents, pending approvals, and dues status
exports.getDashboardStats = async (req, res) => {
    try {
        const totalResidents = await User.countDocuments({ role: { $ne: 'admin' } });
        const pendingApprovals = await User.countDocuments({ status: 'pending' });
        
        res.json({
            success: true,
            data: {
                totalResidents,
                pendingApprovals,
                openComplaints: 0,
                duesCollected: 45000
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Returns list of registered residents for Admin Portal
exports.getResidents = async (req, res) => {
    try {
        const residents = await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: residents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getResidentDetails = async (req, res) => {
    try {
        const resident = await User.findById(req.params.residentId);
        res.json({ success: true, data: resident });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateResident = async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.residentId, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(
            req.params.residentId, 
            { paymentStatus: 'Paid', lastPaymentDate: new Date() }, 
            { new: true }
        );
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};