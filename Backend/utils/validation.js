// ================================================
// Validation Utilities
// ================================================

// Validate email format
const validateEmail = (email) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

// Validate Nigerian phone number
const validatePhone = (phone) => {
    // Accept formats: +234xxxxxxxxxx, 0xxxxxxxxxxx, 234xxxxxxxxxx
    const phoneRegex = /^(\+234|234|0)[0-9]{10}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    return phoneRegex.test(cleanPhone);
};

// Validate password strength
const validatePassword = (password) => {
    // At least 8 characters
    if (password.length < 8) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters'
        };
    }
    
    // Optional: Add stronger requirements
    // - At least one uppercase letter
    // - At least one lowercase letter
    // - At least one number
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return {
        valid: password.length >= 8,
        message: 'Password is valid'
    };
};

// Validate username
const validateUsername = (username) => {
    // 3-50 characters, alphanumeric, underscore, hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return usernameRegex.test(username);
};

// Validate name
const validateName = (name) => {
    // At least 2 characters, letters and spaces only
    const nameRegex = /^[a-zA-Z\s]{2,}$/;
    return nameRegex.test(name);
};

// Resident registration validation
const validateResidentRegistration = (data) => {
    const errors = {};
    
    // First name
    if (!data.firstName || !validateName(data.firstName)) {
        errors.firstName = 'First name must be at least 2 characters (letters only)';
    }
    
    // Last name
    if (!data.lastName || !validateName(data.lastName)) {
        errors.lastName = 'Last name must be at least 2 characters (letters only)';
    }
    
    // Username
    if (!data.username || !validateUsername(data.username)) {
        errors.username = 'Username: 3-50 characters (letters, numbers, underscore, hyphen)';
    }
    
    // Password
    if (!data.password || data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    }
    
    // Email
    if (!data.email || !validateEmail(data.email)) {
        errors.email = 'Please enter a valid email address';
    }
    
    // Phone
    if (!data.phone || !validatePhone(data.phone)) {
        errors.phone = 'Please enter a valid Nigerian phone number';
    }
    
    // Status
    if (!['Owner', 'Tenant'].includes(data.status)) {
        errors.status = 'Status must be Owner or Tenant';
    }
    
    // Property type
    const validPropertyTypes = [
        'Flat',
        'Semi-Detached Bungalow',
        'Detached Bungalow',
        'Semi-Detached Duplex',
        'Detached Duplex'
    ];
    if (!validPropertyTypes.includes(data.propertyType)) {
        errors.propertyType = 'Invalid property type';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Admin login validation
const validateAdminLogin = (data) => {
    const errors = {};
    
    if (!data.username || data.username.length < 3) {
        errors.username = 'Username is required (minimum 3 characters)';
    }
    
    if (!data.password || data.password.length < 6) {
        errors.password = 'Password is required (minimum 6 characters)';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Resident login validation
const validateResidentLogin = (data) => {
    const errors = {};
    
    if (!data.username || data.username.length < 3) {
        errors.username = 'Username is required (minimum 3 characters)';
    }
    
    if (!data.password || data.password.length < 6) {
        errors.password = 'Password is required (minimum 6 characters)';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Sanitize string input
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
};

// Format phone number to standard format
const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('234')) {
        return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
        return '+234' + cleaned.substring(1);
    } else {
        return '+234' + cleaned;
    }
};

module.exports = {
    validateEmail,
    validatePhone,
    validatePassword,
    validateUsername,
    validateName,
    validateResidentRegistration,
    validateAdminLogin,
    validateResidentLogin,
    sanitizeString,
    formatPhone
};