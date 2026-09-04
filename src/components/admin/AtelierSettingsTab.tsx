import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { useAtelierStore, AtelierSectionConfig, DEFAULT_ATELIER_CONFIG } from '../../store/useAtelierStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

export const AtelierSettingsTab: React.FC = () => {
  const { addToast } = useUIStore();
  const { config, saveConfig, resetToDefaults, isLoading } = useAtelierStore();

  const [form, setForm] = useState<AtelierSectionConfig>(config);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(config.imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form when store config updates
  useEffect(() => {
    setForm(config);
    setImagePreviewUrl(config.imageUrl);
  }, [config]);

  const handleToggle = (key: keyof AtelierSectionConfig) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFieldChange = (key: keyof AtelierSectionConfig, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (key === 'imageUrl') {
      setImagePreviewUrl(value);
    }
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        description: 'Please select a valid image file (JPG, PNG, or WebP).',
      });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Try uploading to R2/Storage via api.uploadMediaFile
      try {
        const uploadRes = await api.uploadMediaFile(file, {
          mediaType: 'banner',
          preserveOriginal: true,
        });
        if (uploadRes && uploadRes.publicUrl) {
          handleFieldChange('imageUrl', uploadRes.publicUrl);
          addToast({
            type: 'success',
            title: 'Image Uploaded to Storage',
            description: `Successfully uploaded ${file.name} to media pipeline.`,
          });
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn('Remote upload failed, falling back to local data URL:', uploadErr);
      }

      // 2. Client-side local data URL fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleFieldChange('imageUrl', dataUrl);
        addToast({
          type: 'success',
          title: 'Image Loaded',
          description: `${file.name} loaded and set as background image.`,
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        addToast({
          type: 'error',
          title: 'Load Failed',
          description: 'Could not read selected image file.',
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Error',
        description: err?.message || 'Failed to process image.',
      });
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveConfig(form);
    if (success) {
      addToast({
        type: 'success',
        title: 'Atelier Section Updated',
        description: 'Editorial copy, image settings, and button visibility saved successfully.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not update Atelier section configuration.',
      });
    }
  };

  const handleConfirmReset = async () => {
    const success = await resetToDefaults();
    setIsResetModalOpen(false);
    if (success) {
      setForm(DEFAULT_ATELIER_CONFIG);
      setImagePreviewUrl(DEFAULT_ATELIER_CONFIG.imageUrl);
      addToast({
        type: 'info',
        title: 'Reset to Defaults',
        description: 'Atelier editorial copy, image, and buttons restored to original values.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-xs font-poppins text-left">
      {/* 1. Header Overview & Master Switch */}
      <div className="bg-white p-6 sm:p-7 border border-[#E7E7E7] rounded-[4px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3F3F8F]" />
            <h2 className="font-semibold text-sm sm:text-base text-black uppercase tracking-wide">
              Homepage Atelier Editorial Section
            </h2>
          </div>
          <p className="text-[#666666] text-xs mt-1 max-w-xl">
            Control the full-bleed scroll expansion section on your storefront homepage. Customize
            background imagery, preferred dimensions, typography, and toggle visibility for every text
            element and button.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-[#F8F8F8] p-3 rounded-[4px] border border-[#E7E7E7]">
          <div className="text-right">
            <div className="font-semibold text-xs text-black">Section Status</div>
            <div className="text-[10px] text-[#666666]">
              {form.isEnabled ? 'Visible on Homepage' : 'Hidden from Storefront'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isEnabled}
            onClick={() => handleToggle('isEnabled')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              form.isEnabled ? 'bg-emerald-600' : 'bg-neutral-300'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                form.isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Image Settings & Preferred Dimensions Guide */}
      <div className="bg-white p-6 sm:p-7 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E7E7E7]">
          <ImageIcon className="w-4 h-4 text-[#3F3F8F]" />
          <h3 className="font-semibold text-xs text-black uppercase tracking-wider">
            Background Image &amp; Recommended Size Guide
          </h3>
        </div>

        {/* Preferred Size Advisory Card */}
        <div className="bg-[#EEEEF8]/60 border border-[#D5D5ED] rounded-[4px] p-4 text-xs text-[#2A2A5E] space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#3F3F8F]">
            <Info className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            <span>Preferred Image Specifications for Best Display</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
            <div className="bg-white/80 p-2.5 rounded border border-[#D5D5ED]">
              <span className="font-bold block text-black">Aspect Ratio:</span>
              <span className="text-[#555555]">16:9 Landscape (or 16:10)</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded border border-[#D5D5ED]">
              <span className="font-bold block text-black">Recommended Resolution:</span>
              <span className="text-[#555555]">1920 × 1080 px (Min 1280×720)</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded border border-[#D5D5ED]">
              <span className="font-bold block text-black">File Size &amp; Format:</span>
              <span className="text-[#555555]">WebP or JPG (Under 1.5 MB)</span>
            </div>
          </div>
          <p className="text-[11px] text-[#444444] pt-1">
            <strong className="text-black">Model / Subject Placement:</strong> Because editorial
            headings and buttons overlay the <strong>left side</strong> of the screen on desktop, place
            the main model, garment, or focal point in the <strong>center or right-third</strong> of your image so the text never covers the subject.
          </p>
        </div>

        {/* Image Input & Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Image Source URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                  placeholder="/Assets/editorial/tanoah-women-atelier.jpg"
                  className="flex-1 p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs font-mono"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelected}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  icon={<Upload className="w-3.5 h-3.5" />}
                  className="shrink-0 whitespace-nowrap"
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
              <p className="text-[10px] text-[#888888] mt-1">
                You can enter a local asset path (e.g. <code className="text-[#3F3F8F]">/Assets/editorial/...</code>), a Cloudflare R2 URL, or upload directly from your computer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Object Focal Position
                </label>
                <select
                  value={form.objectPosition}
                  onChange={(e) => handleFieldChange('objectPosition', e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white"
                >
                  <option value="center 30%">center 30% (Recommended for Models/Sarees)</option>
                  <option value="center center">center center (Centered)</option>
                  <option value="center 20%">center 20% (Upper focal point)</option>
                  <option value="center 40%">center 40% (Lower focal point)</option>
                  <option value="center top">center top (Top-aligned)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Accessibility Alt Text
                </label>
                <input
                  type="text"
                  value={form.imageAlt}
                  onChange={(e) => handleFieldChange('imageAlt', e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Thumbnail / Image Preview */}
          <div className="border border-[#E7E7E7] rounded-[4px] p-3 bg-[#F8F8F8] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-black uppercase">
                Active Image Preview
              </span>
              <span className="text-[10px] text-[#888888] font-mono">
                Position: {form.objectPosition}
              </span>
            </div>
            <div className="relative aspect-[16/9] w-full rounded overflow-hidden bg-black/10 border border-[#E7E7E7]">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt={form.imageAlt}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: form.objectPosition }}
                  onError={() => setImagePreviewUrl('/Assets/editorial/tanoah-women-atelier.jpg')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Text & Button Customization with Show/Hide Toggles */}
      <div className="bg-white p-6 sm:p-7 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3F3F8F]" />
            <h3 className="font-semibold text-xs text-black uppercase tracking-wider">
              Content Typography &amp; Show/Hide Toggles
            </h3>
          </div>
          <span className="text-[10px] text-[#888888]">
            Toggle any switch to instantly show or hide that element on the live site
          </span>
        </div>

        {/* 3A. Preview Title (Card Title Before Scroll Expansion) */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-xs text-black block">
                Scroll-Expand Initial Title
              </label>
              <span className="text-[10px] text-[#666666]">
                Large headline displayed on the central card before the user scrolls to expand.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-500">
                {form.showPreviewTitle ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.showPreviewTitle}
                onClick={() => handleToggle('showPreviewTitle')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.showPreviewTitle ? 'bg-[#3F3F8F]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.showPreviewTitle ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {form.showPreviewTitle && (
            <input
              type="text"
              value={form.previewTitle}
              onChange={(e) => handleFieldChange('previewTitle', e.target.value)}
              placeholder="THE WOMEN'S ATELIER"
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-wondra uppercase tracking-wider"
            />
          )}
        </div>

        {/* 3B. Eyebrow Badge (Spring / Summer '26) */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-xs text-black block">
                Eyebrow Badge (with Sparkles Icon)
              </label>
              <span className="text-[10px] text-[#666666]">
                Curved pill badge shown at the top of the editorial text block.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-500">
                {form.showBadge ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.showBadge}
                onClick={() => handleToggle('showBadge')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.showBadge ? 'bg-[#3F3F8F]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.showBadge ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {form.showBadge && (
            <input
              type="text"
              value={form.badgeText}
              onChange={(e) => handleFieldChange('badgeText', e.target.value)}
              placeholder="Tanoah • Spring / Summer '26"
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white"
            />
          )}
        </div>

        {/* 3C. Main Heading (Line 1 & Line 2) */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-xs text-black block">
                Main Editorial Heading (Wondra Luxury Serif)
              </label>
              <span className="text-[10px] text-[#666666]">
                Large headline split into two impactful lines.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-500">
                {form.showHeading ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.showHeading}
                onClick={() => handleToggle('showHeading')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.showHeading ? 'bg-[#3F3F8F]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.showHeading ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {form.showHeading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#555555] uppercase mb-1">
                  Line 1
                </label>
                <input
                  type="text"
                  value={form.headingLine1}
                  onChange={(e) => handleFieldChange('headingLine1', e.target.value)}
                  placeholder="SCULPTED SILHOUETTES,"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-wondra uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#555555] uppercase mb-1">
                  Line 2
                </label>
                <input
                  type="text"
                  value={form.headingLine2}
                  onChange={(e) => handleFieldChange('headingLine2', e.target.value)}
                  placeholder="EFFORTLESS GRACE"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-wondra uppercase"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3D. Description / Editorial Copy */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-xs text-black block">
                Editorial Paragraph Copy
              </label>
              <span className="text-[10px] text-[#666666]">
                Descriptive text detailing the craftsmanship and fabrications.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-500">
                {form.showDescription ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.showDescription}
                onClick={() => handleToggle('showDescription')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.showDescription ? 'bg-[#3F3F8F]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.showDescription ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {form.showDescription && (
            <textarea
              rows={3}
              value={form.descriptionText}
              onChange={(e) => handleFieldChange('descriptionText', e.target.value)}
              placeholder="Every fold and drape celebrates artisanal mastery..."
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white leading-relaxed"
            />
          )}
        </div>

        {/* 3E. Primary Action Button */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-xs text-black block">
                Primary Action Button (Solid White Pill)
              </label>
              <span className="text-[10px] text-[#666666]">
                Main call-to-action button linking to catalog or collection.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-500">
                {form.showPrimaryButton ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.showPrimaryButton}
                onClick={() => handleToggle('showPrimaryButton')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.showPrimaryButton ? 'bg-[#3F3F8F]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.showPrimaryButton ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {form.showPrimaryButton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#555555] uppercase mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={form.primaryButtonText}
                  onChange={(e) => handleFieldChange('primaryButtonText', e.target.value)}
                  placeholder="EXPLORE WOMEN'S COLLECTION"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#555555] uppercase mb-1">
                  Destination URL
                </label>
                <input
                  type="text"
                  value={form.primaryButtonLink}
                  onChange={(e) => handleFieldChange('primaryButtonLink', e.target.value)}
                  placeholder="/collections/women"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3F. Secondary Action Button */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-xs text-black block">
                Secondary Action Button (Glass / Outline Pill)
              </label>
              <span className="text-[10px] text-[#666666]">
                Secondary link for lookbooks, stories, or artisan atelier details.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-500">
                {form.showSecondaryButton ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.showSecondaryButton}
                onClick={() => handleToggle('showSecondaryButton')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  form.showSecondaryButton ? 'bg-[#3F3F8F]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.showSecondaryButton ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {form.showSecondaryButton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#555555] uppercase mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={form.secondaryButtonText}
                  onChange={(e) => handleFieldChange('secondaryButtonText', e.target.value)}
                  placeholder="VIEW ATELIER LOOKBOOK"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#555555] uppercase mb-1">
                  Destination URL
                </label>
                <input
                  type="text"
                  value={form.secondaryButtonLink}
                  onChange={(e) => handleFieldChange('secondaryButtonLink', e.target.value)}
                  placeholder="/lookbook"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs bg-white font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Live Interactive Visual Simulation */}
      <div className="bg-white p-6 sm:p-7 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#3F3F8F]" />
            <h3 className="font-semibold text-xs text-black uppercase tracking-wider">
              Live Responsive Layout Simulation
            </h3>
          </div>
          <span className="text-[10px] text-[#888888]">
            Previewing enabled elements over selected image
          </span>
        </div>

        <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full rounded overflow-hidden bg-neutral-900 border border-[#E7E7E7] shadow-inner select-none flex items-center p-6 sm:p-10">
          {/* Background Image */}
          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: form.objectPosition }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

          {/* Overlay Content */}
          <div className="relative z-10 max-w-lg space-y-2 sm:space-y-3 text-white">
            {form.showBadge && form.badgeText && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/20 text-[9px] font-medium uppercase tracking-wider text-white">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{form.badgeText}</span>
              </div>
            )}

            {form.showHeading && (form.headingLine1 || form.headingLine2) && (
              <h4 className="font-wondra text-lg sm:text-2xl text-white leading-tight tracking-wide drop-shadow-md">
                {form.headingLine1 && <span className="block">{form.headingLine1}</span>}
                {form.headingLine2 && <span className="block text-white/95">{form.headingLine2}</span>}
              </h4>
            )}

            {form.showDescription && form.descriptionText && (
              <p className="text-[10px] sm:text-xs text-white/90 line-clamp-2 leading-relaxed font-light drop-shadow">
                {form.descriptionText}
              </p>
            )}

            {(form.showPrimaryButton || form.showSecondaryButton) && (
              <div className="flex items-center gap-2 pt-1">
                {form.showPrimaryButton && form.primaryButtonText && (
                  <span className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 shadow">
                    <span>{form.primaryButtonText}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                )}
                {form.showSecondaryButton && form.secondaryButtonText && (
                  <span className="px-3 py-1.5 bg-white/20 text-white border border-white/40 text-[10px] font-semibold uppercase tracking-wider rounded backdrop-blur">
                    {form.secondaryButtonText}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Save & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E7E7E7]">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={isLoading}
            icon={<Save className="w-4 h-4" />}
            className="bg-[#3F3F8F] hover:bg-[#343476] text-white px-8"
          >
            {isLoading ? 'SAVING CHANGES...' : 'SAVE ATELIER SECTION'}
          </Button>

          <Button
            variant="outline"
            size="lg"
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            icon={<RotateCcw className="w-4 h-4" />}
            className="border-[#E7E7E7] text-neutral-700 hover:bg-neutral-100"
          >
            RESET TO DEFAULTS
          </Button>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3F3F8F] hover:underline"
        >
          <span>View Live Storefront</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Atelier Section to Defaults"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#555555] leading-relaxed">
            Are you sure you want to reset all copy, background imagery, and button settings for the
            Women&apos;s Atelier section to their original factory defaults? Any custom copy or links will
            be replaced.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E7E7]">
            <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReset}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
};

export default AtelierSettingsTab;
