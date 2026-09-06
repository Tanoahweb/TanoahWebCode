import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  Search,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  LayoutGrid,
  Check,
  Image as ImageIcon,
  ArrowUpRight,
  HelpCircle,
  Square,
  RectangleVertical,
  Tags,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { Collection, Product, FeaturedCollectionsConfig, FeaturedCollectionItem, Category } from '../../types';
import { DEFAULT_FEATURED_COLLECTIONS_CONFIG } from '../../data/mockData';
import { SingleImageDropzone } from '../../components/common/SingleImageDropzone';

export const CollectionsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'registry' | 'categories' | 'showcase'>(
    tabFromUrl === 'showcase' ? 'showcase' : tabFromUrl === 'categories' ? 'categories' : 'registry'
  );

  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Home Screen Showcase State
  const [showcaseConfig, setShowcaseConfig] = useState<FeaturedCollectionsConfig>(
    DEFAULT_FEATURED_COLLECTIONS_CONFIG
  );
  const [isSavingShowcase, setIsSavingShowcase] = useState(false);

  // Modal / Form state for collections
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  // Modal / Form state for categories
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catImage, setCatImage] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const [cols, prods, featCfg, cats] = await Promise.all([
      api.getCollections(),
      api.getProducts(),
      api.getFeaturedCollectionsConfig(),
      api.getCategories(),
    ]);
    setCollections(cols || []);
    setProducts(prods || []);
    if (featCfg) setShowcaseConfig(featCfg);
    setCategories(cats || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab: 'registry' | 'categories' | 'showcase') => {
    setActiveTab(tab);
    setSearchParams(tab === 'showcase' ? { tab: 'showcase' } : tab === 'categories' ? { tab: 'categories' } : {});
  };

  const handleOpenCreate = () => {
    setEditingCollection(null);
    setName('');
    setSlug('');
    setDescription('');
    setBannerImage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (col: Collection) => {
    setEditingCollection(col);
    setName(col.title);
    setSlug(col.slug);
    setDescription(col.description || '');
    setBannerImage(col.banner_image || '');
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCollection) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const colToSave: Collection = {
      id: editingCollection ? editingCollection.id : `col_${Date.now()}`,
      title: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim(),
      banner_image: bannerImage || '/Assets/hero/hero-landscape.jpg',
      is_smart: false,
      is_active: true,
      sort_order: editingCollection ? editingCollection.sort_order : collections.length + 1,
    };

    await api.saveCollection(colToSave);
    addToast({
      type: 'success',
      title: editingCollection ? 'Collection Updated' : 'Collection Created',
      description: `Collection "${colToSave.title}" is active and automatically synced with store navigation.`,
    });

    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteCollection = async (col: Collection) => {
    if (window.confirm(`Are you sure you want to remove collection "${col.title}"?`)) {
      await api.deleteCollection(col.id);
      addToast({
        type: 'info',
        title: 'Collection Deleted',
        description: `Collection ${col.title} has been removed.`,
      });
      loadData();
    }
  };

  // Category Handlers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatDescription('');
    setCatImage('');
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatDescription(cat.description || '');
    setCatImage(cat.image_url || '');
    setIsCatModalOpen(true);
  };

  const handleCatNameChange = (val: string) => {
    setCatName(val);
    if (!editingCategory) {
      setCatSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const catToSave: Category = {
      id: editingCategory ? editingCategory.id : crypto.randomUUID(),
      name: catName.trim(),
      slug: catSlug.trim() || catName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: catDescription.trim(),
      image_url: catImage || undefined,
      sort_order: editingCategory ? editingCategory.sort_order : categories.length + 1,
      is_active: true,
    };

    const success = await api.saveCategory(catToSave);
    if (success) {
      addToast({
        type: 'success',
        title: editingCategory ? 'Category Updated' : 'Category Created',
        description: `Category "${catToSave.name}" is active and synced across all devices.`,
      });
      setIsCatModalOpen(false);
      loadData();
    } else {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not save category to Supabase database.',
      });
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (window.confirm(`Are you sure you want to remove category "${cat.name}"?`)) {
      const success = await api.deleteCategory(cat.id);
      if (success) {
        addToast({
          type: 'info',
          title: 'Category Deleted',
          description: `Category "${cat.name}" has been removed.`,
        });
        loadData();
      }
    }
  };

  // Showcase Operations
  const handleUpdateShowcaseItem = (id: string, updates: Partial<FeaturedCollectionItem>) => {
    setShowcaseConfig((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
    }));
  };

  const handleSelectCollectionForShowcaseItem = (id: string, colSlug: string) => {
    const col = collections.find((c) => c.slug === colSlug);
    if (!col) return;

    handleUpdateShowcaseItem(id, {
      collection_id: col.id,
      collection_slug: col.slug,
      title: col.title.toUpperCase(),
      subtitle: col.description || `${col.title} Curated Edition`,
      image: col.banner_image || '/Assets/hero/hero-mobile.jpg',
      link: `/collections/${col.slug}`,
    });
  };

  const handleMoveShowcaseItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= showcaseConfig.items.length) return;

    const list = [...showcaseConfig.items];
    const [moved] = list.splice(index, 1);
    list.splice(newIndex, 0, moved);
    setShowcaseConfig((prev) => ({
      ...prev,
      items: list.map((it, idx) => ({ ...it, sort_order: idx })),
    }));
  };

  const handleDeleteShowcaseItem = (id: string) => {
    if (showcaseConfig.items.length <= 1) {
      addToast({
        type: 'error',
        title: 'Cannot Remove',
        description: 'You need at least 1 collection card in the home screen section.',
      });
      return;
    }
    setShowcaseConfig((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleAddShowcaseItem = (chosenCol?: Collection) => {
    const alreadyUsedSlugs = new Set(
      showcaseConfig.items.map((it) => it.collection_slug).filter(Boolean)
    );
    const unusedCol = collections.find((c) => !alreadyUsedSlugs.has(c.slug));
    const col = chosenCol || unusedCol || collections[0];

    const newItem: FeaturedCollectionItem = {
      id: `fc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: col ? col.title.toUpperCase() : 'NEW EDITION',
      subtitle: col?.description || 'Curated Editorial Pieces',
      image: col?.banner_image || '/Assets/hero/hero-mobile.jpg',
      link: col ? `/collections/${col.slug}` : '/collections/all',
      collection_slug: col?.slug,
      collection_id: col?.id,
      is_active: true,
      sort_order: showcaseConfig.items.length,
    };

    setShowcaseConfig((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    addToast({
      type: 'success',
      title: 'New Card Added',
      description: `Added "${newItem.title}" card. Remember to click "Publish Showcase" when done.`,
    });
  };

  const handleSaveShowcase = async () => {
    setIsSavingShowcase(true);
    const success = await api.saveFeaturedCollectionsConfig(showcaseConfig);
    setIsSavingShowcase(false);

    if (success) {
      addToast({
        type: 'success',
        title: 'Home Showcase Published',
        description: 'Changes to "Explore The Editions" are now live on your home screen.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not save showcase configuration.',
      });
    }
  };

  const handleResetShowcaseDefaults = () => {
    if (window.confirm('Reset this section to original Tanoah default collections and 4:5 ratio?')) {
      setShowcaseConfig(JSON.parse(JSON.stringify(DEFAULT_FEATURED_COLLECTIONS_CONFIG)));
      addToast({
        type: 'info',
        title: 'Reset to Defaults',
        description: 'Click "Publish Showcase Changes" to apply.',
      });
    }
  };

  const filtered = collections.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins text-xs pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-5 border-b border-[#E7E7E7] gap-4">
          <div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black flex items-center gap-2">
              <span>COLLECTIONS & EDITORIAL EDITS</span>
            </h1>
            <p className="text-[#666666] mt-0.5">
              Manage store collections registry and curate the home screen "Explore The Editions" showcase with custom aspect ratios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'registry' ? (
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreate}
              >
                CREATE COLLECTION
              </Button>
            ) : activeTab === 'categories' ? (
              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreateCategory}
              >
                CREATE CATEGORY
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleResetShowcaseDefaults}
                >
                  RESET DEFAULTS
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Save className="w-4 h-4" />}
                  isLoading={isSavingShowcase}
                  onClick={handleSaveShowcase}
                >
                  PUBLISH SHOWCASE
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex border-b border-[#E7E7E7] gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('registry')}
            className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'registry'
                ? 'border-[#3F3F8F] text-[#3F3F8F]'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Collections Catalog ({collections.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('categories')}
            className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-[#3F3F8F] text-[#3F3F8F]'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Categories Registry ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('showcase')}
            className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'showcase'
                ? 'border-[#3F3F8F] text-[#3F3F8F]'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Home Screen: Explore The Editions ({showcaseConfig.items.length} cards &bull; {showcaseConfig.aspect_ratio})</span>
          </button>
        </div>

        {activeTab === 'registry' ? (
          <>
            {/* Search */}
            <div className="bg-white p-3 border border-[#E7E7E7] rounded-[4px] shadow-sm flex items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div className="text-[#888888] font-semibold text-[11px]">
                {filtered.length} Curated {filtered.length === 1 ? 'Collection' : 'Collections'}
              </div>
            </div>

            {/* Collections Table */}
            <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                  <tr>
                    <th className="p-4">Collection</th>
                    <th className="p-4">Slug Identifier</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Associated Items</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#888888]">
                        No collections match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((col) => {
                      const matchingProductsCount = products.filter((p) => {
                        const colMatch = p.collections?.some((c) => c.toLowerCase() === col.slug.toLowerCase());
                        const tagMatch = p.tags?.some((t) => t.toLowerCase() === col.slug.toLowerCase());
                        const catMatch = p.category_name?.toLowerCase().includes(col.slug.toLowerCase());
                        return colMatch || tagMatch || catMatch;
                      }).length;

                      return (
                        <tr key={col.id || col.slug} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-14 bg-neutral-100 rounded-[2px] overflow-hidden border border-[#E7E7E7] shrink-0">
                                <img
                                  src={col.banner_image || '/Assets/hero/hero-mobile.jpg'}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-black text-sm">{col.title}</div>
                                <div className="text-[10px] text-[#888888] font-mono">
                                  /collections/{col.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-neutral-600">{col.slug}</td>
                          <td className="p-4 text-[#666666] max-w-xs truncate">
                            {col.description || 'Editorial collection and curated garments.'}
                          </td>
                          <td className="p-4 font-semibold text-black">
                            {matchingProductsCount} {matchingProductsCount === 1 ? 'item' : 'items'}
                          </td>
                          <td className="p-4">
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                              ACTIVE
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Link
                              to={`/collections/${col.slug}`}
                              target="_blank"
                              className="inline-block p-1 text-neutral-500 hover:text-black"
                              title="View on Storefront"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleOpenEdit(col)}
                              className="inline-block p-1 text-neutral-500 hover:text-[#3F3F8F]"
                              title="Edit Collection"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCollection(col)}
                              className="inline-block p-1 text-neutral-400 hover:text-red-600"
                              title="Delete Collection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'categories' ? (
          <>
            {/* Search & Counter */}
            <div className="bg-white p-3 border border-[#E7E7E7] rounded-[4px] shadow-sm flex items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={catSearchTerm}
                  onChange={(e) => setCatSearchTerm(e.target.value)}
                  className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="text-[11px] text-neutral-500 font-medium">
                {categories.length} Cloud-Synced {categories.length === 1 ? 'Category' : 'Categories'}
              </div>
            </div>

            {/* Categories Table */}
            <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Slug Identifier</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Associated Products</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {categories.filter((c) =>
                    c.name.toLowerCase().includes(catSearchTerm.toLowerCase()) ||
                    c.slug.toLowerCase().includes(catSearchTerm.toLowerCase())
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#888888]">
                        No categories found. Click "CREATE CATEGORY" above to add one.
                      </td>
                    </tr>
                  ) : (
                    categories
                      .filter((c) =>
                        c.name.toLowerCase().includes(catSearchTerm.toLowerCase()) ||
                        c.slug.toLowerCase().includes(catSearchTerm.toLowerCase())
                      )
                      .map((cat) => {
                        const matchingCount = products.filter(
                          (p) => p.category_id === cat.id || p.category_name?.toLowerCase() === cat.slug.toLowerCase() || p.gender === cat.slug
                        ).length;

                        return (
                          <tr key={cat.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-14 bg-neutral-100 rounded-[2px] overflow-hidden border border-[#E7E7E7] shrink-0">
                                  <img
                                    src={cat.image_url || '/Assets/hero/hero-mobile.jpg'}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-black text-sm">{cat.name}</div>
                                  <div className="text-[10px] text-[#888888] font-mono">
                                    /collections/{cat.slug}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-neutral-600">{cat.slug}</td>
                            <td className="p-4 text-[#666666] max-w-xs truncate">
                              {cat.description || 'Department category for garments and silhouettes.'}
                            </td>
                            <td className="p-4 font-semibold text-black">
                              {matchingCount} {matchingCount === 1 ? 'item' : 'items'}
                            </td>
                            <td className="p-4">
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                                ACTIVE
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <Link
                                to={`/collections/${cat.slug}`}
                                target="_blank"
                                className="inline-block p-1 text-neutral-500 hover:text-black"
                                title="View on Storefront"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleOpenEditCategory(cat)}
                                className="inline-block p-1 text-neutral-500 hover:text-[#3F3F8F]"
                                title="Edit Category"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="inline-block p-1 text-neutral-400 hover:text-red-600"
                                title="Delete Category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* 1. Aspect Ratio Freedom Selector */}
            <div className="bg-white p-5 sm:p-6 border border-[#E7E7E7] rounded-[4px] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E7E7E7]">
                <div>
                  <h2 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#3F3F8F]" />
                    <span>Card Aspect Ratio Freedom</span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Select how cards are proportioned in the "Explore The Editions" section. The luxury aesthetic, fonts, and dark overlay stay identically elegant.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-[#F0F0FF] text-[#3F3F8F] border border-[#D5D5FF]">
                    ACTIVE: {showcaseConfig.aspect_ratio === '1:1' ? '1:1 SQUARE' : '4:5 EDITORIAL PORTRAIT'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
                {/* 1:1 Square Option */}
                <button
                  type="button"
                  onClick={() => setShowcaseConfig((prev) => ({ ...prev, aspect_ratio: '1:1' }))}
                  className={`p-4 rounded-[4px] border-2 text-left transition-all relative flex gap-4 items-start ${
                    showcaseConfig.aspect_ratio === '1:1'
                      ? 'border-[#3F3F8F] bg-[#3F3F8F]/5 shadow-sm'
                      : 'border-[#E7E7E7] hover:border-neutral-400 bg-white'
                  }`}
                >
                  <div className="w-12 h-12 rounded-[3px] border-2 border-dashed border-[#3F3F8F] flex items-center justify-center shrink-0 bg-white">
                    <Square className="w-6 h-6 text-[#3F3F8F]" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black text-sm">1:1 Square Format</span>
                      {showcaseConfig.aspect_ratio === '1:1' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#3F3F8F] bg-white px-2 py-0.5 rounded border border-[#3F3F8F]/30">
                          <Check className="w-3 h-3" /> SELECTED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      Symmetrical square format (aspect ratio 1:1). Perfect for crisp product-focused imagery, balanced grid rhythm, and modern editorial aesthetics.
                    </p>
                  </div>
                </button>

                {/* 4:5 Editorial Portrait Option */}
                <button
                  type="button"
                  onClick={() => setShowcaseConfig((prev) => ({ ...prev, aspect_ratio: '4:5' }))}
                  className={`p-4 rounded-[4px] border-2 text-left transition-all relative flex gap-4 items-start ${
                    showcaseConfig.aspect_ratio === '4:5'
                      ? 'border-[#3F3F8F] bg-[#3F3F8F]/5 shadow-sm'
                      : 'border-[#E7E7E7] hover:border-neutral-400 bg-white'
                  }`}
                >
                  <div className="w-12 h-15 rounded-[3px] border-2 border-dashed border-[#3F3F8F] flex items-center justify-center shrink-0 bg-white py-1">
                    <RectangleVertical className="w-6 h-7 text-[#3F3F8F]" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black text-sm">4:5 Editorial Portrait Format</span>
                      {showcaseConfig.aspect_ratio === '4:5' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#3F3F8F] bg-white px-2 py-0.5 rounded border border-[#3F3F8F]/30">
                          <Check className="w-3 h-3" /> SELECTED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      Classic luxury editorial portrait format (aspect ratio 4:5). Ideal for full-length models, high-fashion campaign photography, and lookbooks.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Section Titles */}
            <div className="bg-white p-5 sm:p-6 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-[#E7E7E7]">
                <Edit2 className="w-4 h-4 text-[#3F3F8F]" />
                <span>Section Headings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Eyebrow / Subtitle
                  </label>
                  <input
                    type="text"
                    value={showcaseConfig.section_subtitle}
                    onChange={(e) =>
                      setShowcaseConfig((prev) => ({ ...prev, section_subtitle: e.target.value }))
                    }
                    placeholder="E.g., CURATED CATEGORIES"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Displays in uppercase Poppins tracking above the title.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Main Title (Wondra Font)
                  </label>
                  <input
                    type="text"
                    value={showcaseConfig.section_title}
                    onChange={(e) =>
                      setShowcaseConfig((prev) => ({ ...prev, section_title: e.target.value }))
                    }
                    placeholder="E.g., EXPLORE THE EDITIONS"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Rendered on the storefront with luxury Wondra typography.</p>
                </div>
              </div>
            </div>

            {/* 3. Curated Editions Editor */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-[#E7E7E7] rounded-[4px] shadow-sm">
                <div>
                  <h2 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#3F3F8F]" />
                    <span>Curate Showcase Editions ({showcaseConfig.items.length})</span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Select which collections to display on your homepage. Each card links directly to a collection.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quick-add from catalog dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const col = collections.find((c) => c.slug === e.target.value);
                        if (col) handleAddShowcaseItem(col);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="p-1.5 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] text-xs font-medium focus:outline-none focus:border-[#3F3F8F]"
                  >
                    <option value="" disabled>
                      + Quick Add From Collection...
                    </option>
                    {collections.map((c) => (
                      <option key={c.id || c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => handleAddShowcaseItem()}
                  >
                    ADD NEW CARD
                  </Button>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-4">
                {showcaseConfig.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden hover:border-neutral-300 transition-colors"
                  >
                    {/* Card Header Bar */}
                    <div className="bg-[#F8F8F8] px-4 py-2.5 border-b border-[#E7E7E7] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div className="font-bold text-black text-xs uppercase tracking-wide">
                          {item.title || 'UNTITLED EDITION'}
                        </div>
                        {item.collection_slug && (
                          <span className="text-[10px] font-mono text-[#3F3F8F] bg-[#F0F0FF] px-2 py-0.5 rounded border border-[#D5D5FF]">
                            /collections/{item.collection_slug}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer mr-2 text-[11px] font-medium text-neutral-600">
                          <input
                            type="checkbox"
                            checked={item.is_active !== false}
                            onChange={(e) =>
                              handleUpdateShowcaseItem(item.id, { is_active: e.target.checked })
                            }
                            className="rounded text-[#3F3F8F] focus:ring-[#3F3F8F] w-3.5 h-3.5"
                          />
                          <span>Show on Home</span>
                        </label>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveShowcaseItem(idx, 'up')}
                          className="p-1 text-neutral-500 hover:text-black hover:bg-neutral-200 rounded disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === showcaseConfig.items.length - 1}
                          onClick={() => handleMoveShowcaseItem(idx, 'down')}
                          className="p-1 text-neutral-500 hover:text-black hover:bg-neutral-200 rounded disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShowcaseItem(item.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                          title="Remove Edition Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Compact Card Body */}
                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-4 items-start">
                      {/* Left: Compact Photo Thumbnail */}
                      <div className="w-32 sm:w-36 shrink-0">
                        <SingleImageDropzone
                          compact
                          value={item.image}
                          onChange={(url) => handleUpdateShowcaseItem(item.id, { image: url })}
                          label={`Photo (${showcaseConfig.aspect_ratio === '1:1' ? '1:1 Square' : '4:5 Portrait'})`}
                          aspectRatio={showcaseConfig.aspect_ratio === '1:1' ? '1/1' : '4/5'}
                        />
                      </div>

                      {/* Right: Form Controls */}
                      <div className="flex-1 w-full space-y-2.5">
                        {/* Collection Selector */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1 flex items-center justify-between">
                            <span>Select Collection to Link & Auto-Fill</span>
                            {item.collection_slug && (
                              <span className="text-[9px] text-[#3F3F8F] font-normal lowercase">
                                synced from catalog
                              </span>
                            )}
                          </label>
                          <select
                            value={item.collection_slug || ''}
                            onChange={(e) =>
                              handleSelectCollectionForShowcaseItem(item.id, e.target.value)
                            }
                            className="w-full p-2 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] text-xs font-medium focus:outline-none focus:border-[#3F3F8F] focus:bg-white transition-colors"
                          >
                            <option value="">-- Choose A Store Collection --</option>
                            {collections.map((col) => (
                              <option key={col.id || col.slug} value={col.slug}>
                                {col.title} (/collections/{col.slug})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Title, Subtitle, and URL in a 3-column row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-neutral-600 mb-1">
                              Card Title (Wondra Font) *
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) =>
                                handleUpdateShowcaseItem(item.id, {
                                  title: e.target.value.toUpperCase(),
                                })
                              }
                              placeholder="E.g., KURTA SET"
                              className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-semibold focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-neutral-600 mb-1">
                              Card Subtitle
                            </label>
                            <input
                              type="text"
                              value={item.subtitle}
                              onChange={(e) =>
                                handleUpdateShowcaseItem(item.id, { subtitle: e.target.value })
                              }
                              placeholder="E.g., Tailored Elegance"
                              className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-neutral-600 mb-1">
                              Destination Link URL
                            </label>
                            <input
                              type="text"
                              value={item.link}
                              onChange={(e) =>
                                handleUpdateShowcaseItem(item.id, { link: e.target.value })
                              }
                              placeholder="/collections/kurta-set"
                              className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Big Prominent "+ Add Another Card" Button at the bottom */}
                <button
                  type="button"
                  onClick={() => handleAddShowcaseItem()}
                  className="w-full py-3.5 border-2 border-dashed border-[#3F3F8F]/40 hover:border-[#3F3F8F] bg-[#3F3F8F]/5 hover:bg-[#3F3F8F]/10 rounded-[4px] flex items-center justify-center gap-2 text-xs font-bold text-[#3F3F8F] transition-all cursor-pointer group shadow-xs"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>+ ADD ANOTHER EDITION CARD (Total: {showcaseConfig.items.length})</span>
                </button>
              </div>

              {/* 4. Interactive Live Preview */}
              <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E7E7E7] gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#3F3F8F]" />
                      <span>Live Storefront Home Screen Preview</span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Exact pixel-perfect replica of the homepage "Explore The Editions" section with your chosen aspect ratio ({showcaseConfig.aspect_ratio}).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded border border-[#E7E7E7]">
                      Ratio: {showcaseConfig.aspect_ratio} &bull; Active Cards: {showcaseConfig.items.filter((i) => i.is_active !== false).length}
                    </span>
                  </div>
                </div>

                {/* Homepage Replica Box */}
                <div className="bg-[#FAF9F5]/40 p-6 sm:p-10 border border-[#E7E7E7] rounded-[4px]">
                  <div className="text-center max-w-xl mx-auto mb-10">
                    <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase block mb-1">
                      {showcaseConfig.section_subtitle || 'CURATED CATEGORIES'}
                    </span>
                    <h2 className="font-wondra text-3xl sm:text-4xl text-black">
                      {showcaseConfig.section_title || 'EXPLORE THE EDITIONS'}
                    </h2>
                  </div>

                  <div
                    className={`grid gap-6 ${
                      showcaseConfig.items.filter((i) => i.is_active !== false).length === 1
                        ? 'grid-cols-1 max-w-md mx-auto'
                        : showcaseConfig.items.filter((i) => i.is_active !== false).length === 2
                        ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
                        : showcaseConfig.items.filter((i) => i.is_active !== false).length === 4
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {showcaseConfig.items
                      .filter((cat) => cat.is_active !== false)
                      .map((cat) => {
                        const isSquare = showcaseConfig.aspect_ratio === '1:1';
                        return (
                          <div
                            key={cat.id}
                            style={{ aspectRatio: isSquare ? '1 / 1' : '4 / 5' }}
                            className={`group relative rounded-[4px] overflow-hidden border border-[#E7E7E7] flex flex-col justify-end p-6 sm:p-8 transition-all duration-300 ${
                              isSquare ? 'aspect-square' : 'aspect-[4/5] min-h-[380px]'
                            }`}
                          >
                            <img
                              src={cat.image || '/Assets/hero/hero-mobile.jpg'}
                              alt={cat.title}
                              onError={(e) => {
                                e.currentTarget.src = '/Assets/hero/hero-mobile.jpg';
                              }}
                              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                            <div className="relative z-10 text-white space-y-1">
                              {cat.subtitle && (
                                <span className="text-[10px] tracking-widest uppercase font-poppins text-white/80 line-clamp-1 block">
                                  {cat.subtitle}
                                </span>
                              )}
                              <h3 className="font-wondra text-xl sm:text-2xl text-white leading-snug">
                                {cat.title}
                              </h3>
                              <div className="pt-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-poppins font-semibold uppercase tracking-wider text-white underline underline-offset-4">
                                  DISCOVER NOW <ArrowUpRight className="w-4 h-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Bottom Action bar */}
                <div className="pt-4 border-t border-[#E7E7E7] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-[#666666]">
                    Ready to display these curated collections on your homepage? Click publish to save and push live.
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="md"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={handleResetShowcaseDefaults}
                    >
                      RESET DEFAULTS
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Save className="w-4 h-4" />}
                      isLoading={isSavingShowcase}
                      onClick={handleSaveShowcase}
                    >
                      PUBLISH SHOWCASE CHANGES
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Create/Edit Collection */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[4px] max-w-lg w-full p-6 space-y-4 shadow-xl text-left animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
                <h3 className="font-wondra text-lg text-black">
                  {editingCollection ? 'EDIT COLLECTION' : 'NEW COLLECTION'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-black font-mono text-base"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCollection} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Collection Title *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="E.g., Festive Sarees 2026"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="festive-sarees"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Editorial description of this collection..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <SingleImageDropzone
                    value={bannerImage}
                    onChange={setBannerImage}
                    label="Collection Banner Photography"
                    helperText="Drag & drop or click to upload collection banner (WebP, PNG, JPG). Automatically WebP optimized."
                    aspectRatio="16/9"
                  />
                </div>

                <div className="pt-3 border-t border-[#E7E7E7] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[#E7E7E7] text-neutral-700 hover:bg-[#F8F8F8] rounded-[4px] font-semibold"
                  >
                    Cancel
                  </button>
                  <Button variant="primary" size="md" type="submit">
                    {editingCollection ? 'SAVE CHANGES' : 'CREATE COLLECTION'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Modal */}
        {isCatModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-[4px] max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#E7E7E7]">
                <h3 className="font-wondra text-lg text-black">
                  {editingCategory ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="text-neutral-400 hover:text-black text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="E.g., Kurtas, Sarees, Formal Wear"
                    value={catName}
                    onChange={(e) => handleCatNameChange(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="kurtas"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Editorial description of this category..."
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <SingleImageDropzone
                    value={catImage}
                    onChange={setCatImage}
                    label="Category Photography"
                    helperText="Upload category card image (WebP, PNG, JPG)."
                    aspectRatio="4/5"
                  />
                </div>

                <div className="pt-3 border-t border-[#E7E7E7] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    className="px-4 py-2 border border-[#E7E7E7] text-neutral-700 hover:bg-[#F8F8F8] rounded-[4px] font-semibold"
                  >
                    Cancel
                  </button>
                  <Button variant="primary" size="md" type="submit">
                    {editingCategory ? 'SAVE CHANGES' : 'CREATE CATEGORY'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
export default CollectionsPage;
