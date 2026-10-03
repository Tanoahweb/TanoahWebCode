import { create } from 'zustand';
import { api } from '../services/api';

export interface EditorialLookbookConfig {
  isEnabled: boolean;

  // Main Hero Image (Left, 3:4 / 4:5 aspect ratio)
  heroImage: string;
  heroAlt: string;
  tag: string;

  // Floating Detail Inset Card (Bottom-right, 3:4 aspect ratio)
  detailImage: string;
  detailAlt: string;
  detailTag: string;

  // Editorial Copy
  volume: string;
  title: string;
  subtitle: string;
  description: string;

  // Statistics / Quality Badges
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;

  // CTA Action Buttons
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

export const DEFAULT_LOOKBOOK_CONFIG: EditorialLookbookConfig = {
  isEnabled: true,

  heroImage: '/Assets/editorial/lookbook-hero-ivory.jpg',
  heroAlt: 'TANOAH SS26 Editorial Lookbook - Botanical Linen Kurta',
  tag: 'LOOK 01 • BOTANICAL LINEN',

  detailImage: '/Assets/editorial/lookbook-detail-embroidery.jpg',
  detailAlt: 'Artisanal Hand-Loomed Linen Weave Detail',
  detailTag: 'Raised Botanical Needlework',

  volume: 'VOLUME 01 • SS26 EDITORIAL',
  title: 'AN EXPLORATION OF TEXTURE, FORM & ELEVATION',
  subtitle: 'THE BOTANICAL LINEN KURTA',
  description:
    'Every garment in the Spring / Summer 2026 collection is sculpted from pure botanical linens, heavyweight double-mercerized cottons, and fluid modal blends. We prioritize enduring design over fleeting cycles.',

  stat1Value: '100%',
  stat1Label: 'Botanical Linen Fibres',
  stat2Value: 'ARTISANAL',
  stat2Label: 'Handcrafted Precision Fit',

  primaryButtonText: 'VIEW FULL LOOKBOOK',
  primaryButtonLink: '/collections/all',
  secondaryButtonText: 'THE ART ARCHIVE',
  secondaryButtonLink: '/about',
};

const STORAGE_KEY = 'tanoah_lookbook_section_config';

interface LookbookStoreState {
  config: EditorialLookbookConfig;
  isLoading: boolean;
  hasLoaded: boolean;
  fetchConfig: () => Promise<void>;
  saveConfig: (updates: Partial<EditorialLookbookConfig>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  updateField: <K extends keyof EditorialLookbookConfig>(key: K, value: EditorialLookbookConfig[K]) => void;
}

const getStoredConfig = (): EditorialLookbookConfig => {
  if (typeof window === 'undefined') return DEFAULT_LOOKBOOK_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LOOKBOOK_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse stored lookbook config:', e);
  }
  return DEFAULT_LOOKBOOK_CONFIG;
};

export const useEditorialLookbookStore = create<LookbookStoreState>((set, get) => {
  // Cross-component and cross-tab reactive event listener
  if (typeof window !== 'undefined') {
    window.addEventListener('tanoah_lookbook_updated', ((e: CustomEvent<EditorialLookbookConfig>) => {
      if (e.detail) {
        set({ config: { ...DEFAULT_LOOKBOOK_CONFIG, ...e.detail } });
      }
    }) as EventListener);

    window.addEventListener('tanoah_settings_updated', () => {
      get().fetchConfig();
    });
  }

  return {
    config: getStoredConfig(),
    isLoading: false,
    hasLoaded: false,

    fetchConfig: async () => {
      set({ isLoading: true });
      try {
        // 1. Initial local lookup
        const local = getStoredConfig();
        set({ config: local });

        // 2. Fetch from store settings if available
        const storeSettings: any = await api.getStoreSettings();
        if (storeSettings && storeSettings.lookbook_section_config) {
          const merged = { ...DEFAULT_LOOKBOOK_CONFIG, ...storeSettings.lookbook_section_config };
          set({ config: merged, isLoading: false, hasLoaded: true });
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return;
        }

        set({ isLoading: false, hasLoaded: true });
      } catch (err) {
        console.error('Failed to fetch lookbook config:', err);
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

    saveConfig: async (updates: Partial<EditorialLookbookConfig>) => {
      set({ isLoading: true });
      try {
        const current = get().config;
        const newConfig = { ...current, ...updates };

        // Save to localStorage immediately
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        }

        // Persist to Supabase store settings
        const remoteOk = await api.saveStoreSettings({
          lookbook_section_config: newConfig,
        } as any);

        if (!remoteOk) {
          console.warn('Could not save lookbook to remote store settings, saved locally.');
        }

        set({ config: newConfig, isLoading: false });

        // Broadcast update event to all active homepage components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tanoah_lookbook_updated', {
              detail: newConfig,
            })
          );
        }

        return true;
      } catch (err) {
        console.error('Failed to save lookbook config:', err);
        set({ isLoading: false });
        return false;
      }
    },

    resetToDefaults: async () => {
      set({ isLoading: true });
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }

        try {
          await api.saveStoreSettings({
            lookbook_section_config: DEFAULT_LOOKBOOK_CONFIG,
          } as any);
        } catch (apiErr) {
          console.warn('Could not reset lookbook in remote settings:', apiErr);
        }

        set({ config: DEFAULT_LOOKBOOK_CONFIG, isLoading: false });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tanoah_lookbook_updated', {
              detail: DEFAULT_LOOKBOOK_CONFIG,
            })
          );
        }

        return true;
      } catch (err) {
        console.error('Failed to reset lookbook config:', err);
        set({ isLoading: false });
        return false;
      }
    },
  };
});
