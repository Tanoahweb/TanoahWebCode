import React, { useEffect } from 'react';
import { DEFAULT_CANONICAL_DOMAIN, DEFAULT_SEO_CONFIG } from '@/services/seoEngine';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

/**
 * Robust Client-Side SEO Management Component
 * Automatically synchronizes document title, meta descriptions, canonical URLs,
 * OpenGraph, Twitter Cards, robots indexing directives, and Schema.org JSON-LD structured data.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonical,
  image,
  type = 'website',
  noindex = false,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Title
    const finalTitle = title ? `${title}` : 'TANOAH | Luxury Handcrafted Women’s Wear';
    document.title = finalTitle;

    // Helper to set or create meta tags
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to set or create link tags
    const setLinkTag = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Meta Description
    const finalDesc = description || DEFAULT_SEO_CONFIG.default_meta_description;
    setMetaTag('name', 'description', finalDesc);

    // 3. Robots directive
    const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMetaTag('name', 'robots', robotsContent);

    // 4. Canonical URL
    const finalCanonical = canonical || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : DEFAULT_CANONICAL_DOMAIN);
    setLinkTag('canonical', finalCanonical);

    // 5. Open Graph tags
    const finalImage = image || DEFAULT_SEO_CONFIG.default_social_image;
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:image', finalImage);
    setMetaTag('property', 'og:site_name', 'TANOAH');

    // 6. Twitter Card tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDesc);
    setMetaTag('name', 'twitter:image', finalImage);

    // 7. Schema.org JSON-LD Structured Data
    const scriptId = 'tanoah-structured-data';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Optional cleanup on unmount if needed
    };
  }, [title, description, canonical, image, type, noindex, jsonLd]);

  return null;
};
