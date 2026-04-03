import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface VotedItem {
  id: string;
  vote: number;
  question: {
    id: string;
    text: string;
    yes_count: number;
    no_count: number;
    comment_count: number;
  };
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<VotedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('id, vote, question:question_id(id, text, yes_count, no_count, comment_count)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setItems((data as any) ?? []);
      } catch (err) {
        console.error('[FeedScreen] Error fetching votes:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  const renderLeftAction = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.leftAction, { transform: [{ scale }] }]}>
        <Text style={styles.actionText}>Save</Text>
      </Animated.View>
    );
  };

  const renderRightAction = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.rightAction, { transform: [{ scale }] }]}>
        <Text style={styles.actionText}>Hide</Text>
      </Animated.View>
    );
  };

  // FeedCard component isolates swipeable ref so we can close it immediately after open
  const FeedCard: React.FC<{ item: VotedItem }> = ({ item }) => {
    const swipeRef = useRef<any>(null);
    const q = item.question as any;
    const total = (q.yes_count || 0) + (q.no_count || 0);
    const yesP = total > 0 ? Math.round((q.yes_count / total) * 100) : 50;
    const noP = 100 - yesP;
    const voted = item.vote === 1 ? 'yes' : 'no';

    return (
      <Swipeable
        ref={swipeRef}
        renderLeftActions={renderLeftAction}
        renderRightActions={renderRightAction}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={80}
        rightThreshold={80}
        onSwipeableOpen={() => swipeRef.current?.close()}
      >
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.voteBadge, voted === 'yes' ? styles.yesBadge : styles.noBadge]}>
              <Text style={[styles.voteBadgeText, voted === 'yes' ? styles.yesText : styles.noText]}>
                {voted === 'yes' ? '✓ YES' : '✗ NO'}
              </Text>
            </View>
          </View>
          <Text style={styles.questionText}>{q.text}</Text>
          <View style={styles.resultsRow}>
            <Text style={styles.yesP}>{yesP}%</Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${yesP}%` as any }]} />
              <View style={[styles.barFillNo, { width: `${noP}%` as any }]} />
            </View>
            <Text style={styles.noP}>{noP}%</Text>
          </View>
          <Text style={styles.commentsLabel}>💬 {q.comment_count} comments</Text>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Seppiks</Text>
        <Text style={styles.title}>Your Votes</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗳️</Text>
            <Text style={styles.emptyText}>No votes yet.{'\n'}Start swiping!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const q = item.question as any;
          const total = (q.yes_count || 0) + (q.no_count || 0);
          const yesP = total > 0 ? Math.round((q.yes_count / total) * 100) : 50;
          const noP = 100 - yesP;
          const voted = item.vote === 1 ? 'yes' : 'no';

          return (
            <Swipeable
              renderLeftActions={renderLeftAction}
              renderRightActions={renderRightAction}
              overshootLeft={false}
              overshootRight={false}
            >
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.voteBadge, voted === 'yes' ? styles.yesBadge : styles.noBadge]}>
                    <Text style={[styles.voteBadgeText, voted === 'yes' ? styles.yesText : styles.noText]}>
                      {voted === 'yes' ? '✓ YES' : '✗ NO'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.questionText}>{q.text}</Text>
                <View style={styles.resultsRow}>
                  <Text style={styles.yesP}>{yesP}%</Text>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${yesP}%` as any }]} />
                    <View style={[styles.barFillNo, { width: `${noP}%` as any }]} />
                  </View>
                  <Text style={styles.noP}>{noP}%</Text>
                </View>
                <Text style={styles.commentsLabel}>💬 {q.comment_count} comments</Text>
              </View>
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.gold, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  emptyState: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    minHeight: 120,
  },
  cardTop: { flexDirection: 'row' },
  voteBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  yesBadge: { borderColor: Colors.yes, backgroundColor: Colors.yesLight },
  noBadge: { borderColor: Colors.no, backgroundColor: Colors.noLight },
  voteBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  yesText: { color: Colors.yes },
  noText: { color: Colors.no },
  questionText: { fontSize: 16, fontWeight: '700', color: Colors.white, lineHeight: 22 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  yesP: { fontSize: 14, fontWeight: '700', color: Colors.yes, width: 36 },
  noP: { fontSize: 14, fontWeight: '700', color: Colors.no, width: 36, textAlign: 'right' },
  bar: { flex: 1, height: 4, borderRadius: 2, flexDirection: 'row', overflow: 'hidden', backgroundColor: Colors.border },
  barFill: { height: '100%', backgroundColor: Colors.yes },
  barFillNo: { height: '100%', backgroundColor: Colors.no },
  commentsLabel: { fontSize: 12, color: Colors.textMuted },

  // swipe action styles
  leftAction: {

    backgroundColor: Colors.yes,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    marginVertical: Spacing.sm,
    minHeight: 120,
  },
  rightAction: {
    backgroundColor: Colors.no,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
    marginVertical: Spacing.sm,
    minHeight: 120,
  },
  actionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
