import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// In-memory fallback for when native modules are unavailable
const memoryStorage = new Map<string, string>();
const isWeb = Platform.OS === 'web';

// Matches Supabase auth token keys, e.g. "sb-zexkvpvkgnsycmhkmrkq-auth-token"
const SUPABASE_AUTH_KEY_RE = /^sb-[a-z0-9]+-auth-token$/;

/**
 * Checks whether a raw stored Supabase session JSON has an expired access token.
 * When the access token is expired, Supabase will try to refresh it. If the
 * refresh token has also been invalidated server-side (e.g. after a project
 * pause on the free tier), Supabase retries up to ~3 times and logs an
 * AuthApiError for each attempt. Returning null here prevents Supabase from
 * ever seeing the stale token and eliminates those error logs.
 */
function isExpiredSupabaseSession(raw: string): boolean {
  try {
    const { expires_at } = JSON.parse(raw);
    return typeof expires_at === 'number' && expires_at * 1000 < Date.now();
  } catch {
    return true; // unparseable value — treat as stale
  }
}

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        memoryStorage.set(key, value);
        return;
      }
    }

    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch {
      // fall through to SecureStore
    }

    try {
      if (SecureStore?.setItemAsync) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch {
      // fall through to memory
    }

    memoryStorage.set(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    let value: string | null = null;

    if (isWeb) {
      try {
        value = typeof window !== 'undefined'
          ? window.localStorage.getItem(key)
          : (memoryStorage.get(key) ?? null);
      } catch {
        value = memoryStorage.get(key) ?? null;
      }
    } else {
      try {
        if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
          const v = await AsyncStorage.getItem(key);
          if (v !== null) value = v;
        }
      } catch {
        // fall through
      }

      if (value === null) {
        try {
          if (SecureStore?.getItemAsync) {
            const v = await SecureStore.getItemAsync(key);
            if (v !== null) value = v;
          }
        } catch {
          // fall through
        }
      }

      if (value === null) {
        value = memoryStorage.get(key) ?? null;
      }
    }

    // Proactively clear expired Supabase auth sessions before returning them.
    // When an access token has expired, Supabase will attempt to refresh it
    // using the stored refresh token. If the refresh token is also invalid
    // (e.g. after a free-tier project pause), Supabase retries ~3 times and
    // logs an AuthApiError on each attempt. Returning null here prevents those
    // retries entirely. Trade-off: re-login is required after the 1-hour access
    // token lifetime, even if the refresh token is still valid server-side.
    if (value !== null && SUPABASE_AUTH_KEY_RE.test(key) && isExpiredSupabaseSession(value)) {
      await this.removeItem(key);
      return null;
    }

    return value;
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      } catch {
        memoryStorage.delete(key);
      }
      return;
    }

    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch {
      // fall through
    }

    try {
      if (SecureStore?.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch {
      // fall through
    }

    memoryStorage.delete(key);
  },

  async clear(): Promise<void> {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') window.localStorage.clear();
      } catch {
        memoryStorage.clear();
      }
      return;
    }

    try {
      if (AsyncStorage && typeof AsyncStorage.clear === 'function') {
        await AsyncStorage.clear();
        return;
      }
    } catch {
      // ignore
    }

    memoryStorage.clear();
  },
};
