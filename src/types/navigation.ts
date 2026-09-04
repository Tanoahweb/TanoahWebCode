export interface MegaMenuSubLink {
  id: string;
  label: string;
  url: string;
  badge?: string; // e.g. "NEW", "HOT", "SS26", "SALE"
  is_active: boolean;
  collection_id?: string;
  collection_slug?: string;
}

export interface MegaMenuColumn {
  id: string;
  title: string; // e.g. "MEN", "WOMEN", "CURATED EDITS"
  view_all_label?: string; // e.g. "VIEW ALL"
  view_all_url?: string; // e.g. "/collections/men"
  links: MegaMenuSubLink[];
  auto_sync_collections?: boolean; // When true, automatically syncs and lists store collections
  collection_filter?: 'all' | 'men' | 'women' | 'curated';
}

export interface MegaMenuBanner {
  id: string;
  badge: string; // e.g. "LIMITED EDITION"
  title: string; // e.g. "THE TIMELESS CAPSULE"
  subtitle?: string;
  image_url: string; // e.g. "/Assets/hero/hero-mobile.jpg"
  cta_label: string; // e.g. "DISCOVER NOW"
  cta_url: string; // e.g. "/collections/new-arrivals"
  is_active: boolean;
}

export interface HeaderMenuItem {
  id: string;
  label: string; // e.g. "SHOP", "MEN", "WOMEN", "NEW ARRIVALS", "SALE", "LOOKBOOK"
  url: string; // e.g. "/collections/all", "/collections/men", "/lookbook"
  sort_order: number;
  is_active: boolean;
  highlight_style?: 'default' | 'bold' | 'colored' | 'badge';
  badge_text?: string; // e.g. "NEW", "SALE", "20% OFF"
  has_mega_menu: boolean;
  mega_menu?: {
    columns: MegaMenuColumn[];
    banner?: MegaMenuBanner;
  };
}

export interface NavigationConfig {
  header_menu: HeaderMenuItem[];
  updated_at?: string;
}
