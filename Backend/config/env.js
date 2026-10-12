// ================================================
// Environment helpers
// ================================================

const isProduction = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

// MONGODB_URI is the documented name; MONGO_URI is still accepted because that is
// what the original .env used.
const getMongoUri = () => process.env.MONGODB_URI || process.env.MONGO_URI || '';

// Never fall back to a hard-coded secret in production: anyone who has read the
// source could otherwise forge admin tokens.
const getJwtSecret = () => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (isProduction()) {
        throw new Error('JWT_SECRET is not set. Add it in Vercel -> Project Settings -> Environment Variables.');
    }
    return 'hallows-estate-secret-key'; // local development only
};

module.exports = { isProduction, getMongoUri, getJwtSecret };
