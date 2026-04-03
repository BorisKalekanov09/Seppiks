import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0D1117', '#111827', '#0D1117']}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo */}
      <View style={styles.header}>
        <Text style={styles.logo}>Seppiks</Text>
      </View>

      {/* Hero text */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Real people.{'\n'}Real decisions.</Text>
        <Text style={styles.heroSubtitle}>Join the editorial collective{'\n'}shaping tomorrow.</Text>
      </View>

      {/* Visual card */}
      <View style={styles.visualCard}>
        <LinearGradient
          colors={['#1A2030', '#0D1117']}
          style={styles.cardGradient}
        />
        <View style={styles.glowOrb} />
        {/* Abstract swipe visual */}
        <View style={styles.swipeVisual}>
          <View style={[styles.swipeLine, { opacity: 0.15, width: '90%' }]} />
          <View style={[styles.swipeLine, { opacity: 0.25, width: '75%', top: 30 }]} />
          <View style={[styles.swipeLine, { opacity: 0.35, width: '60%', top: 55 }]} />
          <View style={[styles.swipeLine, { opacity: 0.2, width: '80%', top: 80 }]} />
          <View style={[styles.swipeLine, { opacity: 0.1, width: '95%', top: 100 }]} />
        </View>
        {/* YES / NO labels subtle */}
        <View style={styles.cardLabels}>
          <Text style={[styles.cardLabel, { color: Colors.yes }]}>YES ←</Text>
          <Text style={[styles.cardLabel, { color: Colors.no }]}>→ NO</Text>
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/preferences')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          activeOpacity={0.7}
        >
          <Text style={styles.signInText}>Sign in to existing account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginTop: 64,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.gold,
    letterSpacing: -0.5,
  },
  heroSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1,
  },
  heroSubtitle: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  visualCard: {
    marginTop: Spacing.xl,
    width: width - Spacing.lg * 2,
    height: height * 0.35,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glowOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.gold,
    opacity: 0.04,
    top: '20%',
    left: '20%',
  },
  swipeVisual: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    top: '25%',
  },
  swipeLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.gold,
  },
  cardLabels: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.6,
  },
  bottom: {
    position: 'absolute',
    bottom: 48,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.gold,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1200',
  },
  signInText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
