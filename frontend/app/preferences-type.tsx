import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { storage } from '@/lib/storage';

const CONTENT_TYPES = [
  {
    id: 'serious',
    icon: '📚',
    label: 'Serious',
    description: 'Deep dives into philosophy, science, and global affairs.',
  },
  {
    id: 'fun',
    icon: '🎉',
    label: 'Fun',
    description: 'Lighthearted trivia, pop culture, and daily brain teasers.',
  },
  {
    id: 'controversial',
    icon: '⚖️',
    label: 'Controversial',
    description: 'Unpopular opinions and debates that challenge the status quo.',
  },
];

export default function PreferencesTypeScreen() {
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    await storage.setItem('pref_content_type', selected);
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Seppiks</Text>
        <TouchableOpacity style={styles.settingsIcon}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={styles.progressDot} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What kind of{'\n'}questions do you{'\n'}prefer?</Text>
        <Text style={styles.subtitle}>
          Tailor your feed by choosing the topics that spark your curiosity.
        </Text>

        <View style={styles.list}>
          {CONTENT_TYPES.map(item => {
            const isSelected = selected === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>STEP 2 OF 3</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.gold },
  settingsIcon: { padding: 4 },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  progressDot: {
    height: 4,
    width: 28,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressActive: { backgroundColor: Colors.gold },
  progressDone: { backgroundColor: Colors.goldLight },
  scroll: { paddingHorizontal: Spacing.lg },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  list: { gap: Spacing.sm },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceElevated,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  cardIcon: { fontSize: 22 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: Colors.gold },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
  },
  cardLabel: { fontSize: 17, fontWeight: '700', color: Colors.white, marginTop: 4 },
  cardDescription: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 19 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 36,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  continueBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.gold,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#1A1200' },
  stepText: { fontSize: 12, color: Colors.textMuted, letterSpacing: 1 },
});
