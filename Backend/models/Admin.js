// ================================================
// Admin Model
// ================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username cannot exceed 50 characters']
    },
    
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },
    
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    
    phone: {
        type: String,
        required: [true, 'Phone number is required']
    },
    
    role: {
        type: String,
        enum: ['super-admin', 'admin', 'manager'],
        default: 'admin'
    },
    
    permissions: {
        viewResidents: { type: Boolean, default: true },
        editResidents: { type: Boolean, default: true },
        viewPayments: { type: Boolean, default: true },
        recordPayments: { type: Boolean, default: true },
        viewComplaints: { type: Boolean, default: true },
        resolveComplaints: { type: Boolean, default: true },
        postAnnouncements: { type: Boolean, default: true },
        manageAdmins: { type: Boolean, default: false }
    },
    
    isActive: {
        type: Boolean,
        default: true
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

// Hash password before saving
AdminSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return; // Just return; Mongoose handles Promise completion
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
AdminSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get public data (without password)
AdminSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('Admin', AdminSchema);