// ================================================
// Resident Model
// ================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ResidentSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username cannot exceed 50 characters']
    },
    
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't return password by default
    },
    
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    
    middleName: {
        type: String,
        trim: true,
        default: ''
    },
    
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true
    },
    
    status: {
        type: String,
        enum: ['Owner', 'Tenant'],
        required: [true, 'Status (Owner/Tenant) is required']
    },
    
    propertyType: {
        type: String,
        enum: ['Flat', 'Semi-Detached Bungalow', 'Detached Bungalow', 'Semi-Detached Duplex', 'Detached Duplex'],
        required: [true, 'Property type is required']
    },
    
    unit: {
        type: String,
        default: 'Not Assigned',
        trim: true
    },
    
    block: {
        type: String,
        default: 'Not Assigned',
        trim: true
    },
    
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Pending', 'Overdue'],
        default: 'Pending'
    },
    
    dueAmount: {
        type: Number,
        default: 50000 // Default monthly dues in Naira
    },
    
    amountPaid: {
        type: Number,
        default: 0
    },
    
    lastPaymentDate: {
        type: Date,
        default: null
    },
    
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    },
    
    documents: {
        identification: String,
        propertyDocument: String,
        tenancyAgreement: String
    },
    
    complaints: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint'
    }],
    
    facilities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FacilityBooking'
    }],
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    isVerified: {
        type: Boolean,
        default: false
    },
    
    lastLogin: {
        type: Date,
        default: null
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// CORRECT: Pure async/await without the next parameter
ResidentSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
ResidentSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get full name
ResidentSchema.methods.getFullName = function() {
    if (this.middleName) {
        return `${this.firstName} ${this.middleName} ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
};

// Method to get public data (without password)
ResidentSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

// Index for efficient non-unique field queries
ResidentSchema.index({ unit: 1 });
ResidentSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Resident', ResidentSchema);