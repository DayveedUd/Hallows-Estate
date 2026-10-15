// ================================================
// Admin Routes
// ================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdminToken, checkPermission } = require('../middleware/auth');

// Public routes
router.post('/login', adminController.login);

// Protected routes (require authentication)
router.get('/profile', verifyAdminToken, adminController.getProfile);

router.get('/dashboard-stats', verifyAdminToken, checkPermission('viewResidents'), adminController.getDashboardStats);

router.get('/residents', verifyAdminToken, checkPermission('viewResidents'), adminController.getResidents);

router.get('/residents/:residentId', verifyAdminToken, checkPermission('viewResidents'), adminController.getResidentDetails);

router.put('/residents/:residentId', verifyAdminToken, checkPermission('editResidents'), adminController.updateResident);

router.patch('/residents/:residentId/status', verifyAdminToken, checkPermission('editResidents'), adminController.updateResidentStatus);

router.post('/residents/:residentId/payment', verifyAdminToken, checkPermission('recordPayments'), adminController.recordPayment);

router.get('/tickets', verifyAdminToken, checkPermission('viewComplaints'), adminController.getTickets);

router.patch('/tickets/:ticketId/status', verifyAdminToken, checkPermission('resolveComplaints'), adminController.updateTicketStatus);

router.get('/facility-bookings', verifyAdminToken, checkPermission('viewResidents'), adminController.getFacilityBookings);

router.get('/announcements', verifyAdminToken, checkPermission('postAnnouncements'), adminController.getAnnouncements);

router.post('/announcements', verifyAdminToken, checkPermission('postAnnouncements'), adminController.createAnnouncement);

module.exports = router;