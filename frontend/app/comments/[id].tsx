import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
}

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [question, setQuestion] = useState<{ text: string } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [qRes, cRes] = await Promise.all([
        supabase.from('questions').select('text').eq('id', id).single(),
        supabase
          .from('comments')
          .select('id, content, created_at, user_id, profiles(display_name)')
          .eq('question_id', id)
          .order('created_at', { ascending: true }),
      ]);
      setQuestion(qRes.data);
      setComments((cRes.data as any) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async () => {
    if (!text.trim() || !user || !id) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('comments')
      .insert({ question_id: id, user_id: user.id, content: text.trim() })
      .select('id, content, created_at, user_id, profiles(display_name)')
      .single();
    if (data) {
      setComments(prev => [...prev, data as any]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSubmitting(false);
  };

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Question */}
      {question && (
        <View style={styles.questionCard}>
          <Text style={styles.dilemmaTag}>DISCUSSING</Text>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>
      )}

      {/* Comments list */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>Be the first to comment!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwn = item.user_id === user?.id;
            const displayName = item.profiles?.display_name ?? 'Anonymous';
            const initials = displayName.slice(0, 2).toUpperCase();

            return (
              <View style={[styles.commentRow, isOwn && styles.commentRowOwn]}>
                <View style={[styles.commentAvatar, isOwn && styles.commentAvatarOwn]}>
                  <Text style={styles.commentAvatarText}>{initials}</Text>
                </View>
                <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
                  {!isOwn && (
                    <Text style={styles.commentAuthor}>{displayName}</Text>
                  )}
                  <Text style={styles.commentContent}>{item.content}</Text>
                  <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Share your thoughts..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={handleSubmit}
          disabled={!text.trim() || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#1A1200" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  questionCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dilemmaTag: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2, marginBottom: 6 },
  questionText: { fontSize: 16, fontWeight: '700', color: Colors.white, lineHeight: 22 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 24 },
  emptyBox: { alignItems: 'center', marginTop: 48, gap: Spacing.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  commentRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  commentRowOwn: { flexDirection: 'row-reverse' },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    flexShrink: 0,
  },
  commentAvatarOwn: { backgroundColor: Colors.gold },
  commentAvatarText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  bubble: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.gold + '40',
  },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: Colors.gold },
  commentContent: { fontSize: 14, color: Colors.white, lineHeight: 20 },
  commentTime: { fontSize: 11, color: Colors.textMuted, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, fontWeight: '900', color: '#1A1200' },
});
