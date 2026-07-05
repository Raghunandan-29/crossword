const WebSocket = require('ws');

let wss = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('WS message received:', data.type);
      } catch (e) {
        console.error('Invalid WS message:', e.message);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Crossword server' }));
  });

  console.log('WebSocket server initialized');
}

function broadcast(type, data) {
  if (!wss) return;

  const message = JSON.stringify({ type, data, timestamp: Date.now() });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastPuzzleUpdate(puzzle) {
  broadcast('puzzle_update', puzzle);
}

function broadcastPuzzlePublished(puzzle) {
  broadcast('puzzle_published', puzzle);
}

function broadcastPuzzleUnpublished(puzzleId) {
  broadcast('puzzle_unpublished', { id: puzzleId });
}

function broadcastPuzzleDeleted(puzzleId) {
  broadcast('puzzle_deleted', { id: puzzleId });
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastPuzzleUpdate,
  broadcastPuzzlePublished,
  broadcastPuzzleUnpublished,
  broadcastPuzzleDeleted
};
