import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

const supabaseUrl = 'https://zexkvpvkgnsycmhkmrkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_o-UXqdgcxmWlTR0Z327Mbg_WaGxlXRR';

console.log('[Supabase] Initializing Supabase client with custom storage adapter');
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
console.log('[Supabase] Client initialized');
