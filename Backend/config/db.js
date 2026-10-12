// ================================================
// MongoDB Connection (serverless-safe)
// ================================================
//
// Why this file looks the way it does:
//  * On Vercel every request may land on a cold or a warm function instance. The
//    connection promise is cached on `global`, so a warm instance reuses one live
//    connection instead of opening a new one per request.
//  * `bufferCommands: false` makes a query made without a live connection fail
//    immediately instead of sitting in Mongoose's 10s buffer and dying with
//    "Operation `residents.findOne()` buffering timed out after 10000ms".
//  * A failed attempt clears the cached promise, so the NEXT request retries rather
//    than every request failing until the instance is recycled.
//  * Callers must `await connectDB()` before querying. server.js does that once for
//    every /api route (see ensureDb).

const mongoose = require('mongoose');
const { getMongoUri } = require('./env');

const cache = global.__hallowsMongo || (global.__hallowsMongo = {
    promise: null,
    listenersAttached: false,
    indexesEnsured: false
});

const CONNECT_OPTIONS = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000, // under Vercel's 10s default function limit
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5 // small pool: each serverless instance handles few concurrent requests
};

const attachListeners = () => {
    if (cache.listenersAttached) return;
    cache.listenersAttached = true;
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
    mongoose.connection.on('error', (error) => console.error('MongoDB error:', error.message));
};

// With bufferCommands off, index builds cannot be queued behind the connection, so
// build them explicitly once the connection is open. This keeps the unique
// constraints on username / email / phone in force.
const ensureIndexes = async () => {
    if (cache.indexesEnsured) return;
    cache.indexesEnsured = true;
    const models = Object.values(require('../models'));
    const results = await Promise.allSettled(models.map((model) => model.createIndexes()));
    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            console.error(`Index build failed for ${models[i].modelName}:`, result.reason?.message || result.reason);
        }
    });
};

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose;

    const uri = getMongoUri();
    if (!uri) {
        const error = new Error('MONGODB_URI is not set in the environment.');
        error.code = 'NO_DB_URI';
        throw error;
    }

    // A resolved promise with a disconnected socket is stale: drop it and reconnect.
    if (cache.promise && mongoose.connection.readyState === 0) cache.promise = null;

    if (!cache.promise) {
        attachListeners();
        cache.promise = mongoose.connect(uri, CONNECT_OPTIONS)
            .then(async (m) => {
                await ensureIndexes();
                return m;
            })
            .catch((error) => {
                cache.promise = null; // allow the next request to retry
                throw error;
            });
    }

    await cache.promise;
    return mongoose;
};

// Safe to expose: never includes credentials.
const getDbStatus = () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return {
        state: states[mongoose.connection.readyState] || 'unknown',
        database: mongoose.connection.name || null,
        configured: Boolean(getMongoUri())
    };
};

module.exports = { connectDB, getDbStatus };
