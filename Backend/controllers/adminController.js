// ================================================
// Admin Controller
// ================================================

const jwt = require('jsonwebtoken');
const User = require('../models/Admin');
const Resident = require('../models/Resident');
const Announcement = require('../models/Announcement');
const MaintenanceTicket = require('../models/MaintenanceTicket');
const FacilityBooking = require('../models/FacilityBooking');
const { getJwtSecret } = require('../config/env');

const generateToken = (id) => jwt.sign({ id, type: 'admin' }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '30d'
});

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const admin = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'Admin account is inactive' });
        }

        admin.lastLogin = new Date();
        await admin.save();
        res.json({
            success: true,
            message: 'Login successful',
            token: generateToken(admin._id),
            adminId: admin._id,
            adminName: `${admin.firstName} ${admin.lastName}`,
            role: admin.role,
            permissions: admin.permissions
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during admin login' });
    }
};

exports.getProfile = async (req, res) => {
    res.json({ success: true, data: req.admin });
};

// Returns total residents, pending approvals, and dues status
exports.getDashboardStats = async (req, res) => {
    try {
        const [totalResidents, pendingApprovals, openComplaints, dues] = await Promise.all([
            Resident.countDocuments(),
            Resident.countDocuments({ accountStatus: 'pending' }),
            MaintenanceTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
            Resident.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }])
        ]);
        
        res.json({
            success: true,
            data: {
                totalResidents,
                pendingApprovals,
                openComplaints,
                duesCollected: dues[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Returns list of registered residents for Admin Portal
exports.getResidents = async (req, res) => {
    try {
        const residents = await Resident.find().select('-password').sort({ createdAt: -1 });
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
        const resident = await Resident.findById(req.params.residentId).select('-password');
        if (!resident) return res.status(404).json({ success: false, message: 'Resident not found' });
        res.json({ success: true, data: resident });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateResident = async (req, res) => {
    try {
        const allowedFields = ['firstName', 'middleName', 'lastName', 'status', 'propertyType', 'unit', 'block', 'paymentStatus', 'dueAmount'];
        const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
        const updated = await Resident.findByIdAndUpdate(req.params.residentId, update, { returnDocument: 'after', runValidators: true }).select('-password');
        if (!updated) return res.status(404).json({ success: false, message: 'Resident not found' });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateResidentStatus = async (req, res) => {
    try {
        const { accountStatus, rejectionReason = '' } = req.body;
        if (!['pending', 'active', 'rejected', 'suspended'].includes(accountStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid account status' });
        }

        const update = {
            accountStatus,
            isActive: accountStatus === 'active',
            isVerified: accountStatus === 'active',
            rejectionReason
        };
        if (accountStatus === 'active') {
            update.approvedBy = req.adminId;
            update.approvedAt = new Date();
        }

        const resident = await Resident.findByIdAndUpdate(req.params.residentId, update, { returnDocument: 'after', runValidators: true }).select('-password');
        if (!resident) return res.status(404).json({ success: false, message: 'Resident not found' });
        res.json({ success: true, message: `Resident account ${accountStatus}`, data: resident });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const resident = await Resident.findById(req.params.residentId);
        if (!resident) return res.status(404).json({ success: false, message: 'Resident not found' });

        // `amount` is optional: omitted means "settle the outstanding balance".
        const outstanding = Math.max((resident.dueAmount || 0) - (resident.amountPaid || 0), 0);
        const rawAmount = req.body?.amount;
        const amount = rawAmount === undefined || rawAmount === null || rawAmount === '' ? outstanding : Number(rawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'A payment amount greater than zero is required' });
        }

        // The resident portal derives "outstanding" from dueAmount - amountPaid, and the
        // admin dashboard sums amountPaid, so amountPaid must move with paymentStatus.
        resident.amountPaid = (resident.amountPaid || 0) + amount;
        resident.lastPaymentDate = new Date();
        if (resident.amountPaid >= resident.dueAmount) {
            resident.paymentStatus = 'Paid';
        } else if (resident.paymentStatus !== 'Overdue') {
            resident.paymentStatus = 'Pending';
        }
        await resident.save();

        res.json({ success: true, message: 'Payment recorded', data: resident });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTickets = async (req, res) => {
    try {
        const tickets = await MaintenanceTicket.find()
            .select('+photo')
            .populate('resident', 'firstName middleName lastName unit block username')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error loading tickets' });
    }
};

exports.updateTicketStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid ticket status' });
        }

        const update = { status };
        if (adminNotes !== undefined) update.adminNotes = adminNotes;
        if (status === 'resolved' || status === 'closed') update.resolvedAt = new Date();
        else update.resolvedAt = null; // re-opened tickets are no longer resolved
        if (status !== 'open') update.assignedTo = req.adminId; // last admin to act on it
        const ticket = await MaintenanceTicket.findByIdAndUpdate(req.params.ticketId, update, { returnDocument: 'after' })
            .populate('resident', 'firstName middleName lastName unit block username')
            .populate('assignedTo', 'firstName lastName');
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.json({ success: true, data: ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error updating ticket' });
    }
};

exports.getFacilityBookings = async (req, res) => {
    try {
        const bookings = await FacilityBooking.find()
            .populate('resident', 'firstName lastName unit block')
            .sort({ date: 1, createdAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        console.error('Get facility bookings error:', error);
        res.status(500).json({ success: false, message: 'Unable to load facility bookings' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json({ success: true, data: announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error loading announcements' });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, category, severity = 'normal', expiresAt = null } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({ success: false, message: 'Title, content, and category are required' });
        }
        const announcement = await Announcement.create({ title, content, category, severity, expiresAt, createdBy: req.adminId });
        res.status(201).json({ success: true, data: announcement });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error creating announcement' });
    }
};
