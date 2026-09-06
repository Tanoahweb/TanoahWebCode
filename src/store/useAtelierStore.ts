import { create } from 'zustand';
import { api } from '../services/api';

export interface AtelierSectionConfig {
  isEnabled: boolean;

  // Background Image & Positioning
  imageUrl: string;
  imageAlt: string;
  objectPosition: string;

  // Initial Preview Title (Card title before scroll expansion)
  previewTitle: string;
  showPreviewTitle: boolean;

  // Eyebrow / Badge
  showBadge: boolean;
  badgeText: string;

  // Main Heading
  showHeading: boolean;
  headingLine1: string;
  headingLine2: string;

  // Description / Editorial Copy
  showDescription: boolean;
  descriptionText: string;

  // Primary Button (Explore Collection)
  showPrimaryButton: boolean;
  primaryButtonText: string;
  primaryButtonLink: string;

  // Secondary Button (View Lookbook)
  showSecondaryButton: boolean;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

export const DEFAULT_ATELIER_CONFIG: AtelierSectionConfig = {
  isEnabled: true,

  imageUrl: '/Assets/editorial/tanoah-women-collection.jpg',
  imageAlt: 'Tanoah Women Collection',
  objectPosition: 'center 30%',

  previewTitle: "THE WOMEN'S COLLECTION",
  showPreviewTitle: true,

  showBadge: true,
  badgeText: "Tanoah \u2022 Spring / Summer '26",

  showHeading: true,
  headingLine1: 'SCULPTED SILHOUETTES,',
  headingLine2: 'EFFORTLESS GRACE',

  showDescription: true,
  descriptionText:
    'Every fold and drape celebrates artisanal mastery. Hand-selected raw silks, breathable fluid linens, and architectural Indian tailoring crafted for the contemporary woman who embraces understated luxury.',

  showPrimaryButton: true,
  primaryButtonText: "EXPLORE WOMEN'S COLLECTION",
  primaryButtonLink: '/collections/women',

  showSecondaryButton: true,
  secondaryButtonText: 'VIEW LOOKBOOK',
  secondaryButtonLink: '/lookbook',
};

const STORAGE_KEY = 'tanoah_atelier_section_config';

interface AtelierStoreState {
  config: AtelierSectionConfig;
  isLoading: boolean;
  hasLoaded: boolean;
  fetchConfig: () => Promise<void>;
  saveConfig: (updates: Partial<AtelierSectionConfig>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  updateField: <K extends keyof AtelierSectionConfig>(key: K, value: AtelierSectionConfig[K]) => void;
}

const getStoredConfig = (): AtelierSectionConfig => {
  if (typeof window === 'undefined') return DEFAULT_ATELIER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ATELIER_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse stored atelier config:', e);
  }
  return DEFAULT_ATELIER_CONFIG;
};

export const useAtelierStore = create<AtelierStoreState>((set, get) => {
  // Listen for custom window event for cross-component and cross-tab reactivity
  if (typeof window !== 'undefined') {
    window.addEventListener('tanoah_atelier_updated', ((e: CustomEvent<AtelierSectionConfig>) => {
      if (e.detail) {
        set({ config: { ...DEFAULT_ATELIER_CONFIG, ...e.detail } });
      }
    }) as EventListener);
  }

  return {
    config: getStoredConfig(),
    isLoading: false,
    hasLoaded: false,

    fetchConfig: async () => {
      set({ isLoading: true });
      try {
        // First check local storage
        const local = getStoredConfig();
        set({ config: local });

        // Optionally check Supabase store settings if available
        const storeSettings: any = await api.getStoreSettings();
        if (storeSettings && storeSettings.atelier_section_config) {
          const merged = { ...DEFAULT_ATELIER_CONFIG, ...storeSettings.atelier_section_config };
          set({ config: merged, isLoading: false, hasLoaded: true });
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return;
        }

        set({ isLoading: false, hasLoaded: true });
      } catch (err) {
        console.error('Failed to fetch atelier config:', err);
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

    saveConfig: async (updates: Partial<AtelierSectionConfig>) => {
      set({ isLoading: true });
      try {
        const newConfig = { ...get().config, ...updates };
        set({ config: newConfig, isLoading: false });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
          window.dispatchEvent(
            new CustomEvent('tanoah_atelier_updated', { detail: newConfig })
          );
        }

        // Persist to Supabase store settings
        try {
          await api.saveStoreSettings({
            ...((await api.getStoreSettings()) as any),
            atelier_section_config: newConfig,
          });
        } catch (supaErr) {
          console.warn('Could not save to Supabase remote store settings:', supaErr);
        }

        return true;
      } catch (err) {
        console.error('Failed to save atelier config:', err);
        set({ isLoading: false });
        return false;
      }
    },

    resetToDefaults: async () => {
      set({ isLoading: true });
      try {
        const resetConfig = { ...DEFAULT_ATELIER_CONFIG };
        set({ config: resetConfig, isLoading: false });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(resetConfig));
          window.dispatchEvent(
            new CustomEvent('tanoah_atelier_updated', { detail: resetConfig })
          );
        }

        try {
          await api.saveStoreSettings({
            ...((await api.getStoreSettings()) as any),
            atelier_section_config: resetConfig,
          });
        } catch {}

        return true;
      } catch (err) {
        console.error('Failed to reset atelier config:', err);
        set({ isLoading: false });
        return false;
      }
    },
  };
});
