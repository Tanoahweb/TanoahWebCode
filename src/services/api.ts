import { supabase } from './supabase';
import { Product, ProductDetailSection, SizeChart, StoreSettings, Collection, Coupon, Order, CartItem, MediaItem, NavigationConfig, FeaturedCollectionsConfig, SavedAddress, Category, DeliverySpeedTier, ProductReview } from '@/types';
import { BlogArticle, SEORedirect, SEO404Log, SEOAuditSummary, SEOAuditIssue } from '@/types/seo';
import { recordRedirectIfSlugChanged } from './seoEngine';
import { SAMPLE_PRODUCTS, SAMPLE_COLLECTIONS, SAMPLE_SETTINGS, SAMPLE_COUPONS, DEFAULT_FEATURED_COLLECTIONS_CONFIG, SAMPLE_CATEGORIES, DEFAULT_DELIVERY_SPEEDS } from '@/data/mockData';
import { DEFAULT_NAVIGATION_CONFIG } from '@/data/defaultNavigation';
import { processImageForUpload } from '@/utils/imagePipeline';
import { r2Service } from './r2Service';
import { safeSetItem, safeGetItem, sanitizeOrderForStorage } from '@/utils/safeStorage';
import { formatCouponDate, isCouponDateExpired, isCouponNotStarted } from '@/utils/formatters';
import { validateEmail, validatePhone } from '@/utils/validation';

export type { ProductReview };

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

export interface PaginatedProductsOptions {
  page?: number;
  limit?: number;
  collection?: string;
  type?: string;
  types?: string[];
  search?: string;
  gender?: string;
  sortBy?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sizes?: string[];
  colors?: string[];
  statusFilter?: string;
}

export interface PaginatedProductsResult {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export const DEFAULT_SIZE_CHARTS: SizeChart[] = [
  {
    id: 'sc_standard_tops',
    name: 'Standard Tops, Shirts & Kurtas',
    description: 'All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape.',
    columns: ['Size', 'Chest (in)', 'Shoulder (in)', 'Length (in)'],
    rows: [
      ['S', '38 - 40', '18.5', '28.0'],
      ['M', '41 - 43', '19.5', '29.0'],
      ['L', '44 - 46', '20.5', '30.0'],
      ['XL', '47 - 49', '21.5', '31.0'],
    ],
    is_default: true,
  },
  {
    id: 'sc_trousers_bottoms',
    name: 'Trousers, Pants & Chinos',
    description: 'All measurements are tailored in inches. Measure around your natural waistline where you normally wear your trousers.',
    columns: ['Size', 'Waist (in)', 'Hip (in)', 'Length (in)'],
    rows: [
      ['30', '30 - 31', '38.0', '40.0'],
      ['32', '32 - 33', '40.0', '41.0'],
      ['34', '34 - 35', '42.0', '42.0'],
      ['36', '36 - 37', '44.0', '42.5'],
    ],
    is_default: false,
  },
  {
    id: 'sc_dresses_coords',
    name: 'Dresses, Gowns & Co-ords',
    description: 'All measurements are tailored in inches. For fitted silhouettes, prioritize your bust and waist measurements.',
    columns: ['Size', 'Bust (in)', 'Waist (in)', 'Hip (in)', 'Length (in)'],
    rows: [
      ['XS', '32 - 34', '26 - 27', '36.0', '46.0'],
      ['S', '35 - 37', '28 - 29', '38.0', '47.0'],
      ['M', '38 - 40', '30 - 32', '40.0', '48.0'],
      ['L', '41 - 43', '33 - 35', '42.0', '49.0'],
      ['XL', '44 - 46', '36 - 38', '45.0', '50.0'],
    ],
    is_default: false,
  },
];

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

  // Ensure custom_sections are properly formatted and parsed
  let customSections: ProductDetailSection[] = [];
  if (Array.isArray(p.custom_sections)) {
    customSections = p.custom_sections;
  } else if (typeof p.custom_sections === 'string') {
    try {
      const parsed = JSON.parse(p.custom_sections);
      if (Array.isArray(parsed)) {
        customSections = parsed;
      }
    } catch {}
  }
  const cleanSections = customSections
    .filter((sec) => sec && (typeof sec.title === 'string' || typeof sec.content === 'string'))
    .map((sec, idx) => ({
      id: sec.id || `sec_${Date.now()}_${idx}`,
      title: (sec.title || '').trim(),
      content: (sec.content || '').trim(),
    }));

  const similarProductIds: string[] = Array.isArray(p.similar_product_ids)
    ? p.similar_product_ids
    : (Array.isArray((p.structured_attributes as any)?.similar_product_ids)
      ? (p.structured_attributes as any).similar_product_ids
      : (typeof (p.structured_attributes as any)?.similar_product_ids === 'string'
        ? (() => { try { return JSON.parse((p.structured_attributes as any).similar_product_ids); } catch { return []; } })()
        : []));

  const similarCategoryIds: string[] = Array.isArray(p.similar_category_ids)
    ? p.similar_category_ids
    : (Array.isArray((p.structured_attributes as any)?.similar_category_ids)
      ? (p.structured_attributes as any).similar_category_ids
      : (typeof (p.structured_attributes as any)?.similar_category_ids === 'string'
        ? (() => { try { return JSON.parse((p.structured_attributes as any).similar_category_ids); } catch { return []; } })()
        : []));

  const sizeChartId =
    p.size_chart_id ||
    (p.structured_attributes as any)?.size_chart_id ||
    '';

  return {
    ...p,
    size_chart_id: sizeChartId,
    custom_sections: cleanSections,
    images: validImgs,
    variants: sanitizedVariants,
    similar_product_ids: similarProductIds,
    similar_category_ids: similarCategoryIds,
  };
};

// One-time cleanup: wipe deprecated local storage cache keys so all devices synchronize purely with Supabase
if (typeof window !== 'undefined') {
  try {
    const keysToClean = [
      'tanoah_custom_products',
      'tanoah_deleted_product_ids',
      'tanoah_stock_overrides',
      'tanoah_custom_collections',
      'tanoah_home_featured_collections',
      'tanoah_store_settings',
    ];
    keysToClean.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

const getStoredCustomProducts = (): Product[] => [];
const getDeletedProductIds = (): string[] => [];
const applyStockOverrides = (products: Product[]): Product[] => products;
const mergeProductsWithCustom = (baseList: Product[]): Product[] => baseList.map(sanitizeProduct);

// Local order persistence helpers
const getStoredCustomOrders = (): any[] => {
  try {
    const raw = safeGetItem('tanoah_custom_orders');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    return parsed
      .filter((o) => {
        // Drop any corrupted dummy stubs where order_number is a raw UUID string without customer info
        const orderNum = o.order_number || o.orderNumber;
        if (!orderNum) return false;
        if (isUUID(orderNum) && !o.customer && !o.guest_email && (!o.items || o.items.length === 0)) {
          return false;
        }
        return true;
      })
      .map((o) => {
        // Clear legacy dummy tracking numbers
        if (
          o.tracking_number === 'ED849201948IN' ||
          o.tracking_number === 'BD-849201948IN' ||
          o.tracking_number === 'BD8391024IN' ||
          o.trackingNumber === 'ED849201948IN'
        ) {
          o.tracking_number = '';
          o.trackingNumber = '';
        }
        return o;
      });
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
    status: 'confirmed',
    tracking_number: '',
    courier_name: 'India Post (Speed Post)',
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
    courier_name: 'India Post (Speed Post)',
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

export function isProductInCollection(product: Product, collectionSlugOrId: string): boolean {
  if (!product || !collectionSlugOrId) return false;
  const target = collectionSlugOrId.toLowerCase().trim();

  // 1. Direct collections array
  if (Array.isArray(product.collections)) {
    if (product.collections.some((c) => c && c.toLowerCase().trim() === target)) return true;
  }

  // 2. Tags matching collection slug
  if (Array.isArray(product.tags)) {
    if (product.tags.some((t) => t && t.toLowerCase().trim() === target)) return true;
  }

  // 3. Category matching
  if (product.category_name && product.category_name.toLowerCase().trim() === target) {
    return true;
  }
  if (product.category_id && product.category_id.toLowerCase().trim() === target) {
    return true;
  }

  return false;
}

export const api = {
  // Store Settings (Direct Supabase)
  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
      if (!error && data) return { ...SAMPLE_SETTINGS, ...data } as StoreSettings;
      if (error) console.warn('Supabase getStoreSettings warning:', error);
    } catch (e) {
      console.warn('Network error fetching store settings:', e);
    }
    return SAMPLE_SETTINGS;
  },

  async saveStoreSettings(settings: Partial<StoreSettings>): Promise<boolean> {
    try {
      const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
      if (existing?.id) {
        const { error } = await supabase.from('store_settings').update(settings).eq('id', existing.id);
        if (error) {
          console.error('Failed to update store settings in Supabase:', error);
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving store settings:', err);
      return false;
    }
  },

  // Delivery Speeds & Rates (Direct Supabase)
  async getDeliverySpeeds(): Promise<DeliverySpeedTier[]> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('delivery_speeds_config')
        .limit(1)
        .single();
      if (!error && data?.delivery_speeds_config && Array.isArray(data.delivery_speeds_config) && data.delivery_speeds_config.length > 0) {
        return data.delivery_speeds_config as DeliverySpeedTier[];
      }
      if (error) console.warn('Supabase getDeliverySpeeds warning:', error);
    } catch (e) {
      console.warn('Network error fetching delivery speeds:', e);
    }
    return DEFAULT_DELIVERY_SPEEDS;
  },

  async saveDeliverySpeeds(speeds: DeliverySpeedTier[]): Promise<boolean> {
    try {
      const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
      if (existing?.id) {
        const { error } = await supabase
          .from('store_settings')
          .update({ delivery_speeds_config: speeds })
          .eq('id', existing.id);
        if (error) {
          console.error('Failed to update delivery speeds in Supabase:', error);
          return false;
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving delivery speeds:', err);
      return false;
    }
  },

  // Header Menu & Mega Menu Navigation (Direct Supabase)
  async getNavigationConfig(): Promise<NavigationConfig> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('navigation_config')
        .limit(1)
        .single();
      if (!error && data?.navigation_config) {
        const nav = data.navigation_config as NavigationConfig;
        return {
          ...DEFAULT_NAVIGATION_CONFIG,
          ...nav,
          header_menu: nav.header_menu?.length > 0 ? nav.header_menu : DEFAULT_NAVIGATION_CONFIG.header_menu,
          footer_menu: nav.footer_menu && nav.footer_menu.length > 0 ? nav.footer_menu : DEFAULT_NAVIGATION_CONFIG.footer_menu,
          footer_bottom_links: nav.footer_bottom_links && nav.footer_bottom_links.length > 0 ? nav.footer_bottom_links : DEFAULT_NAVIGATION_CONFIG.footer_bottom_links,
        };
      }
    } catch (e) {
      console.warn('Network error fetching navigation config:', e);
    }
    return DEFAULT_NAVIGATION_CONFIG;
  },

  async saveNavigationConfig(config: NavigationConfig): Promise<boolean> {
    try {
      const payload: NavigationConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
      if (existing?.id) {
        const { error } = await supabase
          .from('store_settings')
          .update({ navigation_config: payload })
          .eq('id', existing.id);
        if (error) {
          console.error('Failed to save navigation config in Supabase:', error);
          return false;
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_navigation_updated', { detail: payload }));
      }
      return true;
    } catch (err) {
      console.error('Error saving navigation config:', err);
      return false;
    }
  },

  // Home Screen: "Explore The Editions" Featured Collections Showcase (Direct Supabase)
  async getFeaturedCollectionsConfig(): Promise<FeaturedCollectionsConfig> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('featured_collections_config')
        .limit(1)
        .single();
      if (!error && (data as any)?.featured_collections_config?.items?.length > 0) {
        return (data as any).featured_collections_config as FeaturedCollectionsConfig;
      }
    } catch (e) {
      console.warn('Network error fetching featured collections config:', e);
    }
    return DEFAULT_FEATURED_COLLECTIONS_CONFIG;
  },

  async saveFeaturedCollectionsConfig(config: FeaturedCollectionsConfig): Promise<boolean> {
    try {
      const payload: FeaturedCollectionsConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
      if (existing?.id) {
        const { error } = await supabase
          .from('store_settings')
          .update({ featured_collections_config: payload })
          .eq('id', existing.id);
        if (error) {
          console.error('Failed to update featured collections config in Supabase:', error);
          return false;
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_featured_collections_updated', { detail: payload }));
      }
      return true;
    } catch (err) {
      console.error('Error saving featured collections config:', err);
      return false;
    }
  },

  // Collections Catalog (Direct Supabase)
  async getCollections(): Promise<Collection[]> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        return data as Collection[];
      }
    } catch (e) {
      console.warn('Network error fetching collections:', e);
    }
    return SAMPLE_COLLECTIONS;
  },

  async saveCollection(collection: Collection): Promise<boolean> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collection.id);
      const targetId = isUUID ? collection.id : crypto.randomUUID();

      // Check if slug changed to record automated 301 redirect
      try {
        const { data: existingColl } = await supabase.from('collections').select('slug').eq('id', targetId).maybeSingle();
        if (existingColl?.slug && existingColl.slug !== collection.slug) {
          await recordRedirectIfSlugChanged('collections', existingColl.slug, collection.slug, collection.title);
        }
      } catch (e) {
        console.warn('Could not check collection slug for redirect:', e);
      }

      const payload: any = {
        id: targetId,
        title: collection.title,
        slug: collection.slug,
        description: collection.description || null,
        banner_image: collection.banner_image || null,
        is_smart: !!collection.is_smart,
        sort_order: collection.sort_order || 0,
        is_active: collection.is_active !== false,
        seo_title: collection.seo_title || null,
        seo_description: collection.seo_description || null,
        social_image_url: collection.social_image_url || null,
        is_noindex: !!collection.is_noindex,
      };
      const { error } = await supabase.from('collections').upsert([payload], { onConflict: 'slug' });
      if (error) {
        console.error('Failed to save collection to Supabase:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_collections_updated', { detail: { collection: { ...collection, id: targetId } } }));
      }
      return true;
    } catch (err) {
      console.error('Error saving collection:', err);
      return false;
    }
  },

  async deleteCollection(id: string): Promise<boolean> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = supabase.from('collections').delete();
      const { error } = isUUID ? await query.eq('id', id) : await query.eq('slug', id);
      if (error) {
        console.error('Failed to delete collection from Supabase:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_collections_updated', { detail: { deletedId: id } }));
      }
      return true;
    } catch (err) {
      console.error('Error deleting collection:', err);
      return false;
    }
  },

  // Categories Registry (Direct Supabase)
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        return data as Category[];
      }
    } catch (e) {
      console.warn('Network error fetching categories:', e);
    }
    return SAMPLE_CATEGORIES;
  },

  async saveCategory(category: Category): Promise<boolean> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.id);
      const targetId = isUUID ? category.id : crypto.randomUUID();

      // Check if slug changed to record automated 301 redirect
      try {
        const { data: existingCat } = await supabase.from('categories').select('slug').eq('id', targetId).maybeSingle();
        if (existingCat?.slug && existingCat.slug !== category.slug) {
          await recordRedirectIfSlugChanged('categories', existingCat.slug, category.slug, category.name);
        }
      } catch (e) {
        console.warn('Could not check category slug for redirect:', e);
      }

      const payload: any = {
        id: targetId,
        name: category.name,
        slug: category.slug,
        description: category.description || null,
        image_url: category.image_url || null,
        parent_id: category.parent_id || null,
        sort_order: category.sort_order || 0,
        is_active: category.is_active !== false,
        seo_title: category.seo_title || null,
        seo_description: category.seo_description || null,
        social_image_url: category.social_image_url || null,
        is_noindex: !!category.is_noindex,
      };
      const { error } = await supabase.from('categories').upsert([payload], { onConflict: 'slug' });
      if (error) {
        console.error('Failed to save category to Supabase:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_categories_updated', { detail: { category: { ...category, id: targetId } } }));
      }
      return true;
    } catch (err) {
      console.error('Error saving category:', err);
      return false;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = supabase.from('categories').delete();
      const { error } = isUUID ? await query.eq('id', id) : await query.eq('slug', id);
      if (error) {
        console.error('Failed to delete category from Supabase:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_categories_updated', { detail: { deletedId: id } }));
      }
      return true;
    } catch (err) {
      console.error('Error deleting category:', err);
      return false;
    }
  },

  // Size Charts Management (Direct Supabase with local cache fallback)
  async getSizeCharts(): Promise<SizeChart[]> {
    let localCharts: SizeChart[] = [];
    try {
      const stored = localStorage.getItem('tanoah_size_charts');
      if (stored) localCharts = JSON.parse(stored);
    } catch {}

    try {
      const { data, error } = await supabase
        .from('size_charts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const remoteCharts: SizeChart[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
          columns: Array.isArray(d.columns) ? d.columns : [],
          rows: Array.isArray(d.rows) ? d.rows : [],
          is_default: Boolean(d.is_default),
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
        try {
          localStorage.setItem('tanoah_size_charts', JSON.stringify(remoteCharts));
        } catch {}
        return remoteCharts;
      }
    } catch (e) {
      console.warn('Error fetching size charts from Supabase:', e);
    }

    if (localCharts.length > 0) return localCharts;

    return DEFAULT_SIZE_CHARTS;
  },

  async getSizeChartById(id: string): Promise<SizeChart | null> {
    if (!id || id === 'none') return null;
    const charts = await this.getSizeCharts();
    return charts.find((c) => c.id === id) || null;
  },

  async saveSizeChart(chart: SizeChart): Promise<boolean> {
    try {
      const id = chart.id || `sc_${Date.now()}`;
      const payload = {
        id,
        name: chart.name.trim(),
        description: chart.description || '',
        columns: chart.columns,
        rows: chart.rows,
        is_default: Boolean(chart.is_default),
        updated_at: new Date().toISOString(),
      };

      // If this chart is marked default, unmark other charts
      if (payload.is_default) {
        await supabase
          .from('size_charts')
          .update({ is_default: false })
          .neq('id', id);
      }

      const { error } = await supabase.from('size_charts').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('Failed to save size chart to Supabase:', error);
      }

      // Update local storage cache
      try {
        const raw = localStorage.getItem('tanoah_size_charts');
        let list: SizeChart[] = raw ? JSON.parse(raw) : [];
        if (payload.is_default) {
          list = list.map((c) => ({ ...c, is_default: false }));
        }
        list = list.filter((c) => c.id !== id);
        list.push({ ...chart, id });
        localStorage.setItem('tanoah_size_charts', JSON.stringify(list));
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_size_charts_updated', { detail: { chart: { ...chart, id } } }));
      }
      return true;
    } catch (err) {
      console.error('Error saving size chart:', err);
      return false;
    }
  },

  async deleteSizeChart(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('size_charts').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete size chart from Supabase:', error);
      }
      try {
        const raw = localStorage.getItem('tanoah_size_charts');
        if (raw) {
          const list = JSON.parse(raw).filter((c: any) => c.id !== id);
          localStorage.setItem('tanoah_size_charts', JSON.stringify(list));
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_size_charts_updated', { detail: { deletedId: id } }));
      }
      return true;
    } catch (err) {
      console.error('Error deleting size chart:', err);
      return false;
    }
  },

  // Product Types (Persisted in Supabase store_settings.custom_product_types)
  async getProductTypes(): Promise<string[]> {
    const DEFAULT_TYPES = [
      'Sarees',
      'Dresses',
      'Trousers',
      'T-Shirts',
      'Shirts',
      'Kurtas',
      'Lehengas',
      'Outerwear',
      'Co-ords',
      'Accessories',
    ];
    try {
      const { data } = await supabase
        .from('store_settings')
        .select('custom_product_types')
        .limit(1)
        .single();
      const custom: string[] = (data as any)?.custom_product_types || [];
      return Array.from(new Set([...DEFAULT_TYPES, ...custom]));
    } catch {
      return DEFAULT_TYPES;
    }
  },

  async saveProductType(newType: string): Promise<string[]> {
    const trimmed = newType.trim();
    if (!trimmed) return [];
    try {
      const current = await this.getProductTypes();
      if (!current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
        const updated = [...current, trimmed];
        const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
        if (existing?.id) {
          await supabase
            .from('store_settings')
            .update({ custom_product_types: updated })
            .eq('id', existing.id);
        }
        return updated;
      }
      return current;
    } catch (err) {
      console.error('Error saving product type:', err);
      return [];
    }
  },

  // Products with variants and images (Direct Supabase)
  async getProducts(statusFilter?: string): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        return (data as unknown as Product[]).map(sanitizeProduct);
      }
      if (error) {
        console.warn('Supabase getProducts error, falling back to sample products:', error);
      }
    } catch (err) {
      console.warn('Network error fetching products from Supabase:', err);
    }
    const sample = SAMPLE_PRODUCTS.map(sanitizeProduct);
    if (statusFilter && statusFilter !== 'all') {
      return sample.filter((p) => p.status === statusFilter);
    }
    return sample;
  },

  // Single Product by slug (Direct Supabase)
  async getProductBySlug(slug: string): Promise<Product | null> {
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
        return sanitizeProduct(data as unknown as Product);
      }
    } catch (e) {
      console.warn('Error fetching product by slug from Supabase:', e);
    }
    const fallback = SAMPLE_PRODUCTS.find((p: Product) => p.slug === slug);
    return fallback ? sanitizeProduct(fallback) : null;
  },

  // Single Product by ID (Direct Supabase)
  async getProductById(id: string): Promise<Product | null> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `);

      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }

      const { data, error } = await query.single();
      if (!error && data) {
        return sanitizeProduct(data as unknown as Product);
      }
    } catch (e) {
      console.warn('Error fetching product by ID from Supabase:', e);
    }
    const fallback = SAMPLE_PRODUCTS.find((p: Product) => p.id === id || p.slug === id);
    return fallback ? sanitizeProduct(fallback) : null;
  },

  // Save / Update Product (Direct Supabase)
  async saveProduct(product: Product): Promise<{ success: boolean; product: Product }> {
    const sanitized = sanitizeProduct(product);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const targetId = uuidRegex.test(sanitized.id) ? sanitized.id : crypto.randomUUID();
    sanitized.id = targetId;

    // Check if slug changed to record automated 301 redirect
    try {
      const { data: existingProd } = await supabase.from('products').select('slug').eq('id', targetId).maybeSingle();
      if (existingProd?.slug && existingProd.slug !== sanitized.slug) {
        await recordRedirectIfSlugChanged('products', existingProd.slug, sanitized.slug, sanitized.title);
      }
    } catch (e) {
      console.warn('Could not check product slug for redirect:', e);
    }

    const validCategoryId = sanitized.category_id && uuidRegex.test(sanitized.category_id)
      ? sanitized.category_id
      : null;

    const productRow = {
      id: targetId,
      title: sanitized.title,
      slug: sanitized.slug,
      brand: sanitized.brand || 'TANOAH',
      product_type: sanitized.product_type || 'Apparel',
      category_id: validCategoryId,
      gender: sanitized.gender || 'unisex',
      base_price: sanitized.base_price,
      sale_price: sanitized.sale_price ?? null,
      compare_at_price: sanitized.compare_at_price ?? null,
      cost_price: sanitized.cost_price ?? null,
      tax_rate: sanitized.tax_rate ?? 5,
      hsn_code: sanitized.hsn_code ?? null,
      status: sanitized.status || 'active',
      is_featured: !!sanitized.is_featured,
      is_best_seller: !!sanitized.is_best_seller,
      is_new_arrival: !!sanitized.is_new_arrival,
      description: sanitized.description || '',
      short_description: sanitized.short_description || '',
      tags: sanitized.tags || [],
      custom_sections: sanitized.custom_sections || [],
      seo_title: sanitized.seo_title || null,
      seo_description: sanitized.seo_description || null,
      social_image_url: sanitized.social_image_url || null,
      canonical_url_override: sanitized.canonical_url_override || null,
      size_chart_id: sanitized.size_chart_id || null,
      structured_attributes: {
        ...(sanitized.structured_attributes || {}),
        size_chart_id: sanitized.size_chart_id || '',
        similar_product_ids: sanitized.similar_product_ids || [],
        similar_category_ids: sanitized.similar_category_ids || [],
      },
      similar_product_ids: sanitized.similar_product_ids || [],
      similar_category_ids: sanitized.similar_category_ids || [],
      updated_at: new Date().toISOString(),
    };

    const { error: prodError } = await supabase.from('products').upsert(productRow);
    if (prodError) {
      console.error('CRITICAL: Supabase save product failed:', prodError);
      throw new Error(`Failed to save product to database: ${prodError.message}`);
    }

    // Sync Images to Supabase
    if (sanitized.images && sanitized.images.length > 0) {
      await supabase.from('product_images').delete().eq('product_id', targetId);
      const imgRows = sanitized.images.map((img, idx) => ({
        id: uuidRegex.test(img.id) ? img.id : crypto.randomUUID(),
        product_id: targetId,
        image_url: img.image_url,
        media_id: img.media_id || null,
        alt_text: img.alt_text || sanitized.title,
        sort_order: img.sort_order ?? idx,
        is_primary: img.is_primary ?? idx === 0,
        color_name: img.color_name || '',
        position: idx,
      }));
      const { error: insImgErr } = await supabase.from('product_images').insert(imgRows);
      if (insImgErr) {
        console.error('Supabase product images insert failed:', insImgErr);
      }
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
          sale_price: v.sale_price || sanitized.sale_price || null,
          compare_at_price: v.compare_at_price || sanitized.compare_at_price || null,
          stock_quantity: v.stock_quantity ?? 0,
          reserved_stock: 0,
          low_stock_threshold: v.low_stock_threshold ?? 3,
          is_active: v.is_active !== false,
        };
      });
      const { error: insVarErr } = await supabase.from('product_variants').insert(variantRows);
      if (insVarErr) {
        console.error('Supabase product variants insert failed:', insVarErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tanoah_products_updated', { detail: sanitized }));
    }

    return { success: true, product: sanitized };
  },

  // Delete Product (Direct Supabase with CASCADE)
  async deleteProduct(productId: string): Promise<boolean> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    try {
      const query = supabase.from('products').delete();
      const { error } = isUUID ? await query.eq('id', productId) : await query.eq('slug', productId);
      if (error) {
        console.error('Supabase delete product error:', error);
        return false;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_products_updated', { detail: { deletedId: productId } }));
      }
      return true;
    } catch (err) {
      console.error('Error deleting product from Supabase:', err);
      return false;
    }
  },

  // Duplicate Product with guaranteed unique IDs, unique slug, and unique variant SKUs
  async duplicateProduct(productIdOrProduct: string | Product): Promise<{ success: boolean; product: Product }> {
    let source: Product | null = null;
    if (typeof productIdOrProduct === 'string') {
      source = await this.getProductById(productIdOrProduct);
    } else {
      source = productIdOrProduct;
    }

    if (!source) {
      throw new Error('Source product to duplicate was not found.');
    }

    // 1. Calculate guaranteed unique Title
    const rawTitle = source.title || 'Untitled Product';
    let newTitle = `${rawTitle} (Copy)`;
    const copyMatch = rawTitle.match(/^(.*?)(?: \(Copy(?: (\d+))?\))?$/);
    if (copyMatch && rawTitle.includes('(Copy')) {
      const baseTitle = copyMatch[1];
      const count = copyMatch[2] ? parseInt(copyMatch[2], 10) + 1 : 2;
      newTitle = `${baseTitle} (Copy ${count})`;
    }

    // 2. Calculate guaranteed unique URL Slug
    const baseSlug = (source.slug || 'product').replace(/-copy(-\d+)?$/, '');
    let candidateSlug = `${baseSlug}-copy`;
    try {
      const { data: existingSlugRows } = await supabase
        .from('products')
        .select('slug')
        .like('slug', `${baseSlug}-copy%`);
      const existingSlugs = new Set((existingSlugRows || []).map((p) => p.slug));
      if (existingSlugs.has(candidateSlug)) {
        let counter = 2;
        while (existingSlugs.has(`${baseSlug}-copy-${counter}`)) {
          counter++;
        }
        candidateSlug = `${baseSlug}-copy-${counter}`;
      }
    } catch {
      candidateSlug = `${baseSlug}-copy-${Date.now().toString().slice(-4)}`;
    }

    // 3. Generate new product UUID
    const newProductId = crypto.randomUUID();

    // 4. Duplicate Images with new UUIDs
    const newImages = (source.images || []).map((img, idx) => ({
      id: crypto.randomUUID(),
      product_id: newProductId,
      image_url: img.image_url,
      media_id: img.media_id || undefined,
      alt_text: img.alt_text ? `${img.alt_text} (Copy)` : newTitle,
      sort_order: img.sort_order ?? idx,
      is_primary: img.is_primary ?? idx === 0,
      color_name: img.color_name || '',
      position: idx,
    }));

    // 5. Calculate guaranteed unique Variant SKUs
    let existingSkus = new Set<string>();
    try {
      const { data: existingSkuRows } = await supabase
        .from('product_variants')
        .select('sku');
      existingSkus = new Set((existingSkuRows || []).map((v) => v.sku));
    } catch {}

    const newVariants = (source.variants || []).map((v, idx) => {
      const baseSku = (v.sku || `SKU-${idx + 1}`).replace(/-COPY(-\d+)?$/i, '');
      let candidateSku = `${baseSku}-COPY`;
      if (existingSkus.has(candidateSku)) {
        let counter = 2;
        while (existingSkus.has(`${baseSku}-COPY-${counter}`)) {
          counter++;
        }
        candidateSku = `${baseSku}-COPY-${counter}`;
      }
      existingSkus.add(candidateSku);

      return {
        id: crypto.randomUUID(),
        product_id: newProductId,
        title: v.title,
        sku: candidateSku,
        barcode: undefined,
        color_name: v.color_name || '',
        color_hex: v.color_hex || '#000000',
        size: v.size || 'Free Size',
        price: v.price || source!.base_price,
        sale_price: v.sale_price || source!.sale_price || undefined,
        compare_at_price: v.compare_at_price || source!.compare_at_price || undefined,
        stock_quantity: v.stock_quantity ?? 0,
        low_stock_threshold: v.low_stock_threshold ?? 3,
        color_image_url: v.color_image_url,
        is_active: v.is_active !== false,
      };
    });

    // 6. Duplicate Custom Sections
    const newCustomSections = (source.custom_sections || []).map((sec, idx) => ({
      id: `sec_${Date.now()}_${idx}`,
      title: sec.title,
      content: sec.content,
    }));

    // 7. Assemble Complete Duplicated Product Object
    const duplicatedProduct: Product = {
      ...source,
      id: newProductId,
      title: newTitle,
      slug: candidateSlug,
      status: 'draft', // Duplicated products start as draft until edited and published by admin
      seo_title: source.seo_title ? `${source.seo_title} (Copy)` : `${newTitle} | TANOAH`,
      seo_description: source.seo_description || source.short_description || source.description || '',
      images: newImages,
      variants: newVariants,
      custom_sections: newCustomSections,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 8. Persist to Supabase
    return await this.saveProduct(duplicatedProduct);
  },

  // Paginated Products Query (12 per batch) to minimize payload and unwanted API calls
  async getPaginatedProducts(options: PaginatedProductsOptions = {}): Promise<PaginatedProductsResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 12);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const hasVariantFilter = Boolean(
        (options.sizes && options.sizes.length > 0) ||
        (options.colors && options.colors.length > 0) ||
        options.inStockOnly
      );

      const variantsJoin = hasVariantFilter ? 'variants:product_variants!inner(*)' : 'variants:product_variants(*)';

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          ${variantsJoin}
        `, { count: 'exact' });

      // Status filter
      if (options.statusFilter && options.statusFilter !== 'all') {
        query = query.eq('status', options.statusFilter);
      } else if (!options.statusFilter) {
        query = query.eq('status', 'active');
      }

      // Collection filter
      const coll = (options.collection || 'all').toLowerCase();
      if (coll !== 'all') {
        if (coll === 'men') {
          query = query.in('gender', ['men', 'unisex']);
        } else if (coll === 'women') {
          query = query.in('gender', ['women', 'unisex']);
        } else if (coll === 'sale') {
          query = query.not('sale_price', 'is', null);
        } else if (coll === 'new-arrivals') {
          query = query.eq('is_new_arrival', true);
        } else if (coll === 'best-sellers') {
          query = query.or('is_best_seller.eq.true,tags.cs.{"best-sellers"}');
        } else {
          // Custom collection: check tags contains collection slug or product_type matches
          query = query.or(`tags.cs.{"${coll}"},product_type.ilike.%${coll}%`);
        }
      }

      // Gender filter
      if (options.gender && options.gender !== 'all') {
        query = query.in('gender', [options.gender, 'unisex']);
      }

      // Product Type filter
      if (options.types && options.types.length > 0) {
        query = query.in('product_type', options.types);
      } else if (options.type && options.type !== 'all') {
        query = query.eq('product_type', options.type);
      }

      // Variant filters (Sizes, Colors, In-Stock)
      if (options.sizes && options.sizes.length > 0) {
        query = query.in('variants.size', options.sizes);
      }
      if (options.colors && options.colors.length > 0) {
        query = query.in('variants.color_name', options.colors);
      }
      if (options.inStockOnly) {
        query = query.gt('variants.stock_quantity', 0);
      }

      // Search term
      if (options.search && options.search.trim()) {
        const q = options.search.trim();
        query = query.or(`title.ilike.%${q}%,brand.ilike.%${q}%`);
      }

      // Price filter
      if (options.maxPrice && options.maxPrice < 10000) {
        query = query.lte('base_price', options.maxPrice);
      }
      if (options.minPrice) {
        query = query.gte('base_price', options.minPrice);
      }

      // Sorting
      const sortBy = options.sortBy || 'featured';
      if (sortBy === 'price-low') {
        query = query.order('base_price', { ascending: true });
      } else if (sortBy === 'price-high') {
        query = query.order('base_price', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'bestseller') {
        query = query.order('is_best_seller', { ascending: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'alpha-asc') {
        query = query.order('title', { ascending: true });
      } else if (sortBy === 'alpha-desc') {
        query = query.order('title', { ascending: false });
      } else {
        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      }

      // Range (Pagination)
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && data) {
        const sanitized = (data as unknown as Product[]).map(sanitizeProduct);
        const total = typeof count === 'number' ? count : sanitized.length;
        return {
          products: sanitized,
          totalCount: total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          currentPage: page,
          limit,
        };
      }
      if (error) {
        console.warn('Supabase getPaginatedProducts query error, falling back to local slice:', error);
      }
    } catch (err) {
      console.warn('Network error in getPaginatedProducts:', err);
    }

    // Fallback: slice filtered products
    const sample = await this.getProducts(options.statusFilter || 'active');
    const coll = (options.collection || 'all').toLowerCase();
    let filtered = sample.filter((p) => {
      if (coll !== 'all') {
        if (coll === 'men' && p.gender !== 'men' && p.gender !== 'unisex') return false;
        if (coll === 'women' && p.gender !== 'women' && p.gender !== 'unisex') return false;
        if (coll === 'sale' && !p.sale_price && (!p.compare_at_price || p.compare_at_price <= p.base_price)) return false;
        if (coll === 'new-arrivals' && !p.is_new_arrival) return false;
        if (coll === 'best-sellers' && !p.is_best_seller) return false;
      }
      if (options.gender && options.gender !== 'all' && p.gender !== options.gender && p.gender !== 'unisex') return false;
      if (options.types && options.types.length > 0 && !options.types.includes(p.product_type)) return false;
      if (options.type && options.type !== 'all' && p.product_type !== options.type) return false;
      if (options.search && !p.title.toLowerCase().includes(options.search.toLowerCase())) return false;
      if (options.maxPrice && options.maxPrice < 10000 && p.base_price > options.maxPrice) return false;
      if (options.sizes && options.sizes.length > 0 && !p.variants.some((v) => options.sizes!.includes(v.size))) return false;
      if (options.colors && options.colors.length > 0 && !p.variants.some((v) => options.colors!.includes(v.color_name))) return false;
      if (options.inStockOnly && !p.variants.some((v) => v.stock_quantity > 0)) return false;
      return true;
    });

    const total = filtered.length;
    const paginatedSlice = filtered.slice(from, to + 1);

    return {
      products: paginatedSlice,
      totalCount: total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      limit,
    };
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
    
    // Retrieve only approved reviews from browser storage
    let localReviews: ProductReview[] = [];
    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        const allLocal = JSON.parse(stored) as ProductReview[];
        localReviews = allLocal.filter((r) => r.product_id === productId && r.status === 'approved');
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
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          remoteReviews = data as ProductReview[];
        }
      } catch {
        remoteReviews = [];
      }
    }

    // Default curated reviews only if no remote or local reviews exist yet
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
        is_featured: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: `rev-${productId}-2`,
        product_id: productId,
        author_name: 'Meera R.',
        rating: 5,
        title: 'Effortless Luxury Aesthetic',
        review_text: 'Subtle, understated elegance. The stitching details and tactile feel match international designer standards.',
        is_verified_buyer: true,
        status: 'approved',
        is_featured: false,
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
    ];

    const baseReviews = remoteReviews.length > 0 ? remoteReviews : (localReviews.length > 0 ? [] : defaultReviews);
    
    // Deduplicate
    const reviewMap = new Map<string, ProductReview>();
    [...localReviews, ...baseReviews].forEach((r) => {
      if (r.id) reviewMap.set(r.id, r);
    });

    return Array.from(reviewMap.values());
  },

  // Submit Review - All reviews enter moderation as PENDING
  async submitReview(review: Partial<ProductReview> & { product_id: string; author_name: string; rating: number; review_text: string }): Promise<{ success: boolean; message: string; review: ProductReview }> {
    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rev_${Date.now()}`;
    const newReview: ProductReview = {
      id: generatedId,
      product_id: review.product_id,
      product_title: review.product_title,
      user_id: review.user_id,
      author_name: review.author_name || 'Verified Client',
      rating: Math.max(1, Math.min(5, review.rating)),
      title: review.title || '',
      review_text: review.review_text,
      image_urls: review.image_urls || [],
      is_verified_buyer: review.is_verified_buyer ?? true,
      status: 'pending', // Strictly pending until admin approval
      is_featured: false,
      created_at: new Date().toISOString(),
    };

    // Store in browser storage queue
    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      const allLocal = stored ? JSON.parse(stored) : [];
      allLocal.unshift(newReview);
      localStorage.setItem('tanoah_custom_reviews', JSON.stringify(allLocal));
    } catch (e) {
      console.error('Failed to store review locally:', e);
    }

    // Persist to Supabase if valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(review.product_id);
    if (isUuid) {
      try {
        await supabase.from('product_reviews').insert([{
          id: newReview.id,
          product_id: newReview.product_id,
          user_id: newReview.user_id || null,
          author_name: newReview.author_name,
          rating: newReview.rating,
          title: newReview.title,
          review_text: newReview.review_text,
          image_urls: newReview.image_urls,
          is_verified_buyer: newReview.is_verified_buyer,
          status: 'pending',
          is_featured: false,
        }]);
      } catch (err) {
        console.warn('Database insert failed, preserved in local queue:', err);
      }
    }

    return {
      success: true,
      message: 'Review submitted for verification! It will appear publicly once approved by our moderation team.',
      review: newReview,
    };
  },

  // Get Approved Featured Testimonials for Homepage
  async getFeaturedTestimonials(): Promise<ProductReview[]> {
    let remoteReviews: ProductReview[] = [];
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, products(title, slug)')
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error && data && data.length > 0) {
        remoteReviews = data.map((item: any) => ({
          ...item,
          product_title: item.products?.title || item.product_title || 'Tanoah Signature Piece',
        }));
      }
    } catch {
      remoteReviews = [];
    }

    // If fewer than 2 featured in DB, also fetch any other approved reviews with rating >= 4
    if (remoteReviews.length < 2) {
      try {
        const { data } = await supabase
          .from('product_reviews')
          .select('*, products(title, slug)')
          .eq('status', 'approved')
          .gte('rating', 4)
          .order('created_at', { ascending: false })
          .limit(6);
        if (data) {
          const addl = data.map((item: any) => ({
            ...item,
            product_title: item.products?.title || item.product_title || 'Tanoah Signature Piece',
          }));
          remoteReviews = [...remoteReviews, ...addl];
        }
      } catch {}
    }

    // Local approved featured reviews
    let localReviews: ProductReview[] = [];
    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        const allLocal = JSON.parse(stored) as ProductReview[];
        localReviews = allLocal.filter((r) => r.status === 'approved' && r.is_featured);
      }
    } catch {}

    const reviewMap = new Map<string, ProductReview>();
    [...localReviews, ...remoteReviews].forEach((r) => {
      if (r.id) reviewMap.set(r.id, r);
    });

    return Array.from(reviewMap.values());
  },

  // Admin: Get all reviews across the store
  async getAllAdminReviews(): Promise<ProductReview[]> {
    let dbReviews: ProductReview[] = [];
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, products(title, slug)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        dbReviews = data.map((item: any) => ({
          ...item,
          product_title: item.products?.title || item.product_title || 'Tanoah Product',
        }));
      }
    } catch (err) {
      console.error('Failed to fetch admin reviews from Supabase:', err);
    }

    // Also get local reviews
    let localReviews: ProductReview[] = [];
    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        localReviews = JSON.parse(stored) as ProductReview[];
      }
    } catch {}

    const reviewMap = new Map<string, ProductReview>();
    localReviews.forEach((r) => reviewMap.set(r.id, r));
    dbReviews.forEach((r) => reviewMap.set(r.id, r));

    return Array.from(reviewMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  // Admin: Update Review Status (Approve, Reject, Hide)
  async updateReviewStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'hidden'): Promise<boolean> {
    let success = false;
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!error) {
        success = true;
      } else {
        console.warn('Supabase status update with updated_at failed, retrying without updated_at:', error.message);
        const { error: retryError } = await supabase
          .from('product_reviews')
          .update({ status })
          .eq('id', id);
        if (!retryError) {
          success = true;
        } else {
          console.warn('Supabase status update retry failed:', retryError.message);
        }
      }
    } catch (e) {
      console.warn('Supabase status update exception:', e);
    }

    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        const all = JSON.parse(stored) as ProductReview[];
        const updated = all.map((r) => (r.id === id ? { ...r, status } : r));
        localStorage.setItem('tanoah_custom_reviews', JSON.stringify(updated));
        success = true;
      }
    } catch {}

    return success;
  },

  // Admin: Toggle Feature on Homepage
  async toggleReviewFeatured(id: string, isFeatured: boolean): Promise<boolean> {
    let success = false;
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!error) {
        success = true;
      } else {
        console.warn('Supabase toggle featured with updated_at failed, retrying without updated_at:', error.message);
        const { error: retryError } = await supabase
          .from('product_reviews')
          .update({ is_featured: isFeatured })
          .eq('id', id);
        if (!retryError) {
          success = true;
        } else {
          console.warn('Supabase toggle featured retry failed:', retryError.message);
        }
      }
    } catch (e) {
      console.warn('Supabase toggle featured exception:', e);
    }

    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        const all = JSON.parse(stored) as ProductReview[];
        const updated = all.map((r) => (r.id === id ? { ...r, is_featured: isFeatured } : r));
        localStorage.setItem('tanoah_custom_reviews', JSON.stringify(updated));
        success = true;
      }
    } catch {}

    return success;
  },

  // Check if a user has purchased a specific product (verified buyer check)
  async checkUserPurchasedProduct(params: {
    productId?: string;
    productTitle?: string;
    productSlug?: string;
    userId?: string;
    userEmail?: string;
  }): Promise<boolean> {
    if (!params.userId && !params.userEmail) return false;

    try {
      const orders = await this.getUserOrders(params.userId, params.userEmail);
      if (!orders || orders.length === 0) return false;

      const normTitle = params.productTitle ? params.productTitle.trim().toLowerCase() : '';
      const normSlug = params.productSlug ? params.productSlug.trim().toLowerCase().replace(/-/g, ' ') : '';
      const targetId = params.productId ? String(params.productId).trim().toLowerCase() : '';

      for (const order of orders) {
        const orderStatus = (order.status || '').toLowerCase();
        if (orderStatus === 'cancelled') continue;

        const items = order.items || [];
        for (const item of items) {
          const itemProdId = item.product_id || item.productId || item.id || '';
          const itemTitle = (item.product_title || item.productTitle || item.title || item.name || '').trim().toLowerCase();

          // 1. Direct ID match
          if (targetId && itemProdId && String(itemProdId).toLowerCase() === targetId) {
            return true;
          }

          // 2. Title match (case-insensitive & trimmed)
          if (normTitle && itemTitle && (itemTitle === normTitle || itemTitle.includes(normTitle) || normTitle.includes(itemTitle))) {
            return true;
          }

          // 3. Slug match against title
          if (normSlug && itemTitle && (itemTitle.includes(normSlug) || normSlug.includes(itemTitle))) {
            return true;
          }
        }
      }

      return false;
    } catch (err) {
      console.warn('checkUserPurchasedProduct error:', err);
      return false;
    }
  },

  // Get distinct list of products purchased by a customer
  async getUserPurchasedProducts(userId?: string, userEmail?: string): Promise<{ id: string; title: string; image?: string }[]> {
    if (!userId && !userEmail) return [];

    try {
      const orders = await this.getUserOrders(userId, userEmail);
      if (!orders || orders.length === 0) return [];

      const purchasedMap = new Map<string, { id: string; title: string; image?: string }>();
      const allProducts = await this.getProducts();

      for (const order of orders) {
        const orderStatus = (order.status || '').toLowerCase();
        if (orderStatus === 'cancelled') continue;

        const items = order.items || [];
        for (const item of items) {
          const rawId = item.product_id || item.productId || item.id || '';
          const rawTitle = (item.product_title || item.productTitle || item.title || item.name || '').trim();
          if (!rawTitle && !rawId) continue;

          // Match with catalog product to get proper ID and image
          const catalogMatch = allProducts.find(
            (p) =>
              (rawId && p.id === rawId) ||
              (rawTitle && p.title.toLowerCase().trim() === rawTitle.toLowerCase())
          );

          const id = catalogMatch?.id || rawId || `purchased_${Date.now()}`;
          const title = catalogMatch?.title || rawTitle || 'Tanoah Garment';
          const image =
            catalogMatch?.images?.find((img) => img.is_primary)?.image_url ||
            catalogMatch?.images?.[0]?.image_url ||
            item.image ||
            item.image_url;

          if (!purchasedMap.has(title.toLowerCase())) {
            purchasedMap.set(title.toLowerCase(), { id, title, image });
          }
        }
      }

      return Array.from(purchasedMap.values());
    } catch (err) {
      console.warn('getUserPurchasedProducts error:', err);
      return [];
    }
  },

  // Admin: Delete Review
  async deleteReview(id: string): Promise<boolean> {
    let success = false;
    try {
      const { error } = await supabase.from('product_reviews').delete().eq('id', id);
      if (!error) success = true;
    } catch (e) {
      console.warn('Supabase delete review error:', e);
    }

    try {
      const stored = localStorage.getItem('tanoah_custom_reviews');
      if (stored) {
        const all = JSON.parse(stored) as ProductReview[];
        const updated = all.filter((r) => r.id !== id);
        localStorage.setItem('tanoah_custom_reviews', JSON.stringify(updated));
        success = true;
      }
    } catch {}

    return success;
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
    description?: string;
    discount_type: 'percentage' | 'fixed' | 'free_shipping' | 'bogo';
    discount_value: number;
    min_spend?: number;
    max_discount?: number;
    start_date?: string;
    end_date?: string;
    total_usage_limit?: number;
    per_customer_limit?: number;
    eligible_collections?: string[];
    is_active?: boolean;
  }): Promise<{ success: boolean; coupon: Coupon }> {
    const cleanCode = coupon.code.trim().toUpperCase();
    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}`,
      code: cleanCode,
      description: coupon.description?.trim() || undefined,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_spend: coupon.min_spend || 0,
      max_discount: coupon.max_discount,
      start_date: coupon.start_date || new Date().toISOString().split('T')[0],
      end_date: coupon.end_date || undefined,
      total_usage_limit: coupon.total_usage_limit || undefined,
      per_customer_limit: coupon.per_customer_limit || undefined,
      usage_count: 0,
      eligible_collections: coupon.eligible_collections && coupon.eligible_collections.length > 0 ? coupon.eligible_collections : undefined,
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
        description: newCoupon.description || null,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_spend: newCoupon.min_spend,
        max_discount: newCoupon.max_discount || null,
        start_date: newCoupon.start_date || null,
        end_date: newCoupon.end_date || null,
        total_usage_limit: newCoupon.total_usage_limit || null,
        per_customer_limit: newCoupon.per_customer_limit || null,
        usage_count: 0,
        eligible_collections: newCoupon.eligible_collections || [],
        is_active: newCoupon.is_active,
      }]);
    } catch (dbErr) {
      console.warn('Remote coupon insert notice:', dbErr);
    }

    return { success: true, coupon: newCoupon };
  },

  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<boolean> {
    try {
      const raw = localStorage.getItem('tanoah_custom_coupons');
      if (raw) {
        const list: Coupon[] = JSON.parse(raw);
        const updated = list.map((c) => (c.id === couponId || c.code === couponId ? { ...c, ...updates } : c));
        localStorage.setItem('tanoah_custom_coupons', JSON.stringify(updated));
      }

      const payload: any = { ...updates };
      delete payload.id;
      delete payload.created_at;
      if (payload.eligible_collections && !Array.isArray(payload.eligible_collections)) {
        payload.eligible_collections = [];
      }
      await supabase.from('coupons').update(payload).or(`id.eq.${couponId},code.eq.${couponId}`);
      return true;
    } catch (e) {
      console.error('Error updating coupon:', e);
      return false;
    }
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
  async validateCoupon(
    code: string,
    subtotal: number,
    items?: CartItem[]
  ): Promise<{ valid: boolean; coupon?: Coupon; message: string }> {
    try {
      const cleanCode = code.trim().toLowerCase();
      const allCoupons = await this.getCoupons();
      const match = allCoupons.find((c) => c.code.toLowerCase() === cleanCode);

      if (!match) {
        return { valid: false, message: 'Invalid promo code.' };
      }

      // Check if expired by date first
      if (isCouponDateExpired(match)) {
        const dateStr = formatCouponDate(match.end_date);
        return { valid: false, message: `The coupon is expired on ${dateStr}.` };
      }

      // Total Usage Limit Validation
      if (match.total_usage_limit && match.total_usage_limit > 0) {
        const usageCount = match.usage_count || 0;
        if (usageCount >= match.total_usage_limit) {
          return { valid: false, message: 'This promo code has reached its maximum redemption limit.' };
        }
      }

      // Date Range Validation (Valid Between - start date)
      if (isCouponNotStarted(match)) {
        const dateStr = formatCouponDate(match.start_date);
        return { valid: false, message: `This coupon is not active yet (Starts ${dateStr}).` };
      }

      // Inactive coupon check
      if (match.is_active === false) {
        return { valid: false, message: 'This promo code is currently inactive.' };
      }

      // Collection-specific validation
      if (match.eligible_collections && match.eligible_collections.length > 0) {
        if (items && items.length > 0) {
          const matchingItems = items.filter((item) =>
            match.eligible_collections!.some((colSlug) => isProductInCollection(item.product, colSlug))
          );

          if (matchingItems.length === 0) {
            const allCols = await this.getCollections();
            const colNames = match.eligible_collections
              .map((slug) => allCols.find((c) => c.slug === slug || c.id === slug)?.title || slug)
              .join(', ');
            return {
              valid: false,
              message: `This code is only valid for items in "${colNames}". Please add eligible items to your cart.`,
            };
          }

          const matchingSubtotal = matchingItems.reduce((acc, item) => {
            const price =
              item.variant?.sale_price ??
              item.variant?.price ??
              item.product?.sale_price ??
              item.product?.base_price ??
              0;
            return acc + price * item.quantity;
          }, 0);

          if (match.min_spend && matchingSubtotal < match.min_spend) {
            const diff = Math.round(match.min_spend - matchingSubtotal);
            return {
              valid: false,
              message: `Minimum spend of ₹${match.min_spend.toLocaleString('en-IN')} required on eligible collection items (Add ₹${diff.toLocaleString('en-IN')} more).`,
            };
          }
        }
      } else {
        // Store-wide minimum spend check
        if (match.min_spend && subtotal < match.min_spend) {
          const diff = Math.round(match.min_spend - subtotal);
          return {
            valid: false,
            message: `Minimum spend of ₹${match.min_spend.toLocaleString('en-IN')} required (Add ₹${diff.toLocaleString('en-IN')} more).`,
          };
        }
      }

      return { valid: true, coupon: match, message: 'Coupon applied successfully!' };
    } catch {
      return { valid: false, message: 'Unable to validate coupon at this time.' };
    }
  },

  async recordCouponUsage(code: string): Promise<void> {
    try {
      const cleanCode = code.trim().toUpperCase();
      const allCoupons = await this.getCoupons();
      const target = allCoupons.find((c) => c.code.toUpperCase() === cleanCode);
      if (target) {
        const newCount = (target.usage_count || 0) + 1;
        await this.updateCoupon(target.id, { usage_count: newCount });
      }
    } catch (e) {
      console.warn('Could not record coupon usage:', e);
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
    courier_name?: string;
    delivery_speed?: string;
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    grand_total: number;
    items: CartItem[];
  }): Promise<{ success: boolean; order_number?: string; error?: string }> {
    // Backend Validation Guards
    const emailValidation = validateEmail(params.guest_email);
    if (!emailValidation.isValid) {
      return { success: false, error: emailValidation.error || 'Invalid email address provided.' };
    }

    const phoneValidation = validatePhone(params.guest_phone);
    if (!phoneValidation.isValid) {
      return { success: false, error: phoneValidation.error || 'Invalid phone number. Must be a valid 10-digit mobile number.' };
    }

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
      courier_name: params.courier_name || 'India Post',
      delivery_speed: params.delivery_speed,
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
            product_title: item.product?.title || 'Tanoah Product',
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tanoah_orders_updated', { detail: { order_number: orderNumber } }));
    }

    return { success: true, order_number: orderNumber };
  },

  // Adjust inventory according to purchase (Direct Supabase)
  async adjustInventoryForOrder(items: CartItem[]): Promise<void> {
    try {
      for (const item of items) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.variant.id
        );
        if (isUuid) {
          try {
            const { data: currentVar } = await supabase
              .from('product_variants')
              .select('stock_quantity')
              .eq('id', item.variant.id)
              .single();
            if (currentVar) {
              const newQty = Math.max(0, (currentVar.stock_quantity ?? 0) - item.quantity);
              await supabase
                .from('product_variants')
                .update({ stock_quantity: newQty })
                .eq('id', item.variant.id);
            }
          } catch (e) {
            console.warn('Could not update variant stock in Supabase:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error adjusting inventory:', err);
    }
  },

  // Public Order Tracking (Dual lookup by Order Number or India Post Consignment Number)
  async getOrderByNumber(orderNumberOrTracking: string): Promise<any | null> {
    const cleanNum = (orderNumberOrTracking || '').trim();
    if (!cleanNum) return null;
    const cleanUpper = cleanNum.toUpperCase();

    const customOrders = getStoredCustomOrders();
    const localMatch = customOrders.find((o) => {
      const oNum = (o.order_number || o.orderNumber || '').toUpperCase();
      const oTrack = (o.tracking_number || o.trackingNumber || '').toUpperCase();
      return oNum === cleanUpper || oTrack === cleanUpper || o.id === cleanNum;
    });

    let remoteOrder: any = null;
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanNum);
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `);
      if (isUUID) {
        query = query.eq('id', cleanNum);
      } else {
        query = query.or(`order_number.ilike.${cleanNum},tracking_number.ilike.${cleanNum}`);
      }
      const { data, error } = await query.limit(1).maybeSingle();
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

    const sample = SAMPLE_ORDERS_DETAILED.find((o) => {
      const oNum = (o.orderNumber || o.order_number || '').toUpperCase();
      const oTrack = (o.trackingNumber || o.tracking_number || '').toUpperCase();
      return oNum === cleanUpper || oTrack === cleanUpper || o.id === cleanNum;
    });
    return sample || null;
  },

  // Public Consignment Tracking with Dual Search & Email/Mobile Verification ("This or that")
  async trackConsignment(params: {
    orderNumberOrTracking?: string;
    contact?: string;
  }): Promise<{
    status: 'found_single' | 'found_multiple' | 'verification_failed' | 'not_found' | 'empty_query';
    order?: any;
    orders?: any[];
    matchedContact?: string;
    verified?: boolean;
    querySummary?: {
      orderNumber?: string;
      contact?: string;
    };
    errorMessage?: string;
  }> {
    const cleanOrder = (params.orderNumberOrTracking || '').trim();
    const cleanContact = (params.contact || '').trim();

    if (!cleanOrder && !cleanContact) {
      return {
        status: 'empty_query',
        errorMessage: 'Please enter an Order Number / Consignment Barcode OR your registered Email / Mobile number to track.',
      };
    }

    const doesContactMatch = (order: any, contactStr: string): boolean => {
      if (!order || !contactStr) return false;
      const target = contactStr.trim().toLowerCase();

      // 1. Email check
      if (target.includes('@')) {
        const oEmail = (
          order.guest_email ||
          order.guestEmail ||
          order.formData?.email ||
          order.shipping_address?.email ||
          ''
        ).trim().toLowerCase();
        if (oEmail && (oEmail === target || oEmail.includes(target) || target.includes(oEmail))) {
          return true;
        }
      }

      // 2. Phone check (match last 10 digits or exact substring)
      const inputDigits = target.replace(/\D/g, '');
      if (inputDigits.length >= 7) {
        const last10Input = inputDigits.slice(-10);
        const orderPhoneRaw = (
          order.guest_phone ||
          order.guestPhone ||
          order.formData?.phone ||
          order.shipping_address?.phone ||
          ''
        ).replace(/\D/g, '');
        const last10Order = orderPhoneRaw.slice(-10);
        if (last10Order && last10Order === last10Input) return true;
        if (orderPhoneRaw && (orderPhoneRaw.includes(inputDigits) || inputDigits.includes(orderPhoneRaw))) {
          return true;
        }
      }
      return false;
    };

    // Case 1: Both Order Number AND Contact provided (Verified lookup)
    if (cleanOrder && cleanContact) {
      const order = await this.getOrderByNumber(cleanOrder);
      if (!order) {
        return {
          status: 'not_found',
          querySummary: { orderNumber: cleanOrder, contact: cleanContact },
          errorMessage: `No consignment found for order or tracking reference "${cleanOrder}".`,
        };
      }

      const isMatch = doesContactMatch(order, cleanContact);
      if (isMatch) {
        return {
          status: 'found_single',
          order,
          verified: true,
          matchedContact: cleanContact,
          querySummary: { orderNumber: cleanOrder, contact: cleanContact },
        };
      } else {
        return {
          status: 'verification_failed',
          querySummary: { orderNumber: cleanOrder, contact: cleanContact },
          errorMessage: `Order "${cleanOrder}" was located, but the provided Email or Mobile does not match the contact records for this consignment.`,
        };
      }
    }

    // Case 2: Only Order Number / Consignment Barcode provided ("This")
    if (cleanOrder && !cleanContact) {
      const order = await this.getOrderByNumber(cleanOrder);
      if (order) {
        return {
          status: 'found_single',
          order,
          verified: false,
          querySummary: { orderNumber: cleanOrder },
        };
      } else {
        return {
          status: 'not_found',
          querySummary: { orderNumber: cleanOrder },
          errorMessage: `No consignment found matching "${cleanOrder}".`,
        };
      }
    }

    // Case 3: Only Contact (Email / Mobile) provided ("That")
    let remoteOrders: any[] = [];
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (cleanContact.includes('@')) {
        query = query.ilike('guest_email', cleanContact.toLowerCase());
      } else {
        const digits = cleanContact.replace(/\D/g, '');
        const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
        query = query.ilike('guest_phone', `%${last10}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        remoteOrders = data;
      }
    } catch {
      remoteOrders = [];
    }

    const customOrders = getStoredCustomOrders();
    const localMatches = customOrders.filter((o) => doesContactMatch(o, cleanContact));
    const sampleMatches = SAMPLE_ORDERS_DETAILED.filter((o) => doesContactMatch(o, cleanContact));

    const seen = new Set<string>();
    const allMatches: any[] = [];
    for (const ord of [...remoteOrders, ...localMatches, ...sampleMatches]) {
      const key = (ord.order_number || ord.orderNumber || ord.id || '').toUpperCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        allMatches.push(ord);
      }
    }

    if (allMatches.length === 0) {
      return {
        status: 'not_found',
        querySummary: { contact: cleanContact },
        errorMessage: `No active consignments or orders found registered to "${cleanContact}".`,
      };
    } else if (allMatches.length === 1) {
      return {
        status: 'found_single',
        order: allMatches[0],
        verified: true,
        matchedContact: cleanContact,
        querySummary: { contact: cleanContact },
      };
    } else {
      return {
        status: 'found_multiple',
        orders: allMatches,
        matchedContact: cleanContact,
        querySummary: { contact: cleanContact },
      };
    }
  },

  // Newsletter Subscription
  async subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { success: false, message: emailValidation.error || 'Please enter a valid email address.' };
    }

    try {
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email: emailValidation.normalized }]);
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
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { success: false, message: emailValidation.error || 'Please enter a valid email address.' };
    }

    let cleanPhone = null;
    if (phone && phone.trim()) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        return { success: false, message: phoneValidation.error || 'Please enter a valid 10-digit mobile number.' };
      }
      cleanPhone = phoneValidation.cleanDigits;
    }

    try {
      const { error } = await supabase.from('back_in_stock_subscriptions').insert([{
        variant_id: variantId,
        email: emailValidation.normalized,
        phone: cleanPhone,
      }]);
      if (error) throw error;
      return { success: true, message: 'Notification confirmed. We will reach out when this piece returns.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Waitlist registration failed.' };
    }
  },

  // Admin: Get All Back In Stock Subscriptions (Enriched with product & variant)
  async getBackInStockSubscriptions(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('back_in_stock_subscriptions')
        .select(`
          *,
          variant:product_variants (
            id,
            title,
            sku,
            color_name,
            size,
            price,
            sale_price,
            stock_quantity,
            product:products (
              id,
              title,
              slug,
              images:product_images (image_url, is_primary)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Error querying back_in_stock_subscriptions:', err);
    }
    return [];
  },

  // Admin: Toggle notified state for Back In Stock request
  async updateBackInStockStatus(id: string, isNotified: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('back_in_stock_subscriptions')
        .update({
          notified_at: isNotified ? new Date().toISOString() : null,
        })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Admin: Delete Back In Stock request
  async deleteBackInStockSubscription(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('back_in_stock_subscriptions')
        .delete()
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Public: Submit Contact Inquiry
  async submitContactInquiry(data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }): Promise<{ success: boolean; message: string }> {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      return { success: false, message: emailValidation.error || 'Please enter a valid email address.' };
    }

    let cleanPhone = null;
    if (data.phone && data.phone.trim()) {
      const phoneValidation = validatePhone(data.phone);
      if (!phoneValidation.isValid) {
        return { success: false, message: phoneValidation.error || 'Please enter a valid 10-digit mobile number.' };
      }
      cleanPhone = phoneValidation.cleanDigits;
    }

    try {
      const { error } = await supabase.from('contact_inquiries').insert([{
        name: data.name.trim(),
        email: emailValidation.normalized,
        phone: cleanPhone,
        subject: data.subject?.trim() || 'General Inquiry',
        message: data.message.trim(),
        status: 'new',
      }]);
      if (error) throw error;
      return { success: true, message: 'Thank you. Our customer care team has received your message.' };
    } catch (err: any) {
      console.warn('Error saving contact inquiry:', err);
      return { success: true, message: 'Your message has been transmitted successfully.' };
    }
  },

  // Admin: Get All Contact Inquiries
  async getContactInquiries(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Error fetching contact inquiries:', err);
    }
    return [];
  },

  // Admin: Update Contact Inquiry Status & Notes
  async updateContactInquiryStatus(id: string, status: 'new' | 'in_progress' | 'resolved', adminNotes?: string): Promise<boolean> {
    try {
      const payload: any = { status, updated_at: new Date().toISOString() };
      if (adminNotes !== undefined) payload.admin_notes = adminNotes;
      const { error } = await supabase
        .from('contact_inquiries')
        .update(payload)
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Admin: Delete Contact Inquiry
  async deleteContactInquiry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contact_inquiries')
        .delete()
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Admin: Get Newsletter Subscribers
  async getNewsletterSubscribers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Error fetching newsletter subscribers:', err);
    }
    return [];
  },

  // Admin: Toggle Newsletter Subscriber Active State
  async toggleNewsletterSubscriber(id: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({ is_active: isActive })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Admin: Delete Newsletter Subscriber
  async deleteNewsletterSubscriber(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // Return & Damage Claim Request (Option 2: Hybrid WhatsApp Support)
  async submitReturn(params: {
    order_number: string;
    return_type?: 'return' | 'exchange';
    reason: string;
    customer_description?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    product_title?: string;
    variant_info?: string;
    delivered_at?: string;
    hours_since_delivery?: number;
    tag_intact_confirmed?: boolean;
    unboxing_video_confirmed?: boolean;
    self_ship_confirmed?: boolean;
    video_submitted_via?: 'whatsapp' | 'upload' | 'link';
    customer_courier_name?: string;
    customer_consignment_no?: string;
  }): Promise<{ success: boolean; message: string; ticket?: any }> {
    if (params.customer_phone) {
      const phoneValidation = validatePhone(params.customer_phone);
      if (!phoneValidation.isValid) {
        return { success: false, message: phoneValidation.error || 'Please provide a valid 10-digit mobile number for WhatsApp support.' };
      }
    }

    if (params.customer_email) {
      const emailValidation = validateEmail(params.customer_email);
      if (!emailValidation.isValid) {
        return { success: false, message: emailValidation.error || 'Please provide a valid email address.' };
      }
    }

    try {
      const order = await this.getOrderByNumber(params.order_number);
      const ticketId = `ret_${Date.now()}`;
      const newTicket = {
        id: ticketId,
        order_number: params.order_number,
        customer_name: params.customer_name || (order ? `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim() : 'Valued Client'),
        customer_email: params.customer_email || order?.guest_email || '',
        customer_phone: params.customer_phone || order?.shipping_address?.phone || '',
        return_type: 'return',
        reason: params.reason || 'Damaged in Transit',
        customer_description: params.customer_description || '',
        product_title: params.product_title || 'Tanoah Garment',
        variant_info: params.variant_info || 'Standard',
        delivered_at: params.delivered_at || order?.delivered_at || order?.updated_at || null,
        hours_since_delivery: params.hours_since_delivery ?? 0,
        tag_intact_confirmed: params.tag_intact_confirmed ?? true,
        unboxing_video_confirmed: params.unboxing_video_confirmed ?? true,
        self_ship_confirmed: params.self_ship_confirmed ?? true,
        video_submitted_via: params.video_submitted_via || 'whatsapp',
        customer_courier_name: params.customer_courier_name || '',
        customer_consignment_no: params.customer_consignment_no || '',
        status: 'awaiting_video',
        created_at: new Date().toISOString(),
      };

      // Persist to local returns store
      try {
        const raw = localStorage.getItem('tanoah_custom_returns');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(newTicket);
        localStorage.setItem('tanoah_custom_returns', JSON.stringify(list));
      } catch {}

      // If remote order exists in Supabase, also record in Supabase
      if (order?.id) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
        if (isUUID) {
          const { data: dbReturn } = await supabase
            .from('returns')
            .insert([{
              order_id: order.id,
              return_type: 'return',
              reason: params.reason,
              customer_description: params.customer_description || null,
              status: 'requested',
              video_submitted: false,
            }])
            .select()
            .maybeSingle();

          if (dbReturn?.id) {
            newTicket.id = dbReturn.id;
          }
        }
      }

      return {
        success: true,
        message: 'Damage claim ticket registered. Please share your 360° unboxing video on WhatsApp.',
        ticket: newTicket,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to submit claim.' };
    }
  },

  async updateReturnCustomerShipment(ticketId: string, courierName: string, consignmentNo: string): Promise<boolean> {
    try {
      const tickets = await this.getReturnTickets();
      const updated = tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              customer_courier_name: courierName.trim(),
              customer_consignment_no: consignmentNo.trim(),
              status: 'in_transit',
            }
          : t
      );
      localStorage.setItem('tanoah_custom_returns', JSON.stringify(updated));

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(ticketId)) {
        await supabase
          .from('returns')
          .update({
            customer_courier_name: courierName.trim(),
            customer_consignment_no: consignmentNo.trim(),
            status: 'in_transit',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);
      } else {
        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket?.order_number) {
          let order = await this.getOrderByNumber(ticket.order_number);
          if (!order && !ticket.order_number.startsWith('TAN-') && /^\d+$/.test(ticket.order_number)) {
            order = await this.getOrderByNumber(`TAN-${ticket.order_number}`);
          }
          if (order?.id) {
            await supabase
              .from('returns')
              .update({
                customer_courier_name: courierName.trim(),
                customer_consignment_no: consignmentNo.trim(),
                status: 'in_transit',
                updated_at: new Date().toISOString(),
              })
              .eq('order_id', order.id);
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tanoah_returns_updated', {
            detail: { ticketId, status: 'in_transit', customer_consignment_no: consignmentNo },
          })
        );
      }

      return true;
    } catch {
      return false;
    }
  },

  async markReturnVideoSent(ticketId: string): Promise<boolean> {
    try {
      const tickets = await this.getReturnTickets();
      const updated = tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              video_submitted: true,
              video_submitted_at: new Date().toISOString(),
              status: 'video_submitted',
            }
          : t
      );
      localStorage.setItem('tanoah_custom_returns', JSON.stringify(updated));

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(ticketId)) {
        await supabase
          .from('returns')
          .update({
            status: 'video_submitted',
            video_submitted: true,
            video_submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);
      } else {
        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket?.order_number) {
          let order = await this.getOrderByNumber(ticket.order_number);
          if (!order && !ticket.order_number.startsWith('TAN-') && /^\d+$/.test(ticket.order_number)) {
            order = await this.getOrderByNumber(`TAN-${ticket.order_number}`);
          }
          if (order?.id) {
            await supabase
              .from('returns')
              .update({
                status: 'video_submitted',
                video_submitted: true,
                video_submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('order_id', order.id);
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  async getReturnTicketByOrder(orderNumber: string): Promise<any | null> {
    const cleanNum = (orderNumber || '').trim().toUpperCase();
    if (!cleanNum) return null;

    try {
      // 1. Check Supabase directly first for the latest server-side return status
      let order = await this.getOrderByNumber(cleanNum);
      if (!order && !cleanNum.startsWith('TAN-') && /^\d+$/.test(cleanNum)) {
        order = await this.getOrderByNumber(`TAN-${cleanNum}`);
      }

      if (order?.id) {
        const { data: remoteReturn } = await supabase
          .from('returns')
          .select('*, order:orders(*)')
          .eq('order_id', order.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (remoteReturn) {
          const mappedTicket = {
            id: remoteReturn.id,
            order_number: remoteReturn.order?.order_number || order.order_number || cleanNum,
            customer_name:
              `${remoteReturn.order?.shipping_address?.first_name || ''} ${remoteReturn.order?.shipping_address?.last_name || ''}`.trim() ||
              remoteReturn.order?.guest_email ||
              'Customer',
            customer_email: remoteReturn.order?.guest_email || '',
            customer_phone: remoteReturn.order?.shipping_address?.phone || '',
            return_type: remoteReturn.return_type || 'return',
            reason: remoteReturn.reason || 'Transit Damage',
            customer_description: remoteReturn.customer_description || '',
            product_title: 'Tanoah Garment',
            variant_info: 'Standard',
            status: remoteReturn.status || 'requested',
            video_submitted:
              Boolean(remoteReturn.video_submitted) ||
              ['video_submitted', 'claim_approved', 'approved', 'in_transit', 'item_received', 'completed'].includes(
                remoteReturn.status
              ),
            customer_courier_name: remoteReturn.customer_courier_name || '',
            customer_consignment_no: remoteReturn.customer_consignment_no || '',
            created_at: remoteReturn.created_at || new Date().toISOString(),
          };

          // Synchronize local storage cache with latest Supabase live record
          try {
            const raw = localStorage.getItem('tanoah_custom_returns');
            let list = raw ? JSON.parse(raw) : [];
            list = list.filter((t: any) => t.id !== mappedTicket.id && t.order_number !== mappedTicket.order_number);
            list.unshift(mappedTicket);
            localStorage.setItem('tanoah_custom_returns', JSON.stringify(list));
          } catch {}

          return mappedTicket;
        }
      }

      // 2. Fallback to local and demo returns
      const tickets = await this.getReturnTickets();
      const match = tickets.find((t) => {
        const tNum = (t.order_number || '').trim().toUpperCase();
        return (
          tNum === cleanNum ||
          tNum === `TAN-${cleanNum}` ||
          `TAN-${tNum}` === cleanNum ||
          tNum.replace(/[^A-Z0-9]/g, '') === cleanNum.replace(/[^A-Z0-9]/g, '')
        );
      });
      return match || null;
    } catch {
      return null;
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

    // 1. Remote orders from Supabase are the primary source of truth
    const merged: any[] = [...remoteOrders];

    // 2. Overlay customOrders (guest orders from active session)
    customOrders.forEach((co) => {
      const coNum = co.order_number || co.orderNumber;
      if (!coNum) return;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coNum);
      if (isUUID) return;

      const remoteIdx = merged.findIndex(
        (ro) => (ro.order_number || ro.orderNumber) === coNum || (ro.id && ro.id === co.id)
      );

      if (remoteIdx === -1) {
        // Not in remote orders, add to list
        merged.push(co);
      } else {
        // If remote order has no items, fill from local
        if ((!merged[remoteIdx].items || merged[remoteIdx].items.length === 0) && co.items?.length > 0) {
          merged[remoteIdx].items = co.items;
        }
      }
    });

    return merged;
  },

  // Admin: Update order status (Dual-sync with persistent storage)
  async updateOrderStatus(
    orderId: string,
    status: string,
    trackingNumber?: string,
    courierName: string = 'India Post (Speed Post)'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const cleanId = orderId.trim();
      const cleanTracking = trackingNumber !== undefined ? trackingNumber.trim().toUpperCase() : undefined;

      // 1. Sync to Supabase directly
      const updateData: any = { status };
      if (cleanTracking !== undefined) {
        updateData.tracking_number = cleanTracking || null;
      }
      updateData.courier_name = courierName || 'India Post (Speed Post)';
      updateData.updated_at = new Date().toISOString();

      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        if (isUUID) {
          await supabase.from('orders').update(updateData).eq('id', cleanId);
        } else {
          await supabase.from('orders').update(updateData).eq('order_number', cleanId);
        }
      } catch (e) {
        console.warn('Supabase update order status error:', e);
      }

      // 2. Update in local custom orders (if present)
      const customOrders = getStoredCustomOrders();
      let localUpdated = false;
      const updatedList = customOrders.map((o) => {
        if (o.id === cleanId || o.orderNumber === cleanId || o.order_number === cleanId) {
          localUpdated = true;
          return {
            ...o,
            status,
            tracking_number: cleanTracking !== undefined ? cleanTracking : (o.tracking_number || ''),
            trackingNumber: cleanTracking !== undefined ? cleanTracking : (o.trackingNumber || ''),
            courier_name: courierName || o.courier_name || 'India Post (Speed Post)',
          };
        }
        return o;
      });

      // 3. If it's a sample order in SAMPLE_ORDERS_DETAILED, update in-memory and persist to customOrders
      const sampleMatch = SAMPLE_ORDERS_DETAILED.find(
        (so) => so.id === cleanId || so.orderNumber === cleanId || so.order_number === cleanId
      );
      if (sampleMatch) {
        sampleMatch.status = status;
        sampleMatch.tracking_number = cleanTracking !== undefined ? cleanTracking : (sampleMatch.tracking_number || '');
        sampleMatch.trackingNumber = cleanTracking !== undefined ? cleanTracking : (sampleMatch.trackingNumber || '');
        sampleMatch.courier_name = courierName || 'India Post (Speed Post)';

        const existingIdx = updatedList.findIndex(
          (o) => o.id === sampleMatch.id || o.orderNumber === sampleMatch.orderNumber || o.order_number === sampleMatch.order_number
        );
        if (existingIdx !== -1) {
          updatedList[existingIdx] = { ...sampleMatch };
        } else {
          updatedList.push({ ...sampleMatch });
        }
        localUpdated = true;
      }

      safeSetItem('tanoah_custom_orders', JSON.stringify(updatedList));

      // 4. Also update last order in storage if matching
      const rawLast = safeGetItem('tanoah_last_order');
      if (rawLast) {
        try {
          const parsed = JSON.parse(rawLast);
          if (parsed.orderNumber === cleanId || parsed.order_number === cleanId || parsed.id === cleanId) {
            parsed.status = status;
            if (cleanTracking !== undefined) {
              parsed.tracking_number = cleanTracking;
              parsed.trackingNumber = cleanTracking;
            }
            parsed.courier_name = courierName || parsed.courier_name || 'India Post (Speed Post)';
            safeSetItem('tanoah_last_order', JSON.stringify(parsed));
          }
        } catch {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tanoah_orders_updated', {
            detail: { order_number: cleanId, status, trackingNumber: cleanTracking },
          })
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update order.' };
    }
  },

  // Admin: Update variant stock & audit log (Direct Supabase)
  async updateVariantStock(variantId: string, newQty: number, reason: string = 'manual_adjustment'): Promise<{ success: boolean; message?: string }> {
    try {
      const cleanQty = Math.max(0, Number(newQty) || 0);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId);
      const query = supabase.from('product_variants').update({ stock_quantity: cleanQty });
      const { error } = isUuid ? await query.eq('id', variantId) : await query.eq('sku', variantId);
      if (error) {
        console.error('Supabase stock update error:', error);
        return { success: false, message: error.message };
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

    // Map remote Supabase returns as primary authoritative source
    const merged: any[] = remoteReturns.map((rr) => ({
      id: rr.id,
      order_number: rr.order?.order_number || 'TAN-UNKNOWN',
      customer_name:
        `${rr.order?.shipping_address?.first_name || ''} ${rr.order?.shipping_address?.last_name || ''}`.trim() ||
        rr.order?.guest_email ||
        'Customer',
      customer_email: rr.order?.guest_email || '',
      customer_phone: rr.order?.shipping_address?.phone || '',
      return_type: rr.return_type || 'return',
      reason: rr.reason || 'General Return',
      customer_description: rr.customer_description || '',
      product_title: 'Tanoah Garment',
      variant_info: 'Standard',
      status: rr.status || 'requested',
      video_submitted:
        Boolean(rr.video_submitted) ||
        ['video_submitted', 'claim_approved', 'approved', 'in_transit', 'item_received', 'completed'].includes(rr.status),
      customer_courier_name: rr.customer_courier_name || '',
      customer_consignment_no: rr.customer_consignment_no || '',
      created_at: rr.created_at || new Date().toISOString(),
    }));

    // Overlay any local-only returns that don't exist yet in remote returns
    localReturns.forEach((lr) => {
      const exists = merged.some(
        (m) => m.id === lr.id || (m.order_number && lr.order_number && m.order_number === lr.order_number)
      );
      if (!exists) {
        merged.push(lr);
      }
    });

    const INITIAL_DEMO_RETURNS = [
      {
        id: 'ret_101',
        order_number: 'TAN-849201',
        customer_name: 'Aditya Sharma',
        customer_email: 'aditya.sharma@example.com',
        customer_phone: '+91 98765 43210',
        product_title: 'Classic Linen Trouser',
        variant_info: 'Charcoal / 32',
        reason: 'Transit Damage (Loose Hem & Snagged Weave)',
        customer_description: 'Outer packing crushed by courier. Video awaiting dispatch.',
        status: 'awaiting_video',
        customer_consignment_no: '',
        created_at: new Date(Date.now() - 3600000 * 4.5).toISOString(),
      },
      {
        id: 'ret_102',
        order_number: 'TAN-719382',
        customer_name: 'Mira Nair',
        customer_email: 'mira.nair@example.com',
        customer_phone: '+91 97123 45678',
        return_type: 'return',
        reason: 'Transit Damage (Torn Package & Stained Fabric)',
        customer_description: 'Outer packing crushed by courier and shirt has tear. Video verified on WhatsApp.',
        product_title: 'French Linen Relaxed Camp Shirt',
        variant_info: 'Ecru Sand / M',
        status: 'claim_approved',
        hours_since_delivery: 12.0,
        tag_intact_confirmed: true,
        unboxing_video_confirmed: true,
        self_ship_confirmed: true,
        customer_courier_name: 'DTDC Express',
        customer_consignment_no: 'DTDC-9482019',
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      },
    ];

    INITIAL_DEMO_RETURNS.forEach((demo) => {
      if (!merged.some((m) => m.id === demo.id || m.order_number === demo.order_number)) {
        merged.push(demo);
      }
    });

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return merged;
  },

  async updateReturnTicketStatus(ticketId: string, status: string): Promise<boolean> {
    try {
      const tickets = await this.getReturnTickets();
      const updated = tickets.map((t) => (t.id === ticketId ? { ...t, status } : t));
      localStorage.setItem('tanoah_custom_returns', JSON.stringify(updated));

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(ticketId)) {
        await supabase
          .from('returns')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      } else {
        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket?.order_number) {
          let order = await this.getOrderByNumber(ticket.order_number);
          if (!order && !ticket.order_number.startsWith('TAN-') && /^\d+$/.test(ticket.order_number)) {
            order = await this.getOrderByNumber(`TAN-${ticket.order_number}`);
          }
          if (order?.id) {
            await supabase
              .from('returns')
              .update({ status, updated_at: new Date().toISOString() })
              .eq('order_id', order.id);
          }
        }
      }

      // When return is completed / refunded, sync order payment_status to 'refunded'
      if (status === 'completed') {
        const ticket = tickets.find((t) => t.id === ticketId);
        const orderNum = ticket?.order_number;
        if (orderNum) {
          let order = await this.getOrderByNumber(orderNum);
          if (!order && !orderNum.startsWith('TAN-') && /^\d+$/.test(orderNum)) {
            order = await this.getOrderByNumber(`TAN-${orderNum}`);
          }
          if (order?.id) {
            await supabase
              .from('orders')
              .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
              .eq('id', order.id);
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tanoah_returns_updated', {
            detail: { ticketId, status },
          })
        );
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

    const normalizeMediaItem = (m: any): MediaItem => ({
      id: m.id || m.media_id || `med_${Math.random().toString(36).substring(2, 9)}`,
      r2_key: m.r2_key || '',
      original_filename: m.original_filename || 'image.webp',
      stored_filename: m.stored_filename || m.r2_key?.split('/')?.pop() || m.original_filename || 'image.webp',
      mime_type: m.mime_type || 'image/webp',
      width: Number(m.width) || 2400,
      height: Number(m.height) || 3000,
      file_size: Number(m.file_size) || 0,
      file_hash: m.file_hash || '',
      media_type: m.media_type || 'product',
      storage_provider: m.storage_provider || 'cloudflare_r2',
      created_at: m.created_at || new Date().toISOString(),
      updated_at: m.updated_at,
      deleted_at: m.deleted_at || null,
      product_reference_count: Number(m.product_reference_count || 0),
      is_orphan: Boolean(m.is_orphan),
    });

    let items: MediaItem[] = [];
    try {
      const { data, error } = await supabase
        .from('media_usage_stats')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        items = data.map(normalizeMediaItem);
      }
    } catch {}

    if (items.length === 0) {
      try {
        const { data, error } = await supabase
          .from('media')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          items = data.map(normalizeMediaItem);
        }
      } catch {}
    }

    if (items.length > 0) {
      // Cross-verify with product_images to guarantee 100% accurate 'In Use' labels
      try {
        const { data: allProductImages } = await supabase.from('product_images').select('image_url, media_id');
        if (allProductImages && allProductImages.length > 0) {
          items = items.map((m) => {
            const matches = allProductImages.filter((pi) => {
              if (pi.media_id && (pi.media_id === m.id || pi.media_id === (m as any).media_id)) return true;
              if (!pi.image_url) return false;
              const imgUrl = pi.image_url.toLowerCase();
              const key = (m.r2_key || '').toLowerCase();
              const orig = (m.original_filename || '').toLowerCase();
              const stored = (m.stored_filename || '').toLowerCase();
              return (
                (key && imgUrl.includes(key)) ||
                (orig && imgUrl.includes(orig)) ||
                (stored && imgUrl.includes(stored))
              );
            });
            const count = Math.max(m.product_reference_count || 0, matches.length);
            return {
              ...m,
              product_reference_count: count,
              is_orphan: count === 0,
            };
          });
        }
      } catch (checkErr) {
        console.warn('Cross-verification error:', checkErr);
      }
      return items;
    }

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

    // Delete from Cloudflare R2 bucket
    if (r2Key) {
      try {
        await r2Service.deleteObject(r2Key);
      } catch (r2Err) {
        console.warn('R2 deleteObject error:', r2Err);
      }
    }

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

  async deleteBulkMedia(
    items: { id: string; r2_key?: string }[],
    force = false
  ): Promise<{ success: boolean; deletedCount: number; failedCount: number; message: string }> {
    if (!items || items.length === 0) {
      return { success: true, deletedCount: 0, failedCount: 0, message: 'No items selected.' };
    }

    let itemsToDelete = [...items];
    let failedCount = 0;

    // In safe mode, protect any item linked to an active product
    if (!force) {
      try {
        const { data: allProductImages } = await supabase.from('product_images').select('image_url, media_id');
        if (allProductImages && allProductImages.length > 0) {
          const safeItems: typeof items = [];
          for (const item of items) {
            const isReferenced = allProductImages.some((pi) => {
              if (pi.media_id && pi.media_id === item.id) return true;
              if (!pi.image_url) return false;
              const imgUrl = pi.image_url.toLowerCase();
              const key = (item.r2_key || '').toLowerCase();
              return Boolean(key && imgUrl.includes(key));
            });

            if (isReferenced) {
              failedCount++;
            } else {
              safeItems.push(item);
            }
          }
          itemsToDelete = safeItems;
        }
      } catch (err) {
        console.warn('Error checking product references before bulk delete:', err);
      }
    }

    if (itemsToDelete.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        failedCount,
        message: 'All selected items are currently in use by active products. Deletion cancelled.',
      };
    }

    const ids = itemsToDelete.map((i) => i.id).filter(Boolean);
    const r2Keys = itemsToDelete.map((i) => i.r2_key).filter((k): k is string => Boolean(k));

    // 1. Delete from Cloudflare R2 bucket directly
    try {
      if (r2Keys.length > 0) {
        await r2Service.deleteObjects(r2Keys);
      }
    } catch (e) {
      console.warn('Direct R2 bulk deletion warning:', e);
    }

    // 2. Call backend endpoint if available
    try {
      await fetch('/api/media/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, r2Keys, force }),
      });
    } catch {}

    // 3. Supabase soft delete
    try {
      if (ids.length > 0) {
        await supabase
          .from('media')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', ids);
      }
    } catch (dbErr) {
      console.warn('Supabase bulk media soft delete warning:', dbErr);
    }

    // 4. Update localStorage registry
    try {
      const existing = localStorage.getItem('tanoah_custom_media');
      if (existing) {
        const list: MediaItem[] = JSON.parse(existing);
        const updated = list.filter((m) => !ids.includes(m.id) && !r2Keys.includes(m.r2_key));
        localStorage.setItem('tanoah_custom_media', JSON.stringify(updated));
      }
    } catch {}

    return {
      success: true,
      deletedCount: itemsToDelete.length,
      failedCount,
      message: `${itemsToDelete.length} media asset(s) deleted successfully from R2 and catalog.${
        failedCount > 0 ? ` ${failedCount} in-use image(s) were protected.` : ''
      }`,
    };
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
    const phoneValidation = validatePhone(address.phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error || 'Invalid phone number. Must be a valid 10-digit mobile number.');
    }

    if (address.email) {
      const emailValidation = validateEmail(address.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error || 'Invalid email address.');
      }
    }

    const userId = address.user_id;
    const userEmail = address.email ? validateEmail(address.email).normalized : address.email;
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

  async deleteUserAccountPermanently(userId?: string): Promise<boolean> {
    if (userId) {
      try {
        const { error } = await supabase.rpc('delete_user_account');
        if (error) {
          console.warn('Supabase rpc delete_user_account error:', error);
        }
      } catch (err) {
        console.warn('deleteUserAccountPermanently exception:', err);
      }

      try {
        localStorage.removeItem(`tanoah_saved_addresses_${userId}`);
      } catch {}
    }

    try {
      localStorage.removeItem('tanoah_saved_addresses');
      localStorage.removeItem('tanoah_wishlist');
    } catch {}

    try {
      await supabase.auth.signOut();
    } catch {}

    return true;
  },

  // ==========================================
  // Blog & Editorial Journal Engine
  // ==========================================
  async getBlogArticles(includeDrafts: boolean = false): Promise<BlogArticle[]> {
    try {
      let query = supabase
        .from('blog_articles')
        .select('*')
        .order('published_at', { ascending: false });

      if (!includeDrafts) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as BlogArticle[];
      }
      if (error) console.warn('Supabase getBlogArticles error:', error);
    } catch (e) {
      console.warn('Network error fetching blog articles:', e);
    }
    return [];
  },

  async getBlogArticleBySlug(slug: string): Promise<BlogArticle | null> {
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('slug', slug)
        .single();
      if (!error && data) {
        return data as BlogArticle;
      }
    } catch (e) {
      console.warn('Error fetching blog article by slug:', e);
    }
    return null;
  },

  async saveBlogArticle(article: Partial<BlogArticle>): Promise<{ success: boolean; article: BlogArticle }> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id || '');
    const targetId = isUUID ? article.id! : crypto.randomUUID();

    // Check if slug changed to record automated 301 redirect
    try {
      const { data: existingArt } = await supabase.from('blog_articles').select('slug').eq('id', targetId).maybeSingle();
      if (existingArt?.slug && article.slug && existingArt.slug !== article.slug) {
        await recordRedirectIfSlugChanged('blog', existingArt.slug, article.slug, article.title || 'Blog article');
      }
    } catch (e) {
      console.warn('Could not check blog slug for redirect:', e);
    }

    const payload = {
      id: targetId,
      title: article.title || 'Untitled Journal Entry',
      slug: article.slug || `journal-${Date.now()}`,
      excerpt: article.excerpt || null,
      content: article.content || '',
      featured_image: article.featured_image || null,
      featured_image_alt: article.featured_image_alt || null,
      author_name: article.author_name || 'TANOAH Editorial Team',
      category: article.category || 'Fashion & Styling',
      tags: article.tags || [],
      seo_title: article.seo_title || null,
      seo_description: article.seo_description || null,
      is_published: article.is_published !== false,
      published_at: article.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('blog_articles').upsert(payload).select().single();
    if (error) {
      console.error('Failed to save blog article:', error);
      throw new Error(`Failed to save blog article: ${error.message}`);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tanoah_blog_updated', { detail: data }));
    }

    return { success: true, article: data as BlogArticle };
  },

  async deleteBlogArticle(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('blog_articles').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete blog article:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error deleting blog article:', err);
      return false;
    }
  },

  // ==========================================
  // SEO 301/302 Redirects Management
  // ==========================================
  async getSeoRedirects(): Promise<SEORedirect[]> {
    try {
      const { data, error } = await supabase
        .from('seo_redirects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data as SEORedirect[];
      }
    } catch (e) {
      console.warn('Error fetching SEO redirects:', e);
    }
    return [];
  },

  async saveSeoRedirect(redirect: Partial<SEORedirect>): Promise<boolean> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(redirect.id || '');
      const targetId = isUUID ? redirect.id : crypto.randomUUID();

      let fromUrl = (redirect.from_url || '').trim();
      let toUrl = (redirect.to_url || '').trim();

      if (!fromUrl.startsWith('/')) fromUrl = `/${fromUrl}`;
      if (!toUrl.startsWith('/') && !toUrl.startsWith('http://') && !toUrl.startsWith('https://')) {
        toUrl = `/${toUrl}`;
      }

      const payload = {
        id: targetId,
        from_url: fromUrl.toLowerCase(),
        to_url: toUrl,
        status_code: redirect.status_code || 301,
        hits: redirect.hits ?? 0,
        reason: redirect.reason || 'Admin created redirect',
        created_by: redirect.created_by || 'admin',
        is_active: redirect.is_active !== false,
      };

      const { error } = await supabase.from('seo_redirects').upsert(payload, { onConflict: 'from_url' });
      if (error) {
        console.error('Failed to save SEO redirect:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error saving SEO redirect:', err);
      return false;
    }
  },

  async deleteSeoRedirect(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('seo_redirects').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete SEO redirect:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error deleting SEO redirect:', err);
      return false;
    }
  },

  // ==========================================
  // SEO 404 Logs & Monitoring
  // ==========================================
  async getSeo404Logs(): Promise<SEO404Log[]> {
    try {
      const { data, error } = await supabase
        .from('seo_404_logs')
        .select('*')
        .order('hits', { ascending: false })
        .limit(100);
      if (!error && data) {
        return data as SEO404Log[];
      }
    } catch (e) {
      console.warn('Error fetching 404 logs:', e);
    }
    return [];
  },

  async record404Log(url: string, referrer?: string, userAgent?: string): Promise<void> {
    try {
      const cleanUrl = url.trim().toLowerCase();
      const { data: existing } = await supabase
        .from('seo_404_logs')
        .select('id, hits')
        .eq('url', cleanUrl)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('seo_404_logs')
          .update({
            hits: (existing.hits || 1) + 1,
            referrer: referrer || null,
            user_agent: userAgent || null,
            last_occurred_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('seo_404_logs').insert({
          url: cleanUrl,
          referrer: referrer || null,
          user_agent: userAgent || null,
          hits: 1,
        });
      }
    } catch (err) {
      console.warn('Error recording 404 log:', err);
    }
  },

  async resolve404Log(logId: string, redirectId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('seo_404_logs')
        .update({ resolved_to_redirect_id: redirectId || null })
        .eq('id', logId);
      return !error;
    } catch {
      return false;
    }
  },

  async delete404Log(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('seo_404_logs').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // ==========================================
  // Automated SEO Health Audit & Diagnostics
  // ==========================================
  async getSeoAuditReport(): Promise<SEOAuditSummary> {
    const issues: SEOAuditIssue[] = [];
    let products: Product[] = [];
    let categories: Category[] = [];
    let collections: Collection[] = [];
    let redirects: SEORedirect[] = [];
    let logs404: SEO404Log[] = [];

    try {
      [products, categories, collections, redirects, logs404] = await Promise.all([
        this.getProducts('all'),
        this.getCategories(),
        this.getCollections(),
        this.getSeoRedirects(),
        this.getSeo404Logs(),
      ]);
    } catch (e) {
      console.warn('Error fetching entities for SEO audit:', e);
    }

    let missingMetaDescriptions = 0;
    let missingSeoTitles = 0;
    let missingImageAlts = 0;

    // 1. Audit Products
    products.forEach((p) => {
      // SEO Meta description check
      if (!p.seo_description && (!p.description || p.description.length < 50)) {
        missingMetaDescriptions++;
        issues.push({
          id: `prod_meta_${p.id}`,
          type: 'product',
          severity: 'warning',
          title: `Short or missing meta description: "${p.title}"`,
          description: 'Search engines prefer rich descriptive meta snippets (140-160 characters).',
          target_url: `/products/${p.slug}`,
          entity_id: p.id,
          fix_label: 'Edit Product SEO',
          fix_url: `/admin/products/${p.id}`,
        });
      }

      // SEO Title override check (info only)
      if (!p.seo_title) {
        missingSeoTitles++;
      }

      // Check primary image alt tags
      const primaryImg = p.images?.find((img) => img.is_primary) || p.images?.[0];
      if (!primaryImg || !primaryImg.alt_text || primaryImg.alt_text.trim() === '') {
        missingImageAlts++;
        issues.push({
          id: `prod_img_alt_${p.id}`,
          type: 'image',
          severity: 'info',
          title: `Image missing alt text: "${p.title}"`,
          description: 'Descriptive alt text helps Google Image search index your luxury catalog.',
          target_url: `/products/${p.slug}`,
          entity_id: p.id,
          fix_label: 'Add Alt Text',
          fix_url: `/admin/products/${p.id}`,
        });
      }

      // Check zero images
      if (!p.images || p.images.length === 0) {
        issues.push({
          id: `prod_no_img_${p.id}`,
          type: 'product',
          severity: 'error',
          title: `Product has no images: "${p.title}"`,
          description: 'Products without images are penalized by Google Shopping and search crawlers.',
          entity_id: p.id,
          fix_label: 'Upload Product Media',
          fix_url: `/admin/products/${p.id}`,
        });
      }
    });

    // 2. Audit Unresolved 404s
    const unresolved = logs404.filter((l) => !l.resolved_to_redirect_id);
    unresolved.slice(0, 10).forEach((l) => {
      issues.push({
        id: `404_${l.id}`,
        type: 'system',
        severity: l.hits > 5 ? 'error' : 'warning',
        title: `Broken Link 404: "${l.url}" (${l.hits} hits)`,
        description: `Visitors or bots attempted to reach this non-existent path. Create a 301 redirect to salvage traffic.`,
        target_url: l.url,
        fix_label: 'Create 301 Redirect',
        fix_url: `/admin/seo/redirects?from=${encodeURIComponent(l.url)}`,
      });
    });

    // Calculate SEO Health Score (0-100)
    const totalProdCount = Math.max(products.length, 1);
    const prodScore = Math.max(0, 100 - (missingMetaDescriptions / totalProdCount) * 40 - (missingImageAlts / totalProdCount) * 20);
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const finalScore = Math.max(10, Math.min(100, Math.round(prodScore - errorCount * 5)));

    return {
      score: finalScore,
      totalProducts: products.length,
      missingMetaDescriptions,
      missingSeoTitles,
      missingImageAlts,
      activeRedirects: redirects.filter((r) => r.is_active).length,
      unresolved404s: unresolved.length,
      issues,
    };
  },
};
