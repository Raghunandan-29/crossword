import axios from 'axios';

// Change this to your server IP when testing on a physical device
const API_BASE = 'https://crossword-backend-aqfx.onrender.com/api';
// const WS_URL = 'ws://localhost:3001/ws';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds for Render cold start
});

// Puzzles
export const getPublishedPuzzles = (params = {}) =>
  api.get('/puzzles/published', { params });

export const getPuzzleForPlay = (id) =>
  api.get(`/puzzles/play/${id}`);

export const checkWord = (word_id, answer) =>
  api.post('/puzzles/check-word', { word_id, answer });

export const checkPuzzle = (puzzleId, answers) =>
  api.post(`/puzzles/check-puzzle/${puzzleId}`, { answers });

// Players
export const registerPlayer = (device_id, display_name) =>
  api.post('/players/register', { device_id, display_name });

export const getPlayer = (id) =>
  api.get(`/players/${id}`);

export const saveProgress = (playerId, puzzle_id, cell_data, time_spent_seconds) =>
  api.post(`/players/${playerId}/progress`, { puzzle_id, cell_data, time_spent_seconds });

export const completePuzzle = (playerId, puzzle_id, time_spent_seconds) =>
  api.post(`/players/${playerId}/complete`, { puzzle_id, time_spent_seconds });

export const getPlayerProgress = (playerId) =>
  api.get(`/players/${playerId}/progress`);

export const getLeaderboard = () =>
  api.get('/players/leaderboard/top');

// WebSocket - disabled for now (Render doesn't support WebSocket easily)
export function connectWebSocket(onMessage) {
  // Return a no-op disconnect function
  console.log('WebSocket disabled - using polling instead');
  return () => {};
}

export default api;
