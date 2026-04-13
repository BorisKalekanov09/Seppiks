import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface MyQuestion {
  id: string;
  text: string;
  category: string;
  yes_count: number;
  no_count: number;
  comment_count: number;
  created_at: string;
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<MyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useRef(false);

  const fetchMyQuestions = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      console.log('[MyCollective] Fetching questions for user:', uid);
      const { data, error } = await supabase
        .from('questions')
        .select('id, text, category, yes_count, no_count, comment_count, created_at')
        .eq('author_id', uid)
        .order('created_at', { ascending: false });
      console.log('[MyCollective] Result:', data?.length, 'questions, error:', error?.message);
      if (error) throw error;
      setQuestions(data ?? []);
    } catch (err) {
      console.error('[MyCollective] Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever user becomes available (handles the auth-loading race)
  useEffect(() => {
    if (user) fetchMyQuestions(user.id);
  }, [user, fetchMyQuestions]);

  // Also refetch every time the screen comes into focus (e.g. returning from new-question)
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      if (user) fetchMyQuestions(user.id);

      if (!user) return () => { isFocused.current = false; };

      // Realtime: keep vote counts in sync as others vote
      const channel = supabase
        .channel(`my-collective-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'questions', filter: `author_id=eq.${user.id}` },
          (payload) => {
            setQuestions(prev => [payload.new as MyQuestion, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'questions', filter: `author_id=eq.${user.id}` },
          (payload) => {
            setQuestions(prev =>
              prev.map(q => q.id === (payload.new as MyQuestion).id ? (payload.new as MyQuestion) : q)
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'questions', filter: `author_id=eq.${user.id}` },
          (payload) => {
            setQuestions(prev => prev.filter(q => q.id !== (payload.old as any).id));
          }
        )
        .subscribe();

      return () => {
        isFocused.current = false;
        supabase.removeChannel(channel);
      };
    }, [user, fetchMyQuestions])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  const totalVotes = questions.reduce((sum, q) => sum + (q.yes_count || 0) + (q.no_count || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Seppiks</Text>
          <Text style={styles.title}>My Collective</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-question')}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {questions.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{questions.length}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{totalVotes}</Text>
            <Text style={styles.statLabel}>Total Votes</Text>
          </View>
        </View>
      )}

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✍️</Text>
            <Text style={styles.emptyTitle}>Nothing posted yet</Text>
            <Text style={styles.emptyText}>Tap + to ask the collective your first question.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/new-question')}>
              <Text style={styles.emptyBtnText}>Post a Question</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const total = (item.yes_count || 0) + (item.no_count || 0);
          const yesP = total > 0 ? Math.round((item.yes_count / total) * 100) : 0;
          const noP = total > 0 ? 100 - yesP : 0;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/question-stats/[id]', params: { id: item.id } })}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
                <Text style={styles.voteCount}>{total} votes</Text>
              </View>

              <Text style={styles.questionText}>{item.text}</Text>

              {total > 0 ? (
                <View style={styles.resultsSection}>
                  <View style={styles.resultsRow}>
                    <View style={styles.resultSide}>
                      <Text style={styles.resultLabel}>YES</Text>
                      <Text style={styles.yesP}>{yesP}%</Text>
                    </View>
                    <View style={styles.bar}>
                      <View style={[styles.barFillYes, { flex: yesP || 0.01 }]} />
                      <View style={[styles.barFillNo, { flex: noP || 0.01 }]} />
                    </View>
                    <View style={[styles.resultSide, styles.resultRight]}>
                      <Text style={styles.resultLabel}>NO</Text>
                      <Text style={styles.noP}>{noP}%</Text>
                    </View>
                  </View>
                  <View style={styles.countRow}>
                    <Text style={styles.countText}>{item.yes_count} yes</Text>
                    <Text style={styles.countText}>{item.no_count} no</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noVotesRow}>
                  <Text style={styles.noVotesText}>No votes yet — share your question!</Text>
                </View>
              )}

              <Text style={styles.commentsLabel}>💬 {item.comment_count} comments</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gold + '80',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addButtonText: { fontSize: 28, fontWeight: '300', color: Colors.gold, lineHeight: 32 },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.gold, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  statChip: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.gold },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  list: { padding: Spacing.lg, gap: Spacing.md },
  emptyState: { alignItems: 'center', marginTop: 80, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.xl,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: Colors.gold, letterSpacing: 0.5 },
  voteCount: { fontSize: 12, color: Colors.textMuted },
  questionText: { fontSize: 16, fontWeight: '700', color: Colors.white, lineHeight: 22 },
  resultsSection: { gap: 6 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resultSide: { width: 40 },
  resultRight: { alignItems: 'flex-end' },
  resultLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  yesP: { fontSize: 16, fontWeight: '900', color: Colors.yes },
  noP: { fontSize: 16, fontWeight: '900', color: Colors.no },
  bar: { flex: 1, height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', backgroundColor: Colors.border },
  barFillYes: { height: '100%', backgroundColor: Colors.yes },
  barFillNo: { height: '100%', backgroundColor: Colors.no },
  countRow: { flexDirection: 'row', justifyContent: 'space-between' },
  countText: { fontSize: 11, color: Colors.textMuted },
  noVotesRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  noVotesText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  commentsLabel: { fontSize: 12, color: Colors.textMuted },
});
