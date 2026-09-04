import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Clock,
  ShoppingBag,
  Mail,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Smartphone,
  X,
  Upload,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useOfferPopupStore } from '../../store/useOfferPopupStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../common/Button';
import { OfferPopupConfig } from '../../types';

export const OfferPopupSettingsTab: React.FC = () => {
  const { config, saveConfig, resetToDefaults, openPopup } = useOfferPopupStore();
  const { addToast } = useUIStore();

  const [form, setForm] = useState<OfferPopupConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Sync form state if store config changes externally
  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleFieldChange = <K extends keyof OfferPopupConfig>(key: K, value: OfferPopupConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await saveConfig(form);
      if (success) {
        addToast({
          type: 'success',
          title: 'Offer Popup Saved',
          description: 'Special offer popup settings and visibility rules are now live on the storefront.',
        });
      } else {
        throw new Error('Save failed');
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not save popup settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        'Reset offer popup to the original reference defaults (3s delay, STYLE20 code, 20% OFF, and lifestyle model)?'
      )
    ) {
      await resetToDefaults();
      addToast({
        type: 'info',
        title: 'Reset to Reference Defaults',
        description: 'Default offer popup configuration restored.',
      });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 text-left font-poppins text-xs">
      {/* Top Action & Status Bar */}
      <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-black">SPECIAL OFFER POPUP</span>
            {form.isEnabled ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                DISABLED
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Displays a high-converting promotional modal {form.delaySeconds}s after initial page load with full visibility customization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openPopup()}
            icon={<Eye className="w-3.5 h-3.5" />}
          >
            Test Popup Live
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw className="w-3.5 h-3.5 text-neutral-400" />}
          >
            Reset Defaults
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {isSaving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Controls & Toggles (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Master Enable & Timing */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
            <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px] border-b border-[#E7E7E7] pb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#3F3F8F]" />
              Trigger Timing & Frequency
            </h3>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-[4px] border border-[#E7E7E7]">
              <div>
                <span className="font-medium text-black block">Enable Offer Popup</span>
                <span className="text-[11px] text-neutral-500">
                  When enabled, the popup triggers automatically for store visitors.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isEnabled}
                  onChange={(e) => handleFieldChange('isEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3F3F8F]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Delay in Seconds */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Delay After Page Load (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={form.delaySeconds}
                    onChange={(e) => handleFieldChange('delaySeconds', parseFloat(e.target.value) || 0)}
                    className="w-24 p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  />
                  <span className="text-neutral-500 text-[11px]">(Default: 3 sec)</span>
                </div>
              </div>

              {/* Display Frequency */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Display Frequency
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) => handleFieldChange('frequency', e.target.value as any)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none bg-white"
                >
                  <option value="once_per_session">Once per browsing session (Recommended)</option>
                  <option value="once_per_day">Once every 24 hours</option>
                  <option value="always">Always on every page load (Testing)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Element Visibility Controls ("options set which options want to visible") */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
            <div className="border-b border-[#E7E7E7] pb-2 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#3F3F8F]" />
                Element Visibility Controls
              </h3>
              <span className="text-[10px] text-neutral-400 font-medium">Toggle options on/off</span>
            </div>

            <p className="text-[11px] text-neutral-500">
              Select which elements and sections appear inside the offer modal:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'showImage', label: 'Feature Lifestyle Image', desc: 'Left banner on desktop / top on mobile' },
                { key: 'showBadge', label: 'Pill Badge', desc: '"LIMITED TIME" top badge' },
                { key: 'showBadgeIcon', label: 'Badge Clock Icon', desc: 'Clock icon inside pill badge' },
                { key: 'showSubtitle', label: 'Subtitle Heading', desc: '"SPECIAL OFFER" uppercase text' },
                { key: 'showHeadline', label: 'Main Headline', desc: 'Serif "Get 20% OFF" title' },
                { key: 'showDescription', label: 'Description Text', desc: '"on your first order" copy' },
                { key: 'showDivider', label: 'Shopping Bag Divider', desc: 'Decorative line with shopping bag icon' },
                { key: 'showCouponCode', label: 'Promo Code Callout', desc: '"Use code: STYLE20" with copy click' },
                { key: 'showEmailInput', label: 'Email Capture Input', desc: 'Email input field with icon' },
                { key: 'showButton', label: 'Primary CTA Button', desc: '"UNLOCK OFFER" action button' },
                { key: 'showDismissLink', label: 'Dismiss Link', desc: '"No thanks" text link' },
              ].map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-2.5 bg-neutral-50 hover:bg-neutral-100/70 border border-[#E7E7E7] rounded-[4px] cursor-pointer transition-colors"
                >
                  <div className="pr-2">
                    <span className="font-medium text-black block text-[11px]">{label}</span>
                    <span className="text-[10px] text-neutral-500 leading-tight block">{desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(form as any)[key]}
                    onChange={(e) => handleFieldChange(key as any, e.target.checked)}
                    className="w-4 h-4 text-[#3F3F8F] rounded border-neutral-300 focus:ring-[#3F3F8F] cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Card 3: Lifestyle Image Configuration */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
            <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px] border-b border-[#E7E7E7] pb-2 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#3F3F8F]" />
              Lifestyle Image & Asset Settings
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Image URL (Cloudflare R2 or CDN)
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                  placeholder="https://pub-....r2.dev/offers/special-offer-portrait.jpg"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFieldChange(
                      'imageUrl',
                      'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev/offers/special-offer-portrait.jpg'
                    )
                  }
                >
                  Use Reference Model Image (Default)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFieldChange(
                      'imageUrl',
                      'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev/assets/hero-mobile.jpg'
                    )
                  }
                >
                  Use Hero Mobile
                </Button>
              </div>

              {/* Recommended Size Alert */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[4px] flex items-start gap-2 text-[11px] text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Recommended Image Dimensions:</strong> For optimal high-DPI clarity, use a portrait ratio of <strong>600 × 800 px (3:4)</strong> or <strong>600 × 750 px</strong> with focal point centered.
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Text Content & Copywriting */}
          <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
            <h3 className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px] border-b border-[#E7E7E7] pb-2">
              Content & Copywriting
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={form.badgeText}
                  onChange={(e) => handleFieldChange('badgeText', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="LIMITED TIME"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Subtitle Heading</label>
                <input
                  type="text"
                  value={form.subtitleText}
                  onChange={(e) => handleFieldChange('subtitleText', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="SPECIAL OFFER"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Main Headline</label>
                <input
                  type="text"
                  value={form.headlineText}
                  onChange={(e) => handleFieldChange('headlineText', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="Get 20% OFF"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Description Subtext</label>
                <input
                  type="text"
                  value={form.descriptionText}
                  onChange={(e) => handleFieldChange('descriptionText', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="on your first order"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={form.couponCode}
                  onChange={(e) => handleFieldChange('couponCode', e.target.value.toUpperCase())}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none uppercase font-bold text-[#191846]"
                  placeholder="STYLE20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Coupon Label</label>
                <input
                  type="text"
                  value={form.couponLabel}
                  onChange={(e) => handleFieldChange('couponLabel', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="Use code: "
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Email Placeholder</label>
                <input
                  type="text"
                  value={form.emailPlaceholder}
                  onChange={(e) => handleFieldChange('emailPlaceholder', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={form.buttonText}
                  onChange={(e) => handleFieldChange('buttonText', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none font-semibold uppercase"
                  placeholder="UNLOCK OFFER"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Dismiss Text</label>
                <input
                  type="text"
                  value={form.dismissText}
                  onChange={(e) => handleFieldChange('dismissText', e.target.value)}
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                  placeholder="No thanks"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white p-4 rounded-[4px] border border-[#E7E7E7] shadow-sm">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3 mb-4">
              <div className="flex items-center gap-1.5 font-semibold text-black text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#3F3F8F]" />
                <span>Live Interactive Preview</span>
              </div>

              {/* Device Selector */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-[4px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-2.5 py-1 rounded-[3px] flex items-center gap-1 text-[10px] font-medium transition-colors ${
                    previewMode === 'desktop'
                      ? 'bg-white text-black shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  <Laptop className="w-3 h-3" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2.5 py-1 rounded-[3px] flex items-center gap-1 text-[10px] font-medium transition-colors ${
                    previewMode === 'mobile'
                      ? 'bg-white text-black shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Preview Stage / Frame */}
            <div className="bg-neutral-900/60 backdrop-blur-xs p-4 sm:p-6 rounded-lg flex items-center justify-center min-h-[440px] overflow-hidden">
              {previewMode === 'desktop' ? (
                /* Desktop Preview */
                <div
                  className={`w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative ${
                    form.showImage ? 'grid grid-cols-2 max-w-[480px]' : 'max-w-[320px] mx-auto'
                  }`}
                >
                  {/* Close button representation */}
                  <div className="absolute top-2.5 right-2.5 z-10 p-1 text-neutral-400">
                    <X className="w-4 h-4" />
                  </div>

                  {form.showImage && (
                    <div className="relative w-full h-full min-h-[300px] bg-[#F5F2ED]">
                      <img
                        src={form.imageUrl}
                        alt={form.imageAlt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5 flex flex-col items-center justify-center text-center font-poppins">
                    {form.showBadge && (
                      <div className="inline-flex items-center gap-1 border border-[#191846] text-[#191846] px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase mb-2">
                        {form.showBadgeIcon && <Clock className="w-2.5 h-2.5" />}
                        <span>{form.badgeText}</span>
                      </div>
                    )}

                    {form.showSubtitle && (
                      <div className="text-[9px] font-bold text-black tracking-widest uppercase mb-1">
                        {form.subtitleText}
                      </div>
                    )}

                    {form.showHeadline && (
                      <div className="font-serif text-2xl text-[#191846] font-normal leading-tight mb-1">
                        {form.headlineText}
                      </div>
                    )}

                    {form.showDescription && (
                      <div className="text-[10px] text-neutral-600 mb-2">
                        {form.descriptionText}
                      </div>
                    )}

                    {form.showDivider && (
                      <div className="w-full max-w-[160px] flex items-center justify-center gap-2 my-1 text-neutral-300">
                        <div className="flex-1 h-[1px] bg-neutral-200" />
                        <ShoppingBag className="w-3 h-3 text-neutral-400" />
                        <div className="flex-1 h-[1px] bg-neutral-200" />
                      </div>
                    )}

                    {form.showCouponCode && (
                      <div className="text-[10px] text-neutral-700 font-medium my-1.5">
                        <span>{form.couponLabel}</span>
                        <strong className="text-[#191846] font-bold tracking-wider ml-1">
                          {form.couponCode}
                        </strong>
                      </div>
                    )}

                    {form.showEmailInput && (
                      <div className="relative w-full max-w-[200px] mt-1">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                        <input
                          type="text"
                          disabled
                          placeholder={form.emailPlaceholder}
                          className="w-full pl-7 pr-2 py-1.5 border border-neutral-300 rounded-[3px] text-[10px] bg-neutral-50"
                        />
                      </div>
                    )}

                    {form.showButton && (
                      <div className="w-full max-w-[200px] mt-2 py-2 bg-[#191846] text-white font-semibold text-[10px] tracking-widest uppercase rounded-[3px] text-center shadow-xs">
                        {form.buttonText}
                      </div>
                    )}

                    {form.showDismissLink && (
                      <div className="text-[9px] text-neutral-400 underline mt-2.5">
                        {form.dismissText}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mobile Preview Frame */
                <div className="w-[280px] bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
                  {/* Close button representation */}
                  <div className="absolute top-2 right-2 z-10 p-1 text-neutral-400 bg-white/70 rounded-full">
                    <X className="w-3.5 h-3.5" />
                  </div>

                  {form.showImage && (
                    <div className="relative w-full h-[140px] bg-[#F5F2ED]">
                      <img
                        src={form.imageUrl}
                        alt={form.imageAlt}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}

                  <div className="p-4 flex flex-col items-center justify-center text-center font-poppins">
                    {form.showBadge && (
                      <div className="inline-flex items-center gap-1 border border-[#191846] text-[#191846] px-2 py-0.5 rounded-full text-[8px] font-semibold tracking-wider uppercase mb-1.5">
                        {form.showBadgeIcon && <Clock className="w-2.5 h-2.5" />}
                        <span>{form.badgeText}</span>
                      </div>
                    )}

                    {form.showSubtitle && (
                      <div className="text-[8px] font-bold text-black tracking-widest uppercase mb-0.5">
                        {form.subtitleText}
                      </div>
                    )}

                    {form.showHeadline && (
                      <div className="font-serif text-xl text-[#191846] font-normal leading-tight mb-0.5">
                        {form.headlineText}
                      </div>
                    )}

                    {form.showDescription && (
                      <div className="text-[9px] text-neutral-600 mb-1.5">
                        {form.descriptionText}
                      </div>
                    )}

                    {form.showDivider && (
                      <div className="w-full max-w-[140px] flex items-center justify-center gap-2 my-1 text-neutral-300">
                        <div className="flex-1 h-[1px] bg-neutral-200" />
                        <ShoppingBag className="w-2.5 h-2.5 text-neutral-400" />
                        <div className="flex-1 h-[1px] bg-neutral-200" />
                      </div>
                    )}

                    {form.showCouponCode && (
                      <div className="text-[9px] text-neutral-700 font-medium my-1">
                        <span>{form.couponLabel}</span>
                        <strong className="text-[#191846] font-bold tracking-wider ml-1">
                          {form.couponCode}
                        </strong>
                      </div>
                    )}

                    {form.showEmailInput && (
                      <div className="relative w-full max-w-[180px] mt-1">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-neutral-400" />
                        <input
                          type="text"
                          disabled
                          placeholder={form.emailPlaceholder}
                          className="w-full pl-6 pr-2 py-1 border border-neutral-300 rounded-[3px] text-[9px] bg-neutral-50"
                        />
                      </div>
                    )}

                    {form.showButton && (
                      <div className="w-full max-w-[180px] mt-1.5 py-1.5 bg-[#191846] text-white font-semibold text-[9px] tracking-widest uppercase rounded-[3px] text-center shadow-xs">
                        {form.buttonText}
                      </div>
                    )}

                    {form.showDismissLink && (
                      <div className="text-[8px] text-neutral-400 underline mt-2">
                        {form.dismissText}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 text-center mt-2.5">
              Live preview renders in real-time as inputs and visibility switches change.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default OfferPopupSettingsTab;
