import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { getLeaderboard } from '../api';
import { getOrCreatePlayer } from '../store';

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [leaderboardRes, player] = await Promise.all([
        getLeaderboard(),
        getOrCreatePlayer(),
      ]);
      setPlayers(leaderboardRes.data);
      setCurrentPlayerId(player.id);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getMedalColor = (index) => {
    if (index === 0) return '#FFD700';
    if (index === 1) return '#C0C0C0';
    if (index === 2) return '#CD7F32';
    return colors.textLight;
  };

  const renderItem = ({ item, index }) => {
    const isMe = item.id === currentPlayerId;
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <View style={styles.rankContainer}>
          {index < 3 ? (
            <View style={[styles.medal, { backgroundColor: getMedalColor(index) + '20' }]}>
              <Ionicons name="trophy" size={18} color={getMedalColor(index)} />
            </View>
          ) : (
            <Text style={styles.rank}>{index + 1}</Text>
          )}
        </View>

        <View style={[styles.avatar, isMe && { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person" size={18} color={isMe ? colors.primary : colors.textSecondary} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, isMe && { color: colors.primary }]}>
            {item.display_name} {isMe ? '(You)' : ''}
          </Text>
          <Text style={styles.meta}>{item.puzzles_completed} puzzles solved</Text>
        </View>

        <View style={styles.pointsContainer}>
          <Text style={styles.points}>{item.total_points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
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
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Top puzzle solvers</Text>
      </View>

      <FlatList
        data={players}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="podium-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No players yet</Text>
            <Text style={styles.emptySubtext}>Complete puzzles to appear here!</Text>
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
    paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { fontSize: 28, color: colors.text, ...fonts.bold },
  subtitle: { fontSize: 14, color: colors.textSecondary, ...fonts.regular, marginTop: 2 },

  list: { padding: spacing.xl, paddingBottom: 100 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  rowMe: { borderWidth: 2, borderColor: colors.primary },

  rankContainer: { width: 36, alignItems: 'center' },
  rank: { fontSize: 16, color: colors.textSecondary, ...fonts.bold },
  medal: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    marginLeft: spacing.sm,
  },

  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 15, color: colors.text, ...fonts.semibold },
  meta: { fontSize: 12, color: colors.textSecondary, ...fonts.regular, marginTop: 1 },

  pointsContainer: { alignItems: 'center' },
  points: { fontSize: 18, color: colors.primary, ...fonts.bold },
  pointsLabel: { fontSize: 10, color: colors.textSecondary, ...fonts.medium },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, color: colors.textSecondary, ...fonts.semibold, marginTop: spacing.lg },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginTop: spacing.xs },
});
