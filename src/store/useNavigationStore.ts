import { create } from 'zustand';
import { NavigationConfig, HeaderMenuItem } from '../types/navigation';
import { DEFAULT_NAVIGATION_CONFIG } from '../data/defaultNavigation';
import { api } from '../services/api';

interface NavigationState {
  config: NavigationConfig;
  isLoading: boolean;
  hasLoaded: boolean;
  fetchNavigation: () => Promise<void>;
  saveNavigation: (newConfig: NavigationConfig) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  setHeaderItems: (items: HeaderMenuItem[]) => void;
  updateHeaderItem: (itemId: string, updates: Partial<HeaderMenuItem>) => void;
  addHeaderItem: (item: Omit<HeaderMenuItem, 'id'>) => void;
  removeHeaderItem: (itemId: string) => void;
  reorderHeaderItems: (startIndex: number, endIndex: number) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => {
  // Listen to custom window events for immediate cross-component reactivity
  if (typeof window !== 'undefined') {
    window.addEventListener('tanoah_navigation_updated', ((e: CustomEvent<NavigationConfig>) => {
      if (e.detail && Array.isArray(e.detail.header_menu)) {
        set({ config: e.detail });
      }
    }) as EventListener);
  }

  return {
    config: DEFAULT_NAVIGATION_CONFIG,
    isLoading: false,
    hasLoaded: false,

    fetchNavigation: async () => {
      set({ isLoading: true });
      try {
        const loaded = await api.getNavigationConfig();
        set({ config: loaded, isLoading: false, hasLoaded: true });
      } catch (err) {
        console.error('Failed to fetch navigation config:', err);
        set({ config: DEFAULT_NAVIGATION_CONFIG, isLoading: false, hasLoaded: true });
      }
    },

    saveNavigation: async (newConfig: NavigationConfig) => {
      set({ isLoading: true });
      try {
        const success = await api.saveNavigationConfig(newConfig);
        if (success) {
          set({ config: newConfig, isLoading: false });
        } else {
          set({ isLoading: false });
        }
        return success;
      } catch (err) {
        console.error('Failed to save navigation config:', err);
        set({ isLoading: false });
        return false;
      }
    },

    resetToDefaults: async () => {
      set({ isLoading: true });
      try {
        const resetConfig: NavigationConfig = {
          header_menu: JSON.parse(JSON.stringify(DEFAULT_NAVIGATION_CONFIG.header_menu)),
          updated_at: new Date().toISOString(),
        };
        const success = await api.saveNavigationConfig(resetConfig);
        if (success) {
          set({ config: resetConfig, isLoading: false });
        } else {
          set({ isLoading: false });
        }
        return success;
      } catch (err) {
        console.error('Failed to reset navigation config:', err);
        set({ isLoading: false });
        return false;
      }
    },

    setHeaderItems: (items: HeaderMenuItem[]) => {
      set((state) => ({
        config: {
          ...state.config,
          header_menu: items,
        },
      }));
    },

    updateHeaderItem: (itemId: string, updates: Partial<HeaderMenuItem>) => {
      set((state) => ({
        config: {
          ...state.config,
          header_menu: state.config.header_menu.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        },
      }));
    },

    addHeaderItem: (itemData: Omit<HeaderMenuItem, 'id'>) => {
      const newItem: HeaderMenuItem = {
        ...itemData,
        id: `nav_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sort_order: get().config.header_menu.length,
      };
      set((state) => ({
        config: {
          ...state.config,
          header_menu: [...state.config.header_menu, newItem],
        },
      }));
    },

    removeHeaderItem: (itemId: string) => {
      set((state) => ({
        config: {
          ...state.config,
          header_menu: state.config.header_menu.filter((item) => item.id !== itemId),
        },
      }));
    },

    reorderHeaderItems: (startIndex: number, endIndex: number) => {
      set((state) => {
        const items = [...state.config.header_menu];
        const [movedItem] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, movedItem);

        // Update sort_order numbers
        const updated = items.map((item, idx) => ({ ...item, sort_order: idx }));
        return {
          config: {
            ...state.config,
            header_menu: updated,
          },
        };
      });
    },
  };
});
