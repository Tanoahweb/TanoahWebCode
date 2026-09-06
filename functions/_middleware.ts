// Cloudflare Pages Edge Middleware: functions/_middleware.ts
// Handles:
// 1. Instant 301/302 redirects from database
// 2. Trailing slash normalizer (301)
// 3. Search Crawler & Social Scraper Detection (Googlebot, Bingbot, WhatsApp, Twitterbot, etc.)
// 4. Edge SSR Pre-rendering (injected canonical, title, meta, JSON-LD schema & semantic crawler HTML)
// 5. True HTTP 404 Status Code for non-existent entities & automated 404 logging

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const DEFAULT_SUPABASE_URL = 'https://udbwhvszzocltandpgoy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYndodnN6em9jbHRhbmRwZ295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTk4MjUsImV4cCI6MjEwMzkzNTgyNX0.3MwB_CqrelAkQZv1pYG-4c059dqMAK8g036QAkprK-E';
const CANONICAL_DOMAIN = 'https://tanoah.com';

// Search crawlers & social media unfurl bots
const CRAWLER_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'slurp',
  'baiduspider',
  'twitterbot',
  'facebookexternalhit',
  'facebot',
  'pinterest',
  'whatsapp',
  'linkedinbot',
  'slackbot',
  'applebot',
  'sogou',
  'exabot',
  'ia_archiver',
];

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((bot) => ua.includes(bot));
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const userAgent = context.request.headers.get('user-agent') || '';

  const supabaseUrl = context.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  // 1. Skip static assets, internal APIs, sitemaps, robots.txt, and feeds
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/feeds/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/Assets/') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|xml|txt|json)$/i.test(pathname)
  ) {
    return context.next();
  }

  // 2. Trailing Slash Normalizer (Strip trailing slash with 301, except root /)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const cleanPath = pathname.slice(0, -1);
    url.pathname = cleanPath;
    return Response.redirect(url.toString(), 301);
  }

  // 3. Automated 301/302 Redirect Interceptor (DB lookup)
  try {
    const redirectRes = await fetch(
      `${supabaseUrl}/rest/v1/seo_redirects?from_url=eq.${encodeURIComponent(pathname.toLowerCase())}&is_active=eq.true&select=id,to_url,status_code,hits&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (redirectRes.ok) {
      const redirects = (await redirectRes.json()) as any[];
      if (redirects && redirects.length > 0) {
        const redir = redirects[0];
        const dest = redir.to_url.startsWith('http')
          ? redir.to_url
          : `${url.origin}${redir.to_url}`;

        // Increment hit count asynchronously without blocking
        context.waitUntil(
          fetch(`${supabaseUrl}/rest/v1/seo_redirects?id=eq.${redir.id}`, {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              hits: (redir.hits || 0) + 1,
              last_accessed_at: new Date().toISOString(),
            }),
          }).catch(() => {})
        );

        return Response.redirect(dest, redir.status_code || 301);
      }
    }
  } catch (err) {
    // Non-blocking redirect check failure
  }

  // 4. Determine if request is from a search crawler or social media unfurl bot
  const botDetected = isCrawler(userAgent);

  // If not a crawler, serve standard SPA response immediately
  if (!botDetected) {
    return context.next();
  }

  // 5. CRAWLER & BOT PATH: Execute Edge SSR Injection
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();

  try {
    // Case A: Product Detail Page (/products/:slug)
    const productMatch = pathname.match(/^\/products\/([^\/]+)$/);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]).toLowerCase();
      const pRes = await fetch(
        `${supabaseUrl}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=*,images:product_images(*),variants:product_variants(*)&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (pRes.ok) {
        const pData = (await pRes.json()) as any[];
        if (pData && pData.length > 0) {
          const prod = pData[0];
          const pageTitle = prod.seo_title || `${prod.title} | TANOAH`;
          const pageDesc =
            prod.seo_description ||
            prod.short_description ||
            prod.description?.substring(0, 155) ||
            `Discover ${prod.title} by TANOAH. Handcrafted luxury women’s clothing from Kerala, India.`;
          const canonicalUrl = `${CANONICAL_DOMAIN}/products/${prod.slug}`;
          const primaryImg =
            prod.images?.find((img: any) => img.is_primary)?.image_url ||
            prod.images?.[0]?.image_url ||
            `${CANONICAL_DOMAIN}/Assets/brand/tanoah-social-share.jpg`;
          const fullImgUrl = primaryImg.startsWith('http') ? primaryImg : `${CANONICAL_DOMAIN}${primaryImg}`;
          const price = (prod.sale_price ?? prod.base_price ?? 0).toFixed(2);
          const inStock = (prod.variants || []).some((v: any) => (v.stock_quantity ?? 1) > 0);

          // Build Product JSON-LD
          const productJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: prod.title,
            description: pageDesc,
            image: [fullImgUrl],
            sku: prod.variants?.[0]?.sku || `TAN-${prod.slug.toUpperCase()}`,
            brand: { '@type': 'Brand', name: 'TANOAH' },
            offers: {
              '@type': 'Offer',
              url: canonicalUrl,
              priceCurrency: 'INR',
              price,
              itemCondition: 'https://schema.org/NewCondition',
              availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              seller: { '@type': 'Organization', name: 'TANOAH' },
            },
          };

          // SSR Meta Tags & Structured Data Injection
          const headInjection = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDesc)}" />
    <meta property="og:image" content="${fullImgUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="TANOAH" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDesc)}" />
    <meta name="twitter:image" content="${fullImgUrl}" />
    <script type="application/ld+json">${JSON.stringify(productJsonLd)}</script>`;

          // Semantic HTML for crawlers
          const crawlerHtml = `
    <div id="ssr-crawler-content" style="display:none;">
      <h1>${escapeHtml(prod.title)}</h1>
      <p>${escapeHtml(pageDesc)}</p>
      <div>Brand: TANOAH</div>
      <div>Price: INR ${price}</div>
      <div>Availability: ${inStock ? 'In Stock' : 'Out of Stock'}</div>
      <div>Category: Luxury Handcrafted Women's Wear</div>
    </div>`;

          html = html.replace(/<title>.*?<\/title>/i, '');
          html = html.replace('</head>', `${headInjection}\n  </head>`);
          html = html.replace('<div id="root"></div>', `<div id="root">${crawlerHtml}</div>`);

          return new Response(html, {
            status: 200,
            headers: response.headers,
          });
        }
      }

      // Product Not Found -> True 404 & Logging
      context.waitUntil(
        fetch(`${supabaseUrl}/rest/v1/seo_404_logs`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            url: pathname,
            referrer: context.request.headers.get('referer') || null,
            user_agent: userAgent,
            hits: 1,
          }),
        }).catch(() => {})
      );

      const notFoundHtml = `<!DOCTYPE html><html lang="en"><head><title>Product Not Found | TANOAH</title><meta name="robots" content="noindex, follow" /></head><body><h1>404 - Product Not Found</h1><p>The requested luxury garment is unavailable. <a href="/">Return to TANOAH Storefront</a></p></body></html>`;
      return new Response(notFoundHtml, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Case B: Collection Page (/collections/:slug)
    const collectionMatch = pathname.match(/^\/collections\/([^\/]+)$/);
    if (collectionMatch) {
      const slug = decodeURIComponent(collectionMatch[1]).toLowerCase();
      const cRes = await fetch(
        `${supabaseUrl}/rest/v1/collections?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (cRes.ok) {
        const cData = (await cRes.json()) as any[];
        if (cData && cData.length > 0) {
          const col = cData[0];
          const pageTitle = col.seo_title || `${col.title} - Curated Editions | TANOAH`;
          const pageDesc =
            col.seo_description ||
            col.description ||
            `Explore the ${col.title} edit at TANOAH. Handcrafted designer clothing tailored with timeless aesthetics.`;
          const canonicalUrl = `${CANONICAL_DOMAIN}/collections/${col.slug}`;
          const banner = col.banner_image || `${CANONICAL_DOMAIN}/Assets/brand/tanoah-social-share.jpg`;

          const headInjection = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDesc)}" />
    <meta property="og:image" content="${banner}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />`;

          html = html.replace(/<title>.*?<\/title>/i, '');
          html = html.replace('</head>', `${headInjection}\n  </head>`);
          return new Response(html, { status: 200, headers: response.headers });
        }
      }
    }

    // Case C: Blog Article (/blog/:slug)
    const blogMatch = pathname.match(/^\/blog\/([^\/]+)$/);
    if (blogMatch) {
      const slug = decodeURIComponent(blogMatch[1]).toLowerCase();
      const bRes = await fetch(
        `${supabaseUrl}/rest/v1/blog_articles?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=*&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (bRes.ok) {
        const bData = (await bRes.json()) as any[];
        if (bData && bData.length > 0) {
          const art = bData[0];
          const pageTitle = art.seo_title || `${art.title} | TANOAH Journal`;
          const pageDesc = art.seo_description || art.excerpt || 'Read handcrafted luxury and styling stories from TANOAH.';
          const canonicalUrl = `${CANONICAL_DOMAIN}/blog/${art.slug}`;
          const featImg = art.featured_image || `${CANONICAL_DOMAIN}/Assets/brand/tanoah-social-share.jpg`;

          const articleJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: art.title,
            description: pageDesc,
            image: [featImg],
            datePublished: art.published_at || art.created_at,
            author: { '@type': 'Person', name: art.author_name || 'TANOAH Editorial Team' },
            publisher: { '@type': 'Organization', name: 'TANOAH', logo: { '@type': 'ImageObject', url: `${CANONICAL_DOMAIN}/Assets/brand/tanoah-logo.svg` } },
          };

          const headInjection = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDesc)}" />
    <meta property="og:image" content="${featImg}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <script type="application/ld+json">${JSON.stringify(articleJsonLd)}</script>`;

          html = html.replace(/<title>.*?<\/title>/i, '');
          html = html.replace('</head>', `${headInjection}\n  </head>`);
          return new Response(html, { status: 200, headers: response.headers });
        }
      }
    }

    // Case D: Private routes must always be noindex
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/cart') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/search')
    ) {
      html = html.replace('</head>', `    <meta name="robots" content="noindex, nofollow" />\n  </head>`);
      return new Response(html, { status: 200, headers: response.headers });
    }

    // Default fallback: inject standard Organization & WebSite schema
    const defaultJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'TANOAH',
      url: CANONICAL_DOMAIN,
      logo: `${CANONICAL_DOMAIN}/Assets/brand/tanoah-logo.svg`,
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
    };

    html = html.replace('</head>', `    <script type="application/ld+json">${JSON.stringify(defaultJsonLd)}</script>\n  </head>`);
    return new Response(html, { status: 200, headers: response.headers });
  } catch {
    return response;
  }
};
