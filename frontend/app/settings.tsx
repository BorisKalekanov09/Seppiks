import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Switch
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { storage } from '@/lib/storage';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const handleResetPreferences = async () => {
    Alert.alert('Reset Preferences', 'This will clear your category and content preferences.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await storage.removeItem('pref_categories');
          await storage.removeItem('pref_content_type');
          router.push('/preferences');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert('Delete Account', 'This action cannot be undone. All your data will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await supabase.from('votes').delete().eq('user_id', user.id);
          await supabase.from('comments').delete().eq('user_id', user.id);
          await supabase.from('profiles').delete().eq('id', user.id);
          await supabase.auth.admin.deleteUser(user.id).catch(() => {});
          await signOut();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Account section */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{user?.email}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Member since</Text>
          <Text style={styles.rowValue}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </Text>
        </View>
      </View>

      {/* Preferences section */}
      <Text style={styles.sectionTitle}>PREFERENCES</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleResetPreferences} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Category Interests</Text>
          <Text style={styles.rowAction}>Edit ›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => router.push('/preferences-type')} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Content Type</Text>
          <Text style={styles.rowAction}>Edit ›</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: Colors.border, true: Colors.gold }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Danger zone */}
      <Text style={styles.sectionTitle}>DANGER ZONE</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={[styles.rowLabel, styles.danger]}>Sign Out</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Text style={[styles.rowLabel, styles.danger]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Seppiks v1.0.0</Text>
        <Text style={styles.footerText}>Real people. Real decisions.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.lg,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 24, color: Colors.white },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  rowLabel: { fontSize: 15, color: Colors.white, fontWeight: '500' },
  rowValue: { fontSize: 14, color: Colors.textSecondary, maxWidth: '55%', textAlign: 'right' },
  rowAction: { fontSize: 15, color: Colors.gold, fontWeight: '600' },
  danger: { color: Colors.no },
  footer: { alignItems: 'center', marginTop: Spacing.xxl, gap: 4 },
  footerText: { fontSize: 12, color: Colors.textMuted },
});
