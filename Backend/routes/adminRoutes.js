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

router.post('/residents/:residentId/payment', verifyAdminToken, checkPermission('recordPayments'), adminController.recordPayment);

module.exports = router;