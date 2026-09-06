import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit2, Globe, Layers, X, Check, Power } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { Coupon, Collection } from '../../types';

export const CouponsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Coupon Form States
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minSpend, setMinSpend] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [applicability, setApplicability] = useState<'all' | 'collections'>('all');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // Edit Coupon Modal State
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editForm, setEditForm] = useState<{
    description: string;
    discount_type: 'percentage' | 'fixed' | 'free_shipping';
    discount_value: number;
    min_spend: number;
    max_discount: string;
    applicability: 'all' | 'collections';
    eligible_collections: string[];
    is_active: boolean;
  }>({
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_spend: 0,
    max_discount: '',
    applicability: 'all',
    eligible_collections: [],
    is_active: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cpns, cols] = await Promise.all([api.getCoupons(), api.getCollections()]);
      setCoupons(cpns || []);
      setCollections(cols || []);
    } catch (err) {
      console.error('Error loading coupon data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCollection = (slug: string, isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => {
        const exists = prev.eligible_collections.includes(slug);
        const updated = exists
          ? prev.eligible_collections.filter((s) => s !== slug)
          : [...prev.eligible_collections, slug];
        return { ...prev, eligible_collections: updated };
      });
    } else {
      setSelectedCollections((prev) => {
        const exists = prev.includes(slug);
        return exists ? prev.filter((s) => s !== slug) : [...prev, slug];
      });
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    if (applicability === 'collections' && selectedCollections.length === 0) {
      addToast({
        type: 'error',
        title: 'Collection Required',
        description: 'Please select at least one collection for this offer or choose "All Products".',
      });
      return;
    }

    const res = await api.createCoupon({
      code: newCode.trim().toUpperCase(),
      description: newDescription.trim() || undefined,
      discount_type: discountType,
      discount_value: discountType === 'free_shipping' ? 0 : discountValue,
      min_spend: minSpend,
      max_discount: maxDiscount ? Number(maxDiscount) : undefined,
      eligible_collections: applicability === 'collections' ? selectedCollections : [],
      is_active: true,
    });

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Coupon Created & Active',
        description: `Promo code ${newCode.trim().toUpperCase()} is now live and usable at checkout.`,
      });
      // Reset form
      setNewCode('');
      setNewDescription('');
      setDiscountValue(15);
      setMinSpend(0);
      setMaxDiscount('');
      setApplicability('all');
      setSelectedCollections([]);
      loadData();
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = !coupon.is_active;
    const success = await api.updateCoupon(coupon.id, { is_active: newStatus });
    if (success) {
      addToast({
        type: 'info',
        title: newStatus ? 'Coupon Activated' : 'Coupon Paused',
        description: `Code ${coupon.code} is now ${newStatus ? 'active' : 'paused'}.`,
      });
      loadData();
    }
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    const hasCollections = Boolean(c.eligible_collections && c.eligible_collections.length > 0);
    setEditForm({
      description: c.description || '',
      discount_type: (c.discount_type as any) || 'percentage',
      discount_value: c.discount_value,
      min_spend: c.min_spend || 0,
      max_discount: c.max_discount ? String(c.max_discount) : '',
      applicability: hasCollections ? 'collections' : 'all',
      eligible_collections: c.eligible_collections || [],
      is_active: c.is_active !== false,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    if (editForm.applicability === 'collections' && editForm.eligible_collections.length === 0) {
      addToast({
        type: 'error',
        title: 'Collection Required',
        description: 'Please select at least one collection or choose "All Products".',
      });
      return;
    }

    const updates: Partial<Coupon> = {
      description: editForm.description.trim() || undefined,
      discount_type: editForm.discount_type,
      discount_value: editForm.discount_type === 'free_shipping' ? 0 : Number(editForm.discount_value),
      min_spend: Number(editForm.min_spend),
      max_discount: editForm.max_discount ? Number(editForm.max_discount) : undefined,
      eligible_collections: editForm.applicability === 'collections' ? editForm.eligible_collections : [],
      is_active: editForm.is_active,
    };

    const success = await api.updateCoupon(editingCoupon.id, updates);
    if (success) {
      addToast({
        type: 'success',
        title: 'Coupon Updated',
        description: `Code ${editingCoupon.code} has been successfully updated.`,
      });
      setEditingCoupon(null);
      loadData();
    } else {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: 'Could not update coupon. Please try again.',
      });
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (window.confirm(`Are you sure you want to delete code "${coupon.code}"?`)) {
      await api.deleteCoupon(coupon.id);
      addToast({
        type: 'info',
        title: 'Coupon Removed',
        description: `Code ${coupon.code} has been removed.`,
      });
      loadData();
    }
  };

  const getCollectionName = (slugOrId: string) => {
    const col = collections.find((c) => c.slug === slugOrId || c.id === slugOrId);
    return col ? col.title : slugOrId;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins pb-12">
        <div>
          <h1 className="font-wondra text-2xl sm:text-3xl text-black">
            DISCOUNT ENGINE & PROMOTIONS
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Configure storewide or collection-specific coupon codes, minimum spend thresholds, and dynamic customer promotions.
          </p>
        </div>

        {/* Create Coupon Card */}
        <form
          onSubmit={handleCreateCoupon}
          className="p-5 sm:p-6 bg-white border border-[#E7E7E7] rounded-[6px] shadow-sm space-y-5 text-xs"
        >
          <div className="flex items-center gap-2 border-b border-[#F0F0F0] pb-3">
            <Tag className="w-4 h-4 text-[#3F3F8F]" />
            <h2 className="font-semibold text-sm text-[#111111] uppercase tracking-wider">
              Create New Promotion / Coupon
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                Promo Code *
              </label>
              <input
                required
                type="text"
                placeholder="E.g., LINEN50"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] uppercase font-mono font-bold text-[#3F3F8F] focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                Discount Type *
              </label>
              <select
                value={discountType}
                onChange={(e: any) => setDiscountType(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white font-medium"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            {discountType !== 'free_shipping' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                  Discount Value {discountType === 'percentage' ? '(%)' : '(₹)'} *
                </label>
                <input
                  type="number"
                  min={1}
                  max={discountType === 'percentage' ? 100 : 50000}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                Min. Spend (₹)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                placeholder="0 (No minimum)"
                value={minSpend || ''}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            {discountType === 'percentage' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                  Max Discount (₹) <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={100}
                  placeholder="e.g. 1000"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            )}

            <div className={discountType === 'percentage' ? 'sm:col-span-3' : 'sm:col-span-2 md:col-span-3'}>
              <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                Public Description / Customer Banner Note <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="E.g., 50% off on all Linen collection products"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>
          </div>

          {/* Applicability: All Products vs Specific Collections */}
          <div className="bg-[#FBFBFC] border border-[#EEEEEE] p-4 rounded-[6px] space-y-3">
            <label className="block text-[11px] font-semibold uppercase text-[#333333]">
              Applicability: Which products does this offer apply to?
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setApplicability('all')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-medium border transition-all ${
                  applicability === 'all'
                    ? 'bg-[#3F3F8F] text-white border-[#3F3F8F] shadow-sm'
                    : 'bg-white text-neutral-700 border-[#D8D8D8] hover:bg-neutral-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                All Products (Storewide)
              </button>

              <button
                type="button"
                onClick={() => setApplicability('collections')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-xs font-medium border transition-all ${
                  applicability === 'collections'
                    ? 'bg-[#3F3F8F] text-white border-[#3F3F8F] shadow-sm'
                    : 'bg-white text-neutral-700 border-[#D8D8D8] hover:bg-neutral-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Specific Collections ({selectedCollections.length} selected)
              </button>
            </div>

            {applicability === 'collections' && (
              <div className="mt-3 pt-3 border-t border-[#EAEAEA] space-y-2">
                <p className="text-[11px] text-neutral-500 font-medium">
                  Select the collections eligible for this coupon code:
                </p>
                {collections.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No collections found in database.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto">
                    {collections.map((col) => {
                      const isSelected = selectedCollections.includes(col.slug) || selectedCollections.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => handleToggleCollection(col.slug || col.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                            isSelected
                              ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {col.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="primary" size="md" type="submit" icon={<Plus className="w-4 h-4" />}>
              CREATE PROMOTION
            </Button>
          </div>
        </form>

        {/* Coupons List */}
        <div className="bg-white border border-[#E7E7E7] rounded-[6px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#3F3F8F]" />
              <span className="font-semibold text-xs text-neutral-800 uppercase tracking-wider">
                Active & Saved Promotions ({coupons.length})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Offer Value</th>
                  <th className="p-4">Min. Spend / Limit</th>
                  <th className="p-4">Applicability</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400">
                      Loading promotions...
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400">
                      No coupon codes found. Create one using the form above.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => {
                    const label =
                      c.discount_type === 'percentage'
                        ? `${c.discount_value}% OFF`
                        : c.discount_type === 'free_shipping'
                        ? 'FREE SHIPPING'
                        : `₹${c.discount_value} OFF`;

                    const hasCollections = Boolean(c.eligible_collections && c.eligible_collections.length > 0);

                    return (
                      <tr key={c.id || c.code} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#3F3F8F] bg-[#3F3F8F]/5 border border-[#3F3F8F]/20 px-2.5 py-1 rounded">
                              {c.code}
                            </span>
                          </div>
                          {c.description && (
                            <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">{c.description}</p>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-neutral-900 text-sm">{label}</span>
                          {c.max_discount && (
                            <p className="text-[10px] text-neutral-500">Max ₹{c.max_discount.toLocaleString('en-IN')}</p>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="font-mono text-neutral-700 font-medium">
                            {c.min_spend ? `₹${c.min_spend.toLocaleString('en-IN')}` : 'No minimum'}
                          </span>
                        </td>

                        <td className="p-4">
                          {hasCollections ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                                <Layers className="w-3 h-3" />
                                {c.eligible_collections!.length} Collection{c.eligible_collections!.length > 1 ? 's' : ''}
                              </span>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {c.eligible_collections!.map((slug) => (
                                  <span
                                    key={slug}
                                    className="bg-neutral-100 text-neutral-600 text-[10px] px-1.5 py-0.5 rounded"
                                  >
                                    {getCollectionName(slug)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                              <Globe className="w-3 h-3" />
                              All Products
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                              c.is_active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-neutral-100 text-neutral-500 border border-neutral-300 hover:bg-neutral-200'
                            }`}
                            title="Click to toggle status"
                          >
                            <Power className="w-3 h-3" />
                            {c.is_active !== false ? 'ACTIVE' : 'PAUSED'}
                          </button>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(c)}
                              className="p-1.5 text-neutral-500 hover:text-[#3F3F8F] hover:bg-[#3F3F8F]/5 rounded transition-colors"
                              title="Edit coupon"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete coupon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Coupon Modal */}
        {editingCoupon && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[8px] shadow-xl max-w-lg w-full overflow-hidden border border-[#E7E7E7] animate-fadeIn">
              <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FAFAFA]">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#3F3F8F]" />
                  <h3 className="font-semibold text-sm text-[#111111] uppercase tracking-wide">
                    Edit Coupon: <span className="font-mono font-bold text-[#3F3F8F]">{editingCoupon.code}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setEditingCoupon(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={editForm.discount_type}
                      onChange={(e: any) => setEditForm({ ...editForm, discount_type: e.target.value })}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white font-medium"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                      <option value="free_shipping">Free Shipping</option>
                    </select>
                  </div>

                  {editForm.discount_type !== 'free_shipping' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                        Discount Value {editForm.discount_type === 'percentage' ? '(%)' : '(₹)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={editForm.discount_type === 'percentage' ? 100 : 50000}
                        value={editForm.discount_value}
                        onChange={(e) => setEditForm({ ...editForm, discount_value: Number(e.target.value) })}
                        className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                      Min. Spend (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.min_spend}
                      onChange={(e) => setEditForm({ ...editForm, min_spend: Number(e.target.value) })}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                    />
                  </div>

                  {editForm.discount_type === 'percentage' && (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                        Max Discount (₹)
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder="Optional"
                        value={editForm.max_discount}
                        onChange={(e) => setEditForm({ ...editForm, max_discount: e.target.value })}
                        className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                    Description / Banner Note
                  </label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="E.g., 50% off on all Linen orders"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                {/* Applicability in Edit Modal */}
                <div className="bg-[#FBFBFC] border border-[#EEEEEE] p-3.5 rounded-[6px] space-y-2.5">
                  <label className="block text-[11px] font-semibold uppercase text-[#333333]">
                    Collection Applicability
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, applicability: 'all' })}
                      className={`flex-1 py-1.5 rounded-[4px] text-xs font-medium border text-center transition-all ${
                        editForm.applicability === 'all'
                          ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
                          : 'bg-white text-neutral-700 border-[#D8D8D8]'
                      }`}
                    >
                      All Products
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, applicability: 'collections' })}
                      className={`flex-1 py-1.5 rounded-[4px] text-xs font-medium border text-center transition-all ${
                        editForm.applicability === 'collections'
                          ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
                          : 'bg-white text-neutral-700 border-[#D8D8D8]'
                      }`}
                    >
                      Specific Collections ({editForm.eligible_collections.length})
                    </button>
                  </div>

                  {editForm.applicability === 'collections' && (
                    <div className="flex flex-wrap gap-1.5 pt-2 max-h-36 overflow-y-auto">
                      {collections.map((col) => {
                        const isSelected =
                          editForm.eligible_collections.includes(col.slug) ||
                          editForm.eligible_collections.includes(col.id);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => handleToggleCollection(col.slug || col.id, true)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                              isSelected
                                ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
                                : 'bg-white text-neutral-700 border-neutral-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {col.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="rounded text-[#3F3F8F] focus:ring-[#3F3F8F]"
                    />
                    <span className="text-xs font-medium text-neutral-800">Coupon is Active</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setEditingCoupon(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit">
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
