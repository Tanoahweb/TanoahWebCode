import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Heart, ArrowRight, ShoppingBag, Tag } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useUIStore } from '../../store/useUIStore';
import { FreeShippingProgressBar } from './FreeShippingProgressBar';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../common/Button';
import { getLenis } from '../../animations/smoothScroll';

import { api } from '../../services/api';
import { SAMPLE_PRODUCTS } from '../../data/mockData';

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
  } = useCartStore();

  const { addItem: addToWishlist } = useWishlistStore();
  const { addToast } = useUIStore();

  const [couponInput, setCouponInput] = useState('');

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

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

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
                      <span className="font-semibold text-[#3F3F8F]">{coupon.code}</span>
                      <span className="text-[#666666]">({coupon.description})</span>
                    </div>
                    <button
                      onClick={() => applyCoupon(null)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo / Gift Code (e.g. TANOAH10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] uppercase placeholder-normal"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black text-white rounded-[4px] text-xs font-semibold hover:bg-[#3F3F8F] transition-colors"
                    >
                      APPLY
                    </button>
                  </form>
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
    </div>
  );
};
