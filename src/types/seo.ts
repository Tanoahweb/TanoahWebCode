export interface StoreSEOConfig {
  site_title_template: string;
  default_meta_description: string;
  canonical_domain: string;
  google_site_verification: string;
  bing_site_verification: string;
  ga4_measurement_id: string;
  meta_pixel_id: string;
  default_social_image: string;
  social_links: {
    instagram?: string;
    facebook?: string;
    pinterest?: string;
    youtube?: string;
    twitter?: string;
  };
}

export interface StructuredProductAttributes {
  fabric?: string;
  pattern?: string;
  fit?: string;
  occasion?: string;
  sleeve_type?: string;
  neckline?: string;
  wash_care?: string;
  origin?: string;
  transparency?: string;
  closure?: string;
  [key: string]: string | undefined;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  featured_image_alt?: string;
  author_name: string;
  category: string;
  tags: string[];
  seo_title?: string;
  seo_description?: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface SEORedirect {
  id: string;
  from_url: string;
  to_url: string;
  status_code: number;
  hits: number;
  reason?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  last_accessed_at?: string;
}

export interface SEO404Log {
  id: string;
  url: string;
  referrer?: string;
  user_agent?: string;
  hits: number;
  resolved_to_redirect_id?: string;
  created_at: string;
  last_occurred_at: string;
}

export interface SEOAuditIssue {
  id: string;
  type: 'product' | 'category' | 'collection' | 'image' | 'system';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  target_url?: string;
  entity_id?: string;
  fix_label?: string;
  fix_url?: string;
}

export interface SEOAuditSummary {
  score: number;
  totalProducts: number;
  missingMetaDescriptions: number;
  missingSeoTitles: number;
  missingImageAlts: number;
  activeRedirects: number;
  unresolved404s: number;
  issues: SEOAuditIssue[];
}
