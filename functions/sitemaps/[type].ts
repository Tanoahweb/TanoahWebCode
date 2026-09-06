// Cloudflare Pages Function: GET /sitemaps/[type].ts
// Handles products.xml, categories.xml, collections.xml, blog.xml, pages.xml

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

const DEFAULT_SUPABASE_URL = 'https://udbwhvszzocltandpgoy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYndodnN6em9jbHRhbmRwZ295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTk4MjUsImV4cCI6MjEwMzkzNTgyNX0.3MwB_CqrelAkQZv1pYG-4c059dqMAK8g036QAkprK-E';
const DOMAIN = 'https://tanoah.com';

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const typeParam = (context.params.type as string) || '';
  const type = typeParam.replace(/\.xml$/i, '').toLowerCase();

  const supabaseUrl = context.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  let urlNodes: string[] = [];

  try {
    if (type === 'products') {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/products?status=eq.active&select=id,slug,title,short_description,updated_at,created_at,images:product_images(image_url,alt_text,is_primary)&order=updated_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (res.ok) {
        const products = (await res.json()) as any[];
        products.forEach((p) => {
          const loc = `${DOMAIN}/products/${p.slug}`;
          const lastmod = (p.updated_at || p.created_at || new Date().toISOString()).split('T')[0];

          let imageXml = '';
          const images = (p.images || []).slice(0, 5);
          images.forEach((img: any) => {
            const imgUrl = img.image_url.startsWith('http') ? img.image_url : `${DOMAIN}${img.image_url}`;
            imageXml += `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(img.alt_text || p.title)}</image:title>
      <image:caption>${escapeXml(p.short_description || p.title)}</image:caption>
    </image:image>`;
          });

          urlNodes.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${imageXml}
  </url>`);
        });
      }
    } else if (type === 'categories') {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/categories?is_active=eq.true&select=slug,created_at&order=sort_order.asc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (res.ok) {
        const categories = (await res.json()) as any[];
        categories.forEach((c) => {
          const loc = `${DOMAIN}/categories/${c.slug}`;
          const lastmod = (c.created_at || new Date().toISOString()).split('T')[0];
          urlNodes.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
        });
      }
    } else if (type === 'collections') {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/collections?is_active=eq.true&select=slug,created_at&order=sort_order.asc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (res.ok) {
        const collections = (await res.json()) as any[];
        collections.forEach((c) => {
          const loc = `${DOMAIN}/collections/${c.slug}`;
          const lastmod = (c.created_at || new Date().toISOString()).split('T')[0];
          urlNodes.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
        });
      }
    } else if (type === 'blog') {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/blog_articles?is_published=eq.true&select=slug,title,featured_image,featured_image_alt,published_at,updated_at&order=published_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      // Blog index page
      urlNodes.push(`  <url>
    <loc>${DOMAIN}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);

      if (res.ok) {
        const articles = (await res.json()) as any[];
        articles.forEach((a) => {
          const loc = `${DOMAIN}/blog/${a.slug}`;
          const lastmod = (a.updated_at || a.published_at || new Date().toISOString()).split('T')[0];
          let imgXml = '';
          if (a.featured_image) {
            imgXml = `
    <image:image>
      <image:loc>${escapeXml(a.featured_image)}</image:loc>
      <image:title>${escapeXml(a.featured_image_alt || a.title)}</image:title>
    </image:image>`;
          }

          urlNodes.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imgXml}
  </url>`);
        });
      }
    } else if (type === 'pages') {
      const staticPages = [
        { path: '/', priority: '1.0', changefreq: 'daily' },
        { path: '/collections/all', priority: '0.9', changefreq: 'daily' },
        { path: '/about', priority: '0.7', changefreq: 'monthly' },
        { path: '/contact', priority: '0.7', changefreq: 'monthly' },
        { path: '/shipping-policy', priority: '0.5', changefreq: 'monthly' },
        { path: '/returns-policy', priority: '0.5', changefreq: 'monthly' },
        { path: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
        { path: '/terms-conditions', priority: '0.5', changefreq: 'monthly' },
      ];

      const today = new Date().toISOString().split('T')[0];
      staticPages.forEach((p) => {
        urlNodes.push(`  <url>
    <loc>${DOMAIN}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);
      });
    } else {
      return new Response('Sitemap type not found', { status: 404 });
    }
  } catch (err) {
    return new Response('Error generating sitemap', { status: 500 });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlNodes.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=14400',
    },
  });
};
