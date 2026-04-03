import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      return Alert.alert('Error', 'Please fill in all fields.');
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: name,
        email,
      });
      Alert.alert('Check your email', 'We sent you a confirmation link.', [
        { text: 'OK', onPress: () => router.replace('/preferences') }
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header with back button */}
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seppiks</Text>
        <View style={{ width: 40 }} />
      </View>

        {/* Content */}
        <ScrollView 
          style={styles.contentContainer} 
          contentContainerStyle={styles.contentFlexBox}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Hero section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Join the{'\n'}Collective</Text>
          <Text style={styles.heroSubtitle}>Experience architectural digital luxury.</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. Alexander Voss"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="name@collective.com"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={Colors.gold}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              loading && styles.createButtonDisabled
            ]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.darkBg} />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1428',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: Colors.gold,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.gold,
    letterSpacing: -0.5,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  contentFlexBox: {
    paddingVertical: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  heroSection: {
    marginBottom: Spacing.xl,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 54,
    letterSpacing: -1,
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
  },
  formSection: {
    marginTop: Spacing.xl,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E3A52',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A52',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.white,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  createButton: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1428',
    letterSpacing: 0.5,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loginLink: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '600',
  },
});
