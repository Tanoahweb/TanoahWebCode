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
      const { data: { session } } = await supabase.auth.getSession();
      
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
      } else {
        set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
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
        } else {
          set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
        }
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
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
