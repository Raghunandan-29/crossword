import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { getPlayer, getPlayerProgress } from '../api';
import { getOrCreatePlayer } from '../store';

export default function ProfileScreen({ navigation }) {
  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const stored = await getOrCreatePlayer();
      if (stored.id !== 'offline') {
        const [playerRes, progressRes] = await Promise.all([
          getPlayer(stored.id),
          getPlayerProgress(stored.id),
        ]);
        setPlayer(playerRes.data);
        setProgress(progressRes.data);
      } else {
        setPlayer(stored);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getLevel = (points) => {
    if (points >= 5000) return { name: 'Master', icon: 'diamond', color: '#9775fa' };
    if (points >= 2000) return { name: 'Expert', icon: 'medal', color: colors.accent };
    if (points >= 500) return { name: 'Advanced', icon: 'ribbon', color: colors.primary };
    if (points >= 100) return { name: 'Beginner', icon: 'leaf', color: colors.success };
    return { name: 'Novice', icon: 'school', color: colors.textSecondary };
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const level = getLevel(player?.total_points || player?.stats?.total_points || 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.primary} />
        </View>
        <Text style={styles.displayName}>{player?.display_name || 'Player'}</Text>

        <View style={styles.levelBadge}>
          <Ionicons name={level.icon} size={16} color={level.color} />
          <Text style={[styles.levelText, { color: level.color }]}>{level.name}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{player?.total_points || player?.stats?.total_points || 0}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{player?.puzzles_completed || player?.stats?.completed || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatTime(player?.stats?.total_time || 0)}</Text>
          <Text style={styles.statLabel}>Play Time</Text>
        </View>
      </View>

      {/* History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {progress.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="game-controller-outline" size={36} color={colors.textLight} />
            <Text style={styles.emptyText}>No puzzles played yet</Text>
            <Text style={styles.emptySubtext}>Start solving puzzles to see your progress here</Text>
          </View>
        ) : (
          progress.map((p) => (
            <View key={p.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <View style={[styles.historyIcon, {
                  backgroundColor: p.status === 'completed' ? colors.difficultyLowBg : colors.primarySoft
                }]}>
                  <Ionicons
                    name={p.status === 'completed' ? 'checkmark-circle' : 'hourglass-outline'}
                    size={20}
                    color={p.status === 'completed' ? colors.success : colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.historyTitle}>{p.title}</Text>
                  <Text style={styles.historyMeta}>
                    {p.difficulty} | {formatTime(p.time_spent_seconds)}
                  </Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                {p.status === 'completed' && (
                  <Text style={styles.historyPoints}>+{p.points_earned}</Text>
                )}
                <Text style={[styles.historyStatus, {
                  color: p.status === 'completed' ? colors.success : colors.primary
                }]}>
                  {p.status === 'completed' ? 'Done' : 'In progress'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  header: {
    alignItems: 'center', paddingTop: 70, paddingBottom: spacing.xxl,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  displayName: { fontSize: 24, color: colors.text, ...fonts.bold },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.sm, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  levelText: { fontSize: 14, ...fonts.semibold },

  statsRow: {
    flexDirection: 'row', padding: spacing.xl, gap: spacing.md,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  statValue: { fontSize: 22, color: colors.primary, ...fonts.bold },
  statLabel: { fontSize: 11, color: colors.textSecondary, ...fonts.medium, marginTop: 4 },

  section: { paddingHorizontal: spacing.xl },
  sectionTitle: { fontSize: 18, color: colors.text, ...fonts.bold, marginBottom: spacing.lg },

  emptyHistory: {
    alignItems: 'center', paddingVertical: spacing.xxxl,
    backgroundColor: colors.surface, borderRadius: radius.lg,
  },
  emptyText: { fontSize: 16, color: colors.textSecondary, ...fonts.semibold, marginTop: spacing.md },
  emptySubtext: { fontSize: 13, color: colors.textLight, marginTop: spacing.xs, textAlign: 'center' },

  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  historyIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  historyTitle: { fontSize: 15, color: colors.text, ...fonts.semibold },
  historyMeta: { fontSize: 12, color: colors.textSecondary, ...fonts.regular, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyPoints: { fontSize: 16, color: colors.accent, ...fonts.bold },
  historyStatus: { fontSize: 11, ...fonts.medium, marginTop: 2 },
});
