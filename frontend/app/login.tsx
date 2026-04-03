import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [mode, setMode] = useState<'options' | 'email'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    Alert.alert('Google Sign In', 'Google OAuth requires native setup with expo-auth-session. Configure in Supabase dashboard.');
  };

  const handleAppleLogin = async () => {
    Alert.alert('Apple Sign In', 'Apple Sign In requires native setup on iOS devices.');
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
    else router.replace('/(tabs)');
  };

  // Signup handled on separate `/signup` screen

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ width: '100%' }}
      >
        {/* Glow background */}
        <View style={styles.glowBg} />

        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>Seppiks</Text>
          <Text style={styles.logoSub}>ARCHITECTURAL ELEGANCE</Text>
        </View>

        {/* Visual */}
        <View style={styles.visualBox}>
          <View style={styles.visualInner}>
            <View style={styles.spiralOuter} />
            <View style={styles.spiralInner} />
            <View style={styles.spiralCore} />
          </View>
        </View>

        {/* Content */}
        {mode === 'options' && (
          <View style={styles.optionsSection}>
            <TouchableOpacity style={styles.appleBtn} onPress={handleAppleLogin} activeOpacity={0.85}>
              <Text style={styles.appleBtnIcon}>🍎</Text>
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.85}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <Text style={styles.dividerText}>First time here?</Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.createAccountText}>Create a new account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode('email')} style={styles.emailLinkBtn}>
              <Text style={styles.emailLinkText}>Sign in with email</Text>
            </TouchableOpacity>

            <View style={styles.legalRow}>
              <TouchableOpacity><Text style={styles.legalText}>PRIVACY POLICY</Text></TouchableOpacity>
              <TouchableOpacity><Text style={styles.legalText}>TERMS OF SERVICE</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'email' && (
          <View style={styles.formSection}>
            {/* Email sign-in form */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleEmailLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#1A1200" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode('options')} style={{ marginTop: Spacing.md }}>
              <Text style={styles.backText}>← Back to options</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C2340', alignItems: 'center' },
  glowBg: {
    position: 'absolute',
    top: height * 0.1,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#8B2525',
    opacity: 0.08,
    alignSelf: 'center',
  },
  logoSection: { marginTop: 72, alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: '900', color: Colors.gold, letterSpacing: -1 },
  logoSub: { fontSize: 11, color: Colors.textMuted, letterSpacing: 3, marginTop: 4 },
  visualBox: {
    marginTop: Spacing.xl,
    width: 280,
    height: 200,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(139, 37, 37, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 37, 37, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  visualInner: { position: 'relative', width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  spiralOuter: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(200, 169, 126, 0.2)',
  },
  spiralInner: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(200, 169, 126, 0.3)',
  },
  spiralCore: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 169, 126, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200, 169, 126, 0.5)',
  },
  optionsSection: {
    marginTop: Spacing.xl,
    width: '100%',
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appleBtn: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  appleBtnIcon: { fontSize: 20 },
  appleBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  googleBtn: {
    width: '100%',
    height: 54,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleIcon: { fontSize: 20, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  dividerRow: { marginTop: Spacing.sm },
  dividerText: { fontSize: 13, color: Colors.textSecondary },
  createAccountText: { fontSize: 15, fontWeight: '700', color: Colors.gold },
  emailLinkBtn: { marginTop: 4 },
  emailLinkText: { fontSize: 13, color: Colors.textSecondary },
  legalRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  legalText: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5 },
  formSection: {
    marginTop: Spacing.xl,
    width: '100%',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.gold,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#1A1200' },
  backText: { fontSize: 14, color: Colors.textSecondary },
});
