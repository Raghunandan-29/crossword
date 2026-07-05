import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Alert, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { getPuzzleForPlay, checkPuzzle, completePuzzle } from '../api';
import { getOrCreatePlayer, updateStoredPlayer } from '../store';

const SCREEN_WIDTH = Dimensions.get('window').width;

function parseGridData(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function buildGridFromWords(words, gridSize) {
  const size = gridSize || 15;
  const grid = Array.from({ length: size }, () => Array(size).fill('#'));
  words.forEach(w => {
    for (let i = 0; i < (w.length || 0); i++) {
      const r = w.direction === 'across' ? w.row : w.row + i;
      const c = w.direction === 'across' ? w.col + i : w.col;
      if (r < size && c < size) grid[r][c] = '.';
    }
  });
  return grid;
}

export default function GameScreen({ route, navigation }) {
  const { puzzleId, title } = route.params;
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cellValues, setCellValues] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [direction, setDirection] = useState('across');
  const [completed, setCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showClues, setShowClues] = useState(false);
  const [correctCells, setCorrectCells] = useState({});
  const [score, setScore] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const timeSpentRef = useRef(null);

  useEffect(() => {
    loadPuzzle();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeSpentRef.current) clearInterval(timeSpentRef.current);
    };
  }, []);

  const loadPuzzle = async () => {
    try {
      const res = await getPuzzleForPlay(puzzleId);
      setPuzzle(res.data);

      if (res.data.timer_mode === 1) {
        setTimeRemaining(res.data.time_limit_seconds);
        setTimerActive(true);
      }

      timeSpentRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to load puzzle. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timerActive && !completed) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timerActive, completed]);

  const handleTimeUp = () => {
    Alert.alert('Time\'s Up!', 'You ran out of time. Better luck next time!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  // --- Derive grid & words from puzzle ---
  const words = puzzle?.words || [];
  const parsedGridData = parseGridData(puzzle?.grid_data);
  const solutionGrid = parsedGridData?.solution || [];
  const grid = solutionGrid.length > 0
    ? solutionGrid
    : (words.length > 0 ? buildGridFromWords(words, puzzle?.grid_size) : []);
  const gridSize = grid.length;

  // A cell is a block if it's '#'
  const isBlockCell = useCallback((r, c) => {
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return true;
    return grid[r]?.[c] === '#';
  }, [grid, gridSize]);

  // Responsive cell sizing
  const cellSize = useMemo(() => {
    if (gridSize <= 0) return 35;
    const maxGridWidth = SCREEN_WIDTH - 24;
    return Math.floor(maxGridWidth / gridSize);
  }, [gridSize]);

  // Build number map
  const numberMap = useMemo(() => {
    const map = {};
    words.forEach(w => {
      const key = `${w.row},${w.col}`;
      if (!map[key]) map[key] = w.number;
    });
    return map;
  }, [words]);

  // Get cells for a word
  const getWordCells = useCallback((word) => {
    if (!word) return [];
    const cells = [];
    const len = word.length || 0;
    for (let i = 0; i < len; i++) {
      if (word.direction === 'across') {
        cells.push({ row: word.row, col: word.col + i });
      } else {
        cells.push({ row: word.row + i, col: word.col });
      }
    }
    return cells;
  }, []);

  // Build a set of all playable cell keys and structural blocks
  const { playableCells, structuralBlocks } = useMemo(() => {
    const playable = new Set();
    const blocks = new Set();
    
    // Add all word cells to playable
    words.forEach(w => {
      const cells = getWordCells(w);
      cells.forEach(c => playable.add(`${c.row},${c.col}`));
    });
    
    // Identify structural blocks: # cells that are adjacent to playable cells
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r]?.[c] === '#' && !playable.has(`${r},${c}`)) {
          // Check if adjacent to any playable cell
          const adjacent = [
            [r-1, c], [r+1, c], [r, c-1], [r, c+1],
            [r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1]
          ];
          const hasPlayableNeighbor = adjacent.some(([nr, nc]) => playable.has(`${nr},${nc}`));
          if (hasPlayableNeighbor) {
            blocks.add(`${r},${c}`);
          }
        }
      }
    }
    
    return { playableCells: playable, structuralBlocks: blocks };
  }, [words, getWordCells, grid, gridSize]);

  // Find a word at a given cell in a specific direction
  const findWordAtCell = useCallback((row, col, dir) => {
    return words.find(w => {
      if (w.direction !== dir) return false;
      const cells = getWordCells(w);
      return cells.some(c => c.row === row && c.col === col);
    });
  }, [words, getWordCells]);

  // Find ALL words at a cell (could be both across and down at an intersection)
  const findAllWordsAtCell = useCallback((row, col) => {
    return words.filter(w => {
      const cells = getWordCells(w);
      return cells.some(c => c.row === row && c.col === col);
    });
  }, [words, getWordCells]);

  const handleCellPress = (row, col) => {
    if (isBlockCell(row, col)) return;
    // Check if cell is part of any word
    if (!playableCells.has(`${row},${col}`)) return;

    const wordsAtCell = findAllWordsAtCell(row, col);
    if (wordsAtCell.length === 0) return;

    if (selectedCell?.row === row && selectedCell?.col === col) {
      // Same cell tapped again → toggle direction
      const otherDir = direction === 'across' ? 'down' : 'across';
      const otherWord = wordsAtCell.find(w => w.direction === otherDir);
      if (otherWord) {
        setDirection(otherDir);
        setSelectedWord(otherWord);
      }
    } else {
      // New cell tapped
      setSelectedCell({ row, col });

      // Prefer current direction, fallback to whatever word is there
      const sameDir = wordsAtCell.find(w => w.direction === direction);
      const word = sameDir || wordsAtCell[0];
      if (word) {
        setDirection(word.direction);
        setSelectedWord(word);
      }
    }

    // Open keyboard
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  // --- Typing ---
  const handleLetterInput = useCallback((char) => {
    if (!selectedCell || completed) return;
    const { row, col } = selectedCell;
    setCellValues(prev => ({ ...prev, [`${row},${col}`]: char.toUpperCase() }));

    // Auto-advance to next cell in the current word
    if (selectedWord) {
      const cells = getWordCells(selectedWord);
      const idx = cells.findIndex(c => c.row === row && c.col === col);
      if (idx >= 0 && idx < cells.length - 1) {
        setSelectedCell(cells[idx + 1]);
      }
    }
  }, [selectedCell, selectedWord, completed, getWordCells]);

  const handleBackspace = useCallback(() => {
    if (!selectedCell || completed) return;
    const { row, col } = selectedCell;
    const cellKey = `${row},${col}`;

    if (cellValues[cellKey]) {
      // Clear current cell
      setCellValues(prev => {
        const updated = { ...prev };
        delete updated[cellKey];
        return updated;
      });
    } else {
      // Move back and clear previous cell
      if (selectedWord) {
        const cells = getWordCells(selectedWord);
        const idx = cells.findIndex(c => c.row === row && c.col === col);
        if (idx > 0) {
          const prevCell = cells[idx - 1];
          setSelectedCell(prevCell);
          setCellValues(prev => {
            const updated = { ...prev };
            delete updated[`${prevCell.row},${prevCell.col}`];
            return updated;
          });
        }
      }
    }
  }, [selectedCell, selectedWord, completed, cellValues, getWordCells]);

  const handleCheckPuzzle = async () => {
    try {
      const answers = {};
      words.forEach(w => {
        const cells = getWordCells(w);
        let answer = '';
        cells.forEach(c => { answer += cellValues[`${c.row},${c.col}`] || ' '; });
        answers[w.id] = answer;
      });

      const res = await checkPuzzle(puzzleId, answers);

      const newCorrectCells = {};
      words.forEach(w => {
        const isCorrect = res.data.results[w.id];
        const cells = getWordCells(w);
        cells.forEach(c => {
          newCorrectCells[`${c.row},${c.col}`] = isCorrect ? 'correct' : 'incorrect';
        });
      });
      setCorrectCells(newCorrectCells);

      if (res.data.allCorrect) {
        handlePuzzleComplete();
      } else {
        Alert.alert('Keep Going!', `${res.data.correctCount}/${res.data.totalWords} words correct. Keep trying!`);
        setTimeout(() => setCorrectCells({}), 2000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check puzzle');
    }
  };

  const handlePuzzleComplete = async () => {
    setCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeSpentRef.current) clearInterval(timeSpentRef.current);

    try {
      const player = await getOrCreatePlayer();
      if (player.id !== 'offline') {
        const res = await completePuzzle(player.id, puzzleId, timeSpent);
        setScore(res.data.points_earned);
        await updateStoredPlayer(res.data.player);
      } else {
        setScore(puzzle.points);
      }
    } catch (e) {
      setScore(puzzle.points);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Check if cell is part of the currently selected word
  const highlightedCells = useMemo(() => {
    if (!selectedWord) return new Set();
    const set = new Set();
    getWordCells(selectedWord).forEach(c => set.add(`${c.row},${c.col}`));
    return set;
  }, [selectedWord, getWordCells]);

  // --- Render: Loading ---
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading puzzle...</Text>
      </View>
    );
  }

  // --- Render: Completed ---
  if (completed) {
    return (
      <View style={styles.completionContainer}>
        <View style={styles.completionCard}>
          <View style={styles.completionIcon}>
            <Ionicons name="trophy" size={48} color={colors.accent} />
          </View>
          <Text style={styles.completionTitle}>Congratulations!</Text>
          <Text style={styles.completionSubtitle}>You completed the puzzle!</Text>

          <View style={styles.completionStats}>
            <View style={styles.completionStat}>
              <Text style={styles.completionStatValue}>{score}</Text>
              <Text style={styles.completionStatLabel}>Points</Text>
            </View>
            <View style={[styles.completionStat, { borderLeftWidth: 1, borderLeftColor: colors.borderLight }]}>
              <Text style={styles.completionStatValue}>{formatTime(timeSpent)}</Text>
              <Text style={styles.completionStatLabel}>Time</Text>
            </View>
            <View style={[styles.completionStat, { borderLeftWidth: 1, borderLeftColor: colors.borderLight }]}>
              <Text style={styles.completionStatValue}>{words.length}</Text>
              <Text style={styles.completionStatLabel}>Words</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.completionButton} onPress={() => navigation.goBack()}>
            <Text style={styles.completionButtonText}>Back to Puzzles</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Render: Game ---
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        contextMenuHidden={true}
        selectTextOnFocus={false}
        onChangeText={(text) => {
          if (text.length > 0) {
            const char = text[text.length - 1];
            if (/^[A-Za-z]$/.test(char)) {
              handleLetterInput(char);
            }
          }
          // Clear input after processing
          requestAnimationFrame(() => {
            if (inputRef.current) inputRef.current.clear();
          });
        }}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace') handleBackspace();
        }}
        blurOnSubmit={false}
        caretHidden
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.puzzleTitle} numberOfLines={1}>{title}</Text>
          {puzzle?.timer_mode === 1 && (
            <View style={[styles.timerBadge, timeRemaining < 30 && { backgroundColor: colors.difficultyHighBg }]}>
              <Ionicons name="timer-outline" size={14} color={timeRemaining < 30 ? colors.error : colors.primary} />
              <Text style={[styles.timerText, timeRemaining < 30 && { color: colors.error }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleCheckPuzzle} style={styles.checkBtn}>
          <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ===== CROSSWORD GRID ===== */}
        <View style={styles.gridContainer}>
          {gridSize > 0 ? (
            <View style={styles.gridOuter}>
              {grid.map((row, ri) => (
                <View key={`r${ri}`} style={styles.gridRow}>
                  {row.map((cell, ci) => {
                    const cellKey = `${ri},${ci}`;
                    const isPlayable = playableCells.has(cellKey);
                    const isStructuralBlock = structuralBlocks.has(cellKey);
                    
                    // Render structural blocks (true crossword blocks)
                    if (isStructuralBlock) {
                      return (
                        <View
                          key={`c${ri}-${ci}`}
                          style={[styles.cell, { width: cellSize, height: cellSize }, styles.cellBlock]}
                        />
                      );
                    }
                    
                    // Render padding/empty cells as invisible
                    if (!isPlayable) {
                      return (
                        <View
                          key={`c${ri}-${ci}`}
                          style={[styles.cell, { width: cellSize, height: cellSize }, styles.cellInvisible]}
                        />
                      );
                    }

                    // Playable cell
                    const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                    const isHighlighted = highlightedCells.has(cellKey);
                    const num = numberMap[cellKey];
                    const value = cellValues[cellKey] || '';
                    const cellState = correctCells[cellKey];

                    // Determine cell background style
                    let cellBg = styles.cellEmpty;
                    if (isHighlighted) cellBg = styles.cellHighlighted;
                    if (isSelected) cellBg = styles.cellSelected;
                    if (cellState === 'correct') cellBg = styles.cellCorrect;
                    if (cellState === 'incorrect') cellBg = styles.cellIncorrect;

                    return (
                      <TouchableOpacity
                        key={`c${ri}-${ci}`}
                        onPress={() => handleCellPress(ri, ci)}
                        activeOpacity={0.7}
                        style={[styles.cell, { width: cellSize, height: cellSize }, cellBg]}
                      >
                        {num ? (
                          <Text style={[styles.cellNumber, { fontSize: Math.max(7, cellSize * 0.2) }]}>{num}</Text>
                        ) : null}
                        {value ? (
                          <Text style={[
                            styles.cellLetter,
                            { fontSize: Math.max(12, cellSize * 0.45) },
                            isSelected && styles.cellLetterSelected,
                          ]}>{value}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noGrid}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
              <Text style={styles.noGridText}>Could not load crossword grid</Text>
              <Text style={styles.noGridSubtext}>Go back and try again</Text>
            </View>
          )}
        </View>

        {/* Current clue */}
        {selectedWord && (
          <View style={styles.currentClue}>
            <View style={styles.clueHeader}>
              <Text style={styles.clueNumber}>{selectedWord.number}</Text>
              <Text style={styles.clueDirection}>{selectedWord.direction.toUpperCase()}</Text>
            </View>
            <Text style={styles.clueText}>{selectedWord.hint}</Text>
          </View>
        )}

        {/* Toggle clues */}
        <TouchableOpacity style={styles.clueToggle} onPress={() => setShowClues(!showClues)}>
          <Ionicons name={showClues ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          <Text style={styles.clueToggleText}>{showClues ? 'Hide All Clues' : 'Show All Clues'}</Text>
        </TouchableOpacity>

        {showClues && (
          <View style={styles.allClues}>
            <View style={styles.clueSection}>
              <Text style={styles.clueSectionTitle}>Across</Text>
              {words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number).map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.clueItem, selectedWord?.id === w.id && styles.clueItemActive]}
                  onPress={() => {
                    setSelectedWord(w);
                    setDirection('across');
                    setSelectedCell({ row: w.row, col: w.col });
                    if (inputRef.current) inputRef.current.focus();
                  }}
                >
                  <Text style={styles.clueItemNumber}>{w.number}.</Text>
                  <Text style={styles.clueItemText}>{w.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.clueSection}>
              <Text style={styles.clueSectionTitle}>Down</Text>
              {words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number).map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.clueItem, selectedWord?.id === w.id && styles.clueItemActive]}
                  onPress={() => {
                    setSelectedWord(w);
                    setDirection('down');
                    setSelectedCell({ row: w.row, col: w.col });
                    if (inputRef.current) inputRef.current.focus();
                  }}
                >
                  <Text style={styles.clueItemNumber}>{w.number}.</Text>
                  <Text style={styles.clueItemText}>{w.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoPill}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText}>{formatTime(timeSpent)}</Text>
          </View>
          <View style={styles.infoPill}>
            <Ionicons name="star-outline" size={14} color={colors.accent} />
            <Text style={styles.infoText}>{puzzle?.points || 0} pts</Text>
          </View>
          <View style={styles.infoPill}>
            <Ionicons name="grid-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText}>{words.length} words</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, padding: spacing.xl,
  },
  loadingText: { fontSize: 16, color: colors.textSecondary, ...fonts.medium, marginTop: spacing.lg },
  hiddenInput: { position: 'absolute', top: -100, left: -100, width: 1, height: 1, opacity: 0 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  puzzleTitle: { fontSize: 17, color: colors.text, ...fonts.bold },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, paddingHorizontal: spacing.md, paddingVertical: 2,
    borderRadius: radius.full, backgroundColor: colors.primarySoft,
  },
  timerText: { fontSize: 13, color: colors.primary, ...fonts.bold },
  checkBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Grid
  gridContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: 8,
  },
  gridOuter: {
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: radius.sm,
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0.5,
    position: 'relative',
  },
  cellBlock: {
    backgroundColor: '#1a1a2e',
  },
  cellInvisible: {
    backgroundColor: 'transparent',
  },
  cellEmpty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#BBBBBB',
  },
  cellHighlighted: {
    backgroundColor: '#c5d5ff',
    borderWidth: 0.5,
    borderColor: '#8fa8e8',
  },
  cellSelected: {
    backgroundColor: '#4263eb',
    borderWidth: 0,
  },
  cellCorrect: {
    backgroundColor: '#b2f2bb',
    borderWidth: 0.5,
    borderColor: '#40c057',
  },
  cellIncorrect: {
    backgroundColor: '#ffc9c9',
    borderWidth: 0.5,
    borderColor: '#fa5252',
  },
  cellNumber: {
    position: 'absolute', top: 1, left: 2,
    color: '#666666', ...fonts.bold,
  },
  cellLetter: {
    color: '#1a1a2e', ...fonts.bold, textAlign: 'center',
  },
  cellLetterSelected: {
    color: '#FFFFFF',
  },
  noGrid: {
    alignItems: 'center', padding: spacing.xxxl,
  },
  noGridText: {
    fontSize: 16, color: colors.error, ...fonts.semibold, marginTop: spacing.md,
  },
  noGridSubtext: {
    fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center',
  },

  // Clues
  currentClue: {
    marginHorizontal: spacing.xl, marginTop: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  clueHeader: { alignItems: 'center' },
  clueNumber: { fontSize: 20, color: colors.primary, ...fonts.bold },
  clueDirection: { fontSize: 9, color: colors.textSecondary, ...fonts.bold, marginTop: 1 },
  clueText: { flex: 1, fontSize: 15, color: colors.text, ...fonts.medium, lineHeight: 22 },

  clueToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.lg,
  },
  clueToggleText: { fontSize: 14, color: colors.textSecondary, ...fonts.medium },

  allClues: { marginHorizontal: spacing.xl },
  clueSection: { marginBottom: spacing.xl },
  clueSectionTitle: { fontSize: 16, color: colors.text, ...fonts.bold, marginBottom: spacing.sm },
  clueItem: {
    flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radius.sm, marginBottom: 2,
  },
  clueItemActive: { backgroundColor: colors.primarySoft },
  clueItemNumber: { fontSize: 14, color: colors.primary, ...fonts.bold, width: 28 },
  clueItemText: { flex: 1, fontSize: 14, color: colors.textSecondary, ...fonts.regular, lineHeight: 20 },

  // Info
  infoBar: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.lg,
    paddingVertical: spacing.lg, marginHorizontal: spacing.xl,
  },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.full,
  },
  infoText: { fontSize: 13, color: colors.textSecondary, ...fonts.medium },

  // Completion
  completionContainer: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  completionCard: {
    backgroundColor: colors.surface, borderRadius: radius.xxl,
    padding: spacing.xxxl, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
  },
  completionIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF9DB', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  completionTitle: { fontSize: 28, color: colors.text, ...fonts.bold, marginBottom: spacing.xs },
  completionSubtitle: { fontSize: 16, color: colors.textSecondary, ...fonts.regular, marginBottom: spacing.xxl },
  completionStats: {
    flexDirection: 'row', width: '100%', marginBottom: spacing.xxl,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.lg,
  },
  completionStat: { flex: 1, alignItems: 'center' },
  completionStatValue: { fontSize: 24, color: colors.primary, ...fonts.bold },
  completionStatLabel: { fontSize: 12, color: colors.textSecondary, ...fonts.medium, marginTop: 2 },
  completionButton: {
    width: '100%', paddingVertical: spacing.lg,
    backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center',
  },
  completionButtonText: { fontSize: 16, color: colors.textInverse, ...fonts.bold },
});
