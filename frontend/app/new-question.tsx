import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function NewQuestionScreen() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Relationships');
  const [loading, setLoading] = useState(false);

  const categories = ['Relationships', 'Career', 'Lifestyle', 'Finance', 'Ethics', 'Other'];

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('questions').insert({
        text: text.trim(),
        category,
        author_id: user.id,
      });

      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error('[NewQuestion] Post error:', err);
      alert('Failed to post question. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Question</Text>
        <TouchableOpacity 
          style={[styles.postBtn, !text.trim() && styles.postBtnDisabled]} 
          onPress={handlePost}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Text style={styles.postText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.mainTitle}>Ask the{'\n'}Collective</Text>
        <Text style={styles.subtitle}>Present your dilemma to the world.{'\n'}Get clarity from the many.</Text>

        <Text style={styles.sectionLabel}>THE DILEMMA</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Would you rather..."
          placeholderTextColor={Colors.textMuted}
          multiline
          value={text}
          onChangeText={setText}
          maxLength={200}
        />

        <Text style={styles.sectionLabel}>VISUAL CONTEXT</Text>
        <TouchableOpacity style={styles.imageBox}>
          <Text style={styles.imageIcon}>🖼️</Text>
          <Text style={styles.imageText}>Add Image</Text>
        </TouchableOpacity>

        <View style={styles.categoryHeader}>
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <Text style={styles.categoryHint}>Scroll to explore</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoryContainer}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>RESPONSE LOGIC</Text>
        <View style={styles.logicBox}>
          <View style={styles.logicRow}>
            <View style={styles.dotGold} />
            <Text style={styles.logicText}>Binary Choice</Text>
            <Text style={styles.checkIcon}>☑️</Text>
          </View>
          <View style={[styles.logicRow, styles.logicRowInactive]}>
            <View style={styles.dotGray} />
            <Text style={styles.logicTextInactive}>Multi-selection</Text>
            <View style={styles.circleEmpty} />
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  headerBtn: { paddingVertical: 8 },
  cancelText: { color: Colors.gold, fontSize: 16 },
  headerTitle: { color: Colors.gold, fontSize: 16, fontWeight: '700' },
  postBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    width: 65,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.5 },
  postText: { color: Colors.background, fontSize: 14, fontWeight: '700' },
  content: { paddingHorizontal: Spacing.lg },
  mainTitle: { fontSize: 40, fontWeight: '900', color: Colors.white, lineHeight: 44, marginTop: Spacing.lg },
  subtitle: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.gold, letterSpacing: 1.5, marginBottom: Spacing.md, marginTop: Spacing.lg },
  textInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.white,
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imageBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIcon: { fontSize: 32, marginBottom: Spacing.xs },
  imageText: { color: Colors.textSecondary, fontSize: 14 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  categoryHint: { color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.md },
  categoriesScroll: { marginHorizontal: -Spacing.lg },
  categoryContainer: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  categoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  categoryChipText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  categoryChipTextActive: { color: Colors.background, fontWeight: '700' },
  logicBox: {
    gap: Spacing.sm,
  },
  logicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  logicRowInactive: {
    backgroundColor: 'transparent',
  },
  dotGold: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold, marginRight: Spacing.sm },
  dotGray: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border, marginRight: Spacing.sm },
  logicText: { flex: 1, color: Colors.white, fontSize: 16, fontWeight: '600' },
  logicTextInactive: { flex: 1, color: Colors.textMuted, fontSize: 16, fontWeight: '600' },
  checkIcon: { fontSize: 18 },
  circleEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
});
