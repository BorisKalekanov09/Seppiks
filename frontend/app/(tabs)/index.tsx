import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, PanResponder, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQuestions, Question } from '@/hooks/useQuestions';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_OUT_DURATION = 280;

export default function HomeScreen() {
  const { user } = useAuth();
  const { questions, loading, loadMore, removeQuestion } = useQuestions();
  const [, forceRender] = useState(0);

  // ─── Refs to avoid stale closures in PanResponder ──────────────────────────
  const isSwiping = useRef(false);
  const currentQuestionRef = useRef<Question | undefined>(undefined);
  const questionsLengthRef = useRef(0);
  const castVoteRef = useRef<(q: Question, vote: 'yes' | 'no') => void>(() => {});

  const currentQuestion = questions[0];
  const nextQuestion = questions[1];

  // Keep refs in sync with the latest render values
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
    questionsLengthRef.current = questions.length;
  });

  // ─── Animated values ────────────────────────────────────────────────────────
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const yesOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const noOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextScale = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.93, 1],
    extrapolate: 'clamp',
  });

  const nextOpacity = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.6, 1],
    extrapolate: 'clamp',
  });

  // ─── Vote logic ─────────────────────────────────────────────────────────────
  const castVote = useCallback(async (question: Question, vote: 'yes' | 'no') => {
    if (!user) return;
    const voteValue = vote === 'yes' ? 1 : 0;

    removeQuestion(question.id);

    await supabase.from('votes').insert({
      user_id: user.id,
      question_id: question.id,
      vote: voteValue,
    });

    const field = vote === 'yes' ? 'yes_count' : 'no_count';
    await supabase.rpc('increment_vote', { q_id: question.id, vote_field: field });

    if (questionsLengthRef.current <= 3) loadMore();
  }, [user, removeQuestion, loadMore]);

  // Always keep castVoteRef pointing to the latest castVote
  useEffect(() => {
    castVoteRef.current = castVote;
  });

  // ─── Animation helpers ───────────────────────────────────────────────────────
  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [position]);

  const flyOff = useCallback((direction: 'left' | 'right', releaseYVelocity = 0) => {
    const targetX = direction === 'right' ? width * 1.6 : -width * 1.6;
    const targetY = releaseYVelocity * 100;

    Animated.timing(position, {
      toValue: { x: targetX, y: targetY },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      const q = currentQuestionRef.current;
      if (q) castVoteRef.current(q, direction === 'right' ? 'yes' : 'no');
      position.setValue({ x: 0, y: 0 });
      isSwiping.current = false;
      forceRender(n => n + 1); // trigger re-render to show next card
    });
  }, [position]);

  // ─── Public swipeOut (used by buttons) ──────────────────────────────────────
  const swipeOut = useCallback((direction: 'left' | 'right') => {
    if (!currentQuestionRef.current || isSwiping.current) return;
    isSwiping.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flyOff(direction, 0);
  }, [flyOff]);

  // ─── PanResponder — Tinder style ─────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Don't steal touch on press — only on clear horizontal move
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (isSwiping.current) return false;
        return Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      // When gesture starts, set up offset so the card tracks finger from its current pos
      onPanResponderGrant: () => {
        position.stopAnimation();
        position.extractOffset(); // fold current value into offset
      },

      // Directly map finger movement (no logic, just track)
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),

      // On release: decide fly-off or snap back
      onPanResponderRelease: (_, g) => {
        position.flattenOffset(); // merge offset back into value

        if (isSwiping.current) return;

        // Tinder logic: distance OR velocity triggers the swipe
        const shouldSwipeRight = g.dx > SWIPE_THRESHOLD || g.vx > 0.8;
        const shouldSwipeLeft = g.dx < -SWIPE_THRESHOLD || g.vx < -0.8;

        if (!currentQuestionRef.current) {
          resetPosition();
          return;
        }

        if (shouldSwipeRight) {
          isSwiping.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          flyOff('right', g.vy);
        } else if (shouldSwipeLeft) {
          isSwiping.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          flyOff('left', g.vy);
        } else {
          resetPosition();
        }
      },

      // If OS steals the gesture, snap back cleanly
      onPanResponderTerminate: () => {
        position.flattenOffset();
        resetPosition();
      },
    })
  ).current;

  // ─── Comments ────────────────────────────────────────────────────────────────
  const handleComments = () => {
    if (!currentQuestion) return;
    router.push({ pathname: '/comments/[id]', params: { id: currentQuestion.id } });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  const totalVotes = currentQuestion ? (currentQuestion.yes_count + currentQuestion.no_count) : 0;
  const yesPercent = totalVotes > 0 ? Math.round((currentQuestion!.yes_count / totalVotes) * 100) : 50;
  const noPercent = 100 - yesPercent;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Seppiks</Text>
        <TouchableOpacity onPress={() => router.push('/new-question')} style={styles.settingsBtn}>
          <Text style={{ fontSize: 28, color: Colors.gold, fontWeight: '600' }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Card stack */}
      <View style={styles.cardArea}>

        {/* Next card (behind) */}
        {nextQuestion && (
          <Animated.View
            style={[
              styles.card,
              styles.nextCard,
              {
                transform: [{ scale: nextScale }],
                opacity: nextOpacity,
              }
            ]}
            pointerEvents="none"
          >
            <Text style={styles.dilemmaTag}>TODAY'S DILEMMA</Text>
            <Text style={styles.questionText}>{nextQuestion.text}</Text>
          </Animated.View>
        )}

        {/* Empty state */}
        {!currentQuestion && !loading && (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>Check back later for new dilemmas.</Text>
          </View>
        )}

        {/* Current swipeable card */}
        {currentQuestion && (
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* YES overlay */}
            <Animated.View style={[styles.voteOverlay, styles.yesOverlay, { opacity: yesOpacity }]}>
              <Text style={styles.yesLabel}>YES ✓</Text>
            </Animated.View>
            {/* NO overlay */}
            <Animated.View style={[styles.voteOverlay, styles.noOverlay, { opacity: noOpacity }]}>
              <Text style={styles.noLabel}>NO ✗</Text>
            </Animated.View>

            <Text style={styles.dilemmaTag}>TODAY'S DILEMMA</Text>
            <Text style={styles.questionText}>{currentQuestion.text}</Text>

            {/* Results bar */}
            <View style={styles.resultsSection}>
              <View style={styles.resultRow}>
                <View>
                  <Text style={styles.resultLabel}>YES</Text>
                  <Text style={styles.yesPercent}>{yesPercent}%</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.resultLabel}>NO</Text>
                  <Text style={styles.noPercent}>{noPercent}%</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${yesPercent}%` as any }]} />
                <View style={[styles.progressFillNo, { width: `${noPercent}%` as any }]} />
              </View>
            </View>

            {/* Comment button */}
            <TouchableOpacity style={styles.commentBtn} onPress={handleComments} activeOpacity={0.8}>
              <Text style={styles.commentBtnIcon}>💬</Text>
              <Text style={styles.commentBtnText}>
                {currentQuestion.comment_count >= 1000
                  ? `${(currentQuestion.comment_count / 1000).toFixed(1)}k`
                  : currentQuestion.comment_count} Comments
              </Text>
            </TouchableOpacity>

            <Text style={styles.swipeHint}>SWIPE TO DECIDE</Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom buttons */}
      <View style={styles.swipeIndicators}>
        <TouchableOpacity style={styles.noHint} onPress={() => swipeOut('left')} activeOpacity={0.7}>
          <Text style={styles.noHintText}>✗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.yesHint} onPress={() => swipeOut('right')} activeOpacity={0.7}>
          <Text style={styles.yesHintText}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CARD_HEIGHT = height * 0.6;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.gold },
  settingsBtn: { padding: 4 },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    position: 'absolute',
    width: width - Spacing.md * 2,
    height: CARD_HEIGHT,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  nextCard: {
    transform: [{ scale: 0.94 }],
    opacity: 0.7,
  },
  emptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  emptySubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  voteOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 2,
    zIndex: 10,
  },
  yesOverlay: {
    right: Spacing.lg,
    borderColor: Colors.yes,
    backgroundColor: Colors.yesLight,
  },
  noOverlay: {
    left: Spacing.lg,
    borderColor: Colors.no,
    backgroundColor: Colors.noLight,
  },
  yesLabel: { fontSize: 18, fontWeight: '900', color: Colors.yes, letterSpacing: 1 },
  noLabel: { fontSize: 18, fontWeight: '900', color: Colors.no, letterSpacing: 1 },
  dilemmaTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 36,
    letterSpacing: -0.5,
    flex: 1,
    marginTop: Spacing.sm,
  },
  resultsSection: {
    gap: Spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  yesPercent: { fontSize: 28, fontWeight: '900', color: Colors.yes },
  noPercent: { fontSize: 28, fontWeight: '900', color: Colors.no },
  progressBar: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.yes,
    borderRadius: 2,
  },
  progressFillNo: {
    height: '100%',
    backgroundColor: Colors.no,
    borderRadius: 2,
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentBtnIcon: { fontSize: 18 },
  commentBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  swipeHint: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  swipeIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl * 2,
    paddingBottom: 24,
    paddingTop: Spacing.sm,
  },
  noHint: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.noLight,
    borderWidth: 2,
    borderColor: Colors.no,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noHintText: { fontSize: 22, color: Colors.no, fontWeight: '800' },
  yesHint: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.yesLight,
    borderWidth: 2,
    borderColor: Colors.yes,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yesHintText: { fontSize: 22, color: Colors.yes, fontWeight: '800' },
});
