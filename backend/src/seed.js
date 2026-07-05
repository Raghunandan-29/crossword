const { getDb, initializeDatabase } = require('./database');
const { v4: uuidv4 } = require('uuid');
const CrosswordEngine = require('./crosswordEngine');

async function seed() {
await initializeDatabase();
const db = getDb();

console.log('Seeding database...');

// Create sample puzzles
const samplePuzzles = [
  {
    title: 'Tech Basics',
    difficulty: 'low',
    timer_mode: false,
    time_limit_seconds: 0,
    words: [
      { word: 'CODE', hint: 'Instructions written for a computer' },
      { word: 'DATA', hint: 'Information processed by a computer' },
      { word: 'WEB', hint: 'The World Wide ___' },
      { word: 'APP', hint: 'Short for application' },
      { word: 'BUG', hint: 'An error in a program' }
    ]
  },
  {
    title: 'Animal Kingdom',
    difficulty: 'medium',
    timer_mode: false,
    time_limit_seconds: 0,
    words: [
      { word: 'ELEPHANT', hint: 'Largest land animal' },
      { word: 'TIGER', hint: 'Striped big cat' },
      { word: 'EAGLE', hint: 'Bird of prey, symbol of freedom' },
      { word: 'WHALE', hint: 'Largest marine mammal' },
      { word: 'PYTHON', hint: 'Large snake or programming language' },
      { word: 'LION', hint: 'King of the jungle' },
      { word: 'BEAR', hint: 'Grizzly or polar animal' }
    ]
  },
  {
    title: 'Speed Round: Colors',
    difficulty: 'low',
    timer_mode: true,
    time_limit_seconds: 120,
    words: [
      { word: 'RED', hint: 'Color of roses' },
      { word: 'BLUE', hint: 'Color of the sky' },
      { word: 'GREEN', hint: 'Color of grass' },
      { word: 'YELLOW', hint: 'Color of the sun' },
      { word: 'PURPLE', hint: 'Mix of red and blue' }
    ]
  },
  {
    title: 'World Capitals',
    difficulty: 'high',
    timer_mode: false,
    time_limit_seconds: 0,
    words: [
      { word: 'PARIS', hint: 'Capital of France' },
      { word: 'TOKYO', hint: 'Capital of Japan' },
      { word: 'LONDON', hint: 'Capital of the United Kingdom' },
      { word: 'ROME', hint: 'Capital of Italy' },
      { word: 'BERLIN', hint: 'Capital of Germany' },
      { word: 'MADRID', hint: 'Capital of Spain' },
      { word: 'CAIRO', hint: 'Capital of Egypt' },
      { word: 'DELHI', hint: 'Capital of India' },
      { word: 'LIMA', hint: 'Capital of Peru' },
      { word: 'OSLO', hint: 'Capital of Norway' }
    ]
  }
];

for (const puzzleData of samplePuzzles) {
  const engine = new CrosswordEngine(15);
  const result = engine.generate(puzzleData.words);

  if (!result.success) {
    console.log(`Failed to generate: ${puzzleData.title}`);
    continue;
  }

  const puzzleId = uuidv4();
  const playerGrid = result.grid.map(row =>
    row.map(cell => (cell === '#' ? '#' : ''))
  );

  const gridData = JSON.stringify({
    size: result.gridSize,
    solution: result.grid,
    playerGrid: playerGrid
  });

  let base = 100;
  if (puzzleData.difficulty === 'medium') base = 200;
  if (puzzleData.difficulty === 'high') base = 350;
  base += puzzleData.words.length * 10;
  if (puzzleData.timer_mode) base = Math.floor(base * 1.5);
  const points = base;

  db.prepare(`
    INSERT INTO puzzles (id, title, difficulty, timer_mode, time_limit_seconds, grid_size, grid_data, status, word_count, points, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, CURRENT_TIMESTAMP)
  `).run(
    puzzleId, puzzleData.title, puzzleData.difficulty,
    puzzleData.timer_mode ? 1 : 0, puzzleData.time_limit_seconds,
    result.gridSize, gridData, puzzleData.words.length, points
  );

  const insertWord = db.prepare(`
    INSERT INTO words (id, puzzle_id, word, hint, direction, row, col, number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const w of result.words) {
    insertWord.run(uuidv4(), puzzleId, w.word, w.hint, w.direction, w.row, w.col, w.number);
  }

  console.log(`✅ Created puzzle: ${puzzleData.title} (${result.words.length}/${puzzleData.words.length} words placed)`);
}

db.save();
console.log('\nSeeding complete!');
process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
