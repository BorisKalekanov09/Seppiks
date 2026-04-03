import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// In-memory fallback storage for when native modules are unavailable
const memoryStorage = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    console.log(`[storage.setItem] START: ${key} (len: ${value.length})`);
    const startTime = Date.now();
    
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
          console.log(`[storage.setItem] Web localStorage SET: ${key} (${Date.now() - startTime}ms)`);
        }
        return;
      } catch (e) {
        console.warn(`[storage.setItem] Web localStorage error:`, e);
        memoryStorage.set(key, value);
        return;
      }
    }

    // Try AsyncStorage first
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
        console.log(`[storage.setItem] AsyncStorage SET: ${key} (${Date.now() - startTime}ms)`);
        return;
      }
    } catch (err) {
      console.warn(`[storage.setItem] AsyncStorage failed (${Date.now() - startTime}ms), trying SecureStore...`);
    }

    // Try expo-secure-store as a persistent fallback (works in Expo Go)
    try {
      if (SecureStore && SecureStore.setItemAsync) {
        await SecureStore.setItemAsync(key, value);
        console.log(`[storage.setItem] SecureStore SET: ${key} (${Date.now() - startTime}ms)`);
        return;
      }
    } catch (err) {
      console.warn(`[storage.setItem] SecureStore error (${Date.now() - startTime}ms):`, err);
    }

    // Fallback to memory
    console.log(`[storage.setItem] Memory SET: ${key} (${Date.now() - startTime}ms)`);
    memoryStorage.set(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    console.log(`[storage.getItem] START: ${key}`);
    const startTime = Date.now();
    
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') {
          const val = window.localStorage.getItem(key);
          console.log(`[storage.getItem] Web localStorage for ${key}: ${val ? 'found' : 'not found'} (${Date.now() - startTime}ms)`);
          return val;
        }
      } catch (e) {
        console.warn(`[storage.getItem] Web localStorage error:`, e);
        return memoryStorage.get(key) ?? null;
      }
      return null;
    }

    try {
      console.log(`[storage.getItem] Trying AsyncStorage for ${key}...`);
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const v = await AsyncStorage.getItem(key);
        console.log(`[storage.getItem] AsyncStorage for ${key}: ${v ? 'found' : 'not found'} (${Date.now() - startTime}ms)`);
        if (v !== null) return v;
      }
    } catch (err) {
      console.warn(`[storage.getItem] AsyncStorage error for ${key}:`, err);
    }

    try {
      console.log(`[storage.getItem] Trying SecureStore for ${key}...`);
      if (SecureStore && SecureStore.getItemAsync) {
        const v = await SecureStore.getItemAsync(key);
        console.log(`[storage.getItem] SecureStore for ${key}: ${v ? 'found' : 'not found'} (${Date.now() - startTime}ms)`);
        if (v !== null) return v;
      }
    } catch (err) {
      console.warn(`[storage.getItem] SecureStore error for ${key}:`, err);
    }

    const memVal = memoryStorage.get(key) ?? null;
    console.log(`[storage.getItem] Memory for ${key}: ${memVal ? 'found' : 'not found'} (${Date.now() - startTime}ms)`);
    return memVal;
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return;
      } catch (e) {
        memoryStorage.delete(key);
        return;
      }
    }

    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch (err) {
      // ignore
    }

    try {
      if (SecureStore && SecureStore.deleteItemAsync) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch (err) {
      // ignore
    }

    memoryStorage.delete(key);
  },

  async clear(): Promise<void> {
    if (isWeb) {
      try {
        if (typeof window !== 'undefined') window.localStorage.clear();
        return;
      } catch (e) {
        memoryStorage.clear();
        return;
      }
    }

    try {
      if (AsyncStorage && typeof AsyncStorage.clear === 'function') {
        await AsyncStorage.clear();
        return;
      }
    } catch (err) {/* ignore */}

    // No universal clear for SecureStore, do nothing or clear memory
    memoryStorage.clear();
  },
};

