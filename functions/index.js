const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./src/database');
const authRoutes = require('./src/routes/auth');
const puzzleRoutes = require('./src/routes/puzzles');
const playerRoutes = require('./src/routes/players');

const app = express();

// Enable CORS for all origins
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize database once
let dbInitialized = false;

app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('Database initialized');
    } catch (error) {
      console.error('Database init error:', error);
    }
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/puzzles', puzzleRoutes);
app.use('/players', playerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);