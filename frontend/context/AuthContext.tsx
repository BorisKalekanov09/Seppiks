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
    console.log('[AuthContext] ===== Initializing session restore =====');
    
    let isInitialCheckDone = false;
    let hasSetLoadingFalse = false;
    
    // Safety timeout: if nothing happens after 5 seconds, force loading false
    const safetyTimeout = setTimeout(() => {
      console.log('[AuthContext] SAFETY TIMEOUT: forcing loading to false after 5s');
      if (!hasSetLoadingFalse) {
        setLoading(false);
        hasSetLoadingFalse = true;
      }
    }, 5000);
    
    console.log('[AuthContext] Setting up onAuthStateChange subscriber...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] *** onAuthStateChange fired ***', _event, session ? `User: ${session.user?.email}` : 'No session');
      setSession(session);
      isInitialCheckDone = true;
      if (!hasSetLoadingFalse) {
        setLoading(false);
        hasSetLoadingFalse = true;
        console.log('[AuthContext] Setting loading to false from onAuthStateChange');
      }
      clearTimeout(safetyTimeout);
      if (session && session.user) {
        setTimeout(async () => {
          try {
            const cats = await storage.getItem('pref_categories');
            if (cats) {
              const parsed = JSON.parse(cats);
              console.log('[AuthContext] Syncing preferences to Supabase:', parsed);
              const { error } = await supabase.from('preferences').upsert(
                { user_id: session.user.id, categories: parsed },
                { onConflict: 'user_id' }
              );
              if (error) console.error('[AuthContext] Error syncing:', error);
              else console.log('[AuthContext] Syncing preferences complete');
            }
          } catch (err) {
            console.warn('Failed to sync local preferences to Supabase', err);
          }
        }, 0);
      }
    });

    // Also restore initial session
    console.log('[AuthContext] Calling getSession...');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] *** getSession returned ***:', session ? `User: ${session.user?.email}` : 'No session');
      if (session && !hasSetLoadingFalse) {
        setSession(session);
        isInitialCheckDone = true;
        setLoading(false);
        hasSetLoadingFalse = true;
        console.log('[AuthContext] Setting loading to false from getSession');
      }
      clearTimeout(safetyTimeout);
    }).catch((err) => {
      console.error('[AuthContext] getSession error:', err);
      clearTimeout(safetyTimeout);
      if (!hasSetLoadingFalse) {
        setLoading(false);
        hasSetLoadingFalse = true;
      }
    });

    return () => {
      console.log('[AuthContext] Cleanup: unsubscribing');
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
