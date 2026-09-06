import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  ExternalLink,
  Copy,
  Search,
  ShieldCheck,
  Save,
  Radio,
  Sparkles,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useUIStore } from '@/store/useUIStore';
import { api } from '@/services/api';
import { StoreSEOConfig } from '@/types/seo';
import { DEFAULT_SEO_CONFIG, DEFAULT_CANONICAL_DOMAIN } from '@/services/seoEngine';

export const SeoSettingsTab: React.FC = () => {
  const { addToast } = useUIStore();
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const [seoConfig, setSeoConfig] = useState<StoreSEOConfig>(DEFAULT_SEO_CONFIG);

  useEffect(() => {
    let isMounted = true;
    api.getStoreSettings().then((settings) => {
      if (isMounted && settings?.seo_config) {
        setSeoConfig({
          ...DEFAULT_SEO_CONFIG,
          ...settings.seo_config,
          social_links: {
            ...DEFAULT_SEO_CONFIG.social_links,
            ...(settings.seo_config.social_links || {}),
          },
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    addToast({ type: 'success', title: 'Copied to Clipboard', description: url });
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await api.saveStoreSettings({
        seo_config: seoConfig,
      } as any);

      if (success) {
        addToast({
          type: 'success',
          title: 'SEO Settings Saved',
          description: 'Global domain, verification tags, and tracking IDs updated.',
        });
      } else {
        throw new Error('Could not save SEO configuration');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Please check your connection.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canonicalDomain = seoConfig.canonical_domain || DEFAULT_CANONICAL_DOMAIN;

  const feeds = [
    {
      title: 'XML Sitemap Index',
      description: 'Master sitemap index linking all sub-sitemaps for Google & Bing webmaster consoles.',
      url: `${canonicalDomain}/sitemap.xml`,
    },
    {
      title: 'Products Sub-Sitemap',
      description: 'All active catalog products with image URLs, titles, captions, and change frequency.',
      url: `${canonicalDomain}/sitemaps/products.xml`,
    },
    {
      title: 'Categories & Collections Sitemaps',
      description: 'Curated editions and category taxonomies.',
      url: `${canonicalDomain}/sitemaps/collections.xml`,
    },
    {
      title: 'Editorial Blog Sitemap',
      description: 'Published fashion journal stories and styling guides.',
      url: `${canonicalDomain}/sitemaps/blog.xml`,
    },
    {
      title: 'Robots.txt Directive',
      description: 'Dynamic search crawler instructions and disallows.',
      url: `${canonicalDomain}/robots.txt`,
    },
    {
      title: 'Google Merchant Center Product Feed',
      description: 'Automated RSS 2.0 XML feed formatted for Google Shopping & Merchant Center campaigns in INR.',
      url: `${canonicalDomain}/feeds/google-products.xml`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Primary Canonical Domain */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="flex justify-between items-start pb-3 border-b border-[#E7E7E7]">
          <div>
            <h3 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#3F3F8F]" />
              <span>CANONICAL PRODUCTION DOMAIN</span>
            </h3>
            <p className="text-[11px] text-[#666666] mt-0.5">
              The primary live domain used for canonical URLs, XML sitemaps, OpenGraph metadata, and Google Merchant feeds.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            SAVE SEO SETTINGS
          </Button>
        </div>

        <div className="max-w-xl space-y-2">
          <label className="block text-[11px] font-semibold text-black uppercase">
            Primary Production URL
          </label>
          <input
            type="text"
            value={seoConfig.canonical_domain}
            onChange={(e) => setSeoConfig({ ...seoConfig, canonical_domain: e.target.value.trim() })}
            placeholder="https://tanoah.com"
            className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
          />
          <span className="text-[10px] text-[#888888] block">
            Always include <code className="font-mono text-black">https://</code> without a trailing slash.
          </span>
        </div>
      </div>

      {/* 2. Webmaster Verification Tags */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="pb-3 border-b border-[#E7E7E7]">
          <h3 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#3F3F8F]" />
            <span>SEARCH ENGINE VERIFICATION CODES</span>
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Enter your site verification tokens from Google Search Console and Bing Webmaster Tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Google Site Verification Code
            </label>
            <input
              type="text"
              value={seoConfig.google_site_verification}
              onChange={(e) => setSeoConfig({ ...seoConfig, google_site_verification: e.target.value.trim() })}
              placeholder="e.g. google-site-verification token or meta code"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
            />
            <span className="text-[10px] text-[#888888] block">
              Injected automatically into document &lt;head&gt; for zero-effort verification.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Bing Webmaster Verification Code
            </label>
            <input
              type="text"
              value={seoConfig.bing_site_verification}
              onChange={(e) => setSeoConfig({ ...seoConfig, bing_site_verification: e.target.value.trim() })}
              placeholder="e.g. msvalidate.01 token"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
            />
            <span className="text-[10px] text-[#888888] block">
              Verifies ownership for Microsoft Bing and Yahoo search engines.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Analytics & Pixel Tracking */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="pb-3 border-b border-[#E7E7E7]">
          <h3 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-[#3F3F8F]" />
            <span>ANALYTICS &amp; MARKETING CONVERSION PIXELS</span>
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Configure Google Analytics 4 (GA4) and Meta (Facebook) Pixel measurement IDs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Google Analytics 4 / GTM ID
            </label>
            <input
              type="text"
              value={seoConfig.ga4_measurement_id}
              onChange={(e) => setSeoConfig({ ...seoConfig, ga4_measurement_id: e.target.value.trim() })}
              placeholder="G-XXXXXXXXXX or GTM-XXXXXXX"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Meta (Facebook) Pixel ID
            </label>
            <input
              type="text"
              value={seoConfig.meta_pixel_id}
              onChange={(e) => setSeoConfig({ ...seoConfig, meta_pixel_id: e.target.value.trim() })}
              placeholder="e.g. 123456789012345"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>
        </div>
      </div>

      {/* 4. Brand Social Profiles (for Schema.org sameAs) */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="pb-3 border-b border-[#E7E7E7]">
          <h3 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-[#3F3F8F]" />
            <span>BRAND SOCIAL PROFILES (SCHEMA.ORG SAMEAS)</span>
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            These links are published in the structured Organization schema to establish brand authority with search algorithms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Instagram Profile URL
            </label>
            <input
              type="text"
              value={seoConfig.social_links?.instagram || ''}
              onChange={(e) =>
                setSeoConfig({
                  ...seoConfig,
                  social_links: { ...seoConfig.social_links, instagram: e.target.value.trim() },
                })
              }
              placeholder="https://instagram.com/tanoah"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Facebook Page URL
            </label>
            <input
              type="text"
              value={seoConfig.social_links?.facebook || ''}
              onChange={(e) =>
                setSeoConfig({
                  ...seoConfig,
                  social_links: { ...seoConfig.social_links, facebook: e.target.value.trim() },
                })
              }
              placeholder="https://facebook.com/tanoah"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-black uppercase">
              Pinterest Profile URL
            </label>
            <input
              type="text"
              value={seoConfig.social_links?.pinterest || ''}
              onChange={(e) =>
                setSeoConfig({
                  ...seoConfig,
                  social_links: { ...seoConfig.social_links, pinterest: e.target.value.trim() },
                })
              }
              placeholder="https://pinterest.com/tanoah"
              className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>
        </div>
      </div>

      {/* 5. Live Technical Feeds & Sitemaps Directory */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
        <div className="pb-3 border-b border-[#E7E7E7]">
          <h3 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#3F3F8F]" />
            <span>LIVE SITEMAPS &amp; GOOGLE MERCHANT FEEDS</span>
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            These endpoints are dynamically served by Cloudflare Edge Workers with automatic caching and real-time database synchronization.
          </p>
        </div>

        <div className="divide-y divide-[#E7E7E7]">
          {feeds.map((feed) => (
            <div key={feed.url} className="py-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {feed.title}
                </span>
                <p className="text-[11px] text-[#666666]">{feed.description}</p>
                <code className="text-[10px] text-[#3F3F8F] font-mono break-all">{feed.url}</code>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(feed.url)}
                  className="px-2.5 py-1.5 border border-[#E7E7E7] rounded-[4px] text-[11px] text-[#555555] hover:text-black flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedUrl === feed.url ? 'Copied' : 'Copy URL'}</span>
                </button>
                <a
                  href={feed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 border border-[#E7E7E7] rounded-[4px] text-[11px] text-[#3F3F8F] hover:bg-[#3F3F8F]/5 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View Feed</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
