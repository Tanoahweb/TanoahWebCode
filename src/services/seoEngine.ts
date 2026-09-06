import { Product, Category, Collection, StoreSettings, ProductReview } from '@/types';
import { BlogArticle, StoreSEOConfig, SEORedirect } from '@/types/seo';
import { supabase } from './supabase';

export const DEFAULT_CANONICAL_DOMAIN = 'https://tanoah.com';

export const DEFAULT_SEO_CONFIG: StoreSEOConfig = {
  site_title_template: '%s | TANOAH',
  default_meta_description:
    'Discover TANOAH — Luxury handcrafted women’s clothing, designer kurtas, festive ensembles, and contemporary silhouettes from Kerala, India.',
  canonical_domain: DEFAULT_CANONICAL_DOMAIN,
  google_site_verification: '',
  bing_site_verification: '',
  ga4_measurement_id: '',
  meta_pixel_id: '',
  default_social_image: 'https://tanoah.com/Assets/brand/tanoah-social-share.jpg',
  social_links: {
    instagram: 'https://instagram.com/tanoah',
    facebook: 'https://facebook.com/tanoah',
    pinterest: 'https://pinterest.com/tanoah',
  },
};

/**
 * Generate clean, URL-safe slugs
 * Lowercase, alphanumeric & hyphens only, no trailing/leading hyphens
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // separate accents from letters
    .replace(/[\u0300-\u036f]/g, '') // remove accent diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid characters
    .replace(/[\s_]+/g, '-') // collapse spaces and underscores to a single dash
    .replace(/-+/g, '-') // collapse consecutive dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Normalizes URL and strips tracking query parameters + faceted filter queries
 * for strict canonical compliance.
 */
export function normalizeCanonicalUrl(rawPathOrUrl: string, baseDomain: string = DEFAULT_CANONICAL_DOMAIN): string {
  if (!rawPathOrUrl) return baseDomain;

  try {
    const isAbsolute = rawPathOrUrl.startsWith('http://') || rawPathOrUrl.startsWith('https://');
    const url = isAbsolute ? new URL(rawPathOrUrl) : new URL(rawPathOrUrl, baseDomain);

    // Force configured canonical base domain
    const cleanDomain = (baseDomain || DEFAULT_CANONICAL_DOMAIN).replace(/\/+$/, '');

    // Path normalization: lowercase and remove trailing slash (unless root /)
    let pathname = url.pathname.toLowerCase();
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Strip tracking parameters (Google, Facebook, Mailchimp, generic referrers)
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'gclsrc',
      'fbclid',
      'srsltid',
      'ref',
      'source',
      'mc_eid',
      'campaign',
      'adgroup',
      '_ga',
      '_gl',
    ];

    // Strip faceted navigation filter parameters from canonical URLs
    // Base category/collection pages must be the canonical URL to prevent crawl traps and duplicate content
    const facetedFilterParams = [
      'color',
      'size',
      'sort',
      'price_min',
      'price_max',
      'min_price',
      'max_price',
      'availability',
      'in_stock',
      'gender',
      'fabric',
      'discount',
      'view',
    ];

    trackingParams.forEach((param) => url.searchParams.delete(param));
    facetedFilterParams.forEach((param) => url.searchParams.delete(param));

    // Preserve paginated query parameter if page > 1 (clean e-commerce pagination standard)
    const pageVal = url.searchParams.get('page');
    if (pageVal === '1') {
      url.searchParams.delete('page');
    }

    const search = url.searchParams.toString();
    return `${cleanDomain}${pathname}${search ? `?${search}` : ''}`;
  } catch {
    return `${baseDomain}${rawPathOrUrl.startsWith('/') ? rawPathOrUrl : `/${rawPathOrUrl}`}`;
  }
}

/**
 * Truncate description cleanly at a word boundary
 */
export function truncateDescription(text: string, maxLength: number = 155): string {
  if (!text) return '';
  const clean = text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  const truncated = clean.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? `${truncated.substring(0, lastSpace)}...` : `${truncated}...`;
}

/**
 * Compute Product Meta with automated fallbacks
 */
export function getProductMeta(product: Partial<Product>, settings?: Partial<StoreSettings>) {
  const domain = settings?.seo_config?.canonical_domain || DEFAULT_CANONICAL_DOMAIN;
  const brandName = 'TANOAH';

  // Smart title fallback: {Product Title} | TANOAH
  const title =
    product.seo_title?.trim() ||
    `${product.title?.trim()} | ${brandName}`;

  // Smart description fallback: Clean description + fabric/occasion notes
  let fallbackDesc = product.short_description || product.description || '';
  if (!fallbackDesc) {
    fallbackDesc = `Shop ${product.title} by ${brandName}. Handcrafted luxury women’s apparel with breathable artisanal drape and enduring elegance.`;
  }
  const description = product.seo_description?.trim() || truncateDescription(fallbackDesc, 155);

  const primaryImage =
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    settings?.seo_config?.default_social_image ||
    DEFAULT_SEO_CONFIG.default_social_image;

  const canonical = product.canonical_url_override?.trim()
    ? product.canonical_url_override.trim()
    : normalizeCanonicalUrl(`/products/${product.slug || product.id}`, domain);

  const isNoindex = !!product.is_noindex || product.status !== 'active';

  return {
    title,
    description,
    image: primaryImage,
    canonical,
    isNoindex,
  };
}

/**
 * Compute Category Meta with automated fallbacks
 */
export function getCategoryMeta(category: Partial<Category>, settings?: Partial<StoreSettings>) {
  const domain = settings?.seo_config?.canonical_domain || DEFAULT_CANONICAL_DOMAIN;
  const brandName = 'TANOAH';

  const title =
    category.seo_title?.trim() ||
    `${category.name?.trim()} - Women's Designer Wear | ${brandName}`;

  const description =
    category.seo_description?.trim() ||
    truncateDescription(
      category.description ||
        `Explore the ${category.name} collection at ${brandName}. Handcrafted luxury silhouettes tailored with artisanal grace and contemporary aesthetics.`,
      155
    );

  const image = category.image_url || settings?.seo_config?.default_social_image || DEFAULT_SEO_CONFIG.default_social_image;
  const canonical = normalizeCanonicalUrl(`/categories/${category.slug || category.id}`, domain);

  return {
    title,
    description,
    image,
    canonical,
    isNoindex: !!category.is_noindex,
  };
}

/**
 * Compute Collection Meta with automated fallbacks
 */
export function getCollectionMeta(collection: Partial<Collection>, settings?: Partial<StoreSettings>) {
  const domain = settings?.seo_config?.canonical_domain || DEFAULT_CANONICAL_DOMAIN;
  const brandName = 'TANOAH';

  const title =
    collection.seo_title?.trim() ||
    `${collection.title?.trim()} - Curated Editions | ${brandName}`;

  const description =
    collection.seo_description?.trim() ||
    truncateDescription(
      collection.description ||
        `Discover the ${collection.title} edit at ${brandName}. Premium handcrafted clothing celebrating modern femininity and Indian heritage.`,
      155
    );

  const image = collection.banner_image || settings?.seo_config?.default_social_image || DEFAULT_SEO_CONFIG.default_social_image;
  const canonical = normalizeCanonicalUrl(`/collections/${collection.slug || collection.id}`, domain);

  return {
    title,
    description,
    image,
    canonical,
    isNoindex: !!collection.is_noindex,
  };
}

/**
 * Compute Blog Article Meta with automated fallbacks
 */
export function getBlogMeta(article: Partial<BlogArticle>, settings?: Partial<StoreSettings>) {
  const domain = settings?.seo_config?.canonical_domain || DEFAULT_CANONICAL_DOMAIN;

  const title =
    article.seo_title?.trim() ||
    `${article.title?.trim()} | TANOAH Journal`;

  const description =
    article.seo_description?.trim() ||
    truncateDescription(
      article.excerpt || article.content || 'Read stories of handcrafted luxury, styling inspiration, and textile craftsmanship at TANOAH.',
      155
    );

  const image = article.featured_image || settings?.seo_config?.default_social_image || DEFAULT_SEO_CONFIG.default_social_image;
  const canonical = normalizeCanonicalUrl(`/blog/${article.slug || article.id}`, domain);

  return {
    title,
    description,
    image,
    canonical,
    isNoindex: !article.is_published,
  };
}

/* ==========================================================================
   JSON-LD STRUCTURED DATA GENERATORS (Schema.org)
   ========================================================================== */

/**
 * Generates Google Product Schema JSON-LD
 * Includes pricing in INR, stock availability, brand info, and genuine reviews ONLY.
 */
export function generateProductJsonLd(
  product: Product,
  reviews: ProductReview[] = [],
  baseDomain: string = DEFAULT_CANONICAL_DOMAIN
) {
  const domain = baseDomain.replace(/\/+$/, '');
  const url = `${domain}/products/${product.slug}`;
  const images = (product.images || []).map((img) =>
    img.image_url.startsWith('http') ? img.image_url : `${domain}${img.image_url}`
  );

  const totalStock = (product.variants || []).reduce(
    (acc, v) => acc + (v.stock_quantity ?? (v.is_active !== false ? 1 : 0)),
    0
  );
  const isInStock = totalStock > 0;

  const currentPrice = (product.sale_price ?? product.base_price).toFixed(2);
  const compareAtPrice = product.compare_at_price ? product.compare_at_price.toFixed(2) : undefined;

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: truncateDescription(product.short_description || product.description || product.title, 300),
    image: images.length > 0 ? images : undefined,
    sku: product.variants?.[0]?.sku || `TAN-${product.slug.toUpperCase()}`,
    brand: {
      '@type': 'Brand',
      name: 'TANOAH',
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: currentPrice,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: isInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'TANOAH',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'INR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IN',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };

  // Structured attributes support (fabric, pattern, fit)
  if (product.structured_attributes) {
    if (product.structured_attributes.fabric) {
      schema.material = product.structured_attributes.fabric;
    }
    if (product.structured_attributes.pattern) {
      schema.pattern = product.structured_attributes.pattern;
    }
    if (product.structured_attributes.fit) {
      schema.size = product.structured_attributes.fit;
    }
  }

  // Only include aggregateRating and reviews when GENUINE reviews exist!
  const validReviews = (reviews || []).filter((r) => r && r.status === 'approved');
  if (validReviews.length > 0) {
    const totalScore = validReviews.reduce((sum, r) => sum + (r.rating || 5), 0);
    const avgScore = (totalScore / validReviews.length).toFixed(1);

    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgScore,
      reviewCount: validReviews.length,
      bestRating: '5',
      worstRating: '1',
    };

    schema.review = validReviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.author_name || 'Verified Buyer',
      },
      datePublished: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : undefined,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating || 5,
        bestRating: '5',
        worstRating: '1',
      },
      reviewBody: r.review_text,
    }));
  }

  return schema;
}

/**
 * Generates Organization Schema JSON-LD for TANOAH
 */
export function generateOrganizationJsonLd(
  settings?: Partial<StoreSettings>,
  baseDomain: string = DEFAULT_CANONICAL_DOMAIN
) {
  const domain = (settings?.seo_config?.canonical_domain || baseDomain).replace(/\/+$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TANOAH',
    url: domain,
    logo: `${domain}/Assets/brand/tanoah-logo.svg`,
    description:
      'TANOAH is a luxury handcrafted women’s clothing atelier based in Thrissur, Kerala, India.',
    telephone: '+91 8714141849',
    email: 'connectus.tanoah@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rappal, Pudukkad P O',
      addressLocality: 'Thrissur',
      addressRegion: 'Kerala',
      postalCode: '680301',
      addressCountry: 'IN',
    },
    sameAs: [
      settings?.seo_config?.social_links?.instagram || 'https://instagram.com/tanoah',
      settings?.seo_config?.social_links?.facebook || 'https://facebook.com/tanoah',
      settings?.seo_config?.social_links?.pinterest || 'https://pinterest.com/tanoah',
    ].filter(Boolean),
  };
}

/**
 * Generates BreadcrumbList Schema JSON-LD
 */
export function generateBreadcrumbJsonLd(
  items: { name: string; path: string }[],
  baseDomain: string = DEFAULT_CANONICAL_DOMAIN
) {
  const domain = baseDomain.replace(/\/+$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${domain}${item.path}`,
    })),
  };
}

/**
 * Generates BlogPosting Schema JSON-LD
 */
export function generateBlogPostingJsonLd(
  article: BlogArticle,
  baseDomain: string = DEFAULT_CANONICAL_DOMAIN
) {
  const domain = baseDomain.replace(/\/+$/, '');
  const url = `${domain}/blog/${article.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: article.title,
    description: article.seo_description || article.excerpt,
    image: article.featured_image ? [article.featured_image] : undefined,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || article.published_at || article.created_at,
    author: {
      '@type': 'Person',
      name: article.author_name || 'TANOAH Editorial Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'TANOAH',
      logo: {
        '@type': 'ImageObject',
        url: `${domain}/Assets/brand/tanoah-logo.svg`,
      },
    },
  };
}

/**
 * Generates CollectionPage & ItemList Schema JSON-LD
 */
export function generateCollectionJsonLd(
  collectionTitle: string,
  products: Product[],
  collectionPath: string,
  baseDomain: string = DEFAULT_CANONICAL_DOMAIN
) {
  const domain = baseDomain.replace(/\/+$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collectionTitle,
    url: `${domain}${collectionPath}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 24).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${domain}/products/${p.slug}`,
        name: p.title,
      })),
    },
  };
}

/* ==========================================================================
   AUTOMATED 301 REDIRECT RECORDING HELPER
   ========================================================================== */

/**
 * Detects if a slug was modified and automatically creates an active 301 redirect
 * to safeguard organic rankings and prevent 404 dead links.
 */
export async function recordRedirectIfSlugChanged(
  type: 'products' | 'categories' | 'collections' | 'blog',
  oldSlug: string | undefined,
  newSlug: string | undefined,
  entityName: string = 'Item'
): Promise<boolean> {
  if (!oldSlug || !newSlug || oldSlug.trim() === newSlug.trim()) {
    return false;
  }

  const cleanOld = oldSlug.trim().toLowerCase();
  const cleanNew = newSlug.trim().toLowerCase();

  const fromUrl = `/${type}/${cleanOld}`;
  const toUrl = `/${type}/${cleanNew}`;

  try {
    const { error } = await supabase.from('seo_redirects').upsert(
      {
        from_url: fromUrl,
        to_url: toUrl,
        status_code: 301,
        reason: `${entityName} slug renamed from '${cleanOld}' to '${cleanNew}'`,
        created_by: 'system_auto_slug_tracker',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'from_url' }
    );

    if (error) {
      console.warn('Failed to record automated 301 redirect:', error);
      return false;
    }

    console.log(`[SEO Engine] Successfully created 301 redirect: ${fromUrl} -> ${toUrl}`);
    return true;
  } catch (err) {
    console.error('Error recording automated redirect:', err);
    return false;
  }
}
