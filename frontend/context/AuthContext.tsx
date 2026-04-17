import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialized = false;

    // Safety timeout: force loading false if auth never responds
    const safetyTimeout = setTimeout(() => {
      if (!initialized) {
        setLoading(false);
        initialized = true;
      }
    }, 5000);

    // onAuthStateChange fires INITIAL_SESSION on startup, covering the getSession() case.
    // Using it as the single source of truth avoids a duplicate token-refresh attempt
    // that would otherwise happen when both onAuthStateChange and getSession() run concurrently
    // against a stale stored refresh token.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session ?? null);

      if (!initialized) {
        setLoading(false);
        initialized = true;
        clearTimeout(safetyTimeout);
      }

      // Sync locally-stored preferences and demographics to Supabase on sign-in
      if (session?.user) {
        setTimeout(async () => {
          try {
            const cats = await storage.getItem('pref_categories');
            if (cats) {
              const parsed = JSON.parse(cats);
              await supabase
                .from('preferences')
                .upsert({ user_id: session.user.id, categories: parsed }, { onConflict: 'user_id' });
            }
          } catch {
            // Non-fatal — local prefs will sync on next sign-in
          }

          try {
            const [ageGroup, gender, region] = await Promise.all([
              storage.getItem('demo_age_group'),
              storage.getItem('demo_gender'),
              storage.getItem('demo_region'),
            ]);
            const updates: Record<string, string> = {};
            if (ageGroup) updates.age_group = ageGroup;
            if (gender)   updates.gender    = gender;
            if (region?.trim()) updates.region = region.trim();
            if (Object.keys(updates).length > 0) {
              await supabase.from('profiles').update(updates).eq('id', session.user.id);
              await Promise.all([
                storage.removeItem('demo_age_group'),
                storage.removeItem('demo_gender'),
                storage.removeItem('demo_region'),
              ]);
            }
          } catch {
            // Non-fatal — demographics will sync on next sign-in
          }
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
