const express = require('express');
const cors = require('cors');
const http = require('http');
const { initializeDatabase } = require('./database');
const { initWebSocket } = require('./wsServer');
const authRoutes = require('./routes/auth');
const puzzleRoutes = require('./routes/puzzles');
const playerRoutes = require('./routes/players');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/puzzles', puzzleRoutes);
app.use('/api/players', playerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
initWebSocket(server);

// Initialize database (async) then start server
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`🧩 Crossword API server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server running on ws://localhost:${PORT}/ws`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
