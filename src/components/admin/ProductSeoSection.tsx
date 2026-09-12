import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Smartphone,
  Monitor,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Link as LinkIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Tag,
  Info,
} from 'lucide-react';
import { DEFAULT_CANONICAL_DOMAIN, slugify, truncateDescription } from '@/services/seoEngine';

interface ProductSeoSectionProps {
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  description: string;
  shortDescription?: string;
  seoTitle: string;
  onSeoTitleChange: (val: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (val: string) => void;
  socialImageUrl: string;
  onSocialImageUrlChange: (val: string) => void;
  canonicalUrlOverride: string;
  onCanonicalUrlOverrideChange: (val: string) => void;
  isNoindex: boolean;
  onIsNoindexChange: (val: boolean) => void;
  structuredAttributes: Record<string, string>;
  onStructuredAttributesChange: (val: Record<string, string>) => void;
  primaryImageUrl?: string;
  isEditing: boolean;
}

export const ProductSeoSection: React.FC<ProductSeoSectionProps> = ({
  title,
  slug,
  onSlugChange,
  description,
  shortDescription,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  socialImageUrl,
  onSocialImageUrlChange,
  canonicalUrlOverride,
  onCanonicalUrlOverrideChange,
  isNoindex,
  onIsNoindexChange,
  structuredAttributes,
  onStructuredAttributesChange,
  primaryImageUrl,
  isEditing,
}) => {
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Compute live auto-fallbacks
  const fallbackTitle = `${title.trim() || 'Garment Name'} | TANOAH`;
  const effectiveTitle = seoTitle.trim() || fallbackTitle;

  const rawFallbackDesc =
    shortDescription?.trim() ||
    description?.trim() ||
    `Shop ${title || 'handcrafted garments'} by TANOAH. Luxury artisanal fashion crafted with enduring elegance in Thrissur, Kerala.`;
  const fallbackDescription = truncateDescription(rawFallbackDesc, 155);
  const effectiveDescription = seoDescription.trim() || fallbackDescription;

  const displaySlug = slug || slugify(title) || 'product-handle';
  const displayUrl = `${DEFAULT_CANONICAL_DOMAIN}/products/${displaySlug}`;

  const titleLength = seoTitle.length;
  const descLength = seoDescription.length;

  // Ensure current SEO Page Title and Meta Description are in editable format inside input boxes
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      if (!seoTitle && title?.trim()) {
        onSeoTitleChange(`${title.trim()} | TANOAH`);
      }
      if (!seoDescription && (shortDescription?.trim() || description?.trim())) {
        const defaultDesc = shortDescription?.trim() || truncateDescription(description?.trim() || '', 155);
        if (defaultDesc) {
          onSeoDescriptionChange(defaultDesc);
        }
      }
      if (title?.trim() || shortDescription?.trim() || description?.trim()) {
        initializedRef.current = true;
      }
    }
  }, [title, shortDescription, description, seoTitle, seoDescription, onSeoTitleChange, onSeoDescriptionChange]);

  const handleAttrChange = (key: string, val: string) => {
    onStructuredAttributesChange({
      ...structuredAttributes,
      [key]: val,
    });
  };

  return (
    <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-[#E7E7E7] gap-2">
        <div>
          <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#3F3F8F]" />
            <span>SEARCH ENGINE OPTIMIZATION &amp; SOCIAL PREVIEW</span>
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Automated Google SERP preview, canonical indexing, and structured rich snippets.
          </p>
        </div>

        {/* Device Switcher for SERP Preview */}
        <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-[4px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDevicePreview('desktop')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[2px] flex items-center gap-1 transition-colors ${
              devicePreview === 'desktop' ? 'bg-white text-black shadow-xs' : 'text-[#666666] hover:text-black'
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreview('mobile')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[2px] flex items-center gap-1 transition-colors ${
              devicePreview === 'mobile' ? 'bg-white text-black shadow-xs' : 'text-[#666666] hover:text-black'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Live Google Search Preview Box */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block">
          Live Google Search Result Preview
        </span>

        <div
          className={`p-4 bg-[#F8F9FA] rounded-[6px] border border-[#DADCE0] transition-all font-sans ${
            devicePreview === 'mobile' ? 'max-w-sm mx-auto shadow-sm' : 'w-full'
          }`}
        >
          {/* Breadcrumb row */}
          <div className="flex items-center gap-1.5 text-xs text-[#202124] mb-1">
            <div className="w-4 h-4 rounded-full bg-[#3F3F8F] flex items-center justify-center text-white text-[9px] font-bold">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] text-[#202124] leading-tight font-medium">TANOAH</span>
              <span className="text-[11px] text-[#4D5156] leading-tight truncate">
                https://tanoah.com &rsaquo; products &rsaquo; {displaySlug}
              </span>
            </div>
          </div>

          {/* Title row */}
          <h4 className="text-[18px] text-[#1A0DAB] hover:underline cursor-pointer leading-snug font-normal mt-1 break-words">
            {effectiveTitle}
          </h4>

          {/* Snippet Description */}
          <p className="text-[13px] text-[#4D5156] leading-relaxed mt-1 line-clamp-2 break-words">
            {effectiveDescription}
          </p>

          {/* Stock / Price Rich Snippet */}
          <div className="mt-2 pt-2 border-t border-neutral-200/60 flex items-center gap-2 text-[11px] text-[#70757A]">
            <span className="text-[#137333] font-semibold flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" /> In Stock
            </span>
            <span>•</span>
            <span>Brand: TANOAH</span>
            <span>•</span>
            <span>Fast Shipping across India</span>
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="space-y-4 pt-2">
        {/* Page Title */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-black uppercase">
              SEO Page Title
            </label>
            <div className="flex items-center gap-2">
              {seoTitle !== fallbackTitle && (
                <button
                  type="button"
                  onClick={() => onSeoTitleChange(fallbackTitle)}
                  className="text-[10px] text-[#3F3F8F] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  title="Reset to default brand pattern"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Use Pattern</span>
                </button>
              )}
              <span
                className={`text-[10px] font-mono ${
                  titleLength === 0
                    ? 'text-[#888888]'
                    : titleLength >= 40 && titleLength <= 60
                    ? 'text-emerald-600 font-semibold'
                    : 'text-amber-600'
                }`}
              >
                {titleLength} / 60 characters
              </span>
            </div>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder={fallbackTitle}
            className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
          />
          <p className="text-[10px] text-[#888888] mt-1 flex items-center justify-between">
            <span>Directly editable. Default pattern: <code className="font-mono text-black">{fallbackTitle}</code></span>
            {seoTitle !== fallbackTitle && (
              <button
                type="button"
                onClick={() => onSeoTitleChange(fallbackTitle)}
                className="text-[#3F3F8F] hover:underline font-semibold ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </p>
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-black uppercase">
              Meta Description
            </label>
            <div className="flex items-center gap-2">
              {seoDescription !== fallbackDescription && (
                <button
                  type="button"
                  onClick={() => onSeoDescriptionChange(fallbackDescription)}
                  className="text-[10px] text-[#3F3F8F] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  title="Reset to auto-extracted snippet"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Use Snippet</span>
                </button>
              )}
              <span
                className={`text-[10px] font-mono ${
                  descLength === 0
                    ? 'text-[#888888]'
                    : descLength >= 130 && descLength <= 160
                    ? 'text-emerald-600 font-semibold'
                    : 'text-amber-600'
                }`}
              >
                {descLength} / 160 characters
              </span>
            </div>
          </div>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder={fallbackDescription}
            className="w-full p-2.5 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] leading-relaxed"
          />
          <p className="text-[10px] text-[#888888] mt-1 flex items-center justify-between">
            <span>Recommended length: 140–160 characters. Highlight fabric, silhouette, and craftsmanship.</span>
            {seoDescription !== fallbackDescription && (
              <button
                type="button"
                onClick={() => onSeoDescriptionChange(fallbackDescription)}
                className="text-[#3F3F8F] hover:underline font-semibold ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </p>
        </div>

        {/* URL Handle / Slug with Automated 301 Protection */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-black uppercase flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-[#3F3F8F]" />
              <span>URL Handle (Slug)</span>
            </label>
          </div>

          <div className="flex items-center">
            <span className="px-3 py-2.5 bg-[#F5F5F5] border border-r-0 border-[#E7E7E7] rounded-l-[4px] text-xs text-[#666666] select-none font-mono">
              /products/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => onSlugChange(slugify(e.target.value))}
              placeholder="product-name"
              className="flex-1 p-2.5 bg-white border border-[#E7E7E7] rounded-r-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          {isEditing && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-[4px] flex items-start gap-2 text-amber-800 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Automated 301 Redirect Protection:</strong> If you modify this URL slug, TANOAH will automatically generate a permanent 301 redirect from the old URL to preserve existing backlinks and Google search rankings.
              </div>
            </div>
          )}
        </div>

        {/* Structured Fashion Attributes (for Google Merchant & Rich Filters) */}
        <div className="pt-4 border-t border-[#E7E7E7] space-y-3">
          <div>
            <span className="text-[11px] font-semibold text-black uppercase flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#3F3F8F]" />
              <span>Structured Fashion Attributes (Google Shopping &amp; Merchant Feeds)</span>
            </span>
            <p className="text-[10px] text-[#666666] mt-0.5">
              These attributes feed Google Merchant Center product schema, rich carousels, and search filters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#555555] mb-1">
                Fabric / Material
              </label>
              <input
                type="text"
                placeholder="e.g. Mulberry Silk, Handloom Linen"
                value={structuredAttributes.fabric || ''}
                onChange={(e) => handleAttrChange('fabric', e.target.value)}
                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#555555] mb-1">
                Silhouette / Fit
              </label>
              <input
                type="text"
                placeholder="e.g. Relaxed Fit, Fluid Drape"
                value={structuredAttributes.fit || ''}
                onChange={(e) => handleAttrChange('fit', e.target.value)}
                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#555555] mb-1">
                Occasion
              </label>
              <input
                type="text"
                placeholder="e.g. Festive, Wedding, Evening"
                value={structuredAttributes.occasion || ''}
                onChange={(e) => handleAttrChange('occasion', e.target.value)}
                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#555555] mb-1">
                Pattern / Weave
              </label>
              <input
                type="text"
                placeholder="e.g. Zari Weave, Solid, Floral"
                value={structuredAttributes.pattern || ''}
                onChange={(e) => handleAttrChange('pattern', e.target.value)}
                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#555555] mb-1">
                Sleeve Type
              </label>
              <input
                type="text"
                placeholder="e.g. Three-Quarter, Sleeveless"
                value={structuredAttributes.sleeve_type || ''}
                onChange={(e) => handleAttrChange('sleeve_type', e.target.value)}
                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#555555] mb-1">
                Wash &amp; Care
              </label>
              <input
                type="text"
                placeholder="e.g. Dry Clean Only"
                value={structuredAttributes.wash_care || ''}
                onChange={(e) => handleAttrChange('wash_care', e.target.value)}
                className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>
          </div>
        </div>

        {/* Advanced Technical Settings Accordion */}
        <div className="pt-2 border-t border-[#E7E7E7]">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center justify-between w-full py-2 text-xs font-semibold text-[#555555] hover:text-black transition-colors"
          >
            <span>ADVANCED TECHNICAL INDEXING &amp; CANONICAL SETTINGS</span>
            {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isAdvancedOpen && (
            <div className="mt-3 p-4 bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-4">
              {/* No-index toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-black block">
                    Search Engine Indexing
                  </span>
                  <span className="text-[11px] text-[#666666]">
                    Instruct search engines to index or hide this product page.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isNoindex}
                    onChange={(e) => onIsNoindexChange(!e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F3F8F]"></div>
                </label>
              </div>

              {isNoindex && (
                <div className="p-2.5 bg-red-50 text-red-700 text-[11px] rounded-[4px] flex items-center gap-2">
                  <EyeOff className="w-4 h-4 shrink-0" />
                  <span>
                    Warning: This product is set to <strong>noindex</strong> and will be hidden from Google and Bing search results.
                  </span>
                </div>
              )}

              {/* Canonical URL Override */}
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Canonical URL Override
                </label>
                <input
                  type="text"
                  placeholder="https://tanoah.com/products/original-edition"
                  value={canonicalUrlOverride}
                  onChange={(e) => onCanonicalUrlOverrideChange(e.target.value)}
                  className="w-full p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
                <p className="text-[10px] text-[#888888] mt-1">
                  Leave empty to use standard self-canonical: <code className="font-mono">{displayUrl}</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
