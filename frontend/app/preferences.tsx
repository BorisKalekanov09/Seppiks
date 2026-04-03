import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { storage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  {
    id: 'relationships',
    icon: '❤️',
    label: 'Relationships',
    description: 'Deepen connections and understanding.',
    fullWidth: true,
  },
  {
    id: 'money',
    icon: '💰',
    label: 'Money',
    description: '',
    fullWidth: false,
  },
  {
    id: 'career',
    icon: '💼',
    label: 'Career',
    description: '',
    fullWidth: false,
  },
  {
    id: 'lifestyle',
    icon: '✨',
    label: 'Lifestyle',
    description: 'Design a life that feels authentic and balanced across every dimension.',
    fullWidth: true,
  },
  {
    id: 'health',
    icon: '🏃',
    label: 'Health',
    description: '',
    fullWidth: false,
  },
  {
    id: 'tech',
    icon: '💻',
    label: 'Tech',
    description: '',
    fullWidth: false,
  },
];

export default function PreferencesScreen() {
  const [selected, setSelected] = useState<string[]>(['relationships']);
  const { user } = useAuth();

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    await storage.setItem('pref_categories', JSON.stringify(selected));
    // If user is authenticated, persist preferences to Supabase
    if (user) {
      try {
        await supabase.from('preferences').upsert({ user_id: user.id, categories: selected });
      } catch (err) {
        // ignore for now; local storage still saves preferences
        console.warn('Failed to persist preferences to Supabase', err);
      }
    }
    router.push('/preferences-type');
  };

  // Separate full-width and half-width items
  const rows: Array<typeof CATEGORIES[0] | typeof CATEGORIES[0][]> = [];
  let i = 0;
  while (i < CATEGORIES.length) {
    if (CATEGORIES[i].fullWidth) {
      rows.push(CATEGORIES[i]);
      i++;
    } else {
      const pair = [CATEGORIES[i]];
      if (i + 1 < CATEGORIES.length && !CATEGORIES[i + 1].fullWidth) {
        pair.push(CATEGORIES[i + 1]);
        i += 2;
      } else {
        i++;
      }
      rows.push(pair);
    }
  }

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
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What interests{'\n'}you?</Text>
        <Text style={styles.subtitle}>
          Select the themes that define your journey. We'll curate your experience based on your choices.
        </Text>

        <View style={styles.grid}>
          {rows.map((row, rIdx) => {
            if (Array.isArray(row)) {
              return (
                <View key={rIdx} style={styles.row}>
                  {row.map(item => {
                    const isSelected = selected.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.halfCard, isSelected && styles.cardSelected]}
                        onPress={() => toggle(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cardIcon}>{item.icon}</Text>
                          <View style={[styles.checkCircle, isSelected && styles.checkSelected]}>
                            {isSelected && <Text style={styles.checkMark}>✓</Text>}
                          </View>
                        </View>
                        <Text style={styles.cardLabel}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            } else {
              const item = row;
              const isSelected = selected.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.fullCard, isSelected && styles.cardSelected]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardIcon}>{item.icon}</Text>
                    <View style={[styles.checkCircle, isSelected && styles.checkSelected]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </View>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  {item.description ? (
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            }
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, selected.length === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selected.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>STEP 1 OF 3</Text>
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
  scroll: { paddingHorizontal: Spacing.lg },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  grid: { gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  fullCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  halfCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 90,
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
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkMark: { fontSize: 12, color: '#1A1200', fontWeight: '800' },
  cardLabel: { fontSize: 16, fontWeight: '700', color: Colors.white, marginTop: 4 },
  cardDescription: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
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
