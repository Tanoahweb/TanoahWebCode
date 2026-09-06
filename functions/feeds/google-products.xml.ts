// Cloudflare Pages Function: GET /feeds/google-products.xml
// Dynamic Google Merchant Center RSS 2.0 XML Product Feed for Google Shopping

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
  const supabaseUrl = context.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  let itemsXml = '';

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/products?status=eq.active&select=*,images:product_images(*),variants:product_variants(*)&order=updated_at.desc`,
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
        const link = `${DOMAIN}/products/${p.slug}`;
        const title = p.seo_title || `${p.title} | TANOAH`;
        const description =
          p.seo_description ||
          p.short_description ||
          p.description?.substring(0, 500) ||
          `Shop ${p.title} by TANOAH. Luxury handcrafted women's designer wear.`;

        const primaryImg =
          p.images?.find((img: any) => img.is_primary)?.image_url ||
          p.images?.[0]?.image_url ||
          `${DOMAIN}/Assets/brand/tanoah-social-share.jpg`;
        const fullImg = primaryImg.startsWith('http') ? primaryImg : `${DOMAIN}${primaryImg}`;

        const basePrice = parseFloat(p.base_price || 0).toFixed(2);
        const salePrice = p.sale_price ? parseFloat(p.sale_price).toFixed(2) : null;

        const inStock = (p.variants || []).some((v: any) => (v.stock_quantity ?? 1) > 0);
        const availability = inStock ? 'in_stock' : 'out_of_stock';
        const sku = p.variants?.[0]?.sku || `TAN-${p.slug.toUpperCase()}`;

        let additionalImagesXml = '';
        const additionalImgs = (p.images || [])
          .filter((img: any) => img.image_url !== primaryImg)
          .slice(0, 5);

        additionalImgs.forEach((img: any) => {
          const addUrl = img.image_url.startsWith('http') ? img.image_url : `${DOMAIN}${img.image_url}`;
          additionalImagesXml += `\n      <g:additional_image_link>${escapeXml(addUrl)}</g:additional_image_link>`;
        });

        itemsXml += `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(fullImg)}</g:image_link>${additionalImagesXml}
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${basePrice} INR</g:price>${
        salePrice ? `\n      <g:sale_price>${salePrice} INR</g:sale_price>` : ''
      }
      <g:brand>TANOAH</g:brand>
      <g:mpn>${escapeXml(sku)}</g:mpn>
      <g:identifier_exists>true</g:identifier_exists>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Standard</g:service>
        <g:price>0.00 INR</g:price>
      </g:shipping>
    </item>`;
      });
    }
  } catch (err) {
    console.error('Error generating Google Product Feed:', err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>TANOAH Luxury Women's Clothing Product Feed</title>
    <link>${DOMAIN}</link>
    <description>Handcrafted luxury women’s clothing, designer kurtas, and celebratory ensembles from Kerala, India.</description>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=7200, s-maxage=14400',
    },
  });
};
