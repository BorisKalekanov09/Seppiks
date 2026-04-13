import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface QuestionDetail {
  id: string;
  text: string;
  category: string;
  yes_count: number;
  no_count: number;
  comment_count: number;
  author_id: string;
  status: string;
  created_at: string;
}

export default function QuestionStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, text, category, yes_count, no_count, comment_count, author_id, status, created_at')
        .eq('id', id)
        .single();
      if (!error) setQuestion(data);
      setLoading(false);
    })();
  }, [id]);

  // Realtime: update counts live
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`question-stats-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions', filter: `id=eq.${id}` }, (payload) => {
        setQuestion(prev => prev ? { ...prev, ...(payload.new as QuestionDetail) } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase
              .from('questions')
              .delete()
              .eq('id', id)
              .eq('author_id', user!.id);
            setDeleting(false);
            if (error) {
              Alert.alert('Error', 'Could not delete the question. ' + error.message);
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: Colors.textSecondary }}>Question not found.</Text>
      </View>
    );
  }

  const total = (question.yes_count || 0) + (question.no_count || 0);
  const yesP = total > 0 ? Math.round((question.yes_count / total) * 100) : 0;
  const noP = total > 0 ? 100 - yesP : 0;
  const isAuthor = user?.id === question.author_id;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Results</Text>
        {isAuthor ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={deleting}>
            {deleting
              ? <ActivityIndicator color={Colors.no} size="small" />
              : <Text style={styles.deleteBtnText}>🗑️</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question card */}
        <View style={styles.questionCard}>
          <View style={styles.questionMeta}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{question.category}</Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo(question.created_at)}</Text>
          </View>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        {/* Results */}
        <View style={styles.resultsCard}>
          <Text style={styles.sectionLabel}>RESULTS</Text>
          <Text style={styles.totalVotes}>{total} {total === 1 ? 'vote' : 'votes'} total</Text>

          {total === 0 ? (
            <View style={styles.noVotesBox}>
              <Text style={styles.noVotesIcon}>🗳️</Text>
              <Text style={styles.noVotesText}>No votes yet</Text>
              <Text style={styles.noVotesSub}>Share your question to get responses!</Text>
            </View>
          ) : (
            <>
              {/* YES row */}
              <View style={styles.optionRow}>
                <View style={styles.optionLabelRow}>
                  <View style={[styles.optionDot, { backgroundColor: Colors.yes }]} />
                  <Text style={styles.optionLabel}>YES</Text>
                  <Text style={styles.optionCount}>{question.yes_count} votes</Text>
                  <Text style={[styles.optionPercent, { color: Colors.yes }]}>{yesP}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${yesP}%` as any, backgroundColor: Colors.yes }]} />
                </View>
              </View>

              {/* NO row */}
              <View style={styles.optionRow}>
                <View style={styles.optionLabelRow}>
                  <View style={[styles.optionDot, { backgroundColor: Colors.no }]} />
                  <Text style={styles.optionLabel}>NO</Text>
                  <Text style={styles.optionCount}>{question.no_count} votes</Text>
                  <Text style={[styles.optionPercent, { color: Colors.no }]}>{noP}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${noP}%` as any, backgroundColor: Colors.no }]} />
                </View>
              </View>

              {/* Big split visual */}
              <View style={styles.splitBar}>
                <View style={[styles.splitYes, { flex: yesP || 0.01 }]}>
                  {yesP >= 20 && <Text style={styles.splitLabel}>{yesP}%</Text>}
                </View>
                <View style={[styles.splitNo, { flex: noP || 0.01 }]}>
                  {noP >= 20 && <Text style={styles.splitLabel}>{noP}%</Text>}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Comments button */}
        <TouchableOpacity
          style={styles.commentsBtn}
          onPress={() => router.push({ pathname: '/comments/[id]', params: { id: question.id } })}
          activeOpacity={0.85}
        >
          <Text style={styles.commentsBtnIcon}>💬</Text>
          <Text style={styles.commentsBtnText}>
            {question.comment_count > 0
              ? `View ${question.comment_count} comment${question.comment_count > 1 ? 's' : ''}`
              : 'Add a comment'}
          </Text>
          <Text style={styles.commentsBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Delete button (bottom, only for author) */}
        {isAuthor && (
          <TouchableOpacity style={styles.deleteFullBtn} onPress={handleDelete} disabled={deleting} activeOpacity={0.85}>
            {deleting
              ? <ActivityIndicator color={Colors.no} size="small" />
              : <Text style={styles.deleteFullBtnText}>Delete Question</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 24, color: Colors.white },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 20 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 48 },
  questionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  questionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: Colors.gold, letterSpacing: 0.5 },
  timeAgo: { fontSize: 12, color: Colors.textMuted },
  questionText: { fontSize: 22, fontWeight: '800', color: Colors.white, lineHeight: 30 },
  resultsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.gold, letterSpacing: 2 },
  totalVotes: { fontSize: 13, color: Colors.textMuted },
  optionRow: { gap: 8 },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  optionDot: { width: 8, height: 8, borderRadius: 4 },
  optionLabel: { fontSize: 13, fontWeight: '700', color: Colors.white, width: 28 },
  optionCount: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  optionPercent: { fontSize: 18, fontWeight: '900' },
  barTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  splitBar: {
    flexDirection: 'row',
    height: 48,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  splitYes: {
    backgroundColor: Colors.yes,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitNo: {
    backgroundColor: Colors.no,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitLabel: { fontSize: 15, fontWeight: '900', color: '#fff' },
  noVotesBox: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  noVotesIcon: { fontSize: 36 },
  noVotesText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  noVotesSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  commentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  commentsBtnIcon: { fontSize: 18 },
  commentsBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.white },
  commentsBtnArrow: { fontSize: 20, color: Colors.textMuted },
  deleteFullBtn: {
    borderWidth: 1,
    borderColor: Colors.no + '60',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  deleteFullBtnText: { fontSize: 15, fontWeight: '700', color: Colors.no },
});
