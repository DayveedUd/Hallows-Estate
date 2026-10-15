const mongoose = require('mongoose');

const FacilityBookingSchema = new mongoose.Schema({
    resident: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resident',
        required: true,
        index: true
    },
    facility: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['confirmed'],
        default: 'confirmed'
    }
}, { timestamps: true });

FacilityBookingSchema.index(
    { facility: 1, date: 1, timeSlot: 1 },
    { unique: true, name: 'unique_facility_booking_slot' }
);

module.exports = mongoose.model('FacilityBooking', FacilityBookingSchema);
