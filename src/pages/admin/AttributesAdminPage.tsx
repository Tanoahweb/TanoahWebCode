import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  FolderTree,
  ChevronRight,
  Palette,
  Sliders,
  ListFilter,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { Attribute, AttributeValue, Category, CategoryAttribute, AttributeType } from '../../types';

export const AttributesAdminPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'attributes' | 'mappings'>('attributes');

  // Core data states
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected attribute for values drawer/view
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);

  // Modals state
  // 1. Attribute Modal
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [attrName, setAttrName] = useState('');
  const [attrSlug, setAttrSlug] = useState('');
  const [attrType, setAttrType] = useState<AttributeType>('select');
  const [attrFilterable, setAttrFilterable] = useState(true);
  const [attrRequired, setAttrRequired] = useState(false);
  const [attrSort, setAttrSort] = useState(0);
  const [isSavingAttr, setIsSavingAttr] = useState(false);

  // 2. Value Modal
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<AttributeValue | null>(null);
  const [valText, setValText] = useState('');
  const [valSlug, setValSlug] = useState('');
  const [valColorHex, setValColorHex] = useState('');
  const [valSort, setValSort] = useState(0);
  const [isSavingValue, setIsSavingValue] = useState(false);

  // 3. Category Mapping State
  const [selectedCategoryForMapping, setSelectedCategoryForMapping] = useState<string>('');
  const [assignedAttrIds, setAssignedAttrIds] = useState<string[]>([]);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [attrList, catList] = await Promise.all([
        api.getAttributes(true),
        api.getCategories(true),
      ]);
      setAttributes(attrList || []);
      setCategories(catList || []);

      if (attrList && attrList.length > 0 && !selectedAttribute) {
        setSelectedAttribute(attrList[0]);
      } else if (selectedAttribute) {
        const refreshed = attrList.find((a) => a.id === selectedAttribute.id);
        if (refreshed) setSelectedAttribute(refreshed);
      }

      if (catList && catList.length > 0 && !selectedCategoryForMapping) {
        setSelectedCategoryForMapping(catList[0].id);
      }
    } catch (e) {
      console.error('Error loading attributes data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Load category attribute assignments whenever selectedCategoryForMapping changes
  useEffect(() => {
    if (!selectedCategoryForMapping) return;
    api.getCategoryAttributes(selectedCategoryForMapping).then((res) => {
      setCategoryAttributes(res || []);
      setAssignedAttrIds(res.map((r) => r.attribute_id));
    });
  }, [selectedCategoryForMapping]);

  // ----------------------------------------------------
  // Attribute CRUD
  // ----------------------------------------------------
  const handleOpenAttrModal = (attr?: Attribute) => {
    if (attr) {
      setEditingAttribute(attr);
      setAttrName(attr.name);
      setAttrSlug(attr.slug);
      setAttrType(attr.type || 'select');
      setAttrFilterable(attr.is_filterable !== false);
      setAttrRequired(!!attr.is_required);
      setAttrSort(attr.sort_order || 0);
    } else {
      setEditingAttribute(null);
      setAttrName('');
      setAttrSlug('');
      setAttrType('select');
      setAttrFilterable(true);
      setAttrRequired(false);
      setAttrSort(attributes.length + 1);
    }
    setIsAttrModalOpen(true);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attrName.trim()) return;

    setIsSavingAttr(true);
    try {
      const payload: Attribute = {
        id: editingAttribute ? editingAttribute.id : crypto.randomUUID(),
        name: attrName.trim(),
        slug: attrSlug.trim() || slugify(attrName),
        type: attrType,
        is_filterable: attrFilterable,
        is_required: attrRequired,
        sort_order: Number(attrSort) || 0,
        is_active: true,
      };

      const res = await api.saveAttribute(payload);
      if (res.success) {
        addToast({
          title: editingAttribute ? 'Attribute Updated' : 'Attribute Created',
          description: `Attribute "${payload.name}" saved.`,
          type: 'success',
        });
        setIsAttrModalOpen(false);
        await loadAllData();
        if (res.attribute) setSelectedAttribute(res.attribute);
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      addToast({
        title: 'Save Failed',
        description: 'Could not save attribute. Check slug uniqueness.',
        type: 'error',
      });
    } finally {
      setIsSavingAttr(false);
    }
  };

  const handleDeleteAttribute = async (attr: Attribute) => {
    if (!window.confirm(`Delete attribute "${attr.name}" and all its values? Existing products will preserve historical values in their metadata.`)) {
      return;
    }
    const ok = await api.deleteAttribute(attr.id);
    if (ok) {
      addToast({
        title: 'Attribute Deleted',
        description: `Attribute "${attr.name}" was removed.`,
        type: 'success',
      });
      if (selectedAttribute?.id === attr.id) {
        setSelectedAttribute(null);
      }
      loadAllData();
    }
  };

  // ----------------------------------------------------
  // Value CRUD
  // ----------------------------------------------------
  const handleOpenValueModal = (val?: AttributeValue) => {
    if (!selectedAttribute) return;
    if (val) {
      setEditingValue(val);
      setValText(val.value);
      setValSlug(val.slug);
      setValColorHex(val.color_hex || '');
      setValSort(val.sort_order || 0);
    } else {
      setEditingValue(null);
      setValText('');
      setValSlug('');
      setValColorHex('');
      setValSort((selectedAttribute.values?.length || 0) + 1);
    }
    setIsValueModalOpen(true);
  };

  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valText.trim() || !selectedAttribute) return;

    setIsSavingValue(true);
    try {
      const payload: AttributeValue = {
        id: editingValue ? editingValue.id : crypto.randomUUID(),
        attribute_id: selectedAttribute.id,
        value: valText.trim(),
        slug: valSlug.trim() || slugify(valText),
        color_hex: valColorHex.trim() || undefined,
        sort_order: Number(valSort) || 0,
        is_active: true,
      };

      const ok = await api.saveAttributeValue(payload);
      if (ok) {
        addToast({
          title: editingValue ? 'Value Updated' : 'Value Added',
          description: `Value "${payload.value}" saved.`,
          type: 'success',
        });
        setIsValueModalOpen(false);
        loadAllData();
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      addToast({
        title: 'Save Failed',
        description: 'Could not save attribute value.',
        type: 'error',
      });
    } finally {
      setIsSavingValue(false);
    }
  };

  const handleDeleteValue = async (val: AttributeValue) => {
    if (!window.confirm(`Delete value "${val.value}"?`)) return;
    const ok = await api.deleteAttributeValue(val.id);
    if (ok) {
      addToast({
        title: 'Value Removed',
        description: `Value "${val.value}" was deleted.`,
        type: 'success',
      });
      loadAllData();
    }
  };

  // ----------------------------------------------------
  // Category-Attribute Assignment
  // ----------------------------------------------------
  const toggleAttributeAssignment = (attrId: string) => {
    setAssignedAttrIds((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
    );
  };

  const handleSaveCategoryMapping = async () => {
    if (!selectedCategoryForMapping) return;
    setIsSavingMapping(true);
    try {
      const ok = await api.assignCategoryAttributes(selectedCategoryForMapping, assignedAttrIds);
      if (ok) {
        addToast({
          title: 'Assignments Saved',
          description: 'Category attributes updated successfully.',
          type: 'success',
        });
      } else {
        throw new Error('Assign failed');
      }
    } catch (err) {
      addToast({
        title: 'Save Failed',
        description: 'Could not update category attribute assignments.',
        type: 'error',
      });
    } finally {
      setIsSavingMapping(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-[#3F3F8F] font-semibold">
                CATALOG SPECIFICATIONS
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1">Dynamic Product Attributes</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Define reusable product specs (Fabric, Fit, Sleeve Type, Occasion, Neck Type) and assign them per Category without writing code.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/categories"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
            >
              <FolderTree className="w-3.5 h-3.5 text-[#3F3F8F]" />
              <span>Catalog Hierarchy</span>
            </Link>
            <Button
              onClick={() => handleOpenAttrModal()}
              className="flex items-center gap-1.5 text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Attribute</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 gap-6 text-xs">
          <button
            onClick={() => setActiveTab('attributes')}
            className={`pb-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
              activeTab === 'attributes'
                ? 'border-[#3F3F8F] text-[#3F3F8F]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Attributes & Value Options</span>
            <span className="ml-1 text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full">
              {attributes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`pb-3 font-semibold transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
              activeTab === 'mappings'
                ? 'border-[#3F3F8F] text-[#3F3F8F]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Assign Attributes to Category</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ATTRIBUTES & VALUE OPTIONS                         */}
        {/* ======================================================== */}
        {activeTab === 'attributes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Attributes Master List */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-neutral-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                  Defined Attributes ({attributes.length})
                </span>
                <button
                  onClick={() => handleOpenAttrModal()}
                  className="text-xs text-[#3F3F8F] font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {attributes.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  No attributes defined yet. Click "New Attribute" to create Fabric, Sleeve Type, etc.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {attributes.map((attr) => {
                    const isSelected = selectedAttribute?.id === attr.id;
                    const valCount = attr.values?.length || 0;

                    return (
                      <div
                        key={attr.id}
                        onClick={() => setSelectedAttribute(attr)}
                        className={`p-3 rounded-md cursor-pointer transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#3F3F8F]/5 border-[#3F3F8F] text-[#3F3F8F]'
                            : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-neutral-900">{attr.name}</span>
                            <span className="font-mono text-[10px] text-neutral-400">/{attr.slug}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-1">
                            <span className="uppercase font-mono">{attr.type}</span>
                            <span>•</span>
                            <span>{valCount} value(s)</span>
                            {attr.is_filterable && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 font-medium">Filterable</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAttrModal(attr);
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded"
                            title="Edit Attribute"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttribute(attr);
                            }}
                            className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete Attribute"
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

            {/* Right: Selected Attribute Values Management */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 shadow-xs p-6 space-y-5">
              {selectedAttribute ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-neutral-900">{selectedAttribute.name} Values</h2>
                        <span className="text-[10px] font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
                          slug: {selectedAttribute.slug}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Add the selectable choices for {selectedAttribute.name}. Products assigned this attribute will choose from these values.
                      </p>
                    </div>

                    <Button
                      onClick={() => handleOpenValueModal()}
                      className="text-xs bg-[#3F3F8F] text-white hover:bg-[#323275] flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Value</span>
                    </Button>
                  </div>

                  {/* Values Grid / Table */}
                  {(!selectedAttribute.values || selectedAttribute.values.length === 0) ? (
                    <div className="py-16 text-center border border-dashed border-neutral-200 rounded-lg">
                      <ListFilter className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <h4 className="text-xs font-semibold text-neutral-700">No Values Added Yet</h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Click "Add Value" to configure options (e.g. Pure Cotton, Full Sleeve).
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedAttribute.values.map((val) => (
                        <div
                          key={val.id}
                          className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between hover:bg-white transition-all shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {val.color_hex && (
                              <div
                                className="w-5 h-5 rounded-full border border-neutral-300 shrink-0 shadow-2xs"
                                style={{ backgroundColor: val.color_hex }}
                                title={val.color_hex}
                              />
                            )}
                            <div>
                              <span className="font-semibold text-xs text-neutral-900 block">{val.value}</span>
                              <span className="font-mono text-[10px] text-neutral-400">/{val.slug}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenValueModal(val)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteValue(val)}
                              className="p-1 text-red-400 hover:text-red-700 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-24 text-center text-xs text-neutral-400">
                  Select an attribute from the list to manage its values.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CATEGORY MAPPINGS                                 */}
        {/* ======================================================== */}
        {activeTab === 'mappings' && (
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xs p-6 space-y-6">
            <div className="border-b border-neutral-100 pb-4">
              <h3 className="font-bold text-neutral-900 text-sm">Assign Attributes to Category</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Choose a Category below. Any product created under this Category will dynamically present the selected attributes in the product editor!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="text-xs font-semibold text-neutral-700">Select Category:</label>
              <select
                value={selectedCategoryForMapping}
                onChange={(e) => setSelectedCategoryForMapping(e.target.value)}
                className="text-xs p-2 border border-neutral-300 rounded focus:border-[#3F3F8F] outline-none bg-white min-w-64"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.target_audience ? `(${c.target_audience.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist of all available attributes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-800">
                  Active Attributes for this Category ({assignedAttrIds.length} Selected)
                </span>
                <span className="text-[11px] text-neutral-400">
                  Click to toggle assignment
                </span>
              </div>

              {attributes.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400 border border-dashed rounded">
                  No attributes available. Create attributes in Tab 1 first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {attributes.map((attr) => {
                    const isChecked = assignedAttrIds.includes(attr.id);

                    return (
                      <div
                        key={attr.id}
                        onClick={() => toggleAttributeAssignment(attr.id)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-[#3F3F8F]/5 border-[#3F3F8F] text-[#3F3F8F]'
                            : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#3F3F8F]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-neutral-900 block">{attr.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">/{attr.slug}</span>
                          <span className="text-[10px] text-neutral-400 block mt-1">
                            {attr.values?.length || 0} option(s)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <Button
                onClick={handleSaveCategoryMapping}
                disabled={isSavingMapping || !selectedCategoryForMapping}
                className="text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
              >
                {isSavingMapping ? 'Saving...' : 'Save Category Assignments'}
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 1: ATTRIBUTE                                       */}
        {/* ======================================================== */}
        {isAttrModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-neutral-900 text-sm">
                  {editingAttribute ? 'Edit Attribute' : 'New Dynamic Attribute'}
                </h3>
                <button
                  onClick={() => setIsAttrModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAttribute} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Attribute Name *</label>
                  <input
                    type="text"
                    required
                    value={attrName}
                    onChange={(e) => {
                      setAttrName(e.target.value);
                      if (!editingAttribute) setAttrSlug(slugify(e.target.value));
                    }}
                    placeholder="e.g. Fabric, Sleeve Type, Occasion, Fit"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Slug (Identifier) *</label>
                  <input
                    type="text"
                    required
                    value={attrSlug}
                    onChange={(e) => setAttrSlug(slugify(e.target.value))}
                    placeholder="e.g. fabric, sleeve-type, occasion"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Field Type</label>
                  <select
                    value={attrType}
                    onChange={(e) => setAttrType(e.target.value as AttributeType)}
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none bg-white"
                  >
                    <option value="select">Dropdown Select (Single value)</option>
                    <option value="multi-select">Multi-Select (Multiple tags)</option>
                    <option value="color">Color Swatch (Hex code)</option>
                    <option value="text">Freeform Text</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attrFilterable}
                      onChange={(e) => setAttrFilterable(e.target.checked)}
                      className="rounded border-neutral-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                    />
                    <span className="text-xs font-medium text-neutral-700">Filterable on Store</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attrRequired}
                      onChange={(e) => setAttrRequired(e.target.checked)}
                      className="rounded border-neutral-300 text-[#3F3F8F] focus:ring-[#3F3F8F]"
                    />
                    <span className="text-xs font-medium text-neutral-700">Required Field</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    onClick={() => setIsAttrModalOpen(false)}
                    className="text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingAttr}
                    className="text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
                  >
                    {isSavingAttr ? 'Saving...' : 'Save Attribute'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: ATTRIBUTE VALUE                                 */}
        {/* ======================================================== */}
        {isValueModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-neutral-900 text-sm">
                  {editingValue ? 'Edit Value' : `Add Value to ${selectedAttribute?.name}`}
                </h3>
                <button
                  onClick={() => setIsValueModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveValue} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Value Text *</label>
                  <input
                    type="text"
                    required
                    value={valText}
                    onChange={(e) => {
                      setValText(e.target.value);
                      if (!editingValue) setValSlug(slugify(e.target.value));
                    }}
                    placeholder="e.g. Pure Cotton, 3/4th Sleeve, Casual"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={valSlug}
                    onChange={(e) => setValSlug(slugify(e.target.value))}
                    placeholder="e.g. pure-cotton, 3-4th-sleeve"
                    className="w-full text-xs p-2.5 border rounded focus:border-[#3F3F8F] outline-none font-mono"
                  />
                </div>

                {selectedAttribute?.type === 'color' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Color Hex (#RRGGBB)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={valColorHex || '#000000'}
                        onChange={(e) => setValColorHex(e.target.value)}
                        className="w-8 h-8 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={valColorHex}
                        onChange={(e) => setValColorHex(e.target.value)}
                        placeholder="#FFFFFF"
                        className="flex-1 text-xs p-2 border rounded font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    onClick={() => setIsValueModalOpen(false)}
                    className="text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingValue}
                    className="text-xs bg-[#3F3F8F] text-white hover:bg-[#323275]"
                  >
                    {isSavingValue ? 'Saving...' : 'Save Value'}
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
