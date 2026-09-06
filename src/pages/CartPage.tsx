import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Heart, ArrowRight, ShoppingBag, ShieldCheck, Tag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { useUIStore } from '../store/useUIStore';
import { formatPrice } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { FreeShippingProgressBar } from '../components/cart/FreeShippingProgressBar';
import { api } from '../services/api';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeItem,
    getSubtotal,
    getDiscountAmount,
    getShippingFee,
    getGrandTotal,
    freeShippingThreshold,
    coupon,
    applyCoupon,
    validateCurrentCoupon,
  } = useCartStore();

  const { addItem: addToWishlist } = useWishlistStore();
  const { addToast } = useUIStore();
  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  React.useEffect(() => {
    validateCurrentCoupon();
  }, [items, validateCurrentCoupon]);

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const shipping = getShippingFee();
  const grandTotal = getGrandTotal();

  const handleApplyCoupon = async (codeOrEvent?: string | React.FormEvent) => {
    if (codeOrEvent && typeof codeOrEvent !== 'string' && 'preventDefault' in codeOrEvent) {
      codeOrEvent.preventDefault();
    }
    const code = (typeof codeOrEvent === 'string' ? codeOrEvent : couponInput).trim().toUpperCase();
    if (!code) return;

    setIsApplying(true);
    try {
      const res = await api.validateCoupon(code, subtotal, items);
      if (res.valid && res.coupon) {
        applyCoupon(res.coupon);
        addToast({ type: 'success', title: 'Coupon Applied', description: res.message });
        setCouponInput('');
      } else {
        addToast({ type: 'error', title: 'Invalid Coupon', description: res.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Coupon Error', description: 'Could not validate coupon.' });
    } finally {
      setIsApplying(false);
    }
  };

  const handleMoveToWishlist = (item: any) => {
    addToWishlist(item.product);
    removeItem(item.id);
    addToast({
      type: 'success',
      title: 'Moved to Wishlist',
      description: `${item.product.title} has been moved to your wishlist.`,
    });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center font-poppins">
        <div className="w-20 h-20 bg-[#EEEEF8] text-[#3F3F8F] rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-wondra text-4xl text-black">YOUR SHOPPING BAG IS EMPTY</h1>
        <p className="text-xs text-[#666666] max-w-sm mx-auto mt-2 mb-8">
          You haven't added any pieces to your bag yet. Explore our newest capsule collection.
        </p>
        <Link to="/collections/all">
          <Button variant="primary" size="lg">
            DISCOVER NEW ARRIVALS
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-white font-poppins min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-wondra text-3xl sm:text-4xl text-black mb-8">
          YOUR SHOPPING BAG ({items.reduce((s, i) => s + i.quantity, 0)})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Items List (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            <FreeShippingProgressBar subtotal={subtotal} threshold={freeShippingThreshold} />

            <div className="border border-[#E7E7E7] rounded-[4px] divide-y divide-[#E7E7E7]">
              {items.map((item) => {
                const itemImage =
                  item.variant?.color_image_url ||
                  item.product.images?.find(
                    (img) => img.color_name && img.color_name.toLowerCase() === item.variant?.color_name?.toLowerCase()
                  )?.image_url ||
                  item.product.images?.find((img) => img.is_primary)?.image_url ||
                  item.product.images?.[0]?.image_url ||
                  '/Assets/products/placeholder-product.svg';
                const effectivePrice = item.variant.sale_price ?? item.variant.price;

                return (
                  <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="w-24 h-32 bg-[#F8F8F8] rounded-[2px] overflow-hidden shrink-0 border border-[#E7E7E7]"
                    >
                      <img
                        src={itemImage}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 space-y-1 text-xs">
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="font-medium text-black hover:text-[#3F3F8F] text-sm block"
                      >
                        {item.product.title}
                      </Link>
                      <div className="text-[#666666] text-[11px] space-x-2">
                        <span>Color: {item.variant.color_name}</span>
                        <span>•</span>
                        <span>Size: {item.variant.size}</span>
                        <span>•</span>
                        <span className="font-mono">SKU: {item.variant.sku}</span>
                      </div>

                      <div className="pt-2 flex items-baseline gap-2">
                        <span className="font-semibold text-black text-sm">
                          {formatPrice(effectivePrice)}
                        </span>
                        {item.variant.sale_price && (
                          <span className="text-xs text-[#888888] line-through">
                            {formatPrice(item.variant.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Qty & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                      <div className="flex items-center border border-[#D5D5ED] rounded-[4px] bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs text-black hover:bg-[#EEEEF8]"
                        >
                          -
                        </button>
                        <span className="px-3 text-xs font-semibold text-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs text-black hover:bg-[#EEEEF8]"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => handleMoveToWishlist(item)}
                          className="text-[#666666] hover:text-[#3F3F8F] flex items-center gap-1"
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Save</span>
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[#666666] hover:text-red-500 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary (Col 4) */}
          <div className="lg:col-span-4">
            <div className="p-6 border border-[#E7E7E7] rounded-[4px] bg-[#FAFAFA] space-y-6 text-xs sticky top-28">
              <h3 className="font-wondra text-2xl text-black">ORDER SUMMARY</h3>

              {/* Promo Code Input */}
              <div className="space-y-2">
                {coupon ? (
                  <div className="flex items-center justify-between bg-[#EEEEF8] p-3 rounded-[4px] border border-[#3F3F8F]/20">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#3F3F8F]" />
                      <span className="font-semibold text-[#3F3F8F]">{coupon.code}</span>
                    </div>
                    <button
                      onClick={() => applyCoupon(null)}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon (e.g. TANOAH10)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-white border border-[#E7E7E7] rounded-[4px] uppercase text-xs focus:outline-none focus:border-[#3F3F8F]"
                      />
                      <button
                        type="submit"
                        disabled={isApplying}
                        className="px-4 py-2.5 bg-black text-white rounded-[4px] font-semibold hover:bg-[#3F3F8F] transition-colors disabled:opacity-50"
                      >
                        {isApplying ? '...' : 'APPLY'}
                      </button>
                    </form>

                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      <span className="text-[10px] text-[#888888]">Offers:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon('TANOAH10')}
                        className="text-[10px] px-2 py-0.5 bg-[#EEEEF8] text-[#3F3F8F] font-mono font-semibold rounded border border-[#3F3F8F]/20 hover:bg-[#3F3F8F] hover:text-white transition-colors"
                      >
                        TANOAH10 (10% OFF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon('FREESHIP')}
                        className="text-[10px] px-2 py-0.5 bg-[#EEEEF8] text-[#3F3F8F] font-mono font-semibold rounded border border-[#3F3F8F]/20 hover:bg-[#3F3F8F] hover:text-white transition-colors"
                      >
                        FREESHIP
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-3 pt-2 border-t border-[#E7E7E7]">
                <div className="flex justify-between text-[#666666]">
                  <span>Subtotal</span>
                  <span className="text-black font-medium">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#3F3F8F] font-semibold">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#666666]">
                  <span>Estimated Shipping</span>
                  <span>{shipping === 0 ? <strong className="text-[#3F3F8F]">FREE</strong> : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-black pt-3 border-t border-[#E7E7E7]">
                  <span>Grand Total</span>
                  <span className="text-[#3F3F8F] text-lg">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/checkout')}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full py-4 text-sm font-semibold"
              >
                PROCEED TO CHECKOUT
              </Button>

              <div className="pt-2 text-[11px] text-[#888888] space-y-1.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-black font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#3F3F8F]" />
                  <span>256-Bit SSL Encrypted Checkout</span>
                </div>
                <p>Tax calculated. Complimentary 7-day domestic returns.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
