const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');

const router = express.Router();

// Register or get player by device ID
router.post('/register', (req, res) => {
  try {
    const { device_id, display_name } = req.body;
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    let player = db.prepare('SELECT * FROM players WHERE device_id = ?').get(device_id);

    if (!player) {
      const id = uuidv4();
      db.prepare('INSERT INTO players (id, device_id, display_name) VALUES (?, ?, ?)').run(
        id, device_id, display_name || 'Player'
      );
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    }

    res.json(player);
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player profile with stats
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_attempts,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(points_earned) as total_points,
        SUM(time_spent_seconds) as total_time
      FROM player_progress WHERE player_id = ?
    `).get(req.params.id);

    res.json({ ...player, stats });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save progress
router.post('/:id/progress', (req, res) => {
  try {
    const { puzzle_id, cell_data, time_spent_seconds } = req.body;
    const db = getDb();

    let progress = db.prepare('SELECT * FROM player_progress WHERE player_id = ? AND puzzle_id = ?').get(req.params.id, puzzle_id);

    if (progress) {
      db.prepare(`
        UPDATE player_progress SET cell_data = ?, time_spent_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(JSON.stringify(cell_data), time_spent_seconds || 0, progress.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO player_progress (id, player_id, puzzle_id, cell_data, time_spent_seconds)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, req.params.id, puzzle_id, JSON.stringify(cell_data), time_spent_seconds || 0);
    }

    res.json({ message: 'Progress saved' });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete puzzle
router.post('/:id/complete', (req, res) => {
  try {
    const { puzzle_id, time_spent_seconds } = req.body;
    const db = getDb();

    const puzzle = db.prepare('SELECT points FROM puzzles WHERE id = ?').get(puzzle_id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    let progress = db.prepare('SELECT * FROM player_progress WHERE player_id = ? AND puzzle_id = ?').get(req.params.id, puzzle_id);

    if (progress && progress.status === 'completed') {
      return res.json({ message: 'Already completed', points_earned: progress.points_earned });
    }

    const points = puzzle.points;

    if (progress) {
      db.prepare(`
        UPDATE player_progress SET status = 'completed', points_earned = ?, time_spent_seconds = ?,
        completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(points, time_spent_seconds || 0, progress.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO player_progress (id, player_id, puzzle_id, status, points_earned, time_spent_seconds, completed_at)
        VALUES (?, ?, ?, 'completed', ?, ?, CURRENT_TIMESTAMP)
      `).run(id, req.params.id, puzzle_id, points, time_spent_seconds || 0);
    }

    // Update player totals
    db.prepare(`
      UPDATE players SET total_points = total_points + ?, puzzles_completed = puzzles_completed + 1 WHERE id = ?
    `).run(points, req.params.id);

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);

    res.json({ message: 'Puzzle completed!', points_earned: points, player });
  } catch (error) {
    console.error('Error completing puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player progress for all puzzles
router.get('/:id/progress', (req, res) => {
  try {
    const db = getDb();
    const progress = db.prepare(`
      SELECT pp.*, p.title, p.difficulty, p.timer_mode, p.points as max_points
      FROM player_progress pp
      JOIN puzzles p ON pp.puzzle_id = p.id
      WHERE pp.player_id = ?
      ORDER BY pp.updated_at DESC
    `).all(req.params.id);

    res.json(progress.map(p => ({
      ...p,
      cell_data: p.cell_data ? JSON.parse(p.cell_data) : null
    })));
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leaderboard
router.get('/leaderboard/top', (req, res) => {
  try {
    const db = getDb();
    const leaderboard = db.prepare(`
      SELECT id, display_name, total_points, puzzles_completed
      FROM players
      ORDER BY total_points DESC
      LIMIT 50
    `).all();

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
