import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { storage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const AGE_GROUPS = [
  { id: '18_24', label: '18 – 24', description: 'Gen Z & early Millennials' },
  { id: '25_34', label: '25 – 34', description: 'Core Millennials' },
  { id: '35_44', label: '35 – 44', description: 'Older Millennials & Gen X' },
  { id: '45_plus', label: '45+',   description: 'Gen X & Boomers' },
];

const GENDERS = [
  { id: 'male',   label: 'Male',   icon: '♂' },
  { id: 'female', label: 'Female', icon: '♀' },
  { id: 'other',  label: 'Other',  icon: '⚬' },
];

export default function DemographicsScreen() {
  const { user } = useAuth();
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [gender,   setGender]   = useState<string | null>(null);
  const [region,   setRegion]   = useState('');
  const [saving,   setSaving]   = useState(false);

  const persist = async () => {
    await Promise.all([
      storage.setItem('demo_age_group', ageGroup ?? ''),
      storage.setItem('demo_gender',    gender   ?? ''),
      storage.setItem('demo_region',    region.trim()),
    ]);

    // If the user is already signed in (e.g. returning user editing prefs),
    // write straight to Supabase now
    if (user) {
      try {
        await supabase.from('profiles').update({
          ...(ageGroup      ? { age_group: ageGroup }      : {}),
          ...(gender        ? { gender }                   : {}),
          ...(region.trim() ? { region: region.trim() }   : {}),
        }).eq('id', user.id);
      } catch {
        // Non-fatal
      }
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    await persist();
    setSaving(false);
    router.push('/login');
  };

  const handleSkip = async () => {
    await Promise.all([
      storage.setItem('demo_age_group', ''),
      storage.setItem('demo_gender',    ''),
      storage.setItem('demo_region',    ''),
    ]);
    router.push('/login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Seppiks</Text>
      </View>

      {/* Progress — 4 dots, step 3 active */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={styles.progressDot} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>About{'\n'}you</Text>
        <Text style={styles.subtitle}>
          Help us personalise your experience and contribute to richer collective insights.
          This is completely optional.
        </Text>

        {/* Gender */}
        <Text style={styles.sectionLabel}>GENDER</Text>
        <View style={styles.genderRow}>
          {GENDERS.map(item => {
            const isSelected = gender === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.genderCard, isSelected && styles.cardSelected]}
                onPress={() => setGender(prev => prev === item.id ? null : item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.genderIcon}>{item.icon}</Text>
                <Text style={[styles.genderLabel, isSelected && styles.genderLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Age group */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>AGE GROUP</Text>
        <View style={styles.ageGrid}>
          {AGE_GROUPS.map(item => {
            const isSelected = ageGroup === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.ageCard, isSelected && styles.cardSelected]}
                onPress={() => setAgeGroup(prev => prev === item.id ? null : item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.ageLabel}>{item.label}</Text>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={styles.ageDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Region */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>REGION / COUNTRY</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g. United States, Germany, Brazil…"
          placeholderTextColor={Colors.textMuted}
          value={region}
          onChangeText={setRegion}
          autoCorrect={false}
          returnKeyType="done"
        />
        <Text style={styles.inputHint}>City, country, or region — whatever feels comfortable.</Text>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.continueBtn, saving && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
          <Text style={styles.stepText}>STEP 3 OF 4</Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.lg,
    paddingTop:        56,
    paddingBottom:     Spacing.sm,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.gold },
  progressRow: {
    flexDirection:     'row',
    gap:               6,
    paddingHorizontal: Spacing.lg,
    marginBottom:      Spacing.md,
  },
  progressDot:    { height: 4, width: 28, borderRadius: 2, backgroundColor: Colors.border },
  progressActive: { backgroundColor: Colors.gold },
  progressDone:   { backgroundColor: Colors.goldLight },
  scroll:         { paddingHorizontal: Spacing.lg },
  title: {
    fontSize:      40,
    fontWeight:    '900',
    color:         Colors.white,
    lineHeight:    46,
    letterSpacing: -1,
    marginBottom:  Spacing.sm,
  },
  subtitle: {
    fontSize:     15,
    color:        Colors.textSecondary,
    lineHeight:   22,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '700',
    color:         Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom:  Spacing.sm,
  },

  // Gender
  genderRow: { flexDirection: 'row', gap: Spacing.sm },
  genderCard: {
    flex:            1,
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     Colors.border,
    gap:             6,
  },
  cardSelected: {
    borderColor:     Colors.gold,
    backgroundColor: Colors.surfaceElevated,
  },
  genderIcon:  { fontSize: 22, color: Colors.textSecondary },
  genderLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  genderLabelSelected: { color: Colors.gold },

  // Age group
  ageGrid: { gap: Spacing.sm },
  ageCard: {
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    borderWidth:     1.5,
    borderColor:     Colors.border,
  },
  cardTopRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   4,
  },
  ageLabel:       { fontSize: 17, fontWeight: '700', color: Colors.white },
  ageDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  radio: {
    width:          22,
    height:         22,
    borderRadius:   11,
    borderWidth:    1.5,
    borderColor:    Colors.border,
    justifyContent: 'center',
    alignItems:     'center',
  },
  radioSelected:  { borderColor: Colors.gold },
  radioDot: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: Colors.gold,
  },

  // Region
  input: {
    backgroundColor:   Colors.card,
    borderRadius:      Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:   14,
    color:             Colors.white,
    fontSize:          16,
    borderWidth:       1.5,
    borderColor:       Colors.border,
  },
  inputHint: {
    fontSize:   12,
    color:      Colors.textMuted,
    marginTop:  6,
    lineHeight: 18,
  },

  // Bottom bar
  bottomBar: {
    marginTop:   Spacing.xl,
    paddingBottom: 36,
    alignItems:  'center',
    gap:         Spacing.sm,
  },
  continueBtn: {
    width:           '100%',
    height:          56,
    backgroundColor: Colors.gold,
    borderRadius:    Radius.xl,
    justifyContent:  'center',
    alignItems:      'center',
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#1A1200' },
  skipText:        { fontSize: 14, color: Colors.textSecondary },
  stepText:        { fontSize: 12, color: Colors.textMuted, letterSpacing: 1 },
});
