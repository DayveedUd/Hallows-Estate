// ================================================
// Input Validation Helper Utilities
// ================================================

const validateResidentRegistration = (data) => {
    const errors = {};
    if (!data.firstName) errors.firstName = 'First name is required';
    if (!data.lastName) errors.lastName = 'Last name is required';
    if (!data.username) errors.username = 'Username is required';
    if (!data.password || data.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!data.email) errors.email = 'Email is required';
    if (!data.phone) errors.phone = 'Phone number is required';
    if (!data.status) errors.status = 'Status is required';
    if (!data.propertyType) errors.propertyType = 'Property type is required';

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

const validateResidentLogin = (data) => {
    const errors = {};
    if (!data.username) errors.username = 'Username is required';
    if (!data.password) errors.password = 'Password is required';

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

module.exports = {
    validateResidentRegistration,
    validateResidentLogin
};