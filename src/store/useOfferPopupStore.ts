import { create } from 'zustand';
import { api } from '../services/api';
import { OfferPopupConfig, DEFAULT_OFFER_POPUP_CONFIG } from '../types';

const STORAGE_KEY = 'tanoah_offer_popup_config';
const DISMISSED_SESSION_KEY = 'tanoah_offer_popup_dismissed_session';
const DISMISSED_TIME_KEY = 'tanoah_offer_popup_dismissed_at';

interface OfferPopupStoreState {
  config: OfferPopupConfig;
  isOpen: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  
  openPopup: () => void;
  closePopup: () => void;
  dismissPopup: () => void;
  shouldShowPopup: () => boolean;
  fetchConfig: () => Promise<void>;
  saveConfig: (updates: Partial<OfferPopupConfig>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  updateField: <K extends keyof OfferPopupConfig>(key: K, value: OfferPopupConfig[K]) => void;
}

const getStoredConfig = (): OfferPopupConfig => {
  if (typeof window === 'undefined') return DEFAULT_OFFER_POPUP_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_OFFER_POPUP_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse stored offer popup config:', e);
  }
  return DEFAULT_OFFER_POPUP_CONFIG;
};

export const useOfferPopupStore = create<OfferPopupStoreState>((set, get) => {
  // Listen for custom window event for real-time reactivity across components and previews
  if (typeof window !== 'undefined') {
    window.addEventListener('tanoah_offer_popup_updated', ((e: CustomEvent<OfferPopupConfig>) => {
      if (e.detail) {
        set({ config: { ...DEFAULT_OFFER_POPUP_CONFIG, ...e.detail } });
      }
    }) as EventListener);
  }

  return {
    config: getStoredConfig(),
    isOpen: false,
    isLoading: false,
    hasLoaded: false,

    openPopup: () => set({ isOpen: true }),
    
    closePopup: () => set({ isOpen: false }),

    dismissPopup: () => {
      set({ isOpen: false });
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
          localStorage.setItem(DISMISSED_TIME_KEY, Date.now().toString());
        } catch (e) {
          console.warn('Failed to set dismiss flag:', e);
        }
      }
    },

    shouldShowPopup: () => {
      const { config } = get();
      if (!config.isEnabled) return false;
      if (typeof window === 'undefined') return false;

      // In 'always' mode, always trigger after delay
      if (config.frequency === 'always') return true;

      // In 'once_per_session' mode
      if (config.frequency === 'once_per_session') {
        try {
          const dismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY);
          if (dismissed === 'true') return false;
        } catch {}
        return true;
      }

      // In 'once_per_day' mode (24h cooldown)
      if (config.frequency === 'once_per_day') {
        try {
          const rawTime = localStorage.getItem(DISMISSED_TIME_KEY);
          if (rawTime) {
            const lastDismissed = parseInt(rawTime, 10);
            const oneDayMs = 24 * 60 * 60 * 1000;
            if (Date.now() - lastDismissed < oneDayMs) {
              return false;
            }
          }
        } catch {}
        return true;
      }

      return true;
    },

    fetchConfig: async () => {
      if (get().hasLoaded) return;
      set({ isLoading: true });

      try {
        const local = getStoredConfig();
        set({ config: local });

        // Fetch Supabase remote store settings if available
        const storeSettings: any = await api.getStoreSettings();
        if (storeSettings && storeSettings.offer_popup_config) {
          const merged = { ...DEFAULT_OFFER_POPUP_CONFIG, ...storeSettings.offer_popup_config };
          set({ config: merged, isLoading: false, hasLoaded: true });
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return;
        }

        set({ isLoading: false, hasLoaded: true });
      } catch (err) {
        console.error('Failed to fetch offer popup config:', err);
        set({ isLoading: false, hasLoaded: true });
      }
    },

    updateField: (key, value) => {
      set((state) => ({
        config: {
          ...state.config,
          [key]: value,
        },
      }));
    },

    saveConfig: async (updates: Partial<OfferPopupConfig>) => {
      set({ isLoading: true });
      try {
        const newConfig = { ...get().config, ...updates };
        set({ config: newConfig, isLoading: false });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
          window.dispatchEvent(
            new CustomEvent('tanoah_offer_popup_updated', { detail: newConfig })
          );
        }

        // Persist to Supabase store settings
        try {
          const currentSettings = (await api.getStoreSettings()) as any;
          await api.saveStoreSettings({
            ...currentSettings,
            offer_popup_config: newConfig,
          });
        } catch (supaErr) {
          console.warn('Could not save offer popup config to Supabase:', supaErr);
        }

        return true;
      } catch (err) {
        console.error('Failed to save offer popup config:', err);
        set({ isLoading: false });
        return false;
      }
    },

    resetToDefaults: async () => {
      set({ isLoading: true });
      try {
        const resetConfig = { ...DEFAULT_OFFER_POPUP_CONFIG };
        set({ config: resetConfig, isLoading: false });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(resetConfig));
          window.dispatchEvent(
            new CustomEvent('tanoah_offer_popup_updated', { detail: resetConfig })
          );
        }

        try {
          const currentSettings = (await api.getStoreSettings()) as any;
          await api.saveStoreSettings({
            ...currentSettings,
            offer_popup_config: resetConfig,
          });
        } catch {}

        return true;
      } catch (err) {
        console.error('Failed to reset offer popup config:', err);
        set({ isLoading: false });
        return false;
      }
    },
  };
});
