import { create } from 'zustand';
import { NavigationConfig, HeaderMenuItem, FooterMenuColumn, FooterMenuItem, FooterSubLink } from '../types/navigation';
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

  // Footer Management Actions
  setFooterColumns: (columns: FooterMenuColumn[]) => void;
  addFooterColumn: (title: string) => void;
  updateFooterColumn: (columnId: string, updates: Partial<FooterMenuColumn>) => void;
  removeFooterColumn: (columnId: string) => void;
  reorderFooterColumns: (startIndex: number, endIndex: number) => void;
  addFooterLink: (columnId: string, link: Omit<FooterMenuItem, 'id' | 'sort_order'>) => void;
  updateFooterLink: (columnId: string, linkId: string, updates: Partial<FooterMenuItem>) => void;
  removeFooterLink: (columnId: string, linkId: string) => void;
  reorderFooterLinks: (columnId: string, startIndex: number, endIndex: number) => void;
  setFooterBottomLinks: (links: FooterSubLink[]) => void;
  addBottomLink: (link: Omit<FooterSubLink, 'id' | 'sort_order'>) => void;
  updateBottomLink: (linkId: string, updates: Partial<FooterSubLink>) => void;
  removeBottomLink: (linkId: string) => void;
  reorderBottomLinks: (startIndex: number, endIndex: number) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => {
  // Listen to custom window events for immediate cross-component reactivity
  if (typeof window !== 'undefined') {
    window.addEventListener('tanoah_navigation_updated', ((e: CustomEvent<NavigationConfig>) => {
      if (e.detail && (Array.isArray(e.detail.header_menu) || Array.isArray(e.detail.footer_menu))) {
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
          footer_menu: JSON.parse(JSON.stringify(DEFAULT_NAVIGATION_CONFIG.footer_menu || [])),
          footer_bottom_links: JSON.parse(JSON.stringify(DEFAULT_NAVIGATION_CONFIG.footer_bottom_links || [])),
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

        const updated = items.map((item, idx) => ({ ...item, sort_order: idx }));
        return {
          config: {
            ...state.config,
            header_menu: updated,
          },
        };
      });
    },

    // Footer Management Actions
    setFooterColumns: (columns: FooterMenuColumn[]) => {
      set((state) => ({
        config: {
          ...state.config,
          footer_menu: columns,
        },
      }));
    },

    addFooterColumn: (title: string) => {
      const cols = get().config.footer_menu || [];
      const newCol: FooterMenuColumn = {
        id: `foot_col_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: title.trim(),
        sort_order: cols.length,
        is_active: true,
        links: [],
      };
      set((state) => ({
        config: {
          ...state.config,
          footer_menu: [...(state.config.footer_menu || []), newCol],
        },
      }));
    },

    updateFooterColumn: (columnId: string, updates: Partial<FooterMenuColumn>) => {
      set((state) => ({
        config: {
          ...state.config,
          footer_menu: (state.config.footer_menu || []).map((col) =>
            col.id === columnId ? { ...col, ...updates } : col
          ),
        },
      }));
    },

    removeFooterColumn: (columnId: string) => {
      set((state) => ({
        config: {
          ...state.config,
          footer_menu: (state.config.footer_menu || []).filter((col) => col.id !== columnId),
        },
      }));
    },

    reorderFooterColumns: (startIndex: number, endIndex: number) => {
      set((state) => {
        const cols = [...(state.config.footer_menu || [])];
        const [movedCol] = cols.splice(startIndex, 1);
        cols.splice(endIndex, 0, movedCol);
        const updated = cols.map((col, idx) => ({ ...col, sort_order: idx }));
        return {
          config: {
            ...state.config,
            footer_menu: updated,
          },
        };
      });
    },

    addFooterLink: (columnId: string, linkData: Omit<FooterMenuItem, 'id' | 'sort_order'>) => {
      set((state) => {
        const cols = (state.config.footer_menu || []).map((col) => {
          if (col.id !== columnId) return col;
          const newLink: FooterMenuItem = {
            ...linkData,
            id: `fl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            sort_order: col.links.length,
          };
          return {
            ...col,
            links: [...col.links, newLink],
          };
        });
        return {
          config: {
            ...state.config,
            footer_menu: cols,
          },
        };
      });
    },

    updateFooterLink: (columnId: string, linkId: string, updates: Partial<FooterMenuItem>) => {
      set((state) => {
        const cols = (state.config.footer_menu || []).map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            links: col.links.map((link) =>
              link.id === linkId ? { ...link, ...updates } : link
            ),
          };
        });
        return {
          config: {
            ...state.config,
            footer_menu: cols,
          },
        };
      });
    },

    removeFooterLink: (columnId: string, linkId: string) => {
      set((state) => {
        const cols = (state.config.footer_menu || []).map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            links: col.links.filter((link) => link.id !== linkId),
          };
        });
        return {
          config: {
            ...state.config,
            footer_menu: cols,
          },
        };
      });
    },

    reorderFooterLinks: (columnId: string, startIndex: number, endIndex: number) => {
      set((state) => {
        const cols = (state.config.footer_menu || []).map((col) => {
          if (col.id !== columnId) return col;
          const links = [...col.links];
          const [movedLink] = links.splice(startIndex, 1);
          links.splice(endIndex, 0, movedLink);
          const updatedLinks = links.map((l, idx) => ({ ...l, sort_order: idx }));
          return {
            ...col,
            links: updatedLinks,
          };
        });
        return {
          config: {
            ...state.config,
            footer_menu: cols,
          },
        };
      });
    },

    setFooterBottomLinks: (links: FooterSubLink[]) => {
      set((state) => ({
        config: {
          ...state.config,
          footer_bottom_links: links,
        },
      }));
    },

    addBottomLink: (linkData: Omit<FooterSubLink, 'id' | 'sort_order'>) => {
      const current = get().config.footer_bottom_links || [];
      const newLink: FooterSubLink = {
        ...linkData,
        id: `fbl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sort_order: current.length,
      };
      set((state) => ({
        config: {
          ...state.config,
          footer_bottom_links: [...(state.config.footer_bottom_links || []), newLink],
        },
      }));
    },

    updateBottomLink: (linkId: string, updates: Partial<FooterSubLink>) => {
      set((state) => ({
        config: {
          ...state.config,
          footer_bottom_links: (state.config.footer_bottom_links || []).map((l) =>
            l.id === linkId ? { ...l, ...updates } : l
          ),
        },
      }));
    },

    removeBottomLink: (linkId: string) => {
      set((state) => ({
        config: {
          ...state.config,
          footer_bottom_links: (state.config.footer_bottom_links || []).filter((l) => l.id !== linkId),
        },
      }));
    },

    reorderBottomLinks: (startIndex: number, endIndex: number) => {
      set((state) => {
        const links = [...(state.config.footer_bottom_links || [])];
        const [movedLink] = links.splice(startIndex, 1);
        links.splice(endIndex, 0, movedLink);
        const updated = links.map((l, idx) => ({ ...l, sort_order: idx }));
        return {
          config: {
            ...state.config,
            footer_bottom_links: updated,
          },
        };
      });
    },
  };
});

