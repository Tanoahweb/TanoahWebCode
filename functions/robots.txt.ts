// Cloudflare Pages Function: GET /robots.txt
// Dynamic robots.txt providing instructions for search engines and bots

export const onRequestGet: PagesFunction = async () => {
  const content = `# Robots.txt for TANOAH (https://tanoah.com)
User-agent: *
Disallow: /admin/
Disallow: /checkout
Disallow: /cart
Disallow: /account
Disallow: /search
Disallow: /api/
Allow: /

# Dedicated crawler guidelines
User-agent: Googlebot
Disallow: /admin/
Disallow: /checkout
Disallow: /cart
Disallow: /account
Disallow: /search
Disallow: /api/
Allow: /

User-agent: Googlebot-Image
Allow: /Assets/
Allow: /assets/
Allow: /media/

# XML Sitemaps
Sitemap: https://tanoah.com/sitemap.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
