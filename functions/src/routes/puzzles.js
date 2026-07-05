const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateAdmin } = require('../middleware');
const CrosswordEngine = require('../crosswordEngine');
const { broadcastPuzzlePublished, broadcastPuzzleUnpublished, broadcastPuzzleDeleted } = require('../wsServer');

const router = express.Router();

// ============ PUBLIC ROUTES (for player app) ============

// Get all published puzzles
router.get('/published', (req, res) => {
  try {
    const { difficulty, timer_mode } = req.query;
    let query = 'SELECT id, title, difficulty, timer_mode, time_limit_seconds, grid_size, word_count, points, published_at FROM puzzles WHERE status = ?';
    const params = ['published'];

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    if (timer_mode !== undefined) {
      query += ' AND timer_mode = ?';
      params.push(timer_mode === 'true' ? 1 : 0);
    }

    query += ' ORDER BY published_at DESC';

    const db = getDb();
    const puzzles = db.prepare(query).all(...params);
    res.json(puzzles);
  } catch (error) {
    console.error('Error fetching published puzzles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific published puzzle with full data for gameplay
router.get('/play/:id', (req, res) => {
  try {
    const db = getDb();
    const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ? AND status = ?').get(req.params.id, 'published');
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    const words = db.prepare('SELECT id, puzzle_id, hint, direction, row, col, number, LENGTH(word) as length FROM words WHERE puzzle_id = ? ORDER BY number').all(puzzle.id);


    res.json({
      ...puzzle,
      grid_data: JSON.parse(puzzle.grid_data),
      words: words
    });
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check answer for a word
router.post('/check-word', (req, res) => {
  try {
    const { word_id, answer } = req.body;
    const db = getDb();
    const word = db.prepare('SELECT word FROM words WHERE id = ?').get(word_id);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const correct = word.word.toUpperCase() === answer.toUpperCase();
    res.json({ correct });
  } catch (error) {
    console.error('Error checking word:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check entire puzzle solution
router.post('/check-puzzle/:id', (req, res) => {
  try {
    const { answers } = req.body; // { word_id: answer_string }
    const db = getDb();
    const words = db.prepare('SELECT id, word FROM words WHERE puzzle_id = ?').all(req.params.id);

    let correctCount = 0;
    const results = {};

    words.forEach(w => {
      const answer = answers[w.id];
      const correct = answer && answer.toUpperCase() === w.word.toUpperCase();
      if (correct) correctCount++;
      results[w.id] = correct;
    });

    const allCorrect = correctCount === words.length;

    res.json({
      allCorrect,
      correctCount,
      totalWords: words.length,
      results
    });
  } catch (error) {
    console.error('Error checking puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ADMIN ROUTES ============

// Get all puzzles (admin)
router.get('/admin/all', authenticateAdmin, (req, res) => {
  try {
    const db = getDb();
    const puzzles = db.prepare('SELECT * FROM puzzles ORDER BY updated_at DESC').all();
    const result = puzzles.map(p => ({
      ...p,
      grid_data: JSON.parse(p.grid_data)
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching all puzzles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single puzzle (admin)
router.get('/admin/:id', authenticateAdmin, (req, res) => {
  try {
    const db = getDb();
    const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    const words = db.prepare('SELECT * FROM words WHERE puzzle_id = ? ORDER BY number').all(puzzle.id);

    res.json({
      ...puzzle,
      grid_data: JSON.parse(puzzle.grid_data),
      words
    });
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate/preview crossword
router.post('/admin/generate', authenticateAdmin, (req, res) => {
  try {
    const { words, gridSize = 15 } = req.body;
    const engine = new CrosswordEngine(gridSize);

    // Validate first
    const validation = engine.validate(words);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    const result = engine.generate(words);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('Error generating crossword:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new puzzle
router.post('/admin/create', authenticateAdmin, (req, res) => {
  try {
    const { title, difficulty, timer_mode, time_limit_seconds, words, gridSize = 15 } = req.body;

    if (!title || !difficulty || !words || words.length === 0) {
      return res.status(400).json({ error: 'Title, difficulty, and words are required' });
    }

    const engine = new CrosswordEngine(gridSize);

    // Validate
    const validation = engine.validate(words);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    // Generate crossword
    const result = engine.generate(words);
    if (!result.success) {
      return res.status(400).json({ error: 'Failed to generate crossword layout' });
    }

    const puzzleId = uuidv4();
    const points = calculatePoints(difficulty, words.length, timer_mode);

    // Create grid data (replace letters with empty cells for the player grid)
    const playerGrid = result.grid.map(row =>
      row.map(cell => (cell === '#' ? '#' : ''))
    );

    const gridData = JSON.stringify({
      size: result.gridSize,
      solution: result.grid,
      playerGrid: playerGrid
    });

    const db = getDb();

    // Insert puzzle
    db.prepare(`
      INSERT INTO puzzles (id, title, difficulty, timer_mode, time_limit_seconds, grid_size, grid_data, status, word_count, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).run(puzzleId, title, difficulty, timer_mode ? 1 : 0, time_limit_seconds || 0, result.gridSize, gridData, words.length, points);

    // Insert words
    const insertWord = db.prepare(`
      INSERT INTO words (id, puzzle_id, word, hint, direction, row, col, number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((placedWords) => {
      for (const w of placedWords) {
        insertWord.run(uuidv4(), puzzleId, w.word, w.hint, w.direction, w.row, w.col, w.number);
      }
    });

    insertMany(result.words);

    const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(puzzleId);
    const savedWords = db.prepare('SELECT * FROM words WHERE puzzle_id = ? ORDER BY number').all(puzzleId);

    res.status(201).json({
      ...puzzle,
      grid_data: JSON.parse(puzzle.grid_data),
      words: savedWords
    });
  } catch (error) {
    console.error('Error creating puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update puzzle
router.put('/admin/:id', authenticateAdmin, (req, res) => {
  try {
    const { title, difficulty, timer_mode, time_limit_seconds, words, gridSize } = req.body;
    const db = getDb();
    const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);

    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    if (words && words.length > 0) {
      const engine = new CrosswordEngine(gridSize || puzzle.grid_size);
      const validation = engine.validate(words);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
      }

      const result = engine.generate(words);
      if (!result.success) {
        return res.status(400).json({ error: 'Failed to generate crossword layout' });
      }

      const playerGrid = result.grid.map(row =>
        row.map(cell => (cell === '#' ? '#' : ''))
      );

      const gridData = JSON.stringify({
        size: result.gridSize,
        solution: result.grid,
        playerGrid: playerGrid
      });

      const points = calculatePoints(difficulty || puzzle.difficulty, words.length, timer_mode !== undefined ? timer_mode : puzzle.timer_mode);

      db.prepare(`
        UPDATE puzzles SET title = ?, difficulty = ?, timer_mode = ?, time_limit_seconds = ?,
        grid_size = ?, grid_data = ?, word_count = ?, points = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title || puzzle.title,
        difficulty || puzzle.difficulty,
        timer_mode !== undefined ? (timer_mode ? 1 : 0) : puzzle.timer_mode,
        time_limit_seconds || puzzle.time_limit_seconds,
        result.gridSize,
        gridData,
        words.length,
        points,
        req.params.id
      );

      // Replace words
      db.prepare('DELETE FROM words WHERE puzzle_id = ?').run(req.params.id);
      const insertWord = db.prepare('INSERT INTO words (id, puzzle_id, word, hint, direction, row, col, number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((placedWords) => {
        for (const w of placedWords) {
          insertWord.run(uuidv4(), req.params.id, w.word, w.hint, w.direction, w.row, w.col, w.number);
        }
      });
      insertMany(result.words);
    } else {
      // Update metadata only
      db.prepare(`
        UPDATE puzzles SET title = COALESCE(?, title), difficulty = COALESCE(?, difficulty),
        timer_mode = COALESCE(?, timer_mode), time_limit_seconds = COALESCE(?, time_limit_seconds),
        updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(title, difficulty, timer_mode !== undefined ? (timer_mode ? 1 : 0) : null, time_limit_seconds, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);
    const updatedWords = db.prepare('SELECT * FROM words WHERE puzzle_id = ? ORDER BY number').all(req.params.id);

    res.json({
      ...updated,
      grid_data: JSON.parse(updated.grid_data),
      words: updatedWords
    });
  } catch (error) {
    console.error('Error updating puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Publish puzzle
router.post('/admin/:id/publish', authenticateAdmin, (req, res) => {
  try {
    const db = getDb();
    const puzzle = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    db.prepare("UPDATE puzzles SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

    const updated = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);
    broadcastPuzzlePublished({
      id: updated.id,
      title: updated.title,
      difficulty: updated.difficulty,
      timer_mode: updated.timer_mode,
      time_limit_seconds: updated.time_limit_seconds,
      grid_size: updated.grid_size,
      word_count: updated.word_count,
      points: updated.points,
      published_at: updated.published_at
    });

    res.json({ message: 'Puzzle published', puzzle: { ...updated, grid_data: JSON.parse(updated.grid_data) } });
  } catch (error) {
    console.error('Error publishing puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unpublish puzzle
router.post('/admin/:id/unpublish', authenticateAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE puzzles SET status = 'unpublished', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    broadcastPuzzleUnpublished(req.params.id);
    const updated = db.prepare('SELECT * FROM puzzles WHERE id = ?').get(req.params.id);
    res.json({ message: 'Puzzle unpublished', puzzle: { ...updated, grid_data: JSON.parse(updated.grid_data) } });
  } catch (error) {
    console.error('Error unpublishing puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete puzzle
router.delete('/admin/:id', authenticateAdmin, (req, res) => {
  try {
    const db = getDb();
    const puzzle = db.prepare('SELECT id FROM puzzles WHERE id = ?').get(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    db.prepare('DELETE FROM words WHERE puzzle_id = ?').run(req.params.id);
    db.prepare('DELETE FROM player_progress WHERE puzzle_id = ?').run(req.params.id);
    db.prepare('DELETE FROM puzzles WHERE id = ?').run(req.params.id);
    broadcastPuzzleDeleted(req.params.id);

    res.json({ message: 'Puzzle deleted' });
  } catch (error) {
    console.error('Error deleting puzzle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function calculatePoints(difficulty, wordCount, timerMode) {
  let base = 100;
  if (difficulty === 'medium') base = 200;
  if (difficulty === 'high') base = 350;
  base += wordCount * 10;
  if (timerMode) base = Math.floor(base * 1.5);
  return base;
}

module.exports = router;
