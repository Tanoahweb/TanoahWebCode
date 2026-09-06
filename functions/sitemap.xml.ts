// Cloudflare Pages Function: GET /sitemap.xml
// Dynamic XML Sitemap Index referencing specialized sub-sitemaps

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const domain = 'https://tanoah.com';
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${domain}/sitemaps/products.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemaps/categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemaps/collections.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemaps/blog.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemaps/pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=14400',
    },
  });
};
