import React, { useRef, useState, useCallback } from 'react';
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
const SWIPE_THRESHOLD = width * 0.2;
const ROTATION_FACTOR = 30;

export default function HomeScreen() {
  const { user } = useAuth();
  console.log('[HomeScreen] Mounting... User is:', !!user);
  const { questions, loading, loadMore, removeQuestion } = useQuestions();
  console.log('[HomeScreen] useQuestions output -> loading:', loading, 'questions:', questions.length);
  const [votedQuestion, setVotedQuestion] = useState<{ q: Question; vote: 'yes' | 'no' } | null>(null);
  const isSwiping = useRef(false);

  // Animated values
  const position = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentQuestion = questions[0];
  const nextQuestion = questions[1];

  const rotate = position.x.interpolate({
    inputRange: [-width * 1.8, -width, -width / 2, 0, width / 2, width, width * 1.8],
    outputRange: ['-540deg', '-60deg', '-15deg', '0deg', '15deg', '60deg', '540deg'],
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
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  const nextOpacity = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [0.9, 0.6, 0.9],
    extrapolate: 'clamp',
  });

  const castVote = useCallback(async (question: Question, vote: 'yes' | 'no') => {
    if (!user) return;
    const voteValue = vote === 'yes' ? 1 : 0;

    // Optimistic update
    removeQuestion(question.id);
    setVotedQuestion({ q: question, vote });

    await supabase.from('votes').insert({
      user_id: user.id,
      question_id: question.id,
      vote: voteValue,
    });

    // Update counts
    const field = vote === 'yes' ? 'yes_count' : 'no_count';
    await supabase.rpc('increment_vote', { q_id: question.id, vote_field: field });

    // Preload more
    if (questions.length <= 3) loadMore();
  }, [user, questions.length, removeQuestion, loadMore]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSwiping.current,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only accept the gesture if it's horizontal and not swiping
        return !isSwiping.current && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gesture) => {
        if (isSwiping.current) return;

        // "Automatic" feel: as soon as we detect a clear side swipe (20px), trigger the full action
        if (Math.abs(gesture.dx) > 20) {
          swipeOut(gesture.dx > 0 ? 'right' : 'left', gesture.dy, gesture.vy);
          return;
        }

        // Slight movement feedback before the "snap" trigger
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (isSwiping.current) return;
        // Factor in velocity to make "flicking" work smoothly
        const forceX = gesture.dx + gesture.vx * 200;
        if (forceX > SWIPE_THRESHOLD) swipeOut('right', gesture.dy, gesture.vy);
        else if (forceX < -SWIPE_THRESHOLD) swipeOut('left', gesture.dy, gesture.vy);
        else resetPosition();
      },
      onPanResponderTerminate: (_, gesture) => {
        if (isSwiping.current) return;
        const forceX = gesture.dx + gesture.vx * 200;
        if (forceX > SWIPE_THRESHOLD) swipeOut('right', gesture.dy, gesture.vy);
        else if (forceX < -SWIPE_THRESHOLD) swipeOut('left', gesture.dy, gesture.vy);
        else resetPosition();
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 6,
      tension: 60,
    }).start();
  };

  const swipeOut = useCallback((direction: 'left' | 'right', currentDy: number = 0, vy: number = 0) => {
    if (!currentQuestion || isSwiping.current) return;
    isSwiping.current = true;

    // Fly way off screen with a dramatic arc and spin
    const targetX = direction === 'right' ? width * 1.8 : -width * 1.8;
    // Strong downward arc that feels "not straight"
    const targetY = currentDy + (vy * 100) + 400;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: targetX, y: targetY },
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      castVote(currentQuestion, direction === 'right' ? 'yes' : 'no');
      position.setValue({ x: 0, y: 0 });
      opacity.setValue(1);
      isSwiping.current = false;
    });
  }, [currentQuestion, position, opacity, castVote]);

  const handleComments = () => {
    if (!currentQuestion) return;
    router.push({ pathname: '/comments/[id]', params: { id: currentQuestion.id } });
  };

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
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
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
                transform: [
                  { scale: nextScale },
                ],
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
                opacity,
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
                <View
                  style={[
                    styles.progressFill,
                    { width: `${yesPercent}%` as any }
                  ]}
                />
                <View
                  style={[
                    styles.progressFillNo,
                    { width: `${noPercent}%` as any }
                  ]}
                />
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

      {/* Swipe action indicators */}
      <View style={styles.swipeIndicators}>
        <TouchableOpacity style={styles.noHint} onPress={() => swipeOut('left', 0, 0)} activeOpacity={0.7}>
          <Text style={styles.noHintText}>✗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.yesHint} onPress={() => swipeOut('right', 0, 0)} activeOpacity={0.7}>
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
    transform: [{ scale: 0.96 }, { translateY: 12 }, { rotate: '-2deg' }],
    opacity: 0.8,
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
