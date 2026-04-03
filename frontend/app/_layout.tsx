import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

function RootLayoutNav() {
  const { session, loading } = useAuth();

  useEffect(() => {
    console.log('[RootLayoutNav] State changed:', { loading, hasSession: !!session, email: session?.user?.email });
    if (loading) {
      console.log('[RootLayoutNav] Still loading, not routing');
      return;
    }
    console.log('[RootLayoutNav] Loading complete, making routing decision');
    if (session) {
      console.log('[RootLayoutNav] ✓ Session found, routing to /(tabs)');
      router.replace('/(tabs)');
    } else {
      console.log('[RootLayoutNav] ✗ No session, routing to /onboarding');
      router.replace('/onboarding');
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="preferences-type" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="comments/[id]"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <AuthProvider>
          <RootLayoutNav />
          <StatusBar style="light" />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
