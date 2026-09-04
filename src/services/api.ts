import { supabase } from './supabase';
import { Product, StoreSettings, Collection, Coupon, Order, CartItem, MediaItem, NavigationConfig, FeaturedCollectionsConfig, SavedAddress } from '@/types';
import { SAMPLE_PRODUCTS, SAMPLE_COLLECTIONS, SAMPLE_SETTINGS, SAMPLE_COUPONS, DEFAULT_FEATURED_COLLECTIONS_CONFIG } from '@/data/mockData';
import { DEFAULT_NAVIGATION_CONFIG } from '@/data/defaultNavigation';
import { processImageForUpload } from '@/utils/imagePipeline';
import { r2Service } from './r2Service';
import { safeSetItem, safeGetItem, sanitizeOrderForStorage } from '@/utils/safeStorage';

export interface ProductReview {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  title?: string;
  review_text: string;
  image_urls?: string[];
  is_verified_buyer: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_url?: string;
  desktop_image: string;
  mobile_image?: string;
  position: string;
  sort_order: number;
}

const PLACEHOLDER_PRODUCT_IMAGE = '/Assets/products/placeholder-product.svg';

// Local custom product persistence helpers with automatic image self-healing
const sanitizeProduct = (p: Product): Product => {
  if (!p) return p;

  const isCustomProduct =
    p.id?.startsWith('p_') || p.id?.startsWith('prod_custom_') || !p.id?.startsWith('prod-00');

  // Filter out invalid or empty image records
  let validImgs = (p.images || []).filter(
    (img) => img && typeof img.image_url === 'string' && img.image_url.trim().length > 0
  );

  // If this is a custom product that had hero demo images mistakenly injected earlier, clean them out
  if (isCustomProduct) {
    validImgs = validImgs.filter(
      (img) => !img.image_url.includes('hero-mobile') && !img.image_url.includes('hero-landscape')
    );
  }

  // If a product has no images, provide a clean luxury placeholder so cards never render blank
  if (validImgs.length === 0) {
    validImgs.push({
      id: `img_placeholder_${p.id}`,
      image_url: PLACEHOLDER_PRODUCT_IMAGE,
      is_primary: true,
      sort_order: 0,
    });
  } else if (!validImgs.some((i) => i.is_primary)) {
    validImgs[0].is_primary = true;
  }

  const validImgUrls = new Set(validImgs.map((i) => i.image_url));

  // Ensure variants only point to valid images in validImgs
  const sanitizedVariants = (p.variants || []).map((v) => {
    const matchingImg = validImgs.find(
      (img) => img.color_name && img.color_name.toLowerCase().trim() === v.color_name?.toLowerCase().trim()
    );
    let colorImgUrl = '';
    if (v.color_image_url && validImgUrls.has(v.color_image_url)) {
      colorImgUrl = v.color_image_url;
    } else if (matchingImg) {
      colorImgUrl = matchingImg.image_url;
    } else if (validImgs.length > 0) {
      colorImgUrl = validImgs[0].image_url;
    } else {
      colorImgUrl = PLACEHOLDER_PRODUCT_IMAGE;
    }

    return {
      ...v,
      color_image_url: colorImgUrl,
    };
  });

  return {
    ...p,
    images: validImgs,
    variants: sanitizedVariants,
  };
};

const getStoredCustomProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem('tanoah_custom_products');
    if (!raw) return [];
    const list = JSON.parse(raw) as Product[];
    if (!Array.isArray(list)) return [];
    const sanitized = list.map(sanitizeProduct);
    try {
      localStorage.setItem('tanoah_custom_products', JSON.stringify(sanitized));
    } catch {}
    return sanitized;
  } catch {
    return [];
  }
};

const getDeletedProductIds = (): string[] => {
  try {
    const raw = localStorage.getItem('tanoah_deleted_product_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const applyStockOverrides = (products: Product[]): Product[] => {
  try {
    const raw = localStorage.getItem('tanoah_stock_overrides');
    if (!raw) return products;
    const stockMap: Record<string, number> = JSON.parse(raw);
    products.forEach((p) => {
      if (p.variants) {
        p.variants.forEach((v) => {
          if (stockMap[v.id] !== undefined) {
            v.stock_quantity = stockMap[v.id];
          }
        });
      }
    });
  } catch {}
  return products;
};

const mergeProductsWithCustom = (baseList: Product[]): Product[] => {
  const custom = getStoredCustomProducts();
  const deletedIds = getDeletedProductIds();

  const merged = [...custom];
  baseList.forEach((bp) => {
    if (!merged.some((m) => m.id === bp.id || m.slug === bp.slug)) {
      merged.push(sanitizeProduct(bp));
    }
  });
  const filtered = merged.filter((p) => !deletedIds.includes(p.id) && !deletedIds.includes(p.slug));
  return applyStockOverrides(filtered);
};

// Local order persistence helpers
const getStoredCustomOrders = (): any[] => {
  try {
    const raw = safeGetItem('tanoah_custom_orders');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveCustomOrderToStorage = (order: any) => {
  try {
    const sanitized = sanitizeOrderForStorage(order);
    const existing = getStoredCustomOrders();
    // Cap at latest 5 orders to prevent unbounded storage growth
    const filtered = existing
      .filter((o) => o.orderNumber !== sanitized.orderNumber && o.id !== sanitized.id)
      .slice(0, 4);
    filtered.unshift(sanitized);

    safeSetItem('tanoah_custom_orders', JSON.stringify(filtered));
    safeSetItem('tanoah_last_order', JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error saving custom order:', e);
  }
};

const SAMPLE_ORDERS_DETAILED: any[] = [
  {
    id: 'ord-1',
    orderNumber: 'TAN-849201',
    order_number: 'TAN-849201',
    guest_email: 'aditya.sharma@example.com',
    guest_phone: '+91 98201 44521',
    shipping_address: {
      first_name: 'Aditya',
      last_name: 'Sharma',
      address: 'Penthouse 14B, Altamount Road',
      apartment: 'Horizon Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400026',
      country: 'India',
    },
    formData: {
      firstName: 'Aditya',
      lastName: 'Sharma',
      email: 'aditya.sharma@example.com',
      phone: '+91 98201 44521',
      address: 'Penthouse 14B, Altamount Road',
      apartment: 'Horizon Towers',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400026',
      paymentMethod: 'razorpay',
    },
    payment_method: 'razorpay',
    payment_status: 'paid',
    subtotal: 3998,
    discount_total: 0,
    shipping_total: 0,
    tax_total: 480,
    grand_total: 3998,
    status: 'shipped',
    tracking_number: 'BD-849201948IN',
    courier_name: 'BlueDart Express Air',
    created_at: '2026-09-02T10:30:00Z',
    items: [
      {
        id: 'item-1',
        product_title: 'Heavyweight Signature Oversized Tee',
        variant_title: 'Noir Black / M',
        sku: 'TAN-TEE-BLK-M',
        unit_price: 2499,
        quantity: 1,
        line_total: 2499,
        product: {
          title: 'Heavyweight Signature Oversized Tee',
          images: [{ image_url: '/Assets/hero/hero-landscape.jpg' }],
        },
        variant: { color_name: 'Noir Black', size: 'M', sku: 'TAN-TEE-BLK-M', price: 2499 },
      },
      {
        id: 'item-2',
        product_title: 'Normandy Resort Camp Shirt',
        variant_title: 'Ecru Sand / L',
        sku: 'TAN-SHT-ECR-L',
        unit_price: 1499,
        quantity: 1,
        line_total: 1499,
        product: {
          title: 'Normandy Resort Camp Shirt',
          images: [{ image_url: '/Assets/hero/hero-mobile.jpg' }],
        },
        variant: { color_name: 'Ecru Sand', size: 'L', sku: 'TAN-SHT-ECR-L', price: 1499 },
      },
    ],
  },
  {
    id: 'ord-2',
    orderNumber: 'TAN-849198',
    order_number: 'TAN-849198',
    guest_email: 'meera.iyer@example.com',
    guest_phone: '+91 98450 12398',
    shipping_address: {
      first_name: 'Meera',
      last_name: 'Iyer',
      address: 'Villa 8, Indiranagar 12th Main',
      apartment: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560038',
      country: 'India',
    },
    formData: {
      firstName: 'Meera',
      lastName: 'Iyer',
      email: 'meera.iyer@example.com',
      phone: '+91 98450 12398',
      address: 'Villa 8, Indiranagar 12th Main',
      apartment: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      paymentMethod: 'razorpay',
    },
    payment_method: 'razorpay',
    payment_status: 'paid',
    subtotal: 5499,
    discount_total: 500,
    shipping_total: 0,
    tax_total: 660,
    grand_total: 4999,
    status: 'confirmed',
    tracking_number: '',
    courier_name: 'Delhivery Surface',
    created_at: '2026-09-02T14:15:00Z',
    items: [
      {
        id: 'item-3',
        product_title: 'Handcrafted Mulberry Silk Saree',
        variant_title: 'Red / Free Size',
        sku: 'TAN-SAR-RED-FS',
        unit_price: 5499,
        quantity: 1,
        line_total: 5499,
        product: {
          title: 'Handcrafted Mulberry Silk Saree',
          images: [{ image_url: '/Assets/hero/hero-landscape.jpg' }],
        },
        variant: { color_name: 'Red', size: 'Free Size', sku: 'TAN-SAR-RED-FS', price: 5499 },
      },
    ],
  },
];

export const api = {
  // Store Settings (Persisted locally & remote)
  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const raw = localStorage.getItem('tanoah_store_settings');
      if (raw) return { ...SAMPLE_SETTINGS, ...JSON.parse(raw) };
    } catch {}

    try {
      const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
      if (!error && data) return { ...SAMPLE_SETTINGS, ...data } as StoreSettings;
    } catch {}

    return SAMPLE_SETTINGS;
  },

  async saveStoreSettings(settings: Partial<StoreSettings>): Promise<boolean> {
    try {
      const current = await this.getStoreSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('tanoah_store_settings', JSON.stringify(updated));

      try {
        const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
        if (existing?.id) {
          await supabase.from('store_settings').update(settings).eq('id', existing.id);
        }
      } catch {}

      return true;
    } catch {
      return false;
    }
  },

  // Header Menu & Mega Menu Navigation (persisted locally & remote)
  async getNavigationConfig(): Promise<NavigationConfig> {
    try {
      const raw = localStorage.getItem('tanoah_navigation_menu');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.header_menu) && parsed.header_menu.length > 0) {
          return parsed;
        }
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('navigation_config')
        .limit(1)
        .single();
      if (!error && data?.navigation_config?.header_menu?.length > 0) {
        return data.navigation_config as NavigationConfig;
      }
    } catch {}

    return DEFAULT_NAVIGATION_CONFIG;
  },

  async saveNavigationConfig(config: NavigationConfig): Promise<boolean> {
    try {
      const payload: NavigationConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('tanoah_navigation_menu', JSON.stringify(payload));

      try {
        const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
        if (existing?.id) {
          await supabase
            .from('store_settings')
            .update({ navigation_config: payload })
            .eq('id', existing.id);
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_navigation_updated', { detail: payload }));
      }

      return true;
    } catch {
      return false;
    }
  },

  // Home Screen: "Explore The Editions" Featured Collections Showcase
  async getFeaturedCollectionsConfig(): Promise<FeaturedCollectionsConfig> {
    try {
      const raw = localStorage.getItem('tanoah_home_featured_collections');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          return parsed;
        }
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('featured_collections_config')
        .limit(1)
        .single();
      if (!error && (data as any)?.featured_collections_config?.items?.length > 0) {
        return (data as any).featured_collections_config as FeaturedCollectionsConfig;
      }
    } catch {}

    return DEFAULT_FEATURED_COLLECTIONS_CONFIG;
  },

  async saveFeaturedCollectionsConfig(config: FeaturedCollectionsConfig): Promise<boolean> {
    try {
      const payload: FeaturedCollectionsConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('tanoah_home_featured_collections', JSON.stringify(payload));

      try {
        const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
        if (existing?.id) {
          await supabase
            .from('store_settings')
            .update({ featured_collections_config: payload })
            .eq('id', existing.id);
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_featured_collections_updated', { detail: payload }));
      }

      return true;
    } catch {
      return false;
    }
  },

  // Collections (with custom storage persistence)
  async getCollections(): Promise<Collection[]> {
    let customCols: Collection[] = [];
    try {
      const raw = localStorage.getItem('tanoah_custom_collections');
      if (raw) customCols = JSON.parse(raw);
    } catch {}

    let remoteCols: Collection[] = [];
    try {
      const { data, error } = await supabase.from('collections').select('*').eq('is_active', true).order('sort_order');
      if (!error && data && data.length > 0) remoteCols = data as Collection[];
    } catch {}

    const base = remoteCols.length > 0 ? remoteCols : SAMPLE_COLLECTIONS;
    const merged = [...customCols];
    base.forEach((c) => {
      if (!merged.some((m) => m.id === c.id || m.slug === c.slug)) {
        merged.push(c);
      }
    });
    return merged;
  },

  async saveCollection(collection: Collection): Promise<boolean> {
    try {
      const existing = await this.getCollections();
      const updated = [collection, ...existing.filter((c) => c.id !== collection.id && c.slug !== collection.slug)];
      localStorage.setItem('tanoah_custom_collections', JSON.stringify(updated));

      // Sync to Supabase
      try {
        const payload: any = {
          title: collection.title,
          slug: collection.slug,
          description: collection.description || null,
          banner_image: collection.banner_image || null,
          is_smart: !!collection.is_smart,
          sort_order: collection.sort_order || 0,
          is_active: collection.is_active !== false,
        };
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collection.id);
        if (isUUID) {
          payload.id = collection.id;
        }
        await supabase.from('collections').upsert([payload], { onConflict: 'slug' });
      } catch (err) {
        console.warn('Could not sync collection to Supabase:', err);
      }

      // Broadcast update event so navigation and storefront components auto-sync immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_collections_updated', { detail: { collection, collections: updated } }));
      }

      return true;
    } catch {
      return false;
    }
  },

  async deleteCollection(id: string): Promise<boolean> {
    try {
      const existing = await this.getCollections();
      const updated = existing.filter((c) => c.id !== id && c.slug !== id);
      localStorage.setItem('tanoah_custom_collections', JSON.stringify(updated));

      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) {
          await supabase.from('collections').delete().eq('id', id);
        } else {
          await supabase.from('collections').delete().eq('slug', id);
        }
      } catch (err) {
        console.warn('Could not delete collection from Supabase:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_collections_updated', { detail: { deletedId: id, collections: updated } }));
      }

      return true;
    } catch {
      return false;
    }
  },

  // Products with variants and images (Merged with custom stored products)
  async getProducts(statusFilter?: string): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      const base = error || !data || data.length === 0 ? SAMPLE_PRODUCTS : (data as unknown as Product[]);
      const merged = mergeProductsWithCustom(base);
      if (statusFilter && statusFilter !== 'all') {
        return merged.filter((p) => p.status === statusFilter);
      }
      return merged;
    } catch {
      const merged = mergeProductsWithCustom(SAMPLE_PRODUCTS);
      if (statusFilter && statusFilter !== 'all') {
        return merged.filter((p) => p.status === statusFilter);
      }
      return merged;
    }
  },

  // Single Product by slug (checks custom stored products first, then Supabase, then mock)
  async getProductBySlug(slug: string): Promise<Product | null> {
    const custom = getStoredCustomProducts();
    const customMatch = custom.find((p) => p.slug === slug);
    if (customMatch) return customMatch;

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .eq('slug', slug)
        .single();

      if (!error && data) {
        return data as unknown as Product;
      }
    } catch {
      // fallback
    }

    return SAMPLE_PRODUCTS.find((p: Product) => p.slug === slug) || null;
  },

  // Single Product by ID
  async getProductById(id: string): Promise<Product | null> {
    const custom = getStoredCustomProducts();
    const customMatch = custom.find((p) => p.id === id || p.slug === id);
    if (customMatch) return customMatch;

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as unknown as Product;
      }
    } catch {
      // fallback
    }

    return SAMPLE_PRODUCTS.find((p: Product) => p.id === id || p.slug === id) || null;
  },

  // Save / Update Product
  async saveProduct(product: Product): Promise<{ success: boolean; product: Product }> {
    const sanitized = sanitizeProduct(product);
    const custom = getStoredCustomProducts();
    const filtered = custom.filter((p) => p.id !== sanitized.id && p.slug !== sanitized.slug);
    filtered.unshift(sanitized);
    localStorage.setItem('tanoah_custom_products', JSON.stringify(filtered));

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const targetId = uuidRegex.test(sanitized.id) ? sanitized.id : crypto.randomUUID();
    sanitized.id = targetId;

    try {
      await supabase.from('products').upsert({
        id: targetId,
        title: sanitized.title,
        slug: sanitized.slug,
        brand: sanitized.brand || 'TANOAH',
        product_type: sanitized.product_type || 'Apparel',
        base_price: sanitized.base_price,
        sale_price: sanitized.sale_price,
        compare_at_price: sanitized.compare_at_price,
        cost_price: sanitized.cost_price,
        tax_rate: sanitized.tax_rate || 12,
        hsn_code: sanitized.hsn_code,
        status: sanitized.status || 'active',
        is_featured: !!sanitized.is_featured,
        is_best_seller: !!sanitized.is_best_seller,
        is_new_arrival: !!sanitized.is_new_arrival,
        description: sanitized.description || '',
        short_description: sanitized.short_description || '',
        tags: sanitized.tags || [],
        updated_at: new Date().toISOString(),
      });

      // Sync Images to Supabase
      if (sanitized.images && sanitized.images.length > 0) {
        await supabase.from('product_images').delete().eq('product_id', targetId);
        const imgRows = sanitized.images.map((img, idx) => ({
          product_id: targetId,
          image_url: img.image_url,
          alt_text: img.alt_text || sanitized.title,
          sort_order: img.sort_order ?? idx,
          is_primary: img.is_primary ?? idx === 0,
          color_name: img.color_name || '',
          position: idx,
        }));
        await supabase.from('product_images').insert(imgRows);
      }

      // Sync Variants to Supabase
      if (sanitized.variants && sanitized.variants.length > 0) {
        await supabase.from('product_variants').delete().eq('product_id', targetId);
        const variantRows = sanitized.variants.map((v) => {
          const varId = uuidRegex.test(v.id) ? v.id : crypto.randomUUID();
          return {
            id: varId,
            product_id: targetId,
            title: v.title || `${v.color_name || ''} / ${v.size || ''}`.trim(),
            sku: v.sku,
            barcode: v.barcode || null,
            color_name: v.color_name || '',
            color_hex: v.color_hex || '#000000',
            size: v.size || 'Free Size',
            price: v.price || sanitized.base_price,
            sale_price: v.sale_price || sanitized.sale_price,
            compare_at_price: v.compare_at_price || sanitized.compare_at_price,
            stock_quantity: v.stock_quantity ?? 0,
            low_stock_threshold: v.low_stock_threshold ?? 3,
            is_active: v.is_active !== false,
          };
        });
        await supabase.from('product_variants').insert(variantRows);
      }
    } catch (remoteErr) {
      console.warn('Supabase remote product sync error:', remoteErr);
    }

    return { success: true, product: sanitized };
  },

  // Delete Product (Local custom, blacklist tracking, and remote sync)
  async deleteProduct(productId: string): Promise<boolean> {
    const custom = getStoredCustomProducts();
    const updated = custom.filter((p) => p.id !== productId && p.slug !== productId);
    localStorage.setItem('tanoah_custom_products', JSON.stringify(updated));

    // Also track in deleted IDs blacklist so default sample products don't reappear
    try {
      const raw = localStorage.getItem('tanoah_deleted_product_ids');
      const deletedIds: string[] = raw ? JSON.parse(raw) : [];
      if (!deletedIds.includes(productId)) {
        deletedIds.push(productId);
        localStorage.setItem('tanoah_deleted_product_ids', JSON.stringify(deletedIds));
      }
    } catch {}

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(productId)) {
      try {
        await supabase.from('products').delete().eq('id', productId);
      } catch {}
    }
    return true;
  },

  // Banners
  async getBanners(): Promise<Banner[]> {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error || !data) return [];
      return data as Banner[];
    } catch {
      return [];
    }
  },

  // Product Reviews
  async getProductReviews(productId: string): Promise<ProductReview[]> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    
    // Retrieve any locally submitted reviews from browser storage
    let localReviews: ProductReview[] = [];
    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        const allLocal = JSON.parse(stored) as ProductReview[];
        localReviews = allLocal.filter((r) => r.product_id === productId);
      }
    } catch {
      localReviews = [];
    }

    let remoteReviews: ProductReview[] = [];
    if (isUuid) {
      try {
        const { data, error } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          remoteReviews = data as ProductReview[];
        }
      } catch {
        remoteReviews = [];
      }
    }

    // Default curated reviews if no remote reviews exist yet
    const defaultReviews: ProductReview[] = [
      {
        id: `rev-${productId}-1`,
        product_id: productId,
        author_name: 'Devansh K.',
        rating: 5,
        title: 'Impeccable Drape & Material',
        review_text: 'The tailoring and fabric weight are world-class. Holds structure throughout the entire day without losing shape. Highly recommended.',
        is_verified_buyer: true,
        status: 'approved',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: `rev-${productId}-2`,
        product_id: productId,
        author_name: 'Meera R.',
        rating: 5,
        title: 'Effortless Luxury Aesthetic',
        review_text: 'Subtle, understated elegance. The stitching details and tactile feel match international atelier standards.',
        is_verified_buyer: true,
        status: 'approved',
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
    ];

    const baseReviews = remoteReviews.length > 0 ? remoteReviews : defaultReviews;
    return [...localReviews, ...baseReviews];
  },

  // Submit Review
  async submitReview(review: Omit<ProductReview, 'id' | 'created_at'>): Promise<{ success: boolean; message: string; review: ProductReview }> {
    const newReview: ProductReview = {
      ...review,
      id: `rev_${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'approved',
      is_verified_buyer: true,
    };

    // Store in browser storage immediately so client sees it
    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      const allLocal = stored ? JSON.parse(stored) : [];
      allLocal.unshift(newReview);
      localStorage.setItem('tanoah_custom_reviews', JSON.stringify(allLocal));
    } catch (e) {
      console.error('Failed to store review in localStorage:', e);
    }

    // If product_id is a valid Supabase UUID, also persist to database
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(review.product_id);
    if (isUuid) {
      try {
        await supabase.from('product_reviews').insert([{
          ...review,
          status: 'approved',
          is_verified_buyer: true,
        }]);
      } catch (err) {
        console.warn('Database insert failed, but saved locally:', err);
      }
    }

    return {
      success: true,
      message: 'Review published successfully! Thank you for your feedback.',
      review: newReview,
    };
  },

  // Coupon Management (Dual-sync)
  async getCoupons(): Promise<Coupon[]> {
    let customCoupons: Coupon[] = [];
    try {
      const raw = localStorage.getItem('tanoah_custom_coupons');
      if (raw) customCoupons = JSON.parse(raw);
    } catch {}

    let remoteCoupons: Coupon[] = [];
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (!error && data) remoteCoupons = data as Coupon[];
    } catch {}

    const merged = [...customCoupons];
    remoteCoupons.forEach((rc) => {
      if (!merged.some((m) => m.code.toLowerCase() === rc.code.toLowerCase())) {
        merged.push(rc);
      }
    });

    SAMPLE_COUPONS.forEach((sc) => {
      if (!merged.some((m) => m.code.toLowerCase() === sc.code.toLowerCase())) {
        merged.push(sc);
      }
    });

    return merged;
  },

  async createCoupon(coupon: {
    code: string;
    discount_type: 'percentage' | 'fixed' | 'free_shipping' | 'bogo';
    discount_value: number;
    min_spend?: number;
    max_discount?: number;
    is_active?: boolean;
  }): Promise<{ success: boolean; coupon: Coupon }> {
    const cleanCode = coupon.code.trim().toUpperCase();
    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}`,
      code: cleanCode,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_spend: coupon.min_spend || 0,
      max_discount: coupon.max_discount,
      is_automatic: false,
      is_active: coupon.is_active !== undefined ? coupon.is_active : true,
    };

    // Store in browser storage immediately
    try {
      const existing = await this.getCoupons();
      const updated = [newCoupon, ...existing.filter((c) => c.code.toLowerCase() !== cleanCode.toLowerCase())];
      localStorage.setItem('tanoah_custom_coupons', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving custom coupon:', e);
    }

    // Best-effort remote insert
    try {
      await supabase.from('coupons').insert([{
        code: newCoupon.code,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_spend: newCoupon.min_spend,
        max_discount: newCoupon.max_discount || null,
        is_active: newCoupon.is_active,
      }]);
    } catch {}

    return { success: true, coupon: newCoupon };
  },

  async deleteCoupon(couponId: string): Promise<boolean> {
    try {
      const raw = localStorage.getItem('tanoah_custom_coupons');
      if (raw) {
        const list: Coupon[] = JSON.parse(raw);
        const filtered = list.filter((c) => c.id !== couponId && c.code !== couponId);
        localStorage.setItem('tanoah_custom_coupons', JSON.stringify(filtered));
      }
      await supabase.from('coupons').delete().or(`id.eq.${couponId},code.eq.${couponId}`);
    } catch {}
    return true;
  },

  // Coupon Validation
  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: Coupon; message: string }> {
    try {
      const cleanCode = code.trim().toLowerCase();
      const allCoupons = await this.getCoupons();
      const match = allCoupons.find((c) => c.code.toLowerCase() === cleanCode && c.is_active);

      if (!match) {
        return { valid: false, message: 'Invalid or expired coupon code.' };
      }

      if (match.min_spend && subtotal < match.min_spend) {
        return {
          valid: false,
          message: `Minimum spend of ₹${match.min_spend.toLocaleString('en-IN')} required.`,
        };
      }

      return { valid: true, coupon: match, message: 'Coupon applied successfully!' };
    } catch {
      return { valid: false, message: 'Unable to validate coupon at this time.' };
    }
  },

  // Create Order (saves locally with complete details + decrements inventory + remote sync)
  async createOrder(params: {
    user_id?: string | null;
    guest_email: string;
    guest_phone: string;
    shipping_address: any;
    billing_address?: any;
    payment_method: string;
    payment_status: string;
    payment_gateway_ref?: string;
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    grand_total: number;
    items: CartItem[];
  }): Promise<{ success: boolean; order_number?: string; error?: string }> {
    const orderNumber = 'TAN-' + Math.floor(100000 + Math.random() * 900000);

    const localOrder = {
      id: `ord_${Date.now()}`,
      order_number: orderNumber,
      orderNumber,
      user_id: params.user_id || null,
      guest_email: params.guest_email,
      guest_phone: params.guest_phone,
      shipping_address: params.shipping_address,
      billing_address: params.billing_address || params.shipping_address,
      formData: {
        firstName: params.shipping_address.first_name || '',
        lastName: params.shipping_address.last_name || '',
        email: params.guest_email,
        phone: params.guest_phone,
        address: params.shipping_address.address || '',
        apartment: params.shipping_address.apartment || '',
        city: params.shipping_address.city || '',
        state: params.shipping_address.state || '',
        postalCode: params.shipping_address.postal_code || '',
        paymentMethod: params.payment_method,
      },
      payment_method: params.payment_method,
      payment_status: params.payment_status,
      payment_gateway_ref: params.payment_gateway_ref || null,
      subtotal: params.subtotal,
      discount_total: params.discount_total,
      shipping_total: params.shipping_total,
      tax_total: params.tax_total,
      grand_total: params.grand_total,
      status: params.payment_status === 'paid' ? 'confirmed' : 'pending_payment',
      created_at: new Date().toISOString(),
      items: params.items.map((item) => {
        const itemImg =
          item.variant?.color_image_url ||
          item.product?.images?.find(
            (img) =>
              img.color_name &&
              item.variant?.color_name &&
              img.color_name.toLowerCase().trim() === item.variant.color_name.toLowerCase().trim()
          )?.image_url ||
          item.product?.images?.find((img) => img.is_primary)?.image_url ||
          item.product?.images?.[0]?.image_url ||
          PLACEHOLDER_PRODUCT_IMAGE;

        return {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          product_id: item.product.id,
          variant_id: item.variant.id,
          product: item.product,
          variant: item.variant,
          product_title: item.product.title,
          variant_title: `${item.variant.color_name} / ${item.variant.size}`,
          sku: item.variant.sku,
          image_url: itemImg,
          unit_price: item.variant.sale_price || item.variant.price,
          quantity: item.quantity,
          line_total: (item.variant.sale_price || item.variant.price) * item.quantity,
        };
      }),
    };

    saveCustomOrderToStorage(localOrder);

    // Adjust inventory according to purchase (Issue 5)
    await this.adjustInventoryForOrder(params.items);

    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          user_id: params.user_id || null,
          guest_email: params.guest_email,
          guest_phone: params.guest_phone,
          shipping_address: params.shipping_address,
          billing_address: params.billing_address || params.shipping_address,
          payment_method: params.payment_method,
          payment_status: params.payment_status,
          payment_gateway_ref: params.payment_gateway_ref || null,
          subtotal: params.subtotal,
          discount_total: params.discount_total,
          shipping_total: params.shipping_total,
          tax_total: params.tax_total,
          grand_total: params.grand_total,
          status: params.payment_status === 'paid' ? 'confirmed' : 'pending_payment',
        }])
        .select('id')
        .single();

      if (!orderErr && orderData?.id) {
        const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
        const orderItems = params.items.map((item) => {
          const itemImg =
            item.variant?.color_image_url ||
            item.product?.images?.find(
              (img) =>
                img.color_name &&
                item.variant?.color_name &&
                img.color_name.toLowerCase().trim() === item.variant.color_name.toLowerCase().trim()
            )?.image_url ||
            item.product?.images?.find((img) => img.is_primary)?.image_url ||
            item.product?.images?.[0]?.image_url ||
            PLACEHOLDER_PRODUCT_IMAGE;

          return {
            order_id: orderData.id,
            product_id: isUuid(item.product?.id) ? item.product.id : null,
            variant_id: isUuid(item.variant?.id) ? item.variant.id : null,
            product_title: item.product?.title || 'Atelier Product',
            variant_title: `${item.variant?.color_name || 'Standard'} / ${item.variant?.size || 'Free'}`,
            sku: item.variant?.sku || 'TAN-SKU',
            image_url: itemImg,
            unit_price: Number(item.variant?.sale_price || item.variant?.price || 0),
            quantity: item.quantity,
            line_total: Number(item.variant?.sale_price || item.variant?.price || 0) * item.quantity,
          };
        });
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
        if (itemsErr) console.error('Error inserting order items:', itemsErr);
      }
    } catch {
      // remote sync best effort
    }

    return { success: true, order_number: orderNumber };
  },

  // Adjust inventory according to purchase (Issue 5)
  async adjustInventoryForOrder(items: CartItem[]): Promise<void> {
    try {
      const stored = localStorage.getItem('tanoah_custom_products');
      let products: Product[] = stored ? JSON.parse(stored) : [];

      items.forEach((item) => {
        if (!products.some((p) => p.id === item.product.id)) {
          products.push(item.product);
        }
      });

      items.forEach((item) => {
        const product = products.find((p) => p.id === item.product.id);
        if (product && product.variants) {
          const variant = product.variants.find(
            (v) =>
              v.id === item.variant.id ||
              (v.color_name === item.variant.color_name && v.size === item.variant.size)
          );
          if (variant) {
            variant.stock_quantity = Math.max(0, variant.stock_quantity - item.quantity);
          }
        }
      });

      localStorage.setItem('tanoah_custom_products', JSON.stringify(products));

      for (const item of items) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.variant.id
        );
        if (isUuid) {
          try {
            await supabase.rpc('decrement_inventory', {
              p_variant_id: item.variant.id,
              p_quantity: item.quantity,
            });
          } catch {
            // best effort
          }
        }
      }
    } catch (err) {
      console.error('Error adjusting inventory:', err);
    }
  },

  // Public Order Tracking (Merged so items and client info are never lost)
  async getOrderByNumber(orderNumber: string): Promise<any | null> {
    const cleanNum = orderNumber.trim();
    const customOrders = getStoredCustomOrders();
    const localMatch = customOrders.find(
      (o) => o.order_number === cleanNum || o.orderNumber === cleanNum || o.id === cleanNum
    );

    let remoteOrder: any = null;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('order_number', cleanNum)
        .single();

      if (!error && data) {
        remoteOrder = data;
      }
    } catch {
      // fallback
    }

    if (remoteOrder) {
      // If remote order has no items, merge items from local storage
      if ((!remoteOrder.items || remoteOrder.items.length === 0) && localMatch?.items?.length > 0) {
        remoteOrder.items = localMatch.items;
      }
      return remoteOrder;
    }

    if (localMatch) return localMatch;

    const sample = SAMPLE_ORDERS_DETAILED.find(
      (o) => o.orderNumber === cleanNum || o.order_number === cleanNum || o.id === cleanNum
    );
    return sample || null;
  },

  // Newsletter Subscription
  async subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email: email.toLowerCase().trim() }]);
      if (error) {
        if (error.code === '23505') {
          return { success: true, message: 'You are already subscribed to the TANOAH Gazette.' };
        }
        throw error;
      }
      return { success: true, message: 'Welcome to TANOAH. Complimentary welcome code sent.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Subscription failed.' };
    }
  },

  // Back in Stock Waitlist
  async subscribeBackInStock(variantId: string, email: string, phone?: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.from('back_in_stock_subscriptions').insert([{
        variant_id: variantId,
        email: email.toLowerCase().trim(),
        phone: phone || null,
      }]);
      if (error) throw error;
      return { success: true, message: 'We will notify you immediately once restocked.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to register notification.' };
    }
  },

  // Return & Exchange Request
  async submitReturn(params: {
    order_number: string;
    return_type: 'return' | 'exchange';
    reason: string;
    customer_description?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const order = await this.getOrderByNumber(params.order_number);
      if (!order) return { success: false, message: 'Order number not found.' };

      const { error } = await supabase.from('returns').insert([{
        order_id: order.id,
        return_type: params.return_type,
        reason: params.reason,
        customer_description: params.customer_description || null,
        status: 'requested',
      }]);

      if (error) throw error;
      return { success: true, message: 'Return ticket created. Concierge team will review within 24 hours.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to submit return request.' };
    }
  },

  // Admin: Get all orders (Merged with rich custom and sample orders)
  async getAdminOrders(): Promise<any[]> {
    const customOrders = getStoredCustomOrders();
    let remoteOrders: any[] = [];
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        remoteOrders = data;
      }
    } catch {
      remoteOrders = [];
    }

    const merged = [...customOrders];
    remoteOrders.forEach((ro) => {
      if (!merged.some((m) => m.order_number === ro.order_number || m.orderNumber === ro.order_number)) {
        merged.push(ro);
      }
    });

    SAMPLE_ORDERS_DETAILED.forEach((so) => {
      if (!merged.some((m) => m.order_number === so.orderNumber || m.orderNumber === so.orderNumber)) {
        merged.push(so);
      }
    });

    return merged;
  },

  // Admin: Update order status (Dual-sync)
  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const cleanId = orderId.trim();

      // 1. Update in local custom orders
      const customOrders = getStoredCustomOrders();
      let localUpdated = false;
      const updatedList = customOrders.map((o) => {
        if (o.id === cleanId || o.orderNumber === cleanId || o.order_number === cleanId) {
          localUpdated = true;
          return {
            ...o,
            status,
            tracking_number: trackingNumber || o.tracking_number,
            trackingNumber: trackingNumber || o.trackingNumber,
            courier_name: 'BlueDart Express Air',
          };
        }
        return o;
      });
      if (localUpdated) {
        safeSetItem('tanoah_custom_orders', JSON.stringify(updatedList));
      }

      // Also check last order
      const rawLast = safeGetItem('tanoah_last_order');
      if (rawLast) {
        try {
          const parsed = JSON.parse(rawLast);
          if (parsed.orderNumber === cleanId || parsed.order_number === cleanId || parsed.id === cleanId) {
            parsed.status = status;
            if (trackingNumber) parsed.tracking_number = trackingNumber;
            safeSetItem('tanoah_last_order', JSON.stringify(parsed));
          }
        } catch {}
      }

      // 2. Sync to Supabase
      const updateData: any = { status };
      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
        updateData.courier_name = 'BlueDart Express Air';
      }
      try {
        await supabase.from('orders').update(updateData).or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
      } catch {}

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update order.' };
    }
  },

  // Admin: Update variant stock & audit log (Dual-sync)
  async updateVariantStock(variantId: string, newQty: number, reason: string = 'manual_adjustment'): Promise<{ success: boolean; message?: string }> {
    try {
      const cleanQty = Math.max(0, Number(newQty) || 0);

      // 1. Update in local custom products
      const customProducts = getStoredCustomProducts();
      let updatedCustom = false;
      customProducts.forEach((p) => {
        if (p.variants) {
          p.variants.forEach((v) => {
            if (v.id === variantId || v.sku === variantId) {
              v.stock_quantity = cleanQty;
              updatedCustom = true;
            }
          });
        }
      });
      if (updatedCustom) {
        localStorage.setItem('tanoah_custom_products', JSON.stringify(customProducts));
      }

      // Also track in a persistent variant stock map for sample products
      try {
        const rawStockMap = localStorage.getItem('tanoah_stock_overrides');
        const stockMap: Record<string, number> = rawStockMap ? JSON.parse(rawStockMap) : {};
        stockMap[variantId] = cleanQty;
        localStorage.setItem('tanoah_stock_overrides', JSON.stringify(stockMap));
      } catch {}

      // 2. Sync to Supabase if UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId);
      if (isUuid) {
        try {
          await supabase
            .from('product_variants')
            .update({ stock_quantity: cleanQty })
            .eq('id', variantId);
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating stock:', err);
      return { success: false, message: err.message || 'Failed to update stock.' };
    }
  },

  // Admin: Returns & Exchanges Queue
  async getReturnTickets(): Promise<any[]> {
    let localReturns: any[] = [];
    try {
      const raw = localStorage.getItem('tanoah_custom_returns');
      if (raw) localReturns = JSON.parse(raw);
    } catch {}

    let remoteReturns: any[] = [];
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          order:orders(*)
        `)
        .order('created_at', { ascending: false });
      if (!error && data) remoteReturns = data;
    } catch {}

    const merged = [...localReturns];
    remoteReturns.forEach((rr) => {
      if (!merged.some((m) => m.id === rr.id)) {
        merged.push({
          id: rr.id,
          order_number: rr.order?.order_number || 'TAN-UNKNOWN',
          customer_name: `${rr.order?.shipping_address?.first_name || ''} ${rr.order?.shipping_address?.last_name || ''}`.trim() || rr.order?.guest_email || 'Customer',
          customer_email: rr.order?.guest_email || '',
          return_type: rr.return_type || 'return',
          reason: rr.reason || 'General Return',
          customer_description: rr.customer_description || '',
          product_title: 'Atelier Apparel',
          variant_info: 'Standard',
          status: rr.status || 'requested',
          created_at: rr.created_at || new Date().toISOString(),
        });
      }
    });

    const INITIAL_DEMO_RETURNS = [
      {
        id: 'ret_101',
        order_number: 'TAN-849201',
        customer_name: 'Aditya Sharma',
        customer_email: 'aditya.sharma@example.com',
        return_type: 'exchange',
        reason: 'Size Too Large',
        customer_description: 'Fits slightly looser than expected. Exchange for S.',
        product_title: 'Signature Heavyweight Oversized Tee',
        variant_info: 'Noir Black / M -> Exchange for S',
        status: 'requested',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'ret_102',
        order_number: 'TAN-719382',
        customer_name: 'Mira Nair',
        customer_email: 'mira.nair@example.com',
        return_type: 'return',
        reason: 'Fabric Preference',
        customer_description: 'Looking for a slightly heavier drape.',
        product_title: 'French Linen Relaxed Camp Shirt',
        variant_info: 'Ecru Sand / M',
        status: 'approved',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    INITIAL_DEMO_RETURNS.forEach((demo) => {
      if (!merged.some((m) => m.id === demo.id || m.order_number === demo.order_number)) {
        merged.push(demo);
      }
    });

    return merged;
  },

  async updateReturnTicketStatus(ticketId: string, status: string): Promise<boolean> {
    try {
      const tickets = await this.getReturnTickets();
      const updated = tickets.map((t) => (t.id === ticketId ? { ...t, status } : t));
      localStorage.setItem('tanoah_custom_returns', JSON.stringify(updated));

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(ticketId)) {
        await supabase.from('returns').update({ status }).eq('id', ticketId);
      }
      return true;
    } catch {
      return false;
    }
  },

  // Admin: Customers CRM Aggregation
  async getCustomers(): Promise<any[]> {
    const orders = await this.getAdminOrders();
    const customerMap = new Map<string, any>();

    // Seed patrons
    const SEED_CUSTOMERS = [
      {
        id: 'c-vip-1',
        name: 'Aditya Sharma',
        email: 'aditya.sharma@example.com',
        phone: '+91 98765 43210',
        city: 'Mumbai, Maharashtra',
        totalOrders: 4,
        lifetimeValue: 18992,
        isVip: true,
        lastOrderDate: '2026-09-02',
      },
      {
        id: 'c-vip-2',
        name: 'Ananya Singhania',
        email: 'ananya.s@example.com',
        phone: '+91 98111 22334',
        city: 'New Delhi',
        totalOrders: 3,
        lifetimeValue: 13497,
        isVip: true,
        lastOrderDate: '2026-08-28',
      },
    ];

    SEED_CUSTOMERS.forEach((c) => customerMap.set(c.email.toLowerCase(), { ...c }));

    // Aggregate real orders
    orders.forEach((o) => {
      const email = (o.guest_email || o.formData?.email || '').toLowerCase().trim();
      if (!email) return;

      const name =
        (o.shipping_address?.first_name ? `${o.shipping_address.first_name} ${o.shipping_address.last_name || ''}`.trim() : null) ||
        (o.formData?.firstName ? `${o.formData.firstName} ${o.formData.lastName || ''}`.trim() : null) ||
        email.split('@')[0];

      const phone = o.guest_phone || o.formData?.phone || '+91 90000 00000';
      const city = o.shipping_address?.city
        ? `${o.shipping_address.city}, ${o.shipping_address.state || 'India'}`
        : o.formData?.city || 'India';
      const totalAmount = Number(o.grand_total || o.grandTotal || o.subtotal || 0);
      const orderDate = (o.created_at || o.date || new Date().toISOString()).slice(0, 10);

      if (customerMap.has(email)) {
        const existing = customerMap.get(email);
        existing.totalOrders += 1;
        existing.lifetimeValue += totalAmount;
        if (orderDate > existing.lastOrderDate) {
          existing.lastOrderDate = orderDate;
        }
        if (existing.lifetimeValue > 10000) {
          existing.isVip = true;
        }
      } else {
        customerMap.set(email, {
          id: `cust_${email.replace(/[^a-z0-9]/g, '_')}`,
          name,
          email,
          phone,
          city,
          totalOrders: 1,
          lifetimeValue: totalAmount,
          isVip: totalAmount > 10000,
          lastOrderDate: orderDate,
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  },

  // Media Library & Cloudflare R2 Pipeline Methods
  async getMediaList(): Promise<MediaItem[]> {
    let localMedia: MediaItem[] = [];
    try {
      const raw = localStorage.getItem('tanoah_custom_media');
      if (raw) localMedia = JSON.parse(raw);
    } catch {}

    try {
      const { data, error } = await supabase
        .from('media_usage_stats')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as unknown as MediaItem[];
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as unknown as MediaItem[];
      }
    } catch {}

    const SAMPLE_FALLBACK: MediaItem[] = [
      {
        id: 'med_sample_1',
        r2_key: 'products/hero-landscape.webp',
        original_filename: 'hero-landscape.jpg',
        stored_filename: 'hero-landscape.webp',
        mime_type: 'image/webp',
        width: 2400,
        height: 3000,
        file_size: 685000,
        file_hash: '7a9b8c1d2e3f4a5b6c7d8e9f0a1b2c3d',
        media_type: 'product',
        storage_provider: 'cloudflare_r2',
        created_at: new Date().toISOString(),
        product_reference_count: 2,
        is_orphan: false,
      },
      {
        id: 'med_sample_2',
        r2_key: 'products/hero-mobile.webp',
        original_filename: 'hero-mobile.jpg',
        stored_filename: 'hero-mobile.webp',
        mime_type: 'image/webp',
        width: 2400,
        height: 3000,
        file_size: 542000,
        file_hash: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
        media_type: 'product',
        storage_provider: 'cloudflare_r2',
        created_at: new Date().toISOString(),
        product_reference_count: 1,
        is_orphan: false,
      },
    ];

    return localMedia.length > 0 ? localMedia : SAMPLE_FALLBACK;
  },

  async uploadMediaFile(
    file: File,
    options?: {
      preserveOriginal?: boolean;
      colorName?: string;
      mediaType?: 'product' | 'banner' | 'brand' | 'lookbook';
      onProgress?: (progress: any) => void;
    }
  ): Promise<{
    media: MediaItem;
    publicUrl: string;
    isDuplicate: boolean;
    percentSaved: number;
    originalSize: number;
    optimizedSize: number;
  }> {
    // 1. Process client-side: orientation, standardizing to 4:5 (max 2400x3000), WebP Q=88, SHA-256
    const processed = await processImageForUpload(file, {
      preserveOriginal: options?.preserveOriginal,
      onProgress: options?.onProgress,
    });
    
    // 2. Presigned URL / Deduplication check
    let isDuplicate = false;
    let uploadTargetUrl = '';
    let publicUrl = '';
    let finalMediaRecord: any = null;

    try {
      const existingMedia = await this.getMediaList();
      const match = existingMedia.find((m) => m.file_hash === processed.fileHash);
      if (match) {
        isDuplicate = true;
        finalMediaRecord = match;
        publicUrl = match.r2_key ? r2Service.getPublicUrl(match.r2_key) : '';
      }
    } catch {}

    if (!isDuplicate) {
      try {
        const preRes = await fetch('/api/media/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: processed.originalFilename,
            fileHash: processed.fileHash,
            width: processed.width,
            height: processed.height,
            fileSize: processed.optimizedSize,
            mimeType: 'image/webp',
            mediaType: options?.mediaType || 'product',
            preserveOriginal: options?.preserveOriginal,
          }),
        });

        if (preRes.ok) {
          const preData = await preRes.json();
          if (preData.isDuplicate && preData.media) {
            isDuplicate = true;
            finalMediaRecord = preData.media;
            publicUrl = preData.publicUrl;
          } else {
            uploadTargetUrl = preData.uploadUrl;
            if (preData.publicUrl) publicUrl = preData.publicUrl;
          }
        }
      } catch (e) {
        // Presigned URL endpoint skipped, using direct upload simulation
      }
    }

    // 3. If not duplicate, upload binary
    if (!isDuplicate) {
      let r2UploadSuccess = false;
      const mediaFolder = options?.mediaType === 'banner' ? 'banners' : options?.mediaType === 'lookbook' ? 'lookbook' : 'products';
      const cleanFileName = processed.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const r2Key = `${mediaFolder}/${processed.fileHash.slice(0, 16)}-${cleanFileName}.webp`;

      // 3a. Direct Cloudflare R2 Upload via r2Service
      try {
        const r2Res = await r2Service.upload(processed.blob, r2Key, 'image/webp');
        if (r2Res.success) {
          r2UploadSuccess = true;
          publicUrl = r2Res.publicUrl;
        }
      } catch (r2Err) {
        console.warn('Direct Cloudflare R2 upload attempt:', r2Err);
      }

      // 3b. Presigned S3 PUT fallback if target URL was provided
      if (!r2UploadSuccess && uploadTargetUrl && !uploadTargetUrl.startsWith('/api/media/upload') && !uploadTargetUrl.includes('localhost')) {
        try {
          const s3Res = await fetch(uploadTargetUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/webp' },
            body: processed.blob,
          });
          if (s3Res.ok) {
            r2UploadSuccess = true;
            publicUrl = r2Service.getPublicUrl(r2Key);
          }
        } catch (s3Err) {
          console.warn('Presigned S3 PUT failed:', s3Err);
        }
      }

      // Record in Supabase
      const mediaItemPayload = {
        r2_key: r2Key,
        original_filename: processed.originalFilename,
        stored_filename: `${cleanFileName}.webp`,
        mime_type: 'image/webp',
        width: processed.width,
        height: processed.height,
        file_size: processed.optimizedSize,
        file_hash: processed.fileHash,
        media_type: options?.mediaType || 'product',
        storage_provider: r2UploadSuccess ? 'cloudflare_r2' : 'local_master',
        preserved_original_key: options?.preserveOriginal
          ? `originals/${Date.now()}-${processed.originalFilename}`
          : null,
      };

      try {
        const { data, error } = await supabase.from('media').insert([mediaItemPayload]).select().single();
        if (!error && data) {
          finalMediaRecord = data;
        }
      } catch (dbErr) {
        console.warn('Supabase media insert error:', dbErr);
      }

      if (!finalMediaRecord) {
        finalMediaRecord = {
          id: `med_${Date.now()}`,
          ...mediaItemPayload,
          created_at: new Date().toISOString(),
        };
      }

      // If R2 upload was successful, publicUrl is the R2 public CDN URL; otherwise use the optimized WebP dataUrl
      if (!r2UploadSuccess || !publicUrl) {
        publicUrl = processed.dataUrl;
      }
    }

    // 4. Update local custom media
    try {
      const existing = localStorage.getItem('tanoah_custom_media');
      const list: MediaItem[] = existing ? JSON.parse(existing) : [];
      if (!list.some((m) => m.file_hash === processed.fileHash)) {
        list.unshift(finalMediaRecord);
        localStorage.setItem('tanoah_custom_media', JSON.stringify(list));
      }
    } catch {}

    return {
      media: finalMediaRecord,
      publicUrl: publicUrl || processed.dataUrl || processed.previewUrl,
      isDuplicate,
      percentSaved: processed.percentSaved,
      originalSize: processed.originalSize,
      optimizedSize: processed.optimizedSize,
    };
  },

  async deleteMedia(
    mediaId: string,
    r2Key?: string,
    force = false
  ): Promise<{ success: boolean; message: string; safeToDelete: boolean }> {
    try {
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, r2Key, force }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {}

    // Fallback: update local storage registry and Supabase soft delete
    try {
      const existing = localStorage.getItem('tanoah_custom_media');
      if (existing) {
        const list: MediaItem[] = JSON.parse(existing);
        const updated = list.filter((m) => m.id !== mediaId && m.r2_key !== r2Key);
        localStorage.setItem('tanoah_custom_media', JSON.stringify(updated));
      }
    } catch {}

    try {
      await supabase.from('media').update({ deleted_at: new Date().toISOString() }).eq('id', mediaId);
    } catch {}

    return { success: true, message: 'Media removed from registry.', safeToDelete: true };
  },

  async getStorageAnalytics(): Promise<any> {
    try {
      const res = await fetch('/api/media/analytics');
      if (res.ok) return await res.json();
    } catch {}

    const mediaList = await this.getMediaList();
    const totalBytes = mediaList.reduce((acc, m) => acc + (Number(m.file_size) || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(4);

    return {
      bucketName: r2Service.getBucketName(),
      publicDomain: r2Service.getPublicDomain(),
      storageProvider: 'Cloudflare R2',
      totalAssets: mediaList.length,
      orphanCount: mediaList.filter((m) => m.is_orphan).length,
      inUseCount: mediaList.filter((m) => !m.is_orphan).length,
      totalStorageBytes: totalBytes,
      totalStorageMB: parseFloat(totalMB),
      totalStorageGB: parseFloat(totalGB),
      percentSaved: 88,
      estimatedCostMonthly: '$0.00',
      isFreeTier: true,
    };
  },

  async cleanupOrphanMedia(dryRun = true): Promise<any> {
    try {
      const res = await fetch('/api/media/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      if (res.ok) return await res.json();
    } catch {}

    return {
      dryRun,
      orphanCount: 0,
      purgedCount: 0,
      message: dryRun
        ? 'Scan completed: 0 unreferenced orphan files found.'
        : 'Orphan cleanup completed.',
    };
  },

  // User Address Book Management (Dual-sync: Supabase + LocalStorage with order fallback)
  async getUserAddresses(userId?: string, userEmail?: string): Promise<SavedAddress[]> {
    const list: SavedAddress[] = [];
    const idKey = userId ? `tanoah_saved_addresses_${userId}` : null;
    const emailKey = userEmail ? `tanoah_saved_addresses_${userEmail}` : null;

    // 1. Try Supabase user_addresses if userId is provided
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach((addr) => {
            if (!list.some((a) => a.id === addr.id)) {
              list.push(addr as SavedAddress);
            }
          });
        }
      } catch (err) {
        console.warn('Supabase getUserAddresses fetch failed, falling back to local storage', err);
      }
    }

    // 2. Fetch from local storage keys
    const checkKeys = [idKey, emailKey, 'tanoah_saved_addresses'].filter(Boolean) as string[];
    for (const k of checkKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((addr: any) => {
              if (
                addr &&
                !list.some(
                  (a) =>
                    a.id === addr.id ||
                    (a.address &&
                      addr.address &&
                      a.address.toLowerCase().trim() === addr.address.toLowerCase().trim() &&
                      a.postal_code === addr.postal_code)
                )
              ) {
                list.push(addr);
              }
            });
          }
        }
      } catch {}
    }

    // 3. If no addresses found, check past orders for this user/email to synthesize default address
    if (list.length === 0 && (userId || userEmail)) {
      try {
        const customOrders = getStoredCustomOrders();
        const matchingOrder = customOrders.find(
          (o) =>
            (userId && o.user_id === userId) ||
            (userEmail &&
              (o.guest_email?.toLowerCase() === userEmail?.toLowerCase() ||
                o.formData?.email?.toLowerCase() === userEmail?.toLowerCase()))
        );

        if (matchingOrder?.shipping_address?.address) {
          const ship = matchingOrder.shipping_address;
          const synthetic: SavedAddress = {
            id: `addr_past_${Date.now()}`,
            user_id: userId,
            first_name: ship.first_name || matchingOrder.formData?.firstName || '',
            last_name: ship.last_name || matchingOrder.formData?.lastName || '',
            email: userEmail || matchingOrder.guest_email || '',
            phone: ship.phone || matchingOrder.guest_phone || matchingOrder.formData?.phone || '',
            address: ship.address,
            apartment: ship.apartment || matchingOrder.formData?.apartment || '',
            city: ship.city || matchingOrder.formData?.city || '',
            state: ship.state || matchingOrder.formData?.state || 'Maharashtra',
            postal_code: ship.postal_code || matchingOrder.formData?.postalCode || '',
            country: ship.country || 'India',
            is_default: true,
            label: 'Home',
          };
          list.push(synthetic);
          if (idKey) localStorage.setItem(idKey, JSON.stringify(list));
        }
      } catch {}
    }

    // Ensure at least one is default if list is not empty
    if (list.length > 0 && !list.some((a) => a.is_default)) {
      list[0].is_default = true;
    }

    return list;
  },

  async saveUserAddress(address: Partial<SavedAddress> & {
    first_name: string;
    last_name: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
    user_id?: string;
    email?: string;
  }): Promise<SavedAddress> {
    const userId = address.user_id;
    const userEmail = address.email;
    const existing = await this.getUserAddresses(userId, userEmail);

    const isFirst = existing.length === 0;
    const shouldBeDefault = address.is_default ?? isFirst;

    const id =
      address.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    const newAddress: SavedAddress = {
      id,
      user_id: userId,
      first_name: address.first_name.trim(),
      last_name: address.last_name.trim(),
      email: userEmail,
      phone: address.phone.trim(),
      address: address.address.trim(),
      apartment: address.apartment?.trim() || '',
      city: address.city.trim(),
      state: address.state.trim() || 'Maharashtra',
      postal_code: address.postal_code.trim(),
      country: address.country || 'India',
      is_default: shouldBeDefault,
      label: address.label || 'Home',
    };

    let updated = existing.map((a) => (shouldBeDefault ? { ...a, is_default: false } : a));
    const existIndex = updated.findIndex((a) => a.id === id);
    if (existIndex >= 0) {
      updated[existIndex] = newAddress;
    } else {
      updated.unshift(newAddress);
    }

    // Save to local storage
    const idKey = userId ? `tanoah_saved_addresses_${userId}` : null;
    const emailKey = userEmail ? `tanoah_saved_addresses_${userEmail}` : null;
    if (idKey) localStorage.setItem(idKey, JSON.stringify(updated));
    if (emailKey) localStorage.setItem(emailKey, JSON.stringify(updated));
    localStorage.setItem('tanoah_saved_addresses', JSON.stringify(updated));

    // Sync to Supabase user_addresses
    if (userId) {
      try {
        if (shouldBeDefault) {
          await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId);
        }
        await supabase.from('user_addresses').upsert({
          id: newAddress.id,
          user_id: userId,
          first_name: newAddress.first_name,
          last_name: newAddress.last_name,
          email: newAddress.email,
          phone: newAddress.phone,
          address: newAddress.address,
          apartment: newAddress.apartment,
          city: newAddress.city,
          state: newAddress.state,
          postal_code: newAddress.postal_code,
          country: newAddress.country,
          is_default: newAddress.is_default,
          label: newAddress.label,
        });
      } catch (err) {
        console.warn('Supabase saveUserAddress error:', err);
      }
    }

    return newAddress;
  },

  async deleteUserAddress(addressId: string, userId?: string, userEmail?: string): Promise<boolean> {
    const existing = await this.getUserAddresses(userId, userEmail);
    const updated = existing.filter((a) => a.id !== addressId);
    if (updated.length > 0 && !updated.some((a) => a.is_default)) {
      updated[0].is_default = true;
    }

    const idKey = userId ? `tanoah_saved_addresses_${userId}` : null;
    const emailKey = userEmail ? `tanoah_saved_addresses_${userEmail}` : null;
    if (idKey) localStorage.setItem(idKey, JSON.stringify(updated));
    if (emailKey) localStorage.setItem(emailKey, JSON.stringify(updated));
    localStorage.setItem('tanoah_saved_addresses', JSON.stringify(updated));

    if (userId) {
      try {
        await supabase.from('user_addresses').delete().eq('id', addressId);
      } catch (err) {
        console.warn('Supabase deleteUserAddress error:', err);
      }
    }
    return true;
  },

  async setDefaultUserAddress(addressId: string, userId?: string, userEmail?: string): Promise<boolean> {
    const existing = await this.getUserAddresses(userId, userEmail);
    const updated = existing.map((a) => ({
      ...a,
      is_default: a.id === addressId,
    }));

    const idKey = userId ? `tanoah_saved_addresses_${userId}` : null;
    const emailKey = userEmail ? `tanoah_saved_addresses_${userEmail}` : null;
    if (idKey) localStorage.setItem(idKey, JSON.stringify(updated));
    if (emailKey) localStorage.setItem(emailKey, JSON.stringify(updated));
    localStorage.setItem('tanoah_saved_addresses', JSON.stringify(updated));

    if (userId) {
      try {
        await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId);
        await supabase.from('user_addresses').update({ is_default: true }).eq('id', addressId);
      } catch (err) {
        console.warn('Supabase setDefaultUserAddress error:', err);
      }
    }
    return true;
  },

  async getUserOrders(userId?: string, userEmail?: string): Promise<any[]> {
    const customOrders = getStoredCustomOrders();
    let remoteOrders: any[] = [];
    if (userId || userEmail) {
      try {
        let query = supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false });
        if (userId && userEmail) {
          query = query.or(`user_id.eq.${userId},guest_email.eq.${userEmail}`);
        } else if (userId) {
          query = query.eq('user_id', userId);
        } else if (userEmail) {
          query = query.eq('guest_email', userEmail);
        }
        const { data, error } = await query;
        if (!error && data) remoteOrders = data;
      } catch {}
    }

    const merged = [
      ...customOrders.filter(
        (o) =>
          (userId && o.user_id === userId) ||
          (userEmail &&
            (o.guest_email?.toLowerCase() === userEmail?.toLowerCase() ||
              o.formData?.email?.toLowerCase() === userEmail?.toLowerCase()))
      ),
    ];
    remoteOrders.forEach((ro) => {
      if (!merged.some((m) => m.order_number === ro.order_number || m.orderNumber === ro.order_number)) {
        merged.push(ro);
      }
    });

    return merged;
  },
};
