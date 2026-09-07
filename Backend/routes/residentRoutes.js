// ================================================
// Resident Routes
// ================================================

const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { verifyResidentToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/register', residentController.register);

router.post('/login', residentController.login);

// Protected routes (require authentication)
router.get('/profile', verifyResidentToken, residentController.getProfile);

router.put('/profile', verifyResidentToken, residentController.updateProfile);

router.post('/change-password', verifyResidentToken, residentController.changePassword);

router.get('/payment-details', verifyResidentToken, residentController.getPaymentDetails);

router.get('/announcements', verifyResidentToken, residentController.getAnnouncements);

module.exports = router;