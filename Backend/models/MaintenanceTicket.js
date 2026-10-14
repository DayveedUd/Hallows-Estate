const mongoose = require('mongoose');

const MaintenanceTicketSchema = new mongoose.Schema({
    resident: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resident',
        required: true,
        index: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000
    },
    photo: {
        type: String,
        select: false
    },
    priority: {
        type: String,
        enum: ['normal', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    adminNotes: {
        type: String,
        default: ''
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

MaintenanceTicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MaintenanceTicket', MaintenanceTicketSchema);