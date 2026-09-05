import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  IndianRupee,
  ShieldCheck,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { DeliverySpeedTier, StoreSettings } from '../../types';
import { DEFAULT_DELIVERY_SPEEDS } from '../../data/mockData';

export const DeliverySettingsTab: React.FC = () => {
  const { addToast } = useUIStore();

  const [tiers, setTiers] = useState<DeliverySpeedTier[]>(DEFAULT_DELIVERY_SPEEDS);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1999);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal State for Add/Edit Tier
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState<{
    id: string;
    name: string;
    description: string;
    estimated_days: string;
    charge: number;
    is_free_eligible: boolean;
    is_active: boolean;
    is_default: boolean;
  }>({
    id: '',
    name: '',
    description: '',
    estimated_days: '',
    charge: 0,
    is_free_eligible: true,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [speeds, settings] = await Promise.all([
          api.getDeliverySpeeds(),
          api.getStoreSettings(),
        ]);
        if (isMounted) {
          if (speeds && speeds.length > 0) {
            setTiers(speeds);
          }
          if (settings && settings.free_shipping_threshold !== undefined) {
            setFreeShippingThreshold(Number(settings.free_shipping_threshold));
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load delivery speed settings:', err);
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingTierId(null);
    setTierForm({
      id: `speed_${Date.now()}`,
      name: '',
      description: '',
      estimated_days: '3–5 Business Days',
      charge: 99,
      is_free_eligible: false,
      is_active: true,
      is_default: tiers.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tier: DeliverySpeedTier) => {
    setEditingTierId(tier.id);
    setTierForm({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      estimated_days: tier.estimated_days,
      charge: tier.charge,
      is_free_eligible: tier.is_free_eligible,
      is_active: tier.is_active,
      is_default: Boolean(tier.is_default),
    });
    setIsModalOpen(true);
  };

  const handleSaveTierForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierForm.name.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Please enter a name for the delivery speed tier.',
      });
      return;
    }
    if (!tierForm.estimated_days.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Please specify the estimated transit days (e.g. 2–3 Business Days).',
      });
      return;
    }

    let updatedTiers = [...tiers];

    if (editingTierId) {
      updatedTiers = updatedTiers.map((t) => {
        if (t.id === editingTierId) {
          return {
            ...t,
            name: tierForm.name.trim(),
            description: tierForm.description.trim(),
            estimated_days: tierForm.estimated_days.trim(),
            charge: Number(tierForm.charge) || 0,
            is_free_eligible: tierForm.is_free_eligible,
            is_active: tierForm.is_active,
            is_default: tierForm.is_default,
          };
        }
        return tierForm.is_default ? { ...t, is_default: false } : t;
      });
    } else {
      const newTier: DeliverySpeedTier = {
        id: tierForm.id || `speed_${Date.now()}`,
        name: tierForm.name.trim(),
        description: tierForm.description.trim(),
        estimated_days: tierForm.estimated_days.trim(),
        charge: Number(tierForm.charge) || 0,
        is_free_eligible: tierForm.is_free_eligible,
        is_active: tierForm.is_active,
        is_default: tierForm.is_default,
      };

      if (newTier.is_default) {
        updatedTiers = updatedTiers.map((t) => ({ ...t, is_default: false }));
      }
      updatedTiers.push(newTier);
    }

    // Ensure at least one tier is default if available
    const hasDefault = updatedTiers.some((t) => t.is_default && t.is_active);
    if (!hasDefault && updatedTiers.length > 0) {
      const firstActiveIndex = updatedTiers.findIndex((t) => t.is_active);
      if (firstActiveIndex !== -1) {
        updatedTiers[firstActiveIndex].is_default = true;
      }
    }

    setTiers(updatedTiers);
    setIsModalOpen(false);
  };

  const handleDeleteTier = (id: string) => {
    if (tiers.length <= 1) {
      addToast({
        type: 'error',
        title: 'Action Denied',
        description: 'You must maintain at least one delivery speed option for customer checkout.',
      });
      return;
    }
    const filtered = tiers.filter((t) => t.id !== id);
    if (!filtered.some((t) => t.is_default) && filtered.length > 0) {
      filtered[0].is_default = true;
    }
    setTiers(filtered);
    addToast({
      type: 'info',
      title: 'Tier Removed',
      description: 'Remember to click Save Changes to sync to database.',
    });
  };

  const handleToggleActive = (id: string) => {
    const updated = tiers.map((t) => {
      if (t.id === id) {
        return { ...t, is_active: !t.is_active };
      }
      return t;
    });
    setTiers(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = tiers.map((t) => ({
      ...t,
      is_default: t.id === id,
      is_active: t.id === id ? true : t.is_active, // auto activate default
    }));
    setTiers(updated);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all delivery speeds to standard factory defaults?')) {
      setTiers(DEFAULT_DELIVERY_SPEEDS);
      setFreeShippingThreshold(1999);
      addToast({
        type: 'info',
        title: 'Reset Completed',
        description: 'Tiers reset to defaults. Click Save Changes to apply.',
      });
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const [saveSpeedsRes, saveSettingsRes] = await Promise.all([
        api.saveDeliverySpeeds(tiers),
        api.saveStoreSettings({
          free_shipping_threshold: Number(freeShippingThreshold),
          delivery_speeds_config: tiers,
        }),
      ]);

      if (saveSpeedsRes && saveSettingsRes) {
        addToast({
          type: 'success',
          title: 'Delivery Speeds Saved',
          description: 'Your custom delivery tiers and transit rules are now live at checkout.',
        });
      } else {
        throw new Error('Supabase update returned false');
      }
    } catch (err: any) {
      console.error('Failed to save delivery settings:', err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not persist delivery configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-neutral-500">
        Loading delivery speeds configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs font-poppins">
      {/* Top Banner Notice */}
      <div className="p-4 bg-[#EEEEF8] border border-[#3F3F8F]/20 rounded-[4px] flex items-start gap-3">
        <Truck className="w-5 h-5 text-[#3F3F8F] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-black text-sm">
            Admin-Managed Delivery Speeds & Shipping Options
          </p>
          <p className="text-neutral-600 leading-relaxed text-[11px]">
            Define the courier speeds displayed to your customers at checkout. Each option includes
            custom estimated transit duration (days taken), extra fees, free shipping threshold
            waivers, and active status. India Post delivery tracking links will remain accessible on
            customer order status pages.
          </p>
        </div>
      </div>

      {/* 1. Global Threshold Settings */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E7E7E7] pb-3">
          <Sparkles className="w-4 h-4 text-[#3F3F8F]" />
          <h2 className="font-semibold text-black text-sm uppercase tracking-wider">
            Free Delivery Threshold Rule
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Cart Value Threshold for Free Delivery (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-neutral-400 font-sans">₹</span>
              <input
                type="number"
                min="0"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] font-mono text-sm"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Any tier marked as "Free Shipping Eligible" will automatically become ₹0 when the
              customer's cart subtotal meets or exceeds this amount.
            </p>
          </div>

          <div className="bg-[#FAFAFA] p-3 rounded-[4px] border border-[#EAEAEA] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-[11px] text-neutral-600">
              <span className="font-semibold text-black block">100% Prepaid Delivery</span>
              Cash on Delivery (COD) is disabled across all tiers. Orders are guaranteed via
              integrated online payment gateways (Razorpay / Cashfree).
            </div>
          </div>
        </div>
      </div>

      {/* 2. Delivery Speed Tiers Management */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-3">
          <div>
            <h2 className="font-semibold text-black text-sm uppercase tracking-wider">
              Delivery Speed Tiers ({tiers.length})
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Customers can pick their preferred transit speed in the "DELIVERY SPEED" checkout step.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Delivery Speed
          </Button>
        </div>

        {/* Tiers List */}
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-4 border rounded-[4px] transition-colors ${
                tier.is_active
                  ? tier.is_default
                    ? 'border-[#3F3F8F] bg-[#EEEEF8]/20'
                    : 'border-[#E7E7E7] bg-white'
                  : 'border-neutral-200 bg-neutral-50/70 opacity-70'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-black text-sm">{tier.name}</span>
                    {tier.is_default && (
                      <span className="px-2 py-0.5 bg-[#3F3F8F] text-white text-[9px] font-semibold uppercase tracking-wider rounded">
                        Default Selected
                      </span>
                    )}
                    {tier.is_active ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-semibold uppercase tracking-wider rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-neutral-200 text-neutral-600 text-[9px] font-semibold uppercase tracking-wider rounded">
                        Disabled
                      </span>
                    )}
                    {tier.is_free_eligible && (
                      <span className="px-2 py-0.5 bg-blue-100 text-[#3F3F8F] text-[9px] font-semibold uppercase tracking-wider rounded">
                        Free Eligible &ge; ₹{freeShippingThreshold}
                      </span>
                    )}
                  </div>

                  <p className="text-neutral-500 text-[11px]">{tier.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-600 pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#3F3F8F]" />
                      <span>{tier.estimated_days}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-black">
                      <IndianRupee className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{tier.charge === 0 ? 'FREE' : `₹${tier.charge}`}</span>
                    </span>
                  </div>
                </div>

                {/* Actions & Toggles */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {!tier.is_default && tier.is_active && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(tier.id)}
                      className="px-2.5 py-1.5 border border-neutral-300 rounded text-[10px] font-semibold text-neutral-600 hover:text-black hover:border-black transition-colors"
                      title="Make this the default selected option at checkout"
                    >
                      Set Default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleActive(tier.id)}
                    className={`px-2.5 py-1.5 border rounded text-[10px] font-semibold transition-colors ${
                      tier.is_active
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'border-neutral-300 text-neutral-600 bg-neutral-100 hover:bg-neutral-200'
                    }`}
                  >
                    {tier.is_active ? 'Active' : 'Enable'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(tier)}
                    className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded transition-colors"
                    title="Edit Speed Tier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTier(tier.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Delete Tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAFAFA] p-4 border border-[#E7E7E7] rounded-[4px]">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSaveAll}
            disabled={isSaving}
            icon={isSaving ? undefined : <Save className="w-4 h-4" />}
          >
            {isSaving ? 'Saving Changes...' : 'SAVE ALL DELIVERY SETTINGS'}
          </Button>
        </div>
      </div>

      {/* Add / Edit Tier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[6px] shadow-2xl border border-[#E7E7E7] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E7E7E7] bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#3F3F8F]" />
                <h3 className="font-semibold text-black text-sm">
                  {editingTierId ? 'Edit Delivery Speed Tier' : 'Add New Delivery Speed Tier'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-black rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTierForm} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Speed Option Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Delivery (India Post) or Express Air"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Days Taken / Transit Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4–6 Business Days"
                    value={tierForm.estimated_days}
                    onChange={(e) => setTierForm({ ...tierForm, estimated_days: e.target.value })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Displayed to customer at checkout</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Shipping Charge / Extra Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={tierForm.charge}
                    onChange={(e) => setTierForm({ ...tierForm, charge: Number(e.target.value) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] font-mono"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Enter 0 for complimentary</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Insured doorstep delivery across India via India Post Speed Post"
                  value={tierForm.description}
                  onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E7E7E7]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tierForm.is_free_eligible}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, is_free_eligible: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#3F3F8F] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-neutral-800 text-[11px] font-medium">
                    Free Shipping Eligible (Free when order reaches ₹{freeShippingThreshold})
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tierForm.is_active}
                    onChange={(e) => setTierForm({ ...tierForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-[#3F3F8F] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-neutral-800 text-[11px] font-medium">
                    Active (Show as selectable option during checkout)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tierForm.is_default}
                    onChange={(e) => setTierForm({ ...tierForm, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-[#3F3F8F] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-neutral-800 text-[11px] font-medium">
                    Default Selection (Pre-selected when customer arrives at checkout)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E7E7]">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingTierId ? 'Update Tier' : 'Add Tier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
