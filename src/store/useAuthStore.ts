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
        const isAdmin = user.email?.includes('admin') || user.user_metadata?.role === 'admin';
        
        const profile: UserProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          role: isAdmin ? 'admin' : 'customer',
        };

        set({ user, session, profile, isAdmin, isLoading: false });
      } else {
        set({ user: null, session: null, profile: null, isAdmin: false, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const user = session.user;
          const isAdmin = user.email?.includes('admin') || user.user_metadata?.role === 'admin';
          const profile: UserProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
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
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, isAdmin: false });
  },

  setProfile: (profile) => {
    set({ profile, isAdmin: profile?.role === 'admin' });
  },
}));
