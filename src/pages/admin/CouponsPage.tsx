import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { Coupon } from '../../types';

export const CouponsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minSpend, setMinSpend] = useState<number>(1500);

  const loadCoupons = async () => {
    setIsLoading(true);
    const data = await api.getCoupons();
    setCoupons(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    const res = await api.createCoupon({
      code: newCode.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: discountType === 'free_shipping' ? 0 : discountValue,
      min_spend: minSpend,
      is_active: true,
    });

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Coupon Created & Active',
        description: `Promo code ${newCode.trim().toUpperCase()} is now live and usable at checkout.`,
      });
      setNewCode('');
      loadCoupons();
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (window.confirm(`Are you sure you want to deactivate code "${coupon.code}"?`)) {
      await api.deleteCoupon(coupon.id);
      addToast({
        type: 'info',
        title: 'Coupon Removed',
        description: `Code ${coupon.code} has been removed.`,
      });
      loadCoupons();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins">
        <div>
          <h1 className="font-wondra text-2xl sm:text-3xl text-black">
            DISCOUNT ENGINE & PROMOTIONS
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Create coupon codes, manage percentage discounts, and configure automated threshold rules.
          </p>
        </div>

        {/* Create Coupon Bar */}
        <form
          onSubmit={handleCreateCoupon}
          className="p-5 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm flex flex-wrap items-end gap-4 text-xs"
        >
          <div>
            <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
              Promo Code
            </label>
            <input
              required
              type="text"
              placeholder="E.g., SUMMER15"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="p-2.5 border border-[#E7E7E7] rounded-[4px] uppercase font-mono focus:outline-none focus:border-[#3F3F8F] w-40"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
              Discount Type
            </label>
            <select
              value={discountType}
              onChange={(e: any) => setDiscountType(e.target.value)}
              className="p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>

          {discountType !== 'free_shipping' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-600 mb-1">
                Value {discountType === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                min={1}
                max={discountType === 'percentage' ? 100 : 50000}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-24 p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
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
              step={100}
              value={minSpend}
              onChange={(e) => setMinSpend(Number(e.target.value))}
              className="w-28 p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <Button variant="primary" size="md" type="submit" icon={<Plus className="w-4 h-4" />}>
            CREATE DISCOUNT
          </Button>
        </form>

        {/* Coupons List */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
              <tr>
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Discount Type</th>
                <th className="p-4">Min. Spend</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]">
              {coupons.map((c) => {
                const label =
                  c.discount_type === 'percentage'
                    ? `${c.discount_value}% OFF`
                    : c.discount_type === 'free_shipping'
                    ? 'Free Shipping'
                    : `₹${c.discount_value} OFF`;

                return (
                  <tr key={c.id || c.code} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#3F3F8F]">{c.code}</td>
                    <td className="p-4 font-medium text-black">{label}</td>
                    <td className="p-4 font-mono text-neutral-600">₹{(c.min_spend || 0).toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                        ACTIVE
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteCoupon(c)}
                        className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                        title="Delete coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
