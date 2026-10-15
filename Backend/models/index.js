// ================================================
// Model registry
// Requiring this file registers every model with Mongoose up-front, so that
// populate() refs and index creation never depend on which route ran first.
// ================================================

const Admin = require('./Admin');
const Resident = require('./Resident');
const Announcement = require('./Announcement');
const MaintenanceTicket = require('./MaintenanceTicket');
const FacilityBooking = require('./FacilityBooking');

module.exports = { Admin, Resident, Announcement, MaintenanceTicket, FacilityBooking };
