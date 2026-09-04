/**
 * Safe Storage & Quota Management Utility
 * 
 * Protects against DOMException / QuotaExceededError across all browsers.
 * Features automatic base64 stripping, order compression, fallback to sessionStorage/memory,
 * and emergency cache purging.
 */

const memoryFallback = new Map<string, string>();

/**
 * Strips huge base64 data URLs and redundant product fields to produce
 * a lightweight, ultra-compact order payload (under 2KB) safe for any storage.
 */
export function sanitizeOrderForStorage(order: any): any {
  if (!order || typeof order !== 'object') return order;

  const R2_PUBLIC_BASE = 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev';
  const FALLBACK_PNG = `${R2_PUBLIC_BASE}/assets/placeholder-product.png`;

  const sanitizeImageUrl = (url?: string): string => {
    if (!url || typeof url !== 'string') return FALLBACK_PNG;
    const trimmed = url.trim();
    if (!trimmed) return FALLBACK_PNG;
    // If it's a data URL, replace with CDN fallback to keep storage small and email-compatible
    if (trimmed.startsWith('data:')) {
      return FALLBACK_PNG;
    }
    // If it's an SVG, replace with PNG fallback so it renders in emails and everywhere
    if (trimmed.toLowerCase().endsWith('.svg') || trimmed.toLowerCase().includes('.svg')) {
      return FALLBACK_PNG;
    }
    // If relative path starting with /assets or /Assets, resolve to public R2
    if (trimmed.startsWith('/')) {
      const lower = trimmed.toLowerCase();
      if (lower.includes('placeholder-product')) return FALLBACK_PNG;
      if (lower.includes('hero-landscape')) return `${R2_PUBLIC_BASE}/assets/hero-landscape.jpg`;
      if (lower.includes('hero-mobile')) return `${R2_PUBLIC_BASE}/assets/hero-mobile.jpg`;
      return `${R2_PUBLIC_BASE}${trimmed.replace(/^\/Assets\//i, '/assets/')}`;
    }
    return trimmed;
  };

  const cleanItems = Array.isArray(order.items)
    ? order.items.map((item: any) => {
        const itemImg = sanitizeImageUrl(
          item.image_url ||
          item.variant?.color_image_url ||
          item.product?.images?.[0]?.image_url
        );

        return {
          id: item.id || `item_${Date.now()}`,
          product_id: item.product_id || item.product?.id || '',
          product_title: item.product_title || item.product?.title || 'Atelier Product',
          variant_id: item.variant_id || item.variant?.id || '',
          variant_title: item.variant_title || `${item.variant?.color_name || 'Standard'} / ${item.variant?.size || 'Free'}`,
          sku: item.sku || item.variant?.sku || 'TAN-SKU',
          unit_price: item.unit_price ?? item.variant?.sale_price ?? item.variant?.price ?? 0,
          quantity: item.quantity || 1,
          line_total: item.line_total ?? ((item.unit_price ?? item.variant?.price ?? 0) * (item.quantity || 1)),
          image_url: itemImg,
          variant: item.variant ? {
            id: item.variant.id,
            color_name: item.variant.color_name || 'Standard',
            color_hex: item.variant.color_hex || '#000000',
            size: item.variant.size || 'Free',
            sku: item.variant.sku || 'TAN-SKU',
            price: item.variant.price || 0,
            sale_price: item.variant.sale_price,
            color_image_url: sanitizeImageUrl(item.variant.color_image_url),
          } : undefined,
          // Retain minimal product title/slug for links, omit massive description/sections
          product: item.product ? {
            id: item.product.id,
            title: item.product.title,
            slug: item.product.slug,
            images: [{ id: 'thumb', image_url: itemImg, is_primary: true, sort_order: 0 }],
          } : undefined,
        };
      })
    : [];

  return {
    id: order.id || order.orderNumber || order.order_number,
    orderNumber: order.orderNumber || order.order_number || `TAN-${Date.now()}`,
    order_number: order.order_number || order.orderNumber || `TAN-${Date.now()}`,
    user_id: order.user_id || null,
    guest_email: order.guest_email || order.formData?.email || '',
    guest_phone: order.guest_phone || order.formData?.phone || '',
    formData: order.formData,
    shipping_address: order.shipping_address || (order.formData ? {
      first_name: order.formData.firstName,
      last_name: order.formData.lastName,
      address: order.formData.address,
      apartment: order.formData.apartment,
      city: order.formData.city,
      state: order.formData.state,
      postal_code: order.formData.postalCode,
      country: 'India',
    } : undefined),
    payment_method: order.payment_method || order.formData?.paymentMethod || 'razorpay',
    payment_status: order.payment_status || 'paid',
    payment_gateway_ref: order.payment_gateway_ref || order.paymentGatewayRef || null,
    subtotal: order.subtotal || 0,
    discount: order.discount || order.discount_total || 0,
    discount_total: order.discount_total || order.discount || 0,
    shipping: order.shipping || order.shipping_total || 0,
    shipping_total: order.shipping_total || order.shipping || 0,
    tax_total: order.tax_total || 0,
    grandTotal: order.grandTotal || order.grand_total || 0,
    grand_total: order.grand_total || order.grandTotal || 0,
    date: order.date || order.created_at || new Date().toISOString(),
    created_at: order.created_at || order.date || new Date().toISOString(),
    status: order.status || 'confirmed',
    items: cleanItems,
  };
}

/**
 * Emergency purge of non-critical storage when quota is exceeded
 */
export function purgeStorageBloat(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Trim old custom orders: keep only the latest 3, and strip any heavy images
    const rawOrders = localStorage.getItem('tanoah_custom_orders');
    if (rawOrders) {
      try {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) {
          const trimmed = parsed.slice(0, 3).map(sanitizeOrderForStorage);
          localStorage.setItem('tanoah_custom_orders', JSON.stringify(trimmed));
        }
      } catch {
        localStorage.removeItem('tanoah_custom_orders');
      }
    }

    // 2. Remove any obsolete/deprecated localStorage keys (all stored in Supabase now)
    const deprecatedKeys = [
      'tanoah_custom_products',
      'tanoah_deleted_product_ids',
      'tanoah_stock_overrides',
      'tanoah_custom_collections',
      'tanoah_home_featured_collections',
      'tanoah_custom_product_types',
      'tanoah_store_settings',
    ];
    deprecatedKeys.forEach((k) => localStorage.removeItem(k));

    // 3. Clean any obsolete temporary caches
    const nonCriticalKeys = [
      'tanoah_debug_logs',
      'tanoah_search_history',
      'tanoah_temp_preview',
      'tanoah_analytics_queue',
    ];
    nonCriticalKeys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[safeStorage] Emergency purge error:', e);
  }
}

/**
 * Bulletproof setItem that handles quota errors gracefully without throwing.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    memoryFallback.set(key, value);
    return true;
  }

  // 1. Try standard localStorage
  try {
    localStorage.setItem(key, value);
    memoryFallback.set(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[safeStorage] localStorage.setItem failed for key "${key}". Running purge and retrying...`, err);
  }

  // 2. If quota exceeded, purge bloat and retry
  try {
    purgeStorageBloat();
    localStorage.setItem(key, value);
    memoryFallback.set(key, value);
    return true;
  } catch (retryErr) {
    console.warn(`[safeStorage] localStorage retry failed for key "${key}". Falling back to sessionStorage.`, retryErr);
  }

  // 3. Fallback to sessionStorage
  try {
    sessionStorage.setItem(key, value);
    memoryFallback.set(key, value);
    return true;
  } catch (sessionErr) {
    console.warn(`[safeStorage] sessionStorage failed for key "${key}". Using in-memory store.`, sessionErr);
  }

  // 4. In-memory store fallback (guaranteed to never fail or crash checkout)
  memoryFallback.set(key, value);
  return true;
}

/**
 * Bulletproof getItem that checks localStorage -> sessionStorage -> memory.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return memoryFallback.get(key) || null;
  }

  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {}

  try {
    const sessionVal = sessionStorage.getItem(key);
    if (sessionVal !== null) return sessionVal;
  } catch {}

  return memoryFallback.get(key) || null;
}

/**
 * Bulletproof removeItem.
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') {
    memoryFallback.delete(key);
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {}

  try {
    sessionStorage.removeItem(key);
  } catch {}

  memoryFallback.delete(key);
}

// Automatically run a quota health check once on module load
if (typeof window !== 'undefined') {
  try {
    purgeStorageBloat();
  } catch {}
}
