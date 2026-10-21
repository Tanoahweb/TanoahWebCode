import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'customer' | 'admin';
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
}

/**
 * Verify whether an authenticated Supabase user possesses genuine admin privileges.
 * 1. Cryptographically signed app_metadata (sealed by Supabase Auth server, cannot be forged by client).
 * 2. Active record in public.admin_users table.
 */
const verifyAdminPrivileges = async (user: User): Promise<boolean> => {
  if (user.app_metadata?.role === 'admin') {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('email', user.email || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data?.is_active) {
      return true;
    }
  } catch (err) {
    console.warn('[useAuthStore] Error verifying admin privileges:', err);
  }

  return false;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAdmin: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        // If the stored refresh token is expired or invalid (HTTP 400), cleanly purge the dead session
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          if (typeof window !== 'undefined') {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                localStorage.removeItem(k);
              }
            }
          }
        }
        set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
        return;
      }

      const session = data?.session;
      if (session?.user) {
        const user = session.user;
        const isAdmin = await verifyAdminPrivileges(user);
        
        const profile: UserProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || (isAdmin ? 'Tanoah Administrator' : ''),
          phone: user.user_metadata?.phone || '',
          role: isAdmin ? 'admin' : 'customer',
        };

        set({ user, session, profile, isAdmin, isLoading: false });

        // Clean up OAuth access_token hash from URL bar after session is saved
        if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || (!session && event === 'TOKEN_REFRESHED')) {
          set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
          return;
        }

        if (session?.user) {
          const user = session.user;
          const isAdmin = await verifyAdminPrivileges(user);
          const profile: UserProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || (isAdmin ? 'Tanoah Administrator' : ''),
            phone: user.user_metadata?.phone || '',
            role: isAdmin ? 'admin' : 'customer',
          };
          set({ user, session, profile, isAdmin, isLoading: false });

          if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
        }
      });
    } catch (err) {
      console.warn('[useAuthStore] Auth initialization error (handled):', err);
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[useAuthStore] Sign out error:', e);
    }
    set({ user: null, session: null, profile: null, isAdmin: false });
  },

  setProfile: (profile) => {
    set({ profile, isAdmin: profile?.role === 'admin' });
  },
}));
