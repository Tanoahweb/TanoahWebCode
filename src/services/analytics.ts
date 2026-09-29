/**
 * Google Analytics 4 (GA4) Analytics Engine for TANOAH
 * Measurement ID: G-532HY0E88B
 * 
 * Provides production-grade, type-safe tracking for SPA route changes,
 * custom interactions, and Google Analytics Enhanced E-commerce events.
 */

import { Product, ProductVariant, CartItem } from '@/types';

export const GA_MEASUREMENT_ID = 'G-532HY0E88B';

// Type definitions for Google's gtag interface
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Checks whether gtag is loaded and available on the window object
 */
export function isGtagAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Formats a catalog product and variant into a Google Analytics item payload
 */
function formatGAItem(product: Product, variant?: ProductVariant, quantity: number = 1) {
  const price = variant?.sale_price ?? variant?.price ?? product.sale_price ?? product.base_price ?? 0;
  const categoryName =
    typeof product.category === 'object' && product.category?.name
      ? product.category.name
      : typeof product.category === 'string'
      ? product.category
      : product.category_name || 'Apparel';
  
  return {
    item_id: variant?.sku || product.id,
    item_name: product.title,
    item_brand: 'TANOAH',
    item_category: categoryName,
    item_variant: variant ? `${variant.color_name} / ${variant.size}` : undefined,
    price: Number(price),
    quantity: Number(quantity),
  };
}

/**
 * Track virtual page views in React Router SPA
 * Captures dynamic page titles and complete route paths with query parameters
 */
export function trackPageView(path: string, title?: string) {
  if (!isGtagAvailable()) return;

  try {
    const pageTitle = title || document.title || 'TANOAH';
    const pageLocation = window.location.href;

    // Send page_view event with enhanced metadata
    window.gtag!('event', 'page_view', {
      page_title: pageTitle,
      page_location: pageLocation,
      page_path: path,
      send_to: GA_MEASUREMENT_ID,
    });
  } catch (error) {
    // Fail silently in development/adblocked environments without throwing
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackPageView error:', error);
    }
  }
}

/**
 * Track custom user engagement events
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (!isGtagAvailable()) return;

  try {
    window.gtag!('event', eventName, params);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[GA4] trackEvent (${eventName}) error:`, error);
    }
  }
}

/**
 * GA4 Enhanced E-commerce: Product detail view (view_item)
 */
export function trackViewItem(product: Product, variant?: ProductVariant) {
  if (!isGtagAvailable() || !product) return;

  try {
    const price = variant?.sale_price ?? variant?.price ?? product.sale_price ?? product.base_price ?? 0;
    const gaItem = formatGAItem(product, variant, 1);

    window.gtag!('event', 'view_item', {
      currency: 'INR',
      value: Number(price),
      items: [gaItem],
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackViewItem error:', error);
    }
  }
}

/**
 * GA4 Enhanced E-commerce: Item added to shopping bag (add_to_cart)
 */
export function trackAddToCart(product: Product, variant: ProductVariant, quantity: number = 1) {
  if (!isGtagAvailable() || !product || !variant) return;

  try {
    const price = variant.sale_price ?? variant.price ?? product.sale_price ?? product.base_price ?? 0;
    const gaItem = formatGAItem(product, variant, quantity);

    window.gtag!('event', 'add_to_cart', {
      currency: 'INR',
      value: Number(price) * quantity,
      items: [gaItem],
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackAddToCart error:', error);
    }
  }
}

/**
 * GA4 Enhanced E-commerce: Item removed from bag (remove_from_cart)
 */
export function trackRemoveFromCart(product: Product, variant?: ProductVariant, quantity: number = 1) {
  if (!isGtagAvailable() || !product) return;

  try {
    const gaItem = formatGAItem(product, variant, quantity);

    window.gtag!('event', 'remove_from_cart', {
      currency: 'INR',
      items: [gaItem],
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackRemoveFromCart error:', error);
    }
  }
}

/**
 * GA4 Enhanced E-commerce: Initiated checkout flow (begin_checkout)
 */
export function trackBeginCheckout(items: CartItem[], totalAmount: number) {
  if (!isGtagAvailable() || !items || items.length === 0) return;

  try {
    const gaItems = items.map((item) => formatGAItem(item.product, item.variant, item.quantity));

    window.gtag!('event', 'begin_checkout', {
      currency: 'INR',
      value: Number(totalAmount),
      items: gaItems,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackBeginCheckout error:', error);
    }
  }
}

/**
 * GA4 Enhanced E-commerce: Completed purchase transaction (purchase)
 */
export function trackPurchase(
  orderId: string,
  totalAmount: number,
  items: any[],
  taxAmount: number = 0,
  shippingAmount: number = 0
) {
  if (!isGtagAvailable() || !orderId) return;

  try {
    const gaItems = (items || []).map((item) => {
      const product = item.product || item;
      const variant = item.variant;
      const price = item.price ?? variant?.price_override ?? product?.sale_price ?? product?.base_price ?? 0;
      
      return {
        item_id: variant?.sku || product?.sku || item.product_id || item.id || 'ITEM',
        item_name: product?.title || item.title || 'Apparel Item',
        item_brand: 'TANOAH',
        item_category: product?.category?.name || 'Apparel',
        item_variant: variant ? `${variant.color_name} / ${variant.size}` : undefined,
        price: Number(price),
        quantity: Number(item.quantity || 1),
      };
    });

    window.gtag!('event', 'purchase', {
      transaction_id: orderId,
      value: Number(totalAmount),
      currency: 'INR',
      tax: Number(taxAmount),
      shipping: Number(shippingAmount),
      items: gaItems,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackPurchase error:', error);
    }
  }
}

/**
 * GA4 Search Event (search)
 */
export function trackSearch(searchTerm: string) {
  if (!isGtagAvailable() || !searchTerm) return;

  try {
    window.gtag!('event', 'search', {
      search_term: searchTerm.trim(),
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackSearch error:', error);
    }
  }
}
