import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant, Coupon } from '../types';
import { isProductInCollection } from '../services/api';

export function isCouponEligible(coupon: Coupon | null, items: CartItem[]): boolean {
  if (!coupon || !items || items.length === 0) return false;

  const subtotal = items.reduce((total, item) => {
    const effectivePrice =
      item.variant?.sale_price ??
      item.variant?.price ??
      item.product?.sale_price ??
      item.product?.base_price ??
      0;
    return total + effectivePrice * item.quantity;
  }, 0);

  if (subtotal <= 0) return false;

  // Collection-specific restriction check
  if (coupon.eligible_collections && coupon.eligible_collections.length > 0) {
    const eligibleItems = items.filter((item) =>
      coupon.eligible_collections!.some((colSlug) => isProductInCollection(item.product, colSlug))
    );
    if (eligibleItems.length === 0) return false;

    const applicableSubtotal = eligibleItems.reduce((acc, item) => {
      const price =
        item.variant?.sale_price ??
        item.variant?.price ??
        item.product?.sale_price ??
        item.product?.base_price ??
        0;
      return acc + price * item.quantity;
    }, 0);

    if (coupon.min_spend && applicableSubtotal < coupon.min_spend) return false;
  } else {
    // Storewide min_spend check
    if (coupon.min_spend && subtotal < coupon.min_spend) return false;
  }

  return true;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  coupon: Coupon | null;
  giftNote: string;
  orderNote: string;
  freeShippingThreshold: number;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number, giftNote?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  applyCoupon: (coupon: Coupon | null) => void;
  validateCurrentCoupon: () => void;
  setGiftNote: (note: string) => void;
  setOrderNote: (note: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getShippingFee: () => number;
  getGrandTotal: () => number;
  getAmountToFreeShipping: () => number;
  isFreeShipping: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      coupon: null,
      giftNote: '',
      orderNote: '',
      freeShippingThreshold: 1999,

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      addItem: (product, variant, quantity = 1, giftNote = '') => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.variant.id === variant.id
          );

          if (existingIndex > -1) {
            const updated = [...state.items];
            const newQty = updated[existingIndex].quantity + quantity;
            // Cap at available stock
            updated[existingIndex].quantity = Math.min(newQty, variant.stock_quantity);
            return { items: updated, isDrawerOpen: true };
          }

          const newItem: CartItem = {
            id: `${product.id}_${variant.id}_${Date.now()}`,
            product,
            variant,
            quantity: Math.min(quantity, variant.stock_quantity),
            giftNote,
          };

          return { items: [...state.items, newItem], isDrawerOpen: true };
        });
      },

      removeItem: (itemId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== itemId);
          const validCoupon = isCouponEligible(state.coupon, newItems) ? state.coupon : null;
          return {
            items: newItems,
            coupon: validCoupon,
          };
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => {
          const newItems = state.items.map((item) => {
            if (item.id === itemId) {
              const safeQty = Math.min(quantity, item.variant.stock_quantity);
              return { ...item, quantity: safeQty };
            }
            return item;
          });
          const validCoupon = isCouponEligible(state.coupon, newItems) ? state.coupon : null;
          return {
            items: newItems,
            coupon: validCoupon,
          };
        });
      },

      applyCoupon: (coupon) => {
        if (!coupon) {
          set({ coupon: null });
          return;
        }
        const { items } = get();
        if (isCouponEligible(coupon, items)) {
          set({ coupon });
        } else {
          set({ coupon: null });
        }
      },

      validateCurrentCoupon: () => {
        const { coupon, items } = get();
        if (coupon && !isCouponEligible(coupon, items)) {
          set({ coupon: null });
        }
      },

      setGiftNote: (giftNote) => set({ giftNote }),
      setOrderNote: (orderNote) => set({ orderNote }),
      clearCart: () => set({ items: [], coupon: null, giftNote: '', orderNote: '' }),

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const effectivePrice = item.variant.sale_price ?? item.variant.price;
          return total + effectivePrice * item.quantity;
        }, 0);
      },

      getDiscountAmount: () => {
        const { coupon, items } = get();
        const subtotal = get().getSubtotal();
        if (!coupon || subtotal <= 0) return 0;

        let applicableSubtotal = subtotal;

        // If coupon is restricted to specific collections, calculate discount ONLY on items in those collections
        if (coupon.eligible_collections && coupon.eligible_collections.length > 0) {
          const eligibleItems = items.filter((item) =>
            coupon.eligible_collections!.some((colSlug) => isProductInCollection(item.product, colSlug))
          );
          if (eligibleItems.length === 0) return 0;

          applicableSubtotal = eligibleItems.reduce((acc, item) => {
            const price = item.variant?.sale_price ?? item.variant?.price ?? 0;
            return acc + price * item.quantity;
          }, 0);

          if (coupon.min_spend && applicableSubtotal < coupon.min_spend) return 0;
        } else {
          if (coupon.min_spend && subtotal < coupon.min_spend) return 0;
        }

        let discount = 0;
        if (coupon.discount_type === 'percentage') {
          discount = (applicableSubtotal * coupon.discount_value) / 100;
        } else if (coupon.discount_type === 'fixed') {
          discount = Math.min(coupon.discount_value, applicableSubtotal);
        }

        if (coupon.max_discount && discount > coupon.max_discount) {
          discount = coupon.max_discount;
        }

        return Math.round(Math.min(discount, applicableSubtotal));
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        if (get().isFreeShipping()) return 0;
        return 149; // Standard shipping rate
      },

      isFreeShipping: () => {
        const { coupon, freeShippingThreshold } = get();
        if (coupon?.discount_type === 'free_shipping') {
          if (!coupon.min_spend || get().getSubtotal() >= coupon.min_spend) return true;
        }
        return get().getSubtotal() >= freeShippingThreshold;
      },

      getAmountToFreeShipping: () => {
        const { freeShippingThreshold } = get();
        const subtotal = get().getSubtotal();
        return Math.max(0, freeShippingThreshold - subtotal);
      },

      getGrandTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        const shipping = get().getShippingFee();
        return Math.max(0, subtotal - discount + shipping);
      },
    }),
    {
      name: 'tanoah_cart_store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.validateCurrentCoupon();
        }
      },
      partialize: (state) => ({
        items: state.items.map((item) => ({
          ...item,
          product: {
            ...item.product,
            images: (item.product.images || []).map((img) => ({
              ...img,
              image_url:
                img.image_url?.startsWith('data:') && img.image_url.length > 50000
                  ? '/Assets/products/placeholder-product.svg'
                  : img.image_url,
            })),
          },
          variant: {
            ...item.variant,
            color_image_url:
              item.variant.color_image_url?.startsWith('data:') && item.variant.color_image_url.length > 50000
                ? '/Assets/products/placeholder-product.svg'
                : item.variant.color_image_url,
          },
        })),
        coupon: state.coupon,
        giftNote: state.giftNote,
        orderNote: state.orderNote,
      }),
    }
  )
);
