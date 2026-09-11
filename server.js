// ...existing code...
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const adminRoutes = require('./Backend/routes/adminRoutes');
const residentRoutes = require('./Backend/routes/residentRoutes');

const app = express();
const isVercelRuntime = Boolean(process.env.VERCEL);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'production' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation'), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Determine public directory with priority for Vercel environment
const resolvePublicRoot = () => {
  // In Vercel: process.cwd() = /var/task, __dirname = /var/task
  // Files are in /var/task/public due to includeFiles config
  const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  
  const candidatePaths = [
    // Try direct public folder first
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'public'),
    // Fallback to current directory
    path.join(__dirname),
    process.cwd()
  ];

  for (const dir of candidatePaths) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        // Check if this directory or its public subdirectory has HTML files
        const checkDir = fs.existsSync(path.join(dir, 'public')) && 
                         fs.existsSync(path.join(dir, 'public', 'index.html')) 
                         ? path.join(dir, 'public') 
                         : dir;
        
        if (fs.existsSync(path.join(checkDir, 'index.html'))) {
          return checkDir;
        }
      }
    } catch (e) {
      // Continue to next candidate if there's an error
      continue;
    }
  }

  // Final fallback
  return path.join(process.cwd(), 'public');
};

const resolveExistingHtml = (names) => {
  const publicPath = resolvePublicRoot();
  
  for (const name of names) {
    try {
      const filePath = path.join(publicPath, name);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return filePath;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
};

const publicPath = resolvePublicRoot();
app.use(express.static(publicPath));

const sendHtmlFile = (res, fileNames, fallbackMessage) => {
  const foundFile = resolveExistingHtml(fileNames);

  if (foundFile) {
    try {
      return res.sendFile(foundFile);
    } catch (error) {
      console.error(`Error sending file ${foundFile}:`, error.message);
    }
  }

  // Fallback: Try sending from public directory directly
  const publicPath = resolvePublicRoot();
  for (const fileName of fileNames) {
    const fallbackPath = path.join(publicPath, fileName);
    try {
      if (fs.existsSync(fallbackPath)) {
        console.log(`Serving fallback: ${fallbackPath}`);
        return res.sendFile(fallbackPath);
      }
    } catch (error) {
      continue;
    }
  }

  // Last resort: return error
  console.error(`Could not find HTML file: ${fileNames.join(', ')}`);
  console.error(`Searched in: ${publicPath}`);
  
  return res.status(404).json({
    success: false,
    message: fallbackMessage,
    resolvedPath: publicPath,
    cwd: process.cwd(),
    dirname: __dirname,
    searchedFiles: fileNames
  });
};

// MongoDB
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

const connectMongo = async () => {
  if (!mongoURI) {
    console.warn('⚠️ MONGO_URI is not defined in environment variables.');
    return;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message || error);
  }
};

connectMongo();

// Page routes
app.get('/index.html', (req, res) => {
  sendHtmlFile(res, ['index.html'], 'index.html not found in runtime directory');
});

app.get('/resident-login.html', (req, res) => {
  sendHtmlFile(res, ['resident-login.html'], 'resident-login.html not found in runtime directory');
});

app.get('/resident-portal.html', (req, res) => {
  sendHtmlFile(res, ['resident-portal.html'], 'resident-portal.html not found in runtime directory');
});

app.get('/admin-portal.html', (req, res) => {
  sendHtmlFile(res, ['admin-portal.html'], 'admin-portal.html not found in runtime directory');
});

app.get('/', (req, res) => {
  const indexHtml = resolveExistingHtml(['index.html']);

  if (indexHtml) {
    return res.sendFile(indexHtml);
  }

  return res.redirect('/index.html');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
const shouldStartLocalServer = !isVercelRuntime && process.env.NODE_ENV !== 'production';

if (shouldStartLocalServer) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Hallows Estate Server running on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}

module.exports = app;