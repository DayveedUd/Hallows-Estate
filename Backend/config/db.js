// ================================================
// MongoDB Connection Configuration
// ================================================

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hallows-estate';
        
        await mongoose.connect(mongoURI);
        
        console.log('✅ MongoDB connected successfully');
        console.log(`Database: ${mongoURI}`);
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:');
        console.error(error.message);
        
        // Retry connection after 5 seconds
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('error', (error) => {
    console.error('MongoDB error:', error.message);
});

module.exports = connectDB;