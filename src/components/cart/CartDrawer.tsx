import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Heart, ArrowRight, ShoppingBag, Tag, Sparkles, Check } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useUIStore } from '../../store/useUIStore';
import { FreeShippingProgressBar } from './FreeShippingProgressBar';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../common/Button';
import { getLenis } from '../../animations/smoothScroll';

import { api, isProductInCollection } from '../../services/api';
import { SAMPLE_PRODUCTS } from '../../data/mockData';
import { Coupon, Collection } from '../../types';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    addItem,
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
  const [isOffersOpen, setIsOffersOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [popupCouponInput, setPopupCouponInput] = useState('');

  // Validate coupon whenever items change so invalid coupon is not falsely shown
  useEffect(() => {
    validateCurrentCoupon();
  }, [items, validateCurrentCoupon]);

  // Load available coupons and collections
  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getCoupons(), api.getCollections()]).then(([cpns, cols]) => {
      if (isMounted) {
        setAvailableCoupons(cpns || []);
        setCollections(cols || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const lenis = getLenis();
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      lenis?.stop();
    } else {
      document.body.style.overflow = '';
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = '';
      lenis?.start();
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const shipping = getShippingFee();
  const grandTotal = getGrandTotal();

  const handleApplyCode = async (codeToApply: string) => {
    const clean = codeToApply.trim().toUpperCase();
    if (!clean) return;

    setIsApplying(true);
    try {
      const res = await api.validateCoupon(clean, subtotal, items);
      if (res.valid && res.coupon) {
        applyCoupon(res.coupon);
        addToast({ type: 'success', title: 'Offer Applied!', description: res.message });
        setCouponInput('');
        setPopupCouponInput('');
        setIsOffersOpen(false);
      } else {
        addToast({ type: 'error', title: 'Invalid Coupon', description: res.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Coupon Error', description: 'Could not validate coupon.' });
    } finally {
      setIsApplying(false);
    }
  };

  const getCouponEvaluation = (c: Coupon) => {
    const isApplied = coupon?.code.toUpperCase() === c.code.toUpperCase();
    const hasCollections = Boolean(c.eligible_collections && c.eligible_collections.length > 0);

    let isEligible = true;
    let difference = 0;
    let eligibleSubtotal = subtotal;
    let descriptionText = '';
    let savingsText = '';

    const colNames = hasCollections
      ? c.eligible_collections!
          .map((slug) => collections.find((col) => col.slug === slug || col.id === slug)?.title || slug)
          .join(', ')
      : '';

    if (hasCollections) {
      const matchingItems = items.filter((item) =>
        c.eligible_collections!.some((colSlug) => isProductInCollection(item.product, colSlug))
      );

      if (matchingItems.length === 0) {
        isEligible = false;
        descriptionText = `Add items from "${colNames}" to unlock this offer`;
      } else {
        eligibleSubtotal = matchingItems.reduce((acc, item) => {
          const price =
            item.variant?.sale_price ??
            item.variant?.price ??
            item.product?.sale_price ??
            item.product?.base_price ??
            0;
          return acc + price * item.quantity;
        }, 0);

        if (c.min_spend && eligibleSubtotal < c.min_spend) {
          isEligible = false;
          difference = Math.round(c.min_spend - eligibleSubtotal);
          descriptionText = `Add ₹${difference.toLocaleString('en-IN')} more of "${colNames}" to get this offer`;
        }
      }
    } else {
      if (c.min_spend && subtotal < c.min_spend) {
        isEligible = false;
        difference = Math.round(c.min_spend - subtotal);
        descriptionText = `Add ₹${difference.toLocaleString('en-IN')} more to get this offer`;
      }
    }

    if (isEligible) {
      if (c.discount_type === 'percentage') {
        let estSave = (eligibleSubtotal * c.discount_value) / 100;
        if (c.max_discount && estSave > c.max_discount) estSave = c.max_discount;
        savingsText = `Save ₹${Math.round(estSave).toLocaleString('en-IN')}`;
      } else if (c.discount_type === 'fixed') {
        const estSave = Math.min(c.discount_value, eligibleSubtotal);
        savingsText = `Save ₹${Math.round(estSave).toLocaleString('en-IN')}`;
      } else if (c.discount_type === 'free_shipping') {
        savingsText = 'Free Express Delivery';
      }
      if (!descriptionText) {
        descriptionText = c.description || (c.min_spend ? `Valid on orders above ₹${c.min_spend.toLocaleString('en-IN')}` : 'Storewide instant offer');
      }
    }

    return {
      isApplied,
      isEligible,
      difference,
      descriptionText,
      savingsText,
      hasCollections,
      colNames,
    };
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

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <div
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex justify-end"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeDrawer}
      />

      {/* Sliding Panel */}
      <div
        data-lenis-prevent="true"
        className="relative bg-white w-full max-w-md h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-fade-in"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#3F3F8F]" />
            <h3 className="font-wondra text-xl text-black">YOUR SHOPPING BAG</h3>
            <span className="text-xs font-poppins text-[#666666]">
              ({items.reduce((sum, i) => sum + i.quantity, 0)})
            </span>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1 rounded-full text-black hover:text-[#3F3F8F] transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress */}
        {items.length > 0 && (
          <div className="px-5 pt-4">
            <FreeShippingProgressBar subtotal={subtotal} threshold={freeShippingThreshold} />
          </div>
        )}

        {/* Items List */}
        <div
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 bg-[#EEEEF8] text-[#3F3F8F] rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-wondra text-xl text-black">YOUR BAG IS EMPTY</h4>
              <p className="text-xs text-[#666666] font-poppins max-w-xs mx-auto">
                Discover our new luxury arrivals and curated editorial pieces.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  closeDrawer();
                  navigate('/collections/all');
                }}
              >
                EXPLORE COLLECTION
              </Button>
            </div>
          ) : (
            items.map((item) => {
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
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] relative group"
                >
                  {/* Thumbnail */}
                  <Link
                    to={`/products/${item.product.slug}`}
                    onClick={closeDrawer}
                    className="w-20 h-24 bg-white rounded-[2px] overflow-hidden shrink-0 border border-[#E7E7E7]"
                  >
                    <img
                      src={itemImage}
                      alt={item.product.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between text-xs font-poppins">
                    <div>
                      <div className="flex justify-between items-start pr-6">
                        <Link
                          to={`/products/${item.product.slug}`}
                          onClick={closeDrawer}
                          className="font-medium text-black hover:text-[#3F3F8F] line-clamp-1"
                        >
                          {item.product.title}
                        </Link>
                      </div>

                      <div className="text-[11px] text-[#666666] mt-0.5 space-x-2">
                        <span>Color: {item.variant.color_name}</span>
                        <span>•</span>
                        <span>Size: {item.variant.size}</span>
                      </div>

                      <div className="text-[10px] text-[#888888] font-mono mt-0.5">
                        SKU: {item.variant.sku}
                      </div>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-semibold text-black">
                          {formatPrice(effectivePrice)}
                        </span>
                        {item.variant.sale_price && item.variant.price > item.variant.sale_price && (
                          <span className="text-[10px] text-[#888888] line-through">
                            {formatPrice(item.variant.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls & Move to Wishlist */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E7E7E7]/60">
                      <div className="flex items-center border border-[#D5D5ED] bg-white rounded-[2px]">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-black hover:bg-[#EEEEF8] text-xs font-semibold"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-medium text-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-black hover:bg-[#EEEEF8] text-xs font-semibold"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleMoveToWishlist(item)}
                          className="text-[#666666] hover:text-[#3F3F8F] transition-colors p-1"
                          title="Save for Later"
                        >
                          <Heart className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[#666666] hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Coupon & Notes Accordions */}
          {items.length > 0 && (
            <div className="space-y-2 pt-2 text-xs font-poppins border-t border-[#E7E7E7]">
              {/* Coupon Box */}
              <div>
                {coupon ? (
                  <div className="flex items-center justify-between bg-[#EEEEF8] p-2.5 rounded-[4px] border border-[#3F3F8F]/20">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#3F3F8F]" />
                      <div>
                        <span className="font-semibold text-[#3F3F8F] font-mono text-xs">{coupon.code}</span>
                        <span className="text-[10px] text-[#666666] ml-1.5">
                          ({coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : coupon.discount_type === 'free_shipping' ? 'Free Shipping' : `₹${coupon.discount_value} OFF`})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsOffersOpen(true)}
                        className="text-xs text-[#3F3F8F] font-medium hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Offers
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCoupon(null)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Promo / Gift Code (e.g. TANOAH10)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (couponInput.trim()) {
                              handleApplyCode(couponInput);
                            } else {
                              setIsOffersOpen(true);
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] uppercase placeholder-normal"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (couponInput.trim()) {
                            handleApplyCode(couponInput);
                          } else {
                            setIsOffersOpen(true);
                          }
                        }}
                        disabled={isApplying}
                        className="px-4 py-2 bg-black text-white rounded-[4px] text-xs font-semibold hover:bg-[#3F3F8F] transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Tag className="w-3.5 h-3.5 text-white/80" />
                        {couponInput.trim() ? 'APPLY' : 'OFFERS'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOffersOpen(true)}
                      className="text-[11px] text-[#3F3F8F] hover:underline font-medium flex items-center gap-1 text-left pt-0.5"
                    >
                      <Sparkles className="w-3 h-3 text-[#3F3F8F]" />
                      <span>View available offers & coupons</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Curated Capsule Upsell */}
              <div className="pt-3 border-t border-[#E7E7E7] space-y-2">
                <span className="text-[10px] font-semibold text-[#3F3F8F] uppercase tracking-wider block text-left">
                  PAIR WITH ATELIER ESSENTIALS
                </span>
                <div className="space-y-2">
                  {SAMPLE_PRODUCTS.filter((p) => !items.some((i) => i.product.id === p.id)).slice(0, 2).map((upsell) => (
                    <div key={upsell.id} className="flex items-center gap-3 p-2 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px]">
                      <img
                        src={upsell.images[0]?.image_url}
                        alt=""
                        className="w-12 h-14 object-cover rounded-[2px] bg-white border border-[#E7E7E7]"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-semibold text-black truncate text-[11px]">{upsell.title}</div>
                        <div className="text-[11px] text-[#3F3F8F] font-semibold">{formatPrice(upsell.base_price)}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (upsell.variants[0]) {
                            addItem(upsell, upsell.variants[0], 1);
                            addToast({ type: 'success', title: 'Added to Bag', description: `${upsell.title} added.` });
                          }
                        }}
                        className="text-[10px] py-1 px-2.5 h-auto shrink-0"
                      >
                        + ADD
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Totals & Checkout */}
        {items.length > 0 && (
          <div className="p-5 border-t border-[#E7E7E7] bg-[#FAFAFA] space-y-3 font-poppins text-xs">
            <div className="space-y-1.5">
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
              <div className="flex justify-between text-sm font-semibold text-black pt-2 border-t border-[#E7E7E7]">
                <span>Estimated Total</span>
                <span className="text-[#3F3F8F] text-base">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <p className="text-[10px] text-[#888888] text-center">
              Taxes calculated at checkout. Free 7-day domestic returns included.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                to="/cart"
                onClick={closeDrawer}
                className="py-3 px-4 text-center border border-[#3F3F8F] text-[#3F3F8F] hover:bg-[#EEEEF8] rounded-[4px] font-semibold tracking-wider uppercase text-xs"
              >
                VIEW FULL BAG
              </Link>
              <Button
                variant="primary"
                size="md"
                onClick={handleCheckout}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full py-3 font-semibold"
              >
                CHECKOUT
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Available Offers Pop-up Modal */}
      {isOffersOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-[#E7E7E7] overflow-hidden animate-fadeIn text-left font-poppins">
            {/* Header */}
            <div className="p-4 border-b border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#3F3F8F]/10 flex items-center justify-center text-[#3F3F8F]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-black">
                    Available Offers & Promotions
                  </h3>
                  <p className="text-[10px] text-neutral-500">
                    Apply directly or enter your exclusive voucher code
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOffersOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Manual Promo Code input inside Modal */}
            <div className="p-3.5 border-b border-[#F0F0F0] bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyCode(popupCouponInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={popupCouponInput}
                  onChange={(e) => setPopupCouponInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded-[4px] text-xs uppercase font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
                <button
                  type="submit"
                  disabled={isApplying || !popupCouponInput.trim()}
                  className="px-4 py-2 bg-black hover:bg-[#3F3F8F] text-white rounded-[4px] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isApplying ? '...' : 'APPLY'}
                </button>
              </form>
            </div>

            {/* Active Offers List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {availableCoupons.filter((c) => c.is_active !== false).length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  No active coupon codes at the moment.
                </div>
              ) : (
                availableCoupons
                  .filter((c) => c.is_active !== false)
                  .map((c) => {
                    const evalInfo = getCouponEvaluation(c);
                    return (
                      <div
                        key={c.id || c.code}
                        className={`p-3 rounded-[6px] border transition-all text-left ${
                          evalInfo.isApplied
                            ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                            : evalInfo.isEligible
                            ? 'bg-[#FAF9FE] border-[#3F3F8F]/30 hover:border-[#3F3F8F]'
                            : 'bg-[#FAFAFA] border-[#EEEEEE]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-white border border-[#3F3F8F]/30 text-[#3F3F8F] tracking-wide shadow-2xs">
                                {c.code}
                              </span>
                              <span className="text-xs font-semibold text-neutral-900">
                                {c.discount_type === 'percentage'
                                  ? `${c.discount_value}% OFF`
                                  : c.discount_type === 'free_shipping'
                                  ? 'FREE SHIPPING'
                                  : `₹${c.discount_value} OFF`}
                              </span>
                              {c.max_discount && (
                                <span className="text-[10px] text-neutral-500">
                                  (Max ₹{c.max_discount.toLocaleString('en-IN')})
                                </span>
                              )}
                            </div>

                            {c.description && (
                              <p className="text-[11px] text-neutral-600 line-clamp-2 pt-0.5">
                                {c.description}
                              </p>
                            )}
                          </div>

                          {evalInfo.isApplied ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded shrink-0">
                              <Check className="w-3 h-3" /> APPLIED
                            </span>
                          ) : evalInfo.isEligible ? (
                            <button
                              type="button"
                              onClick={() => handleApplyCode(c.code)}
                              disabled={isApplying}
                              className="px-3.5 py-1.5 bg-[#3F3F8F] hover:bg-black text-white text-[11px] font-bold rounded uppercase tracking-wider transition-colors shrink-0 shadow-xs"
                            >
                              APPLY
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-medium px-2 py-1 bg-neutral-100 rounded shrink-0">
                              LOCKED
                            </span>
                          )}
                        </div>

                        {/* Upsell / Eligibility Notice */}
                        <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[11px]">
                          {!evalInfo.isEligible ? (
                            <span className="text-amber-800 font-medium flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                              {evalInfo.descriptionText}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                              {evalInfo.savingsText && (
                                <span className="font-semibold">{evalInfo.savingsText}</span>
                              )}
                              <span>• Ready to apply</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#FAFAFA] border-t border-[#EAEAEA] text-center text-[10px] text-neutral-400">
              Terms & conditions apply. Only one promotional coupon can be applied per order.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
