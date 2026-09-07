require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./Backend/models/Admin');

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const adminEmail = 'udoinyangdavid2@gmail.com';
        const rawPassword = 'Admin12345!!';

        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin account already exists!');
            process.exit(0);
        }

        const newAdmin = new Admin({
            firstName: 'Estate',
            lastName: 'Admin',
            username: 'estateadmin',
            email: adminEmail,
            phone: '08000000000',
            password: rawPassword, // Pass raw password; pre-save hook hashes it
            role: 'admin',
            status: 'active'
        });

        await newAdmin.save();

        console.log('\n====================================');
        console.log('SUCCESS: Admin Account Created!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${rawPassword}`);
        console.log('====================================\n');

    } catch (err) {
        console.error('Error creating admin:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

seedAdmin();