import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Dimensions, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { getPublishedPuzzles, connectWebSocket } from '../api';

const { width } = Dimensions.get('window');

const difficultyConfig = {
  low: { label: 'Easy', color: colors.difficultyLow, bg: colors.difficultyLowBg, icon: 'leaf-outline' },
  medium: { label: 'Medium', color: colors.difficultyMedium, bg: colors.difficultyMediumBg, icon: 'flame-outline' },
  high: { label: 'Hard', color: colors.difficultyHigh, bg: colors.difficultyHighBg, icon: 'skull-outline' },
};

export default function HomeScreen({ navigation }) {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchPuzzles = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all' && filter !== 'timer') {
        params.difficulty = filter;
      }
      if (filter === 'timer') {
        params.timer_mode = 'true';
      }
      const res = await getPublishedPuzzles(params);
      setPuzzles(res.data);
    } catch (error) {
      console.error('Error fetching puzzles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPuzzles();
  }, [fetchPuzzles]);

  useEffect(() => {
    const disconnect = connectWebSocket((msg) => {
      if (msg.type === 'puzzle_published' || msg.type === 'puzzle_unpublished' || msg.type === 'puzzle_deleted') {
        fetchPuzzles();
      }
    });
    return disconnect;
  }, [fetchPuzzles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPuzzles();
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'low', label: 'Easy' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'Hard' },
    { key: 'timer', label: 'Timer' },
  ];

  const renderPuzzleCard = ({ item }) => {
    const config = difficultyConfig[item.difficulty] || difficultyConfig.low;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Game', { puzzleId: item.id, title: item.title })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.diffBadge, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={14} color={config.color} />
            <Text style={[styles.diffText, { color: config.color }]}>{config.label}</Text>
          </View>
          {item.timer_mode === 1 && (
            <View style={[styles.diffBadge, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="timer-outline" size={14} color={colors.primary} />
              <Text style={[styles.diffText, { color: colors.primary }]}>{item.time_limit_seconds}s</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardStat}>
            <Ionicons name="grid-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{item.word_count} words</Text>
          </View>
          <View style={styles.cardStat}>
            <Ionicons name="star-outline" size={14} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.accent }]}>{item.points} pts</Text>
          </View>
        </View>

        <View style={styles.playButton}>
          <Ionicons name="play" size={18} color={colors.textInverse} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.title}>Crossword Puzzles</Text>
        </View>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Puzzle list */}
      <FlatList
        data={puzzles}
        renderItem={renderPuzzleCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No puzzles found</Text>
            <Text style={styles.emptySubtext}>Pull to refresh or try a different filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  greeting: { fontSize: 14, color: colors.textSecondary, ...fonts.medium },
  title: { fontSize: 28, color: colors.text, ...fonts.bold, marginTop: 2 },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.surface, gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, ...fonts.medium },
  filterTextActive: { color: colors.textInverse },
  list: { padding: spacing.xl, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  diffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  diffText: { fontSize: 12, ...fonts.semibold },
  cardTitle: { fontSize: 20, color: colors.text, ...fonts.bold, marginBottom: spacing.md },
  cardFooter: { flexDirection: 'row', gap: spacing.xl },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: colors.textSecondary, ...fonts.medium },
  playButton: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, color: colors.textSecondary, ...fonts.semibold, marginTop: spacing.lg },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginTop: spacing.xs },
});
