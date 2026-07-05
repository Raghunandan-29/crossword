import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Alert, Animated, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { getPuzzleForPlay, checkPuzzle, completePuzzle, saveProgress } from '../api';
import { getOrCreatePlayer, updateStoredPlayer } from '../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
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

      // Start time tracker
      timeSpentRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      Alert.alert('Error', 'Failed to load puzzle');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
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

  const gridData = puzzle?.grid_data;
  const grid = gridData?.solution || [];
  const words = puzzle?.words || [];
  const gridSize = grid.length;
  const cellSize = Math.min(Math.floor((SCREEN_WIDTH - 40) / gridSize), 36);

  // Build number map
  const numberMap = {};
  words.forEach(w => {
    const key = `${w.row},${w.col}`;
    if (!numberMap[key]) numberMap[key] = w.number;
  });

  // Build word cell map
  const getWordCells = useCallback((word) => {
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      if (word.direction === 'across') {
        cells.push({ row: word.row, col: word.col + i });
      } else {
        cells.push({ row: word.row + i, col: word.col });
      }
    }
    return cells;
  }, []);

  const findWordAtCell = useCallback((row, col, dir) => {
    return words.find(w => {
      if (w.direction !== dir) return false;
      const cells = getWordCells(w);
      return cells.some(c => c.row === row && c.col === col);
    });
  }, [words, getWordCells]);

  const handleCellPress = (row, col) => {
    if (grid[row]?.[col] === '#') return;

    if (selectedCell?.row === row && selectedCell?.col === col) {
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);
      const word = findWordAtCell(row, col, newDir) || findWordAtCell(row, col, direction);
      setSelectedWord(word);
    } else {
      setSelectedCell({ row, col });
      const word = findWordAtCell(row, col, direction) || findWordAtCell(row, col, direction === 'across' ? 'down' : 'across');
      if (word) {
        setDirection(word.direction);
        setSelectedWord(word);
      }
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (key) => {
    if (!selectedCell || completed) return;

    const { row, col } = selectedCell;
    const cellKey = `${row},${col}`;

    if (key === 'BACKSPACE') {
      setCellValues(prev => {
        const updated = { ...prev };
        delete updated[cellKey];
        return updated;
      });
      moveToPrevCell();
      return;
    }

    if (/^[A-Za-z]$/.test(key)) {
      setCellValues(prev => ({ ...prev, [cellKey]: key.toUpperCase() }));
      moveToNextCell();
    }
  };

  const moveToNextCell = () => {
    if (!selectedCell || !selectedWord) return;
    const cells = getWordCells(selectedWord);
    const idx = cells.findIndex(c => c.row === selectedCell.row && c.col === selectedCell.col);
    if (idx < cells.length - 1) {
      setSelectedCell(cells[idx + 1]);
    }
  };

  const moveToPrevCell = () => {
    if (!selectedCell || !selectedWord) return;
    const cells = getWordCells(selectedWord);
    const idx = cells.findIndex(c => c.row === selectedCell.row && c.col === selectedCell.col);
    if (idx > 0) {
      setSelectedCell(cells[idx - 1]);
    }
  };

  const handleCheckPuzzle = async () => {
    try {
      // Build answers from cellValues mapped to word IDs
      const answers = {};
      words.forEach(w => {
        const cells = getWordCells(w);
        let answer = '';
        cells.forEach(c => {
          answer += cellValues[`${c.row},${c.col}`] || ' ';
        });
        answers[w.id] = answer;
      });

      const res = await checkPuzzle(puzzleId, answers);

      // Mark correct/incorrect cells
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
        Alert.alert(
          'Keep Going!',
          `${res.data.correctCount}/${res.data.totalWords} words correct. Keep trying!`
        );
        // Clear incorrect states after 2s
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

  const isHighlightedCell = (row, col) => {
    if (!selectedWord) return false;
    const cells = getWordCells(selectedWord);
    return cells.some(c => c.row === row && c.col === col);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.loadingText}>Loading puzzle...</Text>
        </Animated.View>
      </View>
    );
  }

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Hidden input for keyboard */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace') {
            handleKeyPress('BACKSPACE');
          }
        }}
        onChangeText={(text) => {
          if (text.length > 0) {
            handleKeyPress(text[text.length - 1]);
          }
        }}
        value=""
        caretHidden
        blurOnSubmit={false}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.puzzleTitle} numberOfLines={1}>{title}</Text>
          {puzzle.timer_mode === 1 && (
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
        {/* Grid */}
        <Animated.View style={[styles.gridContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.gridBorder]}>
            {grid.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((cell, ci) => {
                  const isBlock = cell === '#';
                  const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                  const isHighlighted = isHighlightedCell(ri, ci);
                  const num = numberMap[`${ri},${ci}`];
                  const value = cellValues[`${ri},${ci}`] || '';
                  const cellState = correctCells[`${ri},${ci}`];

                  return (
                    <TouchableOpacity
                      key={ci}
                      onPress={() => handleCellPress(ri, ci)}
                      activeOpacity={isBlock ? 1 : 0.7}
                      style={[
                        styles.cell,
                        { width: cellSize, height: cellSize },
                        isBlock && styles.cellBlock,
                        !isBlock && styles.cellEmpty,
                        isHighlighted && styles.cellHighlighted,
                        isSelected && styles.cellSelected,
                        cellState === 'correct' && styles.cellCorrect,
                        cellState === 'incorrect' && styles.cellIncorrect,
                      ]}
                    >
                      {!isBlock && num && (
                        <Text style={[styles.cellNumber, { fontSize: cellSize * 0.22 }]}>{num}</Text>
                      )}
                      {!isBlock && value ? (
                        <Text style={[styles.cellLetter, { fontSize: cellSize * 0.45 }]}>{value}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>

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
            {/* Across */}
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

            {/* Down */}
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
            <Text style={styles.infoText}>{puzzle.points} pts</Text>
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { fontSize: 16, color: colors.textSecondary, ...fonts.medium },
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

  gridContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  gridBorder: {
    backgroundColor: colors.cellBlock, padding: 2, borderRadius: radius.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    justifyContent: 'center', alignItems: 'center',
    margin: 0.5, position: 'relative',
  },
  cellBlock: { backgroundColor: colors.cellBlock },
  cellEmpty: { backgroundColor: colors.surface },
  cellHighlighted: { backgroundColor: colors.cellHighlight },
  cellSelected: { backgroundColor: colors.primary, borderWidth: 0 },
  cellCorrect: { backgroundColor: colors.cellCorrect },
  cellIncorrect: { backgroundColor: colors.cellIncorrect },
  cellNumber: {
    position: 'absolute', top: 1, left: 2,
    color: colors.textSecondary, ...fonts.medium,
  },
  cellLetter: { color: colors.text, ...fonts.bold, textAlign: 'center' },

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
