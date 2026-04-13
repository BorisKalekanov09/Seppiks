import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface ProfileStats {
  votesCast: number;
  comments: number;
  streak: number;
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Get unique days sorted newest first
  const uniqueDays = [...new Set(dates.map(d => d.split('T')[0]))].sort().reverse();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const [votesRes, commentsRes, voteDatesRes] = await Promise.all([
        supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('votes')
          .select('created_at')
          .eq('user_id', user.id),
      ]);

      const votesCast = votesRes.count ?? 0;
      const comments = commentsRes.count ?? 0;
      const dates = (voteDatesRes.data ?? []).map((v: any) => v.created_at as string);
      const streak = calculateStreak(dates);

      setStats({ votesCast, comments, streak });
    } catch (err) {
      console.error('[Profile] Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/onboarding');
  };

  const email = user?.email ?? '';
  const name = user?.user_metadata?.display_name ?? email.split('@')[0] ?? 'User';
  const initials = name.slice(0, 2).toUpperCase();

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>Seppiks</Text>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {statsLoading ? (
          <ActivityIndicator color={Colors.gold} style={{ flex: 1 }} />
        ) : (
          <>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fmt(stats?.votesCast ?? 0)}</Text>
              <Text style={styles.statLabel}>Votes Cast</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fmt(stats?.comments ?? 0)}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats?.streak ?? 0}</Text>
              <Text style={styles.statLabel}>Streak 🔥</Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
        <Text style={styles.menuIcon}>⚙️</Text>
        <Text style={styles.menuText}>Settings & Preferences</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuIcon}>🔔</Text>
        <Text style={styles.menuText}>Notifications</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuIcon}>🔒</Text>
        <Text style={styles.menuText}>Privacy</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuItem, styles.signOutItem]} onPress={handleSignOut}>
        <Text style={styles.menuIcon}>🚪</Text>
        <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.gold },
  settingsBtn: { padding: 4 },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#1A1200' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  email: { fontSize: 14, color: Colors.textSecondary },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 72,
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.white },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  menuIcon: { fontSize: 20 },
  menuText: { flex: 1, fontSize: 16, color: Colors.white, fontWeight: '500' },
  menuArrow: { fontSize: 20, color: Colors.textMuted },
  signOutItem: { marginTop: Spacing.lg, borderBottomWidth: 0 },
  signOutText: { color: Colors.no },
});
