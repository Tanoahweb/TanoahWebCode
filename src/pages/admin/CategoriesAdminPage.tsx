import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  FolderTree,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  Tags,
  ArrowUpDown,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { Category, Subcategory, Product } from '../../types';
import { SingleImageDropzone } from '../../components/common/SingleImageDropzone';

export const CategoriesAdminPage: React.FC = () => {
  const { addToast } = useUIStore();

  // Core data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Expand
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Modals state
  // 1. Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catSort, setCatSort] = useState(0);
  const [catActive, setCatActive] = useState(true);
  const [catSeoTitle, setCatSeoTitle] = useState('');
  const [catSeoDesc, setCatSeoDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // 2. Subcategory Modal
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [subName, setSubName] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subImage, setSubImage] = useState('');
  const [subSort, setSubSort] = useState(0);
  const [subActive, setSubActive] = useState(true);
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [catList, subList, prodList] = await Promise.all([
        api.getCategories(true),
        api.getSubcategories(undefined, true),
        api.getProducts('all'),
      ]);
      setCategories(catList || []);
      setSubcategories(subList || []);
      setProducts(prodList || []);

      // Auto-expand all categories by default
      const expMap: Record<string, boolean> = {};
      (catList || []).forEach((c) => {
        expMap[c.id] = true;
      });
      setExpandedCategories(expMap);
    } catch (e) {
      console.error('Error loading catalog data:', e);
      addToast({
        title: 'Error Loading Catalog',
        description: 'Failed to load categories. Please refresh.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleCatUpdated = () => loadAllData();
    const handleSubUpdated = () => loadAllData();
    window.addEventListener('tanoah_categories_updated', handleCatUpdated);
    window.addEventListener('tanoah_subcategories_updated', handleSubUpdated);

    return () => {
      window.removeEventListener('tanoah_categories_updated', handleCatUpdated);
      window.removeEventListener('tanoah_subcategories_updated', handleSubUpdated);
    };
  }, []);

  const slugify = (text: string) =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

  // Category CRUD Handlers
  const handleOpenCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatSlug(cat.slug);
      setCatDesc(cat.description || '');
      setCatImage(cat.image_url || '');
      setCatSort(cat.sort_order ?? 0);
      setCatActive(cat.is_active !== false);
      setCatSeoTitle(cat.seo_title || '');
      setCatSeoDesc(cat.seo_description || '');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setCatImage('');
      setCatSort(categories.length + 1);
      setCatActive(true);
      setCatSeoTitle('');
      setCatSeoDesc('');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsSavingCategory(true);
    const payload: Category = {
      id: editingCategory ? editingCategory.id : crypto.randomUUID(),
      name: catName.trim(),
      slug: catSlug.trim() || slugify(catName),
      description: catDesc.trim() || undefined,
      image_url: catImage || undefined,
      sort_order: Number(catSort) || 0,
      is_active: catActive,
      seo_title: catSeoTitle.trim() || undefined,
      seo_description: catSeoDesc.trim() || undefined,
    };

    const ok = await api.saveCategory(payload);
    if (ok) {
      addToast({
        title: editingCategory ? 'Category Updated' : 'Category Created',
        description: `Category "${payload.name}" has been saved.`,
        type: 'success',
      });
      setIsCategoryModalOpen(false);
      loadAllData();
    } else {
      addToast({
        title: 'Error Saving Category',
        description: 'Could not save category. Check slug uniqueness.',
        type: 'error',
      });
    }
    setIsSavingCategory(false);
  };

  const handleDeleteCategory = async (cat: Category) => {
    const assignedSubs = subcategories.filter((s) => s.category_id === cat.id);
    const assignedProds = products.filter((p) => p.category_id === cat.id);

    const warnMsg =
      assignedSubs.length > 0 || assignedProds.length > 0
        ? `Warning: This category contains ${assignedSubs.length} subcategories and ${assignedProds.length} products. Deleting it will leave them unassigned. Proceed?`
        : `Are you sure you want to delete category "${cat.name}"?`;

    if (!window.confirm(warnMsg)) return;

    const ok = await api.deleteCategory(cat.id);
    if (ok) {
      addToast({
        title: 'Category Removed',
        description: `Category "${cat.name}" was deleted.`,
        type: 'success',
      });
      loadAllData();
    } else {
      addToast({
        title: 'Error Deleting Category',
        description: 'Could not delete category.',
        type: 'error',
      });
    }
  };

  // Subcategory CRUD Handlers
  const handleOpenSubcategoryModal = (sub?: Subcategory, defaultCategoryId?: string) => {
    if (sub) {
      setEditingSubcategory(sub);
      setSubName(sub.name);
      setSubSlug(sub.slug);
      setSubCategoryId(sub.category_id);
      setSubDesc(sub.description || '');
      setSubImage(sub.image_url || '');
      setSubSort(sub.sort_order ?? 0);
      setSubActive(sub.is_active !== false);
    } else {
      setEditingSubcategory(null);
      setSubName('');
      setSubSlug('');
      setSubCategoryId(defaultCategoryId || (categories[0]?.id || ''));
      setSubDesc('');
      setSubImage('');
      const count = subcategories.filter((s) => s.category_id === (defaultCategoryId || categories[0]?.id)).length;
      setSubSort(count + 1);
      setSubActive(true);
    }
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCategoryId) return;

    setIsSavingSubcategory(true);
    const payload: Subcategory = {
      id: editingSubcategory ? editingSubcategory.id : crypto.randomUUID(),
      category_id: subCategoryId,
      name: subName.trim(),
      slug: subSlug.trim() || slugify(subName),
      description: subDesc.trim() || undefined,
      image_url: subImage || undefined,
      sort_order: Number(subSort) || 0,
      is_active: subActive,
    };

    const ok = await api.saveSubcategory(payload);
    if (ok) {
      addToast({
        title: editingSubcategory ? 'Subcategory Updated' : 'Subcategory Created',
        description: `Subcategory "${payload.name}" has been saved.`,
        type: 'success',
      });
      setIsSubcategoryModalOpen(false);
      loadAllData();
    } else {
      addToast({
        title: 'Error Saving Subcategory',
        description: 'Could not save subcategory.',
        type: 'error',
      });
    }
    setIsSavingSubcategory(false);
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    const assignedProds = products.filter((p) => p.subcategory_id === sub.id);
    const warnMsg =
      assignedProds.length > 0
        ? `Warning: ${assignedProds.length} products are assigned to this subcategory. Delete anyway?`
        : `Are you sure you want to delete subcategory "${sub.name}"?`;

    if (!window.confirm(warnMsg)) return;

    const ok = await api.deleteSubcategory(sub.id);
    if (ok) {
      addToast({
        title: 'Subcategory Removed',
        description: `Subcategory "${sub.name}" was deleted.`,
        type: 'success',
      });
      loadAllData();
    } else {
      addToast({
        title: 'Error Deleting Subcategory',
        description: 'Could not delete subcategory.',
        type: 'error',
      });
    }
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCat = cat.name.toLowerCase().includes(term) || cat.slug.toLowerCase().includes(term);
        const matchSub = subcategories.some(
          (s) => s.category_id === cat.id && (s.name.toLowerCase().includes(term) || s.slug.toLowerCase().includes(term))
        );
        if (!matchCat && !matchSub) return false;
      }
      return true;
    });
  }, [categories, subcategories, searchTerm]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-16 font-poppins text-xs">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-[#3F3F8F] font-semibold">
                CATALOG ARCHITECTURE
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1">Categories & Subcategories</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Manage women's garment categories and subcategories with zero developer dependencies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/attributes"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
            >
              <Tags className="w-3.5 h-3.5 text-[#3F3F8F]" />
              <span>Dynamic Attributes</span>
            </Link>
            <Button
              onClick={() => handleOpenCategoryModal()}
              className="flex items-center gap-1.5 text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </Button>
          </div>
        </div>

        {/* Hierarchy Section */}
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search categories or subcategories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded focus:bg-white focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-neutral-500">
                {categories.length} Categories • {subcategories.length} Subcategories
              </span>
              <Button
                onClick={() => handleOpenCategoryModal()}
                className="text-xs bg-neutral-900 text-white hover:bg-neutral-800 whitespace-nowrap flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </Button>
            </div>
          </div>

          {/* Tree View Cards */}
          {isLoading ? (
            <div className="py-20 text-center text-xs text-neutral-400">Loading categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-12 text-center">
              <Layers className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <h3 className="font-bold text-neutral-800 text-sm">No Categories Found</h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                {searchTerm ? 'No categories matched your search term.' : 'Get started by creating your first garment category.'}
              </p>
              <Button onClick={() => handleOpenCategoryModal()} className="text-xs bg-[#3F3F8F] text-white">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCategories.map((cat) => {
                const catSubs = subcategories.filter((s) => s.category_id === cat.id);
                const assignedProds = products.filter((p) => p.category_id === cat.id);
                const isExpanded = expandedCategories[cat.id] ?? true;

                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
                  >
                    {/* Category Header Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50/50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleCategoryExpand(cat.id)}
                          className="p-1 hover:bg-neutral-200 rounded transition-colors text-neutral-500"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? '' : '-rotate-90'
                            }`}
                          />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-neutral-900 text-sm">{cat.name}</span>
                            <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                              /{cat.slug}
                            </span>
                            {!cat.is_active && (
                              <span className="text-[10px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">
                                Hidden
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-xs text-neutral-500 mt-0.5">{cat.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-neutral-500 self-end md:self-auto">
                        <span className="font-medium bg-neutral-100 px-2 py-0.5 rounded">
                          {catSubs.length} Subcategories
                        </span>
                        <span className="font-medium bg-neutral-100 px-2 py-0.5 rounded">
                          {assignedProds.length} Products
                        </span>

                        <div className="flex items-center gap-1 border-l pl-3">
                          <button
                            onClick={() => handleOpenSubcategoryModal(undefined, cat.id)}
                            className="p-1.5 text-[#3F3F8F] hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                            title="Add Subcategory"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold">Subcategory</span>
                          </button>
                          <button
                            onClick={() => handleOpenCategoryModal(cat)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Subcategories Container */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 p-4 bg-white">
                        {catSubs.length === 0 ? (
                          <div className="py-4 text-center text-xs text-neutral-400 italic">
                            No subcategories added yet. Click "+ Subcategory" to add tailored styles (e.g. A-Line, Gathered, Box Pleated).
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {catSubs.map((sub) => {
                              const subProds = products.filter((p) => p.subcategory_id === sub.id);
                              return (
                                <div
                                  key={sub.id}
                                  className="p-3 border border-neutral-200 rounded bg-white hover:border-[#3F3F8F]/40 transition-colors flex items-center justify-between"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-neutral-800 text-xs">{sub.name}</span>
                                      {!sub.is_active && (
                                        <span className="text-[9px] bg-neutral-100 text-neutral-400 px-1 py-0.2 rounded">
                                          Off
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="font-mono text-[9px] text-neutral-400">/{sub.slug}</span>
                                      <span className="text-[10px] text-neutral-400">•</span>
                                      <span className="text-[10px] text-neutral-500">{subProds.length} items</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenSubcategoryModal(sub, cat.id)}
                                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubcategory(sub)}
                                      className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MODAL: CATEGORY                                           */}
        {/* ======================================================== */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-neutral-900 text-sm">
                  {editingCategory ? 'Edit Category' : 'New Garment Category'}
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => {
                      setCatName(e.target.value);
                      if (!editingCategory) setCatSlug(slugify(e.target.value));
                    }}
                    placeholder="e.g. Sarees, Tops & Tunics, Cord Sets"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={catSlug}
                    onChange={(e) => setCatSlug(slugify(e.target.value))}
                    placeholder="e.g. saree, tops, cord-set"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Used in URLs like /collections/all?category=saree
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Editorial description of this garment category..."
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Hero Banner / Card Image</label>
                  <SingleImageDropzone
                    value={catImage}
                    onChange={(url) => setCatImage(url)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={catSort}
                      onChange={(e) => setCatSort(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={catActive}
                        onChange={(e) => setCatActive(e.target.checked)}
                        className="w-4 h-4 rounded text-[#3F3F8F] focus:ring-[#3F3F8F]"
                      />
                      <span className="text-xs text-neutral-700 font-medium">Active (Visible)</span>
                    </label>
                  </div>
                </div>

                {/* SEO Accordion */}
                <div className="border border-neutral-200 rounded p-3 bg-neutral-50 space-y-3">
                  <h4 className="font-semibold text-neutral-700 text-xs">Search Engine Optimization (SEO)</h4>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">SEO Title</label>
                    <input
                      type="text"
                      value={catSeoTitle}
                      onChange={(e) => setCatSeoTitle(e.target.value)}
                      placeholder="e.g. Designer Sarees | TANOAH Atelier"
                      className="w-full text-xs p-2 bg-white border rounded focus:border-[#3F3F8F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">Meta Description</label>
                    <textarea
                      rows={2}
                      value={catSeoDesc}
                      onChange={(e) => setCatSeoDesc(e.target.value)}
                      placeholder="Meta description for search engines..."
                      className="w-full text-xs p-2 bg-white border rounded focus:border-[#3F3F8F] outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingCategory}
                    className="text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
                  >
                    {isSavingCategory ? 'Saving...' : 'Save Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: SUBCATEGORY                                        */}
        {/* ======================================================== */}
        {isSubcategoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-neutral-900 text-sm">
                  {editingSubcategory ? 'Edit Subcategory' : 'New Subcategory'}
                </h3>
                <button
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSubcategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Parent Category *</label>
                  <select
                    required
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none bg-white"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Subcategory Name *</label>
                  <input
                    type="text"
                    required
                    value={subName}
                    onChange={(e) => {
                      setSubName(e.target.value);
                      if (!editingSubcategory) setSubSlug(slugify(e.target.value));
                    }}
                    placeholder="e.g. A-Line Tops, Box Pleated, Cotton, Organza"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={subSlug}
                    onChange={(e) => setSubSlug(slugify(e.target.value))}
                    placeholder="e.g. a-line-tops, box-pleated, cotton"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={subSort}
                      onChange={(e) => setSubSort(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subActive}
                        onChange={(e) => setSubActive(e.target.checked)}
                        className="w-4 h-4 rounded text-[#3F3F8F] focus:ring-[#3F3F8F]"
                      />
                      <span className="text-xs text-neutral-700 font-medium">Active (Visible)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSubcategoryModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingSubcategory}
                    className="text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
                  >
                    {isSavingSubcategory ? 'Saving...' : 'Save Subcategory'}
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
export default CategoriesAdminPage;
