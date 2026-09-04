export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductImage {
  id: string;
  product_id?: string;
  media_id?: string;
  variant_id?: string | null;
  image_url: string;
  alt_text?: string;
  color_name?: string; // Color this image is associated with (e.g. 'Red', 'Blue')
  sort_order: number;
  position?: number;
  is_primary: boolean;
}

export interface MediaItem {
  id: string;
  r2_key: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  width: number;
  height: number;
  file_size: number;
  file_hash: string;
  media_type: 'product' | 'banner' | 'brand' | 'lookbook';
  storage_provider: string;
  preserved_original_key?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  product_reference_count?: number;
  is_orphan?: boolean;
}

export interface ProductDetailSection {
  id: string;
  title: string; // Heading (e.g. "PRODUCT SPECIFICATIONS & FIT")
  content: string; // Content / specifications points
}

export interface ProductVariant {
  id: string;
  product_id: string;
  title: string; // e.g. "Noir Black / Medium"
  sku: string;
  barcode?: string;
  color_name: string;
  color_hex: string;
  color_image_url?: string;
  size: string;
  price: number;
  sale_price?: number | null;
  compare_at_price?: number | null;
  weight?: number; // in grams
  stock_quantity: number;
  reserved_stock?: number;
  low_stock_threshold: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  brand: string;
  product_type: string;
  category_id?: string;
  category_name?: string;
  gender?: 'men' | 'women' | 'unisex' | 'kids';
  base_price: number;
  sale_price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number;
  tax_rate?: number; // percentage, e.g., 12 for 12% GST
  hsn_code?: string;
  status: ProductStatus;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  is_preorder?: boolean;
  preorder_shipping_date?: string;
  weight?: number;
  seo_title?: string;
  seo_description?: string;
  tags: string[];
  collections?: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  custom_sections?: ProductDetailSection[];
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

export interface Collection {
  id: string;
  title: string;
  slug: string;
  description?: string;
  banner_image?: string;
  is_smart: boolean;
  rules_json?: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  seo_title?: string;
  seo_description?: string;
  product_count?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  giftNote?: string;
  gift_note?: string;
}

export interface Address {
  id?: string;
  full_name: string;
  phone: string;
  address_line1: string; // house / building / street
  address_line2?: string; // area / landmark
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_default?: boolean;
}

export interface SavedAddress {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  label?: 'Home' | 'Work' | 'Other';
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refund_requested'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'razorpay' | 'cod' | 'upi' | 'card' | 'net_banking';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  image_url?: string;
  unit_price: number;
  sale_price?: number;
  quantity: number;
  line_total: number;
  tax_amount: number;
  discount_amount: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  guest_email: string;
  guest_phone: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_gateway_ref?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  grand_total: number;
  currency: string;
  shipping_address: Address;
  billing_address?: Address;
  shipping_method: string;
  tracking_number?: string;
  courier_name?: string;
  internal_notes?: string;
  customer_notes?: string;
  cancellation_reason?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id?: string;
  author_name: string;
  rating: number; // 1 to 5
  title: string;
  review_text: string;
  image_urls?: string[];
  is_verified_buyer: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  is_featured: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
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
  eligible_categories?: string[];
  eligible_collections?: string[];
  eligible_products?: string[];
  is_automatic: boolean;
  is_active: boolean;
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
  is_active: boolean;
}

export interface StoreSettings {
  store_name: string;
  logo_url: string;
  logo_white_url: string;
  favicon_url: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  store_address: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  gst_number?: string;
  tax_inclusive_pricing: boolean;
  default_tax_rate: number;
  free_shipping_threshold: number;
  standard_shipping_rate: number;
  express_shipping_rate: number;
  cod_enabled: boolean;
  cod_fee: number;
  cod_min_order: number;
  cod_max_order: number;
  low_stock_threshold: number;
  order_prefix: string;
  invoice_prefix: string;
  instagram_url?: string;
  facebook_url?: string;
  twitter_url?: string;
}

export interface FeaturedCollectionItem {
  id: string;
  collection_id?: string;
  collection_slug?: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  is_active: boolean;
  sort_order: number;
}

export interface FeaturedCollectionsConfig {
  section_subtitle?: string; // e.g. "CURATED CATEGORIES"
  section_title?: string; // e.g. "EXPLORE THE EDITIONS"
  aspect_ratio: '1:1' | '4:5'; // '1:1' (square) or '4:5' (editorial portrait)
  items: FeaturedCollectionItem[];
  updated_at?: string;
}

export * from './navigation';
export * from './offerPopup';

