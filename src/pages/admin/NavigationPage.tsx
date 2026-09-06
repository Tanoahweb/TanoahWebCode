import React, { useState, useEffect } from 'react';
import {
  Compass,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ExternalLink,
  Edit2,
  ChevronRight,
  ChevronDown,
  Layers,
  Image as ImageIcon,
  Tag,
  Link as LinkIcon,
  X,
  AlertCircle,
  Menu,
  Folder,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import {
  HeaderMenuItem,
  MegaMenuColumn,
  MegaMenuSubLink,
  MegaMenuBanner,
} from '../../types/navigation';
import { Collection } from '../../types';
import { api } from '../../services/api';
import { SingleImageDropzone } from '../../components/common/SingleImageDropzone';
import { Link } from 'react-router-dom';

export const NavigationPage: React.FC = () => {
  const { addToast } = useUIStore();
  const {
    config,
    isLoading,
    hasLoaded,
    fetchNavigation,
    saveNavigation,
    resetToDefaults,
  } = useNavigationStore();

  // Local draft state for editing before saving
  const [draftItems, setDraftItems] = useState<HeaderMenuItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewHoveredItem, setPreviewHoveredItem] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  // Edit / Add Header Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeaderMenuItem | null>(null);
  const [modalLabel, setModalLabel] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalIsActive, setModalIsActive] = useState<boolean>(true);
  const [modalHasMegaMenu, setModalHasMegaMenu] = useState(false);
  const [modalHighlightStyle, setModalHighlightStyle] = useState<'default' | 'bold' | 'colored' | 'badge'>('default');
  const [modalBadgeText, setModalBadgeText] = useState('');

  // Confirmation modal for reset
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Store collections state for collection pickers & auto-sync
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [openCollectionPickerColId, setOpenCollectionPickerColId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadCollections = async () => {
      try {
        const list = await api.getCollections();
        if (isMounted) setAvailableCollections(list || []);
      } catch (err) {
        console.warn('Failed to load collections in Navigation Studio:', err);
      }
    };
    loadCollections();

    const handleCollectionsUpdated = () => {
      loadCollections();
    };
    window.addEventListener('tanoah_collections_updated', handleCollectionsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_collections_updated', handleCollectionsUpdated);
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      fetchNavigation();
    }
  }, [hasLoaded, fetchNavigation]);

  useEffect(() => {
    if (config?.header_menu) {
      setDraftItems(JSON.parse(JSON.stringify(config.header_menu)));
      if (!selectedItemId && config.header_menu.length > 0) {
        // Default select first item that has mega menu
        const firstMega = config.header_menu.find((i) => i.has_mega_menu) || config.header_menu[0];
        setSelectedItemId(firstMega.id);
      }
    }
  }, [config]);

  const selectedItem = draftItems.find((i) => i.id === selectedItemId) || null;

  // Header Items Operations
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= draftItems.length) return;

    const updated = [...draftItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setDraftItems(updated.map((item, idx) => ({ ...item, sort_order: idx })));
  };

  const handleToggleItemActive = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetItem = draftItems.find((i) => i.id === id);
    if (!targetItem) return;
    const newActiveState = !targetItem.is_active;

    const updated = draftItems.map((item) =>
      item.id === id ? { ...item, is_active: newActiveState } : item
    );
    setDraftItems(updated);

    // Save changes to backend immediately so the admin does not need to worry
    const success = await saveNavigation({
      header_menu: updated,
      updated_at: new Date().toISOString(),
    });

    if (success) {
      addToast({
        type: newActiveState ? 'success' : 'info',
        title: newActiveState ? 'Menu Link Visible' : 'Menu Link Hidden',
        description: `"${targetItem.label}" is now ${newActiveState ? 'VISIBLE in' : 'HIDDEN from'} storefront navigation.`,
      });
    } else {
      addToast({
        type: 'info',
        title: 'Status Updated Locally',
        description: `"${targetItem.label}" set to ${newActiveState ? 'Active' : 'Hidden'}. Click "SAVE & PUBLISH" to deploy.`,
      });
    }
  };

  const handleToggleItemMegaMenu = (id: string) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newHasMega = !item.has_mega_menu;
        return {
          ...item,
          has_mega_menu: newHasMega,
          mega_menu:
            newHasMega && !item.mega_menu
              ? {
                  columns: [
                    {
                      id: `col_${Date.now()}`,
                      title: `${item.label} CATEGORIES`,
                      view_all_label: 'VIEW ALL',
                      view_all_url: item.url,
                      links: [
                        { id: `lnk_${Date.now()}_1`, label: 'All Items', url: item.url, is_active: true },
                      ],
                    },
                  ],
                  banner: {
                    id: `bnr_${Date.now()}`,
                    badge: 'FEATURED EDIT',
                    title: `${item.label} COLLECTION`,
                    image_url: '/Assets/hero/hero-mobile.jpg',
                    cta_label: 'EXPLORE COLLECTION',
                    cta_url: item.url,
                    is_active: true,
                  },
                }
              : item.mega_menu,
        };
      })
    );
  };

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setModalLabel('');
    setModalUrl('/collections/');
    setModalIsActive(true);
    setModalHasMegaMenu(false);
    setModalHighlightStyle('default');
    setModalBadgeText('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: HeaderMenuItem) => {
    setEditingItem(item);
    setModalLabel(item.label);
    setModalUrl(item.url);
    setModalIsActive(item.is_active !== false);
    setModalHasMegaMenu(item.has_mega_menu);
    setModalHighlightStyle(item.highlight_style || 'default');
    setModalBadgeText(item.badge_text || '');
    setIsItemModalOpen(true);
  };

  const handleSaveItemModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalLabel.trim() || !modalUrl.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Label and URL are required.' });
      return;
    }

    if (editingItem) {
      setDraftItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                label: modalLabel.trim().toUpperCase(),
                url: modalUrl.trim(),
                is_active: modalIsActive,
                has_mega_menu: modalHasMegaMenu,
                highlight_style: modalHighlightStyle,
                badge_text: modalHighlightStyle === 'badge' ? modalBadgeText.trim() : undefined,
                mega_menu:
                  modalHasMegaMenu && !item.mega_menu
                    ? {
                        columns: [
                          {
                            id: `col_${Date.now()}`,
                            title: `${modalLabel.trim().toUpperCase()} CATEGORIES`,
                            view_all_label: 'VIEW ALL',
                            view_all_url: modalUrl.trim(),
                            links: [{ id: `lnk_${Date.now()}`, label: 'All Items', url: modalUrl.trim(), is_active: true }],
                          },
                        ],
                      }
                    : item.mega_menu,
              }
            : item
        )
      );
      addToast({ type: 'success', title: 'Menu Item Updated', description: `Updated ${modalLabel.toUpperCase()}.` });
    } else {
      const newItem: HeaderMenuItem = {
        id: `nav_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        label: modalLabel.trim().toUpperCase(),
        url: modalUrl.trim(),
        sort_order: draftItems.length,
        is_active: modalIsActive,
        has_mega_menu: modalHasMegaMenu,
        highlight_style: modalHighlightStyle,
        badge_text: modalHighlightStyle === 'badge' ? modalBadgeText.trim() : undefined,
        mega_menu: modalHasMegaMenu
          ? {
              columns: [
                {
                  id: `col_${Date.now()}`,
                  title: `${modalLabel.trim().toUpperCase()} CATEGORIES`,
                  view_all_label: 'VIEW ALL',
                  view_all_url: modalUrl.trim(),
                  links: [{ id: `lnk_${Date.now()}`, label: 'All Items', url: modalUrl.trim(), is_active: true }],
                },
              ],
              banner: {
                id: `bnr_${Date.now()}`,
                badge: 'FEATURED EDIT',
                title: `${modalLabel.trim().toUpperCase()} CAPSULE`,
                image_url: '/Assets/hero/hero-mobile.jpg',
                cta_label: 'DISCOVER NOW',
                cta_url: modalUrl.trim(),
                is_active: true,
              },
            }
          : undefined,
      };
      setDraftItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
      addToast({ type: 'success', title: 'Menu Item Added', description: `Added "${newItem.label}".` });
    }

    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    const item = draftItems.find((i) => i.id === id);
    if (!item) return;

    if (draftItems.length <= 1) {
      addToast({ type: 'error', title: 'Cannot Delete', description: 'Storefront requires at least one menu item.' });
      return;
    }

    const updated = draftItems.filter((i) => i.id !== id);
    setDraftItems(updated.map((i, idx) => ({ ...i, sort_order: idx })));
    if (selectedItemId === id) {
      setSelectedItemId(updated[0]?.id || null);
    }
    addToast({ type: 'info', title: 'Item Removed', description: `Removed "${item.label}".` });
  };

  // Mega Menu Operations for Selected Item
  const handleAddColumn = () => {
    if (!selectedItem) return;
    const newCol: MegaMenuColumn = {
      id: `col_${Date.now()}`,
      title: 'NEW COLUMN',
      view_all_label: 'VIEW ALL',
      view_all_url: selectedItem.url,
      links: [
        { id: `lnk_${Date.now()}_1`, label: 'New Category Link', url: selectedItem.url, is_active: true },
      ],
    };

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id) return item;
        const currentCols = item.mega_menu?.columns || [];
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: [...currentCols, newCol],
          },
        };
      })
    );
  };

  const handleUpdateColumn = (colId: string, updates: Partial<MegaMenuColumn>) => {
    if (!selectedItem) return;
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.map((c) => (c.id === colId ? { ...c, ...updates } : c)),
          },
        };
      })
    );
  };

  const handleDeleteColumn = (colId: string) => {
    if (!selectedItem) return;
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.filter((c) => c.id !== colId),
          },
        };
      })
    );
  };

  const handleAddSubLink = (colId: string) => {
    if (!selectedItem) return;
    const newLink: MegaMenuSubLink = {
      id: `lnk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: 'New Link',
      url: selectedItem.url,
      is_active: true,
    };

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.map((c) =>
              c.id === colId ? { ...c, links: [...c.links, newLink] } : c
            ),
          },
        };
      })
    );
  };

  const handleUpdateSubLink = (colId: string, linkId: string, updates: Partial<MegaMenuSubLink>) => {
    if (!selectedItem) return;
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.map((c) =>
              c.id === colId
                ? {
                    ...c,
                    links: c.links.map((lnk) => (lnk.id === linkId ? { ...lnk, ...updates } : lnk)),
                  }
                : c
            ),
          },
        };
      })
    );
  };

  const handleDeleteSubLink = (colId: string, linkId: string) => {
    if (!selectedItem) return;
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.map((c) =>
              c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c
            ),
          },
        };
      })
    );
  };

  // Dynamically resolve links for a column (used in live previews & auto-sync preview)
  const resolveColumnLinksForDisplay = (col: MegaMenuColumn): MegaMenuSubLink[] => {
    if (col.auto_sync_collections) {
      const activeCols = availableCollections.filter((c) => c.is_active !== false);
      const filtered = activeCols.filter((c) => {
        if (!col.collection_filter || col.collection_filter === 'all') return true;
        const text = `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase();
        return text.includes(col.collection_filter.toLowerCase());
      });

      if (filtered.length > 0) {
        return filtered.map((c) => ({
          id: `dyn_${c.id || c.slug}`,
          label: c.title,
          url: `/collections/${c.slug}`,
          collection_slug: c.slug,
          is_active: true,
        }));
      }
    }
    return col.links || [];
  };

  // Add a specific collection as a sublink to a column
  const handleAddCollectionSubLink = (colId: string, col: Collection) => {
    if (!selectedItem) return;
    const newLink: MegaMenuSubLink = {
      id: `lnk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: col.title,
      url: `/collections/${col.slug}`,
      collection_id: col.id,
      collection_slug: col.slug,
      is_active: true,
    };

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.map((c) =>
              c.id === colId ? { ...c, links: [...c.links, newLink] } : c
            ),
          },
        };
      })
    );

    addToast({
      type: 'success',
      title: 'Collection Added',
      description: `Added "${col.title}" to ${selectedItem.label} column.`,
    });
  };

  // Batch import all store collections not currently in the column
  const handleImportAllMissingCollections = (colId: string) => {
    if (!selectedItem) return;
    const col = selectedItem.mega_menu?.columns.find((c) => c.id === colId);
    if (!col) return;

    const existingSlugs = new Set(
      col.links.map((l) => {
        if (l.collection_slug) return l.collection_slug;
        const match = l.url.match(/\/collections\/([^?#]+)/);
        return match ? match[1] : '';
      })
    );

    const missing = availableCollections.filter(
      (c) => c.is_active !== false && !existingSlugs.has(c.slug)
    );

    if (missing.length === 0) {
      addToast({
        type: 'info',
        title: 'Already In Sync',
        description: 'All store collections are already added to this column.',
      });
      return;
    }

    const newLinks: MegaMenuSubLink[] = missing.map((c, idx) => ({
      id: `lnk_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      label: c.title,
      url: `/collections/${c.slug}`,
      collection_id: c.id,
      collection_slug: c.slug,
      is_active: true,
    }));

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id || !item.mega_menu) return item;
        return {
          ...item,
          mega_menu: {
            ...item.mega_menu,
            columns: item.mega_menu.columns.map((c) =>
              c.id === colId ? { ...c, links: [...c.links, ...newLinks] } : c
            ),
          },
        };
      })
    );

    addToast({
      type: 'success',
      title: 'Collections Added',
      description: `Added ${missing.length} store collections to this column.`,
    });
  };

  // Convert auto-sync dynamic mode into static editable links
  const handleConvertAutoSyncToStatic = (colId: string) => {
    if (!selectedItem) return;
    const col = selectedItem.mega_menu?.columns.find((c) => c.id === colId);
    if (!col) return;

    const activeCols = availableCollections.filter((c) => c.is_active !== false);
    const filtered = activeCols.filter((c) => {
      if (!col.collection_filter || col.collection_filter === 'all') return true;
      const text = `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase();
      return text.includes(col.collection_filter.toLowerCase());
    });

    const staticLinks: MegaMenuSubLink[] = filtered.map((c, idx) => ({
      id: `lnk_static_${Date.now()}_${idx}`,
      label: c.title,
      url: `/collections/${c.slug}`,
      collection_id: c.id,
      collection_slug: c.slug,
      is_active: true,
    }));

    handleUpdateColumn(colId, {
      auto_sync_collections: false,
      links: staticLinks,
    });

    addToast({
      type: 'info',
      title: 'Converted to Manual Links',
      description: `Auto-sync turned off. Converted ${staticLinks.length} collections into customizable sub-links.`,
    });
  };

  // When admin selects a collection from the dropdown in an individual sub-link row
  const handleSelectCollectionForLink = (colId: string, linkId: string, chosenSlug: string) => {
    if (!chosenSlug) {
      handleUpdateSubLink(colId, linkId, { collection_slug: undefined });
      return;
    }

    const col = availableCollections.find((c) => c.slug === chosenSlug);
    if (col) {
      handleUpdateSubLink(colId, linkId, {
        label: col.title,
        url: `/collections/${col.slug}`,
        collection_id: col.id,
        collection_slug: col.slug,
      });
    }
  };

  // Banner Operations
  const handleUpdateBanner = (updates: Partial<MegaMenuBanner>) => {
    if (!selectedItem) return;
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItem.id) return item;
        const currentBanner = item.mega_menu?.banner || {
          id: `bnr_${Date.now()}`,
          badge: 'FEATURED',
          title: 'EDITORIAL CAMPAIGN',
          image_url: '/Assets/hero/hero-mobile.jpg',
          cta_label: 'DISCOVER NOW',
          cta_url: item.url,
          is_active: true,
        };
        return {
          ...item,
          mega_menu: {
            columns: item.mega_menu?.columns || [],
            banner: {
              ...currentBanner,
              ...updates,
            },
          },
        };
      })
    );
  };

  // Save All Changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    const success = await saveNavigation({
      header_menu: draftItems,
      updated_at: new Date().toISOString(),
    });
    setIsSaving(false);

    if (success) {
      addToast({
        type: 'success',
        title: 'Navigation Published',
        description: 'Header menu and mega menu changes are now live across your store.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not persist navigation changes.',
      });
    }
  };

  // Reset to Tanoah Defaults
  const handleConfirmReset = async () => {
    setIsSaving(true);
    const success = await resetToDefaults();
    setIsSaving(false);
    setIsResetModalOpen(false);

    if (success) {
      addToast({
        type: 'info',
        title: 'Reset Completed',
        description: 'Store navigation restored to original Tanoah defaults.',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins text-xs pb-24">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#3F3F8F] font-semibold text-xs tracking-wider uppercase mb-1">
              <Compass className="w-4 h-4" />
              <span>STORE OS &bull; STOREFRONT NAVIGATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-wondra text-black tracking-wide">
              HEADER MENU &amp; MEGA MENU STUDIO
            </h1>
            <p className="text-xs text-[#666666] mt-1">
              Organize top-level header links, multi-column mega menu dropdowns, promotional campaign banners, and mobile navigation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              RESET TO DEFAULTS
            </Button>

            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving || isLoading}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              {isSaving ? 'PUBLISHING...' : 'SAVE & PUBLISH'}
            </Button>
          </div>
        </div>

        {/* Live Interactive Storefront Preview Box */}
        <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#3F3F8F]" />
              <span className="font-semibold text-black uppercase tracking-wider text-[11px]">
                Interactive Storefront Preview (Hover items to test Mega Menu)
              </span>
            </div>

            <div className="flex items-center gap-1 bg-white border border-[#E7E7E7] p-0.5 rounded-[4px]">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-2.5 py-1 text-[10px] font-semibold uppercase rounded transition-colors ${
                  previewDevice === 'desktop' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
                }`}
              >
                Desktop View
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-2.5 py-1 text-[10px] font-semibold uppercase rounded transition-colors ${
                  previewDevice === 'mobile' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
                }`}
              >
                Mobile Drawer
              </button>
            </div>
          </div>

          {/* Desktop Preview */}
          {previewDevice === 'desktop' ? (
            <div
              className="relative bg-white border-b border-[#E7E7E7] min-h-[70px] select-none"
              onMouseLeave={() => setPreviewHoveredItem(null)}
            >
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Left: Dynamic Menu Links */}
                <nav className="flex items-center gap-6 text-[11px] font-semibold tracking-wider">
                  {draftItems
                    .filter((item) => item.is_active)
                    .map((item) => {
                      const isHovered = previewHoveredItem === item.id;
                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => {
                            if (item.has_mega_menu) setPreviewHoveredItem(item.id);
                            else setPreviewHoveredItem(null);
                          }}
                          className="relative py-5 cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <span
                            className={`${
                              item.highlight_style === 'colored'
                                ? 'text-red-600 font-bold'
                                : isHovered
                                ? 'text-[#3F3F8F] font-bold'
                                : 'text-black hover:text-[#3F3F8F]'
                            }`}
                          >
                            {item.label}
                          </span>

                          {item.badge_text && (
                            <span className="text-[8px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1 py-0.2 rounded font-mono">
                              {item.badge_text}
                            </span>
                          )}

                          {isHovered && (
                            <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#3F3F8F] rounded-full" />
                          )}
                        </div>
                      );
                    })}
                </nav>

                {/* Center: Brand Logo */}
                <div className="flex items-center">
                  <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-7 w-auto object-contain" />
                </div>

                {/* Right: Mock Icons */}
                <div className="flex items-center gap-4 text-neutral-400">
                  <span className="text-[10px] tracking-widest text-[#888888] font-mono">SEARCH &bull; WISHLIST &bull; BAG</span>
                </div>
              </div>

              {/* Live Mega Menu Dropdown in Preview */}
              {previewHoveredItem && (() => {
                const activeItem = draftItems.find((i) => i.id === previewHoveredItem);
                if (!activeItem || !activeItem.has_mega_menu || !activeItem.mega_menu) return null;
                const cols = activeItem.mega_menu.columns || [];
                const banner = activeItem.mega_menu.banner;

                return (
                  <div className="absolute top-full left-0 w-full bg-white border-t border-b border-[#E7E7E7] shadow-xl z-50 p-6">
                    <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
                      {cols.map((col) => {
                        const previewLinks = resolveColumnLinksForDisplay(col);
                        return (
                          <div key={col.id} className="col-span-3 border-r border-[#E7E7E7]/60 pr-4 text-left">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-black text-xs uppercase tracking-wider">{col.title}</h5>
                                {col.auto_sync_collections && (
                                  <span className="text-[8px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1 rounded">
                                    AUTO-SYNC
                                  </span>
                                )}
                              </div>
                              {col.view_all_url && (
                                <span className="text-[10px] font-semibold text-[#3F3F8F] flex items-center gap-0.5">
                                  {col.view_all_label || 'VIEW ALL'} &rarr;
                                </span>
                              )}
                            </div>
                            <ul className="space-y-2 text-[11px] text-[#666666]">
                              {previewLinks.filter((l) => l.is_active).map((lnk) => (
                                <li key={lnk.id} className="hover:text-[#3F3F8F] flex items-center justify-between">
                                  <span>{lnk.label}</span>
                                  {lnk.badge && (
                                    <span className="text-[8px] bg-neutral-100 text-neutral-600 px-1 rounded font-mono">
                                      {lnk.badge}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}

                      {/* Banner Column */}
                      {banner && banner.is_active && (
                        <div className="col-span-3">
                          <div className="relative group overflow-hidden rounded-[4px] bg-[#F8F8F8] h-44 flex flex-col justify-end p-4 border border-[#E7E7E7]">
                            <img
                              src={banner.image_url || '/Assets/hero/hero-mobile.jpg'}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className="relative z-10 text-white text-left">
                              <span className="text-[9px] tracking-widest uppercase font-poppins text-white/80 block">
                                {banner.badge}
                              </span>
                              <h6 className="font-wondra text-sm text-white font-bold mb-1 leading-tight">
                                {banner.title}
                              </h6>
                              <span className="text-[10px] text-white hover:underline uppercase font-semibold">
                                {banner.cta_label} &rarr;
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Mobile View Preview */
            <div className="bg-[#F8F8F8] p-4 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-[6px] border border-[#E7E7E7] shadow-sm p-4 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7] mb-3">
                  <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-6 w-auto" />
                  <span className="text-[10px] text-[#888888] font-mono uppercase">Mobile Drawer View</span>
                </div>

                <div className="space-y-1">
                  {draftItems.filter((i) => i.is_active).map((item) => {
                    const isExpanded = mobileExpandedSection === item.id;
                    const hasSub = item.has_mega_menu && item.mega_menu?.columns?.length;

                    return (
                      <div key={item.id} className="border-b border-[#E7E7E7]/60 pb-1">
                        <button
                          type="button"
                          onClick={() => setMobileExpandedSection(isExpanded ? null : item.id)}
                          className="w-full flex items-center justify-between py-2 text-xs font-semibold uppercase text-black"
                        >
                          <span className={item.highlight_style === 'colored' ? 'text-red-600 font-bold' : ''}>
                            {item.label}
                          </span>
                          {hasSub ? (
                            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                          ) : null}
                        </button>

                        {isExpanded && hasSub && (
                          <div className="pl-3 py-1 space-y-3 bg-[#FAFAFA] rounded p-2 mb-1">
                            {item.mega_menu?.columns.map((col) => {
                              const mobLinks = resolveColumnLinksForDisplay(col);
                              return (
                                <div key={col.id} className="space-y-1">
                                  <div className="text-[10px] font-bold text-[#3F3F8F] uppercase flex items-center gap-1">
                                    <span>{col.title}</span>
                                    {col.auto_sync_collections && (
                                      <span className="text-[7px] bg-emerald-100 text-emerald-800 px-1 rounded font-mono font-bold">
                                        SYNCED
                                      </span>
                                    )}
                                  </div>
                                  {mobLinks.filter((l) => l.is_active).map((l) => (
                                    <div key={l.id} className="text-[11px] text-[#666666] pl-2">
                                      {l.label}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Studio Workspace Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Top-Level Header Navigation Items (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#3F3F8F]" />
                  <span>Header Menu Links ({draftItems.length})</span>
                </h3>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Desktop top navigation bar items. Click <strong>VISIBLE</strong> / <strong>HIDDEN</strong> to show or hide items on your storefront.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleOpenCreateItem}
                icon={<Plus className="w-3 h-3" />}
              >
                ADD ITEM
              </Button>
            </div>

            {/* Menu Items List */}
            <div className="space-y-2">
              {draftItems.map((item, index) => {
                const isSelected = selectedItemId === item.id;
                const isItemVisible = item.is_active !== false;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-3 rounded-[4px] border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 shadow-xs'
                        : isItemVisible
                        ? 'border-[#E7E7E7] bg-white hover:border-neutral-300'
                        : 'border-dashed border-neutral-300 bg-neutral-50/70 hover:border-neutral-400'
                    }`}
                  >
                    {/* Left: Reorder & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveItem(index, 'up')}
                          className="p-1 text-neutral-400 hover:text-black disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === draftItems.length - 1}
                          onClick={() => handleMoveItem(index, 'down')}
                          className="p-1 text-neutral-400 hover:text-black disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold text-xs uppercase tracking-wide ${
                              isItemVisible ? 'text-black' : 'text-neutral-500 line-through'
                            }`}
                          >
                            {item.label}
                          </span>

                          {!isItemVisible && (
                            <span className="text-[9px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" /> HIDDEN
                            </span>
                          )}

                          {item.has_mega_menu && (
                            <span className="text-[9px] bg-[#3F3F8F] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              MEGA MENU
                            </span>
                          )}

                          {item.highlight_style === 'colored' && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">
                              SALE COLOR
                            </span>
                          )}

                          {item.badge_text && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                              {item.badge_text}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#888888] font-mono truncate mt-0.5">
                          {item.url}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Active / Hidden Visibility Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleItemActive(item.id, e)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          isItemVisible
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                        }`}
                        title={
                          isItemVisible
                            ? `Click to hide "${item.label}" from the main menu`
                            : `Click to show "${item.label}" in the main menu`
                        }
                      >
                        {isItemVisible ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>

                      {/* Edit modal */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-neutral-400 hover:text-black rounded hover:bg-neutral-100 transition-colors"
                        title="Edit Item Details & Visibility"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Mega Menu Builder for Selected Item (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-xs space-y-6">
            {selectedItem ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-[#E7E7E7] gap-3">
                  <div>
                    <span className="text-[10px] text-[#3F3F8F] uppercase font-bold tracking-wider block">
                      CONFIGURING DROPDOWN FOR:
                    </span>
                    <h3 className="font-bold text-black text-sm uppercase tracking-wider flex items-center gap-2 flex-wrap">
                      <span>{selectedItem.label}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">({selectedItem.url})</span>
                      {selectedItem.is_active === false && (
                        <span className="text-[9px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                          <EyeOff className="w-2.5 h-2.5" /> HIDDEN FROM STOREFRONT
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Direct Visibility Toggle in Header */}
                    <button
                      type="button"
                      onClick={() => handleToggleItemActive(selectedItem.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wide border transition-all ${
                        selectedItem.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                      }`}
                      title={
                        selectedItem.is_active !== false
                          ? `Click to hide "${selectedItem.label}" from storefront menu`
                          : `Click to show "${selectedItem.label}" in storefront menu`
                      }
                    >
                      {selectedItem.is_active !== false ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                      <input
                        type="checkbox"
                        checked={selectedItem.has_mega_menu}
                        onChange={() => handleToggleItemMegaMenu(selectedItem.id)}
                        className="w-4 h-4 text-[#3F3F8F] rounded focus:ring-0 cursor-pointer"
                      />
                      <span>Enable Mega Menu</span>
                    </label>
                  </div>
                </div>

                {selectedItem.has_mega_menu ? (
                  <div className="space-y-6">
                    {/* Columns Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-black uppercase tracking-wider text-xs">
                            Navigation Columns ({(selectedItem.mega_menu?.columns || []).length})
                          </h4>
                          <p className="text-[11px] text-[#666666]">
                            Each column groups related category links with an optional "View All" destination.
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={handleAddColumn}
                          icon={<Plus className="w-3 h-3" />}
                        >
                          ADD COLUMN
                        </Button>
                      </div>

                      {/* Columns List */}
                      <div className="space-y-4">
                        {(selectedItem.mega_menu?.columns || []).map((col, colIdx) => (
                          <div
                            key={col.id}
                            className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-4"
                          >
                            {/* Column Top Header */}
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#E7E7E7] pb-2.5">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-[#3F3F8F] uppercase bg-white border border-[#E0E2EE] px-2 py-0.5 rounded">
                                  Column #{colIdx + 1}
                                </span>

                                {/* Auto-sync Collections Toggle */}
                                <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-[4px] border border-[#D5D9F0] hover:border-[#3F3F8F] transition-colors shadow-2xs">
                                  <input
                                    type="checkbox"
                                    checked={col.auto_sync_collections || false}
                                    onChange={(e) =>
                                      handleUpdateColumn(col.id, {
                                        auto_sync_collections: e.target.checked,
                                      })
                                    }
                                    className="w-3.5 h-3.5 text-[#3F3F8F] rounded focus:ring-0 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-neutral-800 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-[#3F3F8F]" />
                                    ⚡ Auto-sync with Collections
                                  </span>
                                </label>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(col.id)}
                                className="text-red-500 hover:text-red-700 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" /> Remove Column
                              </button>
                            </div>

                            {/* Column Heading & View All Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                                  Column Title
                                </label>
                                <input
                                  type="text"
                                  value={col.title}
                                  onChange={(e) => handleUpdateColumn(col.id, { title: e.target.value })}
                                  placeholder="e.g. ALL COLLECTIONS, MEN, WOMEN"
                                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-semibold uppercase focus:outline-none focus:border-[#3F3F8F]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="block text-[10px] text-[#888888] uppercase font-semibold">
                                    View All Link Destination
                                  </label>
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleUpdateColumn(col.id, { view_all_url: e.target.value });
                                      }
                                    }}
                                    value=""
                                    className="text-[10px] text-[#3F3F8F] bg-transparent border-0 cursor-pointer hover:underline focus:outline-none font-semibold"
                                  >
                                    <option value="">+ Pick Collection...</option>
                                    <option value="/collections/all">All Products (/collections/all)</option>
                                    {availableCollections.map((c) => (
                                      <option key={c.id} value={`/collections/${c.slug}`}>
                                        {c.title} (/collections/{c.slug})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <input
                                  type="text"
                                  value={col.view_all_url || ''}
                                  onChange={(e) => handleUpdateColumn(col.id, { view_all_url: e.target.value })}
                                  placeholder="e.g. /collections/all or /collections/men"
                                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                                />
                              </div>
                            </div>

                            {/* Auto-Sync Mode Active View */}
                            {col.auto_sync_collections ? (
                              <div className="p-3.5 bg-gradient-to-br from-[#F5F6FC] to-[#EFF2FA] border border-[#D5DCF5] rounded-[6px] space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 relative">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-[#2B2D42] uppercase tracking-wide flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-[#3F3F8F]" />
                                      Dynamic Auto-Sync Active
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <label className="text-[10px] text-[#666666] font-semibold uppercase">Category Filter:</label>
                                    <select
                                      value={col.collection_filter || 'all'}
                                      onChange={(e) =>
                                        handleUpdateColumn(col.id, {
                                          collection_filter: e.target.value as any,
                                        })
                                      }
                                      className="text-[11px] font-semibold bg-white border border-[#D5DCF5] rounded px-2 py-1 text-neutral-800 focus:outline-none focus:border-[#3F3F8F]"
                                    >
                                      <option value="all">All Collections ({availableCollections.length})</option>
                                      <option value="men">Men's Collections Only</option>
                                      <option value="women">Women's Collections Only</option>
                                      <option value="curated">Curated & Edits Only</option>
                                    </select>
                                  </div>
                                </div>

                                <p className="text-[11px] text-[#555A7A] leading-relaxed">
                                  ⚡ <strong>All active store collections will automatically appear in this column.</strong> Whenever you add a new collection in <em>Admin &gt; Collections</em>, it will automatically be added to this list and displayed on your storefront and mobile navigation in real-time.
                                </p>

                                {/* Synced Collections Live Preview */}
                                <div className="bg-white rounded border border-[#E0E4F5] p-2.5 max-h-48 overflow-y-auto space-y-1.5">
                                  <div className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1">
                                    Currently Synced Collections ({resolveColumnLinksForDisplay(col).length}):
                                  </div>
                                  {resolveColumnLinksForDisplay(col).map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between py-1 px-2 rounded bg-[#FAFAFA] text-[11px] border border-neutral-100"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="font-semibold text-neutral-900">{item.label}</span>
                                        <span className="text-[10px] font-mono text-[#888888]">{item.url}</span>
                                      </div>
                                      <span className="text-[9px] bg-emerald-50 text-emerald-700 font-mono px-1.5 py-0.5 rounded font-bold">
                                        AUTO-SYNCED
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-[#888888]">
                                    Automatic linking enabled. No manual maintenance needed.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleConvertAutoSyncToStatic(col.id)}
                                    className="text-[10px] text-[#3F3F8F] hover:underline font-semibold"
                                  >
                                    Convert to static manual links &rarr;
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Manual Sub-links Section with Collection Selectors */
                              <div className="pt-2 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <label className="block text-[10px] text-[#888888] uppercase font-semibold">
                                      Sub-Links ({col.links.length})
                                    </label>
                                    <p className="text-[10px] text-[#888888]">
                                      Select collections directly from the list, or add custom URLs.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Add from Collections Quick Picker Dropdown */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenCollectionPickerColId(
                                            openCollectionPickerColId === col.id ? null : col.id
                                          )
                                        }
                                        className="bg-[#3F3F8F] text-white hover:bg-[#343477] text-[10px] font-semibold px-2.5 py-1.5 rounded-[4px] flex items-center gap-1 transition-colors shadow-2xs"
                                      >
                                        <Folder className="w-3 h-3" /> + Select Collection
                                        <ChevronDown className="w-3 h-3 ml-0.5" />
                                      </button>

                                      {openCollectionPickerColId === col.id && (
                                        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xl z-30 p-2 text-left animate-fade-in">
                                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E7E7E7]">
                                            <span className="text-[10px] font-bold text-black uppercase">
                                              Select Store Collection
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setOpenCollectionPickerColId(null)}
                                              className="text-neutral-400 hover:text-black p-0.5"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>

                                          <div className="max-h-56 overflow-y-auto space-y-1">
                                            {availableCollections.map((c) => {
                                              const isAlreadyAdded = col.links.some(
                                                (l) =>
                                                  l.collection_slug === c.slug ||
                                                  l.url === `/collections/${c.slug}`
                                              );
                                              return (
                                                <button
                                                  key={c.id}
                                                  type="button"
                                                  onClick={() => {
                                                    handleAddCollectionSubLink(col.id, c);
                                                    setOpenCollectionPickerColId(null);
                                                  }}
                                                  className={`w-full text-left p-2 rounded flex items-center justify-between text-[11px] transition-colors ${
                                                    isAlreadyAdded
                                                      ? 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                                                      : 'hover:bg-[#F0F2FA] text-black font-semibold'
                                                  }`}
                                                >
                                                  <div>
                                                    <div className="font-semibold text-black">{c.title}</div>
                                                    <div className="text-[9px] font-mono text-[#888888]">
                                                      /collections/{c.slug}
                                                    </div>
                                                  </div>
                                                  {isAlreadyAdded && (
                                                    <span className="text-[8px] bg-neutral-200 text-neutral-600 px-1 py-0.2 rounded font-mono">
                                                      Added
                                                    </span>
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>

                                          <div className="pt-2 mt-2 border-t border-[#E7E7E7] flex justify-between items-center">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleImportAllMissingCollections(col.id);
                                                setOpenCollectionPickerColId(null);
                                              }}
                                              className="text-[10px] text-[#3F3F8F] font-bold hover:underline"
                                            >
                                              ⚡ Add All Store Collections
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleAddSubLink(col.id)}
                                      className="text-[#666666] hover:text-black bg-white border border-[#E7E7E7] hover:border-[#3F3F8F] text-[10px] font-semibold px-2 py-1.5 rounded-[4px] flex items-center gap-1 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> + Custom URL
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {col.links.length === 0 && (
                                    <div className="p-4 bg-white rounded border border-dashed border-[#D0D0D0] text-center text-[11px] text-[#888888]">
                                      No sub-links in this column yet. Click <strong>"+ Select Collection"</strong> above or enable <strong>"Auto-sync with Collections"</strong>.
                                    </div>
                                  )}

                                  {col.links.map((link) => {
                                    const matchedCollection = availableCollections.find(
                                      (c) =>
                                        c.slug === link.collection_slug ||
                                        link.url === `/collections/${c.slug}` ||
                                        link.url.startsWith(`/collections/${c.slug}?`)
                                    );

                                    return (
                                      <div
                                        key={link.id}
                                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-white border border-[#E7E7E7] rounded-[4px] shadow-2xs"
                                      >
                                        {/* Collection Selector Dropdown */}
                                        <div className="w-full sm:w-48">
                                          <select
                                            value={matchedCollection ? matchedCollection.slug : ''}
                                            onChange={(e) =>
                                              handleSelectCollectionForLink(col.id, link.id, e.target.value)
                                            }
                                            className="w-full p-1.5 bg-[#F4F5FB] border border-[#D8DEF4] rounded text-[11px] font-semibold text-[#252846] focus:bg-white focus:border-[#3F3F8F] focus:outline-none"
                                            title="Select Collection"
                                          >
                                            <option value="">-- Custom Link / URL --</option>
                                            <optgroup label="Store Collections">
                                              {availableCollections.map((c) => (
                                                <option key={c.id} value={c.slug}>
                                                  🏷️ {c.title}
                                                </option>
                                              ))}
                                            </optgroup>
                                          </select>
                                        </div>

                                        {/* Link Title */}
                                        <input
                                          type="text"
                                          value={link.label}
                                          onChange={(e) =>
                                            handleUpdateSubLink(col.id, link.id, { label: e.target.value })
                                          }
                                          placeholder="Link Title (e.g. Linen Shirts)"
                                          className="flex-1 p-1.5 bg-[#F8F8F8] border border-transparent rounded text-xs focus:bg-white focus:border-[#3F3F8F] focus:outline-none"
                                        />

                                        {/* Target URL */}
                                        <input
                                          type="text"
                                          value={link.url}
                                          onChange={(e) =>
                                            handleUpdateSubLink(col.id, link.id, {
                                              url: e.target.value,
                                              collection_slug: undefined,
                                            })
                                          }
                                          placeholder="Target URL (e.g. /collections/men)"
                                          className="flex-1 p-1.5 bg-[#F8F8F8] border border-transparent rounded text-xs font-mono focus:bg-white focus:border-[#3F3F8F] focus:outline-none"
                                        />

                                        {/* Tag / Badge */}
                                        <input
                                          type="text"
                                          value={link.badge || ''}
                                          onChange={(e) =>
                                            handleUpdateSubLink(col.id, link.id, { badge: e.target.value })
                                          }
                                          placeholder="Tag"
                                          className="w-16 p-1.5 bg-[#F8F8F8] border border-transparent rounded text-[10px] font-mono focus:bg-white focus:border-[#3F3F8F] focus:outline-none uppercase text-center"
                                        />

                                        {/* Delete Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubLink(col.id, link.id)}
                                          className="text-neutral-400 hover:text-red-600 p-1 self-center transition-colors"
                                          title="Remove link"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Promotional Editorial Banner Column Section */}
                    <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-[#E7E7E7]">
                        <div>
                          <h4 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-[#3F3F8F]" />
                            <span>Promotional Campaign Banner (Right Column)</span>
                          </h4>
                          <p className="text-[11px] text-[#666666]">
                            Visual card displayed inside the mega menu with campaign photography and direct action link.
                          </p>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                          <input
                            type="checkbox"
                            checked={selectedItem.mega_menu?.banner?.is_active ?? true}
                            onChange={(e) => handleUpdateBanner({ is_active: e.target.checked })}
                            className="w-4 h-4 text-[#3F3F8F] rounded focus:ring-0 cursor-pointer"
                          />
                          <span>Show Banner</span>
                        </label>
                      </div>

                      {selectedItem.mega_menu?.banner?.is_active && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                                Over-Title / Badge
                              </label>
                              <input
                                type="text"
                                value={selectedItem.mega_menu?.banner?.badge || ''}
                                onChange={(e) => handleUpdateBanner({ badge: e.target.value })}
                                placeholder="e.g. LIMITED EDITION"
                                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-semibold uppercase focus:outline-none focus:border-[#3F3F8F]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                                Banner Heading Title
                              </label>
                              <input
                                type="text"
                                value={selectedItem.mega_menu?.banner?.title || ''}
                                onChange={(e) => handleUpdateBanner({ title: e.target.value })}
                                placeholder="e.g. THE TIMELESS CAPSULE"
                                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-bold uppercase focus:outline-none focus:border-[#3F3F8F]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                                CTA Button Text
                              </label>
                              <input
                                type="text"
                                value={selectedItem.mega_menu?.banner?.cta_label || ''}
                                onChange={(e) => handleUpdateBanner({ cta_label: e.target.value })}
                                placeholder="e.g. DISCOVER NOW"
                                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-semibold uppercase focus:outline-none focus:border-[#3F3F8F]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                                CTA Destination URL
                              </label>
                              <input
                                type="text"
                                value={selectedItem.mega_menu?.banner?.cta_url || ''}
                                onChange={(e) => handleUpdateBanner({ cta_url: e.target.value })}
                                placeholder="e.g. /collections/new-arrivals"
                                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                              />
                            </div>
                          </div>

                          {/* Image Dropzone */}
                          <div>
                            <SingleImageDropzone
                              value={selectedItem.mega_menu?.banner?.image_url || ''}
                              onChange={(url) => handleUpdateBanner({ image_url: url })}
                              aspectRatio="4/5"
                              label="Campaign Photography (Drag & Drop or Select)"
                              helperText="Drag & drop new photo or paste image URL. Automatically compressed to WebP."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-neutral-400 bg-[#FAFAFA] rounded-[4px] border border-dashed border-[#E7E7E7] space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-neutral-300" />
                    <div className="font-semibold text-black text-xs uppercase">
                      Mega Menu is Disabled for "{selectedItem.label}"
                    </div>
                    <p className="text-[11px] text-[#888888] max-w-sm mx-auto">
                      This menu item behaves as a direct hyperlink to <code className="font-mono text-black">{selectedItem.url}</code>. Enable the checkbox above if you want hovering this item to open a multi-column mega menu dropdown.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-neutral-400">
                Select a menu item on the left to configure its mega menu.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit / Add Header Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 text-left space-y-4 font-poppins text-xs animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-bold text-black uppercase tracking-wider text-sm">
                {editingItem ? 'Edit Header Menu Item' : 'Add New Header Menu Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemModal} className="space-y-4">
              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Menu Item Label *
                </label>
                <input
                  type="text"
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  placeholder="e.g. SHOP, ACCESSORIES, BRIDAL"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-bold uppercase focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] text-[#888888] uppercase font-semibold">
                    Destination URL / Path *
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const col = availableCollections.find((c) => c.slug === e.target.value);
                        if (col) {
                          if (!modalLabel.trim() || modalLabel === 'NEW ITEM') {
                            setModalLabel(col.title.toUpperCase());
                          }
                          setModalUrl(`/collections/${col.slug}`);
                        } else if (e.target.value === 'all') {
                          setModalUrl('/collections/all');
                        }
                      }
                    }}
                    value=""
                    className="text-[10px] text-[#3F3F8F] bg-transparent border-0 cursor-pointer hover:underline focus:outline-none font-semibold"
                  >
                    <option value="">-- Choose from Collections --</option>
                    <option value="all">All Products (/collections/all)</option>
                    {availableCollections.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.title} (/collections/{c.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={modalUrl}
                  onChange={(e) => setModalUrl(e.target.value)}
                  placeholder="e.g. /collections/all or /collections/accessories"
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                  Highlight Style
                </label>
                <select
                  value={modalHighlightStyle}
                  onChange={(e) => setModalHighlightStyle(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                >
                  <option value="default">Standard Luxury (Default)</option>
                  <option value="bold">Always Bold</option>
                  <option value="colored">Sale Accent Color (Red / Promotion)</option>
                  <option value="badge">With Custom Badge Tag</option>
                </select>
              </div>

              {modalHighlightStyle === 'badge' && (
                <div>
                  <label className="block text-[10px] text-[#888888] uppercase font-semibold mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={modalBadgeText}
                    onChange={(e) => setModalBadgeText(e.target.value)}
                    placeholder="e.g. NEW, SS26, HOT"
                    className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono uppercase focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#E7E7E7]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={modalHasMegaMenu}
                    onChange={(e) => setModalHasMegaMenu(e.target.checked)}
                    className="w-4 h-4 text-[#3F3F8F] rounded focus:ring-0 cursor-pointer"
                  />
                  <span>Enable Mega Menu dropdown on hover</span>
                </label>
                <p className="text-[10px] text-[#888888] mt-1 pl-6">
                  If enabled, you will be able to configure multi-column links and promotional imagery for this item.
                </p>
              </div>

              {/* Menu Link Visibility Switch */}
              <div className="p-3.5 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-black">
                    {modalIsActive ? (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-neutral-400" />
                    )}
                    <span>Menu Link Visibility</span>
                  </div>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    {modalIsActive
                      ? 'Visible in header top bar and mobile navigation drawer.'
                      : 'Hidden from customer view without deleting its dropdown structure.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalIsActive(!modalIsActive)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors border ${
                    modalIsActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {modalIsActive ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsItemModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[6px] border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 text-left space-y-4 font-poppins text-xs animate-fade-in">
            <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-xs">
              <AlertCircle className="w-5 h-5" />
              <span>Reset Storefront Navigation</span>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Are you sure you want to restore the navigation to the factory <strong>Tanoah defaults</strong>? All custom columns, links, and banners will be reset to the original design (SHOP, MEN, WOMEN, NEW ARRIVALS, SALE, LOOKBOOK).
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsResetModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="button" onClick={handleConfirmReset}>
                Yes, Reset to Defaults
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
