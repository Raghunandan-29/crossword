/**
 * Crossword Generation Engine
 * Takes a list of words and arranges them into a valid crossword grid.
 */

const EMPTY = '.';
const BLOCK = '#';

class CrosswordEngine {
  constructor(gridSize = 15) {
    this.gridSize = gridSize;
    this.grid = [];
    this.placedWords = [];
    this.numberMap = {};
    this.currentNumber = 1;
    this.initGrid();
  }

  initGrid() {
    this.grid = Array.from({ length: this.gridSize }, () =>
      Array.from({ length: this.gridSize }, () => EMPTY)
    );
  }

  canPlace(word, row, col, direction) {
    const len = word.length;

    if (direction === 'across') {
      if (col + len > this.gridSize) return false;
      // Check cell before word
      if (col > 0 && this.grid[row][col - 1] !== EMPTY && this.grid[row][col - 1] !== BLOCK) return false;
      // Check cell after word
      if (col + len < this.gridSize && this.grid[row][col + len] !== EMPTY && this.grid[row][col + len] !== BLOCK) return false;

      let hasIntersection = false;
      for (let i = 0; i < len; i++) {
        const cell = this.grid[row][col + i];
        if (cell !== EMPTY) {
          if (cell !== word[i]) return false;
          hasIntersection = true;
        } else {
          // Check cells above and below for non-intersection
          if (row > 0 && this.grid[row - 1][col + i] !== EMPTY && this.grid[row - 1][col + i] !== BLOCK) return false;
          if (row < this.gridSize - 1 && this.grid[row + 1][col + i] !== EMPTY && this.grid[row + 1][col + i] !== BLOCK) return false;
        }
      }

      return this.placedWords.length === 0 || hasIntersection;
    } else {
      if (row + len > this.gridSize) return false;
      // Check cell before word
      if (row > 0 && this.grid[row - 1][col] !== EMPTY && this.grid[row - 1][col] !== BLOCK) return false;
      // Check cell after word
      if (row + len < this.gridSize && this.grid[row + len][col] !== EMPTY && this.grid[row + len][col] !== BLOCK) return false;

      let hasIntersection = false;
      for (let i = 0; i < len; i++) {
        const cell = this.grid[row + i][col];
        if (cell !== EMPTY) {
          if (cell !== word[i]) return false;
          hasIntersection = true;
        } else {
          // Check cells left and right for non-intersection
          if (col > 0 && this.grid[row + i][col - 1] !== EMPTY && this.grid[row + i][col - 1] !== BLOCK) return false;
          if (col < this.gridSize - 1 && this.grid[row + i][col + 1] !== EMPTY && this.grid[row + i][col + 1] !== BLOCK) return false;
        }
      }

      return this.placedWords.length === 0 || hasIntersection;
    }
  }

  placeWord(word, row, col, direction) {
    const len = word.length;
    for (let i = 0; i < len; i++) {
      if (direction === 'across') {
        this.grid[row][col + i] = word[i];
      } else {
        this.grid[row + i][col] = word[i];
      }
    }
  }

  removeWord(word, row, col, direction, originalCells) {
    const len = word.length;
    for (let i = 0; i < len; i++) {
      if (direction === 'across') {
        this.grid[row][col + i] = originalCells[i];
      } else {
        this.grid[row + i][col] = originalCells[i];
      }
    }
  }

  getOriginalCells(word, row, col, direction) {
    const cells = [];
    const len = word.length;
    for (let i = 0; i < len; i++) {
      if (direction === 'across') {
        cells.push(this.grid[row][col + i]);
      } else {
        cells.push(this.grid[row + i][col]);
      }
    }
    return cells;
  }

  generate(wordsWithHints) {
    if (!wordsWithHints || wordsWithHints.length === 0) {
      return { success: false, error: 'No words provided' };
    }

    // Sort words by length (longest first for better placement)
    const sorted = [...wordsWithHints].sort((a, b) => b.word.length - a.word.length);
    const words = sorted.map(w => w.word.toUpperCase());

    this.initGrid();
    this.placedWords = [];
    this.currentNumber = 1;

    // Place first word in the center horizontally
    const firstWord = words[0];
    const startRow = Math.floor(this.gridSize / 2);
    const startCol = Math.floor((this.gridSize - firstWord.length) / 2);
    this.placeWord(firstWord, startRow, startCol, 'across');
    this.placedWords.push({
      word: firstWord,
      hint: sorted[0].hint,
      direction: 'across',
      row: startRow,
      col: startCol,
      number: this.currentNumber++
    });

    // Try to place remaining words
    for (let wi = 1; wi < words.length; wi++) {
      const word = words[wi];
      let placed = false;

      // Try both directions
      for (const direction of ['down', 'across']) {
        if (placed) break;

        // Find best placement by scanning all positions
        let bestScore = -1;
        let bestPos = null;

        for (let r = 0; r < this.gridSize; r++) {
          for (let c = 0; c < this.gridSize; c++) {
            if (this.canPlace(word, r, c, direction)) {
              // Score based on intersection count and centrality
              let score = 0;
              const len = word.length;
              for (let i = 0; i < len; i++) {
                const cr = direction === 'across' ? r : r + i;
                const cc = direction === 'across' ? c + i : c;
                if (this.grid[cr][cc] !== EMPTY) score += 10;
              }
              // Prefer positions closer to center
              const centerR = this.gridSize / 2;
              const centerC = this.gridSize / 2;
              const midR = direction === 'across' ? r : r + len / 2;
              const midC = direction === 'across' ? c + len / 2 : c;
              score -= Math.abs(midR - centerR) + Math.abs(midC - centerC);

              if (score > bestScore) {
                bestScore = score;
                bestPos = { row: r, col: c };
              }
            }
          }
        }

        if (bestPos) {
          this.placeWord(word, bestPos.row, bestPos.col, direction);
          this.placedWords.push({
            word,
            hint: sorted[wi].hint,
            direction,
            row: bestPos.row,
            col: bestPos.col,
            number: this.currentNumber++
          });
          placed = true;
        }
      }

      if (!placed) {
        // Try harder: attempt with smaller consideration
        for (let r = 0; r < this.gridSize; r++) {
          for (let c = 0; c < this.gridSize; c++) {
            for (const dir of ['across', 'down']) {
              if (this.canPlace(word, r, c, dir)) {
                this.placeWord(word, r, c, dir);
                this.placedWords.push({
                  word,
                  hint: sorted[wi].hint,
                  direction: dir,
                  row: r,
                  col: c,
                  number: this.currentNumber++
                });
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
          if (placed) break;
        }
      }
    }

    // Renumber words in reading order (top-to-bottom, left-to-right)
    this.placedWords.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return a.direction === 'across' ? -1 : 1;
    });

    // Assign numbers based on unique positions
    const numberMap = new Map();
    let num = 1;
    this.placedWords.forEach(w => {
      const key = `${w.row},${w.col}`;
      if (!numberMap.has(key)) {
        numberMap.set(key, num++);
      }
      w.number = numberMap.get(key);
    });

    // Trim grid to minimal bounding box with 1-cell padding
    const bounds = this.getBounds();
    const trimmedGrid = this.trimGrid(bounds);

    // Adjust word positions relative to trimmed grid
    const adjustedWords = this.placedWords.map(w => ({
      ...w,
      row: w.row - bounds.minRow + 1,
      col: w.col - bounds.minCol + 1
    }));

    return {
      success: true,
      gridSize: trimmedGrid.length,
      grid: trimmedGrid,
      words: adjustedWords,
      placedCount: this.placedWords.length,
      totalWords: wordsWithHints.length
    };
  }

  getBounds() {
    let minRow = this.gridSize, maxRow = 0, minCol = this.gridSize, maxCol = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== EMPTY) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
        }
      }
    }
    return {
      minRow: Math.max(0, minRow - 1),
      maxRow: Math.min(this.gridSize - 1, maxRow + 1),
      minCol: Math.max(0, minCol - 1),
      maxCol: Math.min(this.gridSize - 1, maxCol + 1)
    };
  }

  trimGrid(bounds) {
    const rows = bounds.maxRow - bounds.minRow + 1;
    const cols = bounds.maxCol - bounds.minCol + 1;
    const size = Math.max(rows, cols);
    const trimmed = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => BLOCK)
    );

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const tr = r - bounds.minRow;
        const tc = c - bounds.minCol;
        if (tr < size && tc < size) {
          trimmed[tr][tc] = this.grid[r][c] === EMPTY ? BLOCK : this.grid[r][c];
        }
      }
    }

    return trimmed;
  }

  validate(wordsWithHints) {
    const errors = [];

    if (!wordsWithHints || wordsWithHints.length === 0) {
      errors.push('At least one word is required');
      return { valid: false, errors };
    }

    const wordSet = new Set();
    wordsWithHints.forEach((item, index) => {
      if (!item.word || item.word.trim().length === 0) {
        errors.push(`Word #${index + 1} is empty`);
      } else {
        const upper = item.word.toUpperCase().trim();
        if (upper.length > this.gridSize) {
          errors.push(`"${item.word}" is too long for the grid (max ${this.gridSize} characters)`);
        }
        if (!/^[A-Z]+$/.test(upper)) {
          errors.push(`"${item.word}" contains invalid characters (only letters allowed)`);
        }
        if (wordSet.has(upper)) {
          errors.push(`Duplicate word: "${item.word}"`);
        }
        wordSet.add(upper);
      }

      if (!item.hint || item.hint.trim().length === 0) {
        errors.push(`Hint for word #${index + 1} is missing`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}

module.exports = CrosswordEngine;
