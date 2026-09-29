import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Eye,
  Info,
} from 'lucide-react';
import {
  useEditorialLookbookStore,
  EditorialLookbookConfig,
  DEFAULT_LOOKBOOK_CONFIG,
} from '../../store/useEditorialLookbookStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

export const LookbookSettingsTab: React.FC = () => {
  const { addToast } = useUIStore();
  const { config, saveConfig, resetToDefaults, isLoading } = useEditorialLookbookStore();

  const [form, setForm] = useState<EditorialLookbookConfig>(config);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingDetail, setIsUploadingDetail] = useState(false);

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  // Sync form whenever the store config changes
  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleFieldChange = (key: keyof EditorialLookbookConfig, value: any) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleHeroFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingHero(true);
    try {
      try {
        const uploadRes = await api.uploadMediaFile(file, {
          mediaType: 'banner',
          preserveOriginal: true,
        });
        if (uploadRes && uploadRes.publicUrl) {
          handleFieldChange('heroImage', uploadRes.publicUrl);
          addToast({
            type: 'success',
            title: 'Hero Image Uploaded',
            description: `Successfully uploaded ${file.name} to media pipeline.`,
          });
          setIsUploadingHero(false);
          return;
        }
      } catch (uploadErr) {
        console.warn('R2 upload failed, falling back to local data URL:', uploadErr);
      }

      // Local Data URL Fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleFieldChange('heroImage', dataUrl);
        addToast({
          type: 'success',
          title: 'Hero Image Loaded',
          description: `${file.name} loaded and set as hero image.`,
        });
        setIsUploadingHero(false);
      };
      reader.onerror = () => {
        addToast({
          type: 'error',
          title: 'Load Failed',
          description: 'Could not read selected image file.',
        });
        setIsUploadingHero(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        description: err.message || 'Could not upload image.',
      });
      setIsUploadingHero(false);
    }
  };

  const handleDetailFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingDetail(true);
    try {
      try {
        const uploadRes = await api.uploadMediaFile(file, {
          mediaType: 'banner',
          preserveOriginal: true,
        });
        if (uploadRes && uploadRes.publicUrl) {
          handleFieldChange('detailImage', uploadRes.publicUrl);
          addToast({
            type: 'success',
            title: 'Detail Image Uploaded',
            description: `Successfully uploaded ${file.name} to media pipeline.`,
          });
          setIsUploadingDetail(false);
          return;
        }
      } catch (uploadErr) {
        console.warn('R2 upload failed, falling back to local data URL:', uploadErr);
      }

      // Local Data URL Fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleFieldChange('detailImage', dataUrl);
        addToast({
          type: 'success',
          title: 'Detail Image Loaded',
          description: `${file.name} loaded and set as detail inset image.`,
        });
        setIsUploadingDetail(false);
      };
      reader.onerror = () => {
        addToast({
          type: 'error',
          title: 'Load Failed',
          description: 'Could not read selected image file.',
        });
        setIsUploadingDetail(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        description: err.message || 'Could not upload image.',
      });
      setIsUploadingDetail(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveConfig(form);
    if (success) {
      addToast({
        type: 'success',
        title: 'Lookbook Section Saved',
        description: 'Homepage editorial lookbook images and copy updated successfully.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not update lookbook section settings.',
      });
    }
  };

  const handleConfirmReset = async () => {
    const success = await resetToDefaults();
    setIsResetModalOpen(false);
    if (success) {
      setForm(DEFAULT_LOOKBOOK_CONFIG);
      addToast({
        type: 'info',
        title: 'Reset Completed',
        description: 'Lookbook section restored to default brand photography and text.',
      });
    }
  };

  return (
    <div className="space-y-8 font-poppins">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={heroFileInputRef}
        onChange={handleHeroFileSelected}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={detailFileInputRef}
        onChange={handleDetailFileSelected}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1c1b1f] to-[#2b2a30] text-white p-6 sm:p-8 rounded-[4px] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] uppercase font-semibold tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Homepage Section Editor</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-wondra tracking-wide text-white">
            EDITORIAL LOOKBOOK SHOWCASE
          </h2>
          <p className="text-xs text-neutral-300 leading-relaxed font-light">
            Manage the luxury magazine-style composition featured on the homepage. Change the main
            editorial hero model photo, the floating textile detail inset, and the curated copy.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[3px] bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Home</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          {/* Section Enable Toggle */}
          <button
            type="button"
            onClick={() => handleFieldChange('isEnabled', !form.isEnabled)}
            className={`px-3.5 py-2 rounded-[3px] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              form.isEnabled
                ? 'bg-emerald-600/90 text-white hover:bg-emerald-600'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${form.isEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-neutral-400'}`}
            />
            <span>{form.isEnabled ? 'Section Active' : 'Section Hidden'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: DUAL IMAGE UPLOADERS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card A: Main Hero Image */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-7 border border-[#E7E7E7] rounded-[4px] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
              <div>
                <h3 className="font-semibold text-sm text-black uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#3F3F8F]" />
                  <span>Main Editorial Hero Image</span>
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Primary large photo shown on the left (recommended: 1200×1500px, 4:5 aspect ratio)
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                4:5 Portrait
              </span>
            </div>

            {/* Live Hero Preview Container */}
            <div className="relative aspect-[4/5] max-h-[380px] w-full rounded-[4px] overflow-hidden bg-[#F8F8F8] border border-[#E7E7E7] group shadow-inner">
              <img
                src={form.heroImage || DEFAULT_LOOKBOOK_CONFIG.heroImage}
                alt={form.heroAlt || 'Lookbook Hero Preview'}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102"
              />
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-[2px] border border-black/5 shadow-sm text-left">
                <span className="text-[9px] font-poppins font-semibold tracking-widest text-[#3F3F8F] uppercase block">
                  {form.tag || 'LOOK 01 • BOTANICAL LINEN'}
                </span>
              </div>
            </div>

            {/* Upload Button & URL Input */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => heroFileInputRef.current?.click()}
                  isLoading={isUploadingHero}
                  icon={<Upload className="w-3.5 h-3.5" />}
                  className="bg-[#3F3F8F] hover:bg-[#343476]"
                >
                  UPLOAD NEW HERO PHOTO
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldChange('heroImage', DEFAULT_LOOKBOOK_CONFIG.heroImage)}
                >
                  RESTORE ORIGINAL
                </Button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Hero Image URL (or CDN / R2 path)
                </label>
                <input
                  type="text"
                  value={form.heroImage}
                  onChange={(e) => handleFieldChange('heroImage', e.target.value)}
                  placeholder="https://... or /Assets/editorial/..."
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Frame Badge Tag
                  </label>
                  <input
                    type="text"
                    value={form.tag}
                    onChange={(e) => handleFieldChange('tag', e.target.value)}
                    placeholder="e.g. LOOK 01 • BOTANICAL LINEN"
                    className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Image Alt Description (SEO)
                  </label>
                  <input
                    type="text"
                    value={form.heroAlt}
                    onChange={(e) => handleFieldChange('heroAlt', e.target.value)}
                    placeholder="e.g. TANOAH SS26 Editorial Lookbook"
                    className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Detail Inset Floating Image */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-7 border border-[#E7E7E7] rounded-[4px] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
              <div>
                <h3 className="font-semibold text-sm text-black uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#3F3F8F]" />
                  <span>Floating Inset Detail Card</span>
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Overlapping fabric texture card (recommended: 600×800px, 3:4 aspect ratio)
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                3:4 Inset
              </span>
            </div>

            {/* Live Detail Inset Preview */}
            <div className="relative aspect-[3/4] max-h-[260px] w-48 mx-auto rounded-[4px] overflow-hidden border-4 border-white shadow-xl bg-[#F8F8F8] group">
              <img
                src={form.detailImage || DEFAULT_LOOKBOOK_CONFIG.detailImage}
                alt={form.detailAlt || 'Detail Inset Preview'}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded text-center">
                <span className="text-[8px] font-poppins text-white uppercase tracking-wider font-medium line-clamp-1">
                  {form.detailTag || 'Raised Botanical Needlework'}
                </span>
              </div>
            </div>

            {/* Upload Button & URL Input */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => detailFileInputRef.current?.click()}
                  isLoading={isUploadingDetail}
                  icon={<Upload className="w-3.5 h-3.5" />}
                  className="bg-[#3F3F8F] hover:bg-[#343476]"
                >
                  UPLOAD INSET PHOTO
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldChange('detailImage', DEFAULT_LOOKBOOK_CONFIG.detailImage)}
                >
                  RESTORE ORIGINAL
                </Button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Inset Image URL (or CDN / R2 path)
                </label>
                <input
                  type="text"
                  value={form.detailImage}
                  onChange={(e) => handleFieldChange('detailImage', e.target.value)}
                  placeholder="https://... or /Assets/editorial/..."
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Detail Caption / Tag
                </label>
                <input
                  type="text"
                  value={form.detailTag}
                  onChange={(e) => handleFieldChange('detailTag', e.target.value)}
                  placeholder="e.g. Raised Botanical Needlework"
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: EDITORIAL HEADLINE & COPY */}
        <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-xs space-y-6">
          <div className="border-b border-[#E7E7E7] pb-3">
            <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
              Editorial Typography & Copy
            </h3>
            <p className="text-[11px] text-[#666666]">
              Headings, narrative description, and metadata displayed on the right side of the composition.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Volume / Eyebrow Header
              </label>
              <input
                type="text"
                value={form.volume}
                onChange={(e) => handleFieldChange('volume', e.target.value)}
                placeholder="e.g. VOLUME 01 • SS26 EDITORIAL"
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Product / Theme Subtitle
              </label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                placeholder="e.g. THE BOTANICAL LINEN KURTA"
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Main Headline Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g. AN EXPLORATION OF TEXTURE, FORM & ELEVATION"
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Editorial Narrative Description
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Detailed description of the textile craft, silhouettes, and inspiration..."
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs leading-relaxed focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>
        </div>

        {/* SECTION 3: CRAFT METRICS & BUTTONS */}
        <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-xs space-y-6">
          <div className="border-b border-[#E7E7E7] pb-3">
            <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
              Craft Statistics & Call-to-Action Buttons
            </h3>
            <p className="text-[11px] text-[#666666]">
              Quality credentials and navigation links positioned below the editorial description.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Stat 1 */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#3F3F8F] block">
                Stat Metric 01
              </span>
              <div>
                <label className="block text-[10px] font-semibold text-black uppercase mb-1">Value</label>
                <input
                  type="text"
                  value={form.stat1Value}
                  onChange={(e) => handleFieldChange('stat1Value', e.target.value)}
                  placeholder="e.g. 100%"
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-black uppercase mb-1">Label</label>
                <input
                  type="text"
                  value={form.stat1Label}
                  onChange={(e) => handleFieldChange('stat1Label', e.target.value)}
                  placeholder="e.g. Botanical Linen Fibres"
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs"
                />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#3F3F8F] block">
                Stat Metric 02
              </span>
              <div>
                <label className="block text-[10px] font-semibold text-black uppercase mb-1">Value</label>
                <input
                  type="text"
                  value={form.stat2Value}
                  onChange={(e) => handleFieldChange('stat2Value', e.target.value)}
                  placeholder="e.g. ARTISANAL"
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-black uppercase mb-1">Label</label>
                <input
                  type="text"
                  value={form.stat2Label}
                  onChange={(e) => handleFieldChange('stat2Label', e.target.value)}
                  placeholder="e.g. Handcrafted Precision Fit"
                  className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-black uppercase">
                Primary Button (Text & Destination)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.primaryButtonText}
                  onChange={(e) => handleFieldChange('primaryButtonText', e.target.value)}
                  placeholder="Button Text"
                  className="w-1/2 p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold"
                />
                <input
                  type="text"
                  value={form.primaryButtonLink}
                  onChange={(e) => handleFieldChange('primaryButtonLink', e.target.value)}
                  placeholder="/collections/all"
                  className="w-1/2 p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-black uppercase">
                Secondary Button (Text & Destination)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.secondaryButtonText}
                  onChange={(e) => handleFieldChange('secondaryButtonText', e.target.value)}
                  placeholder="Button Text"
                  className="w-1/2 p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold"
                />
                <input
                  type="text"
                  value={form.secondaryButtonLink}
                  onChange={(e) => handleFieldChange('secondaryButtonLink', e.target.value)}
                  placeholder="/about"
                  className="w-1/2 p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE ACTIONS BAR */}
        <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 border border-[#E7E7E7] rounded-[4px] shadow-lg flex items-center justify-between z-20">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setIsResetModalOpen(true)}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            RESET TO DEFAULTS
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            icon={<Save className="w-4 h-4" />}
            className="bg-[#3F3F8F] hover:bg-[#343476] px-8"
          >
            SAVE CHANGES
          </Button>
        </div>
      </form>

      {/* Confirmation Reset Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="RESTORE DEFAULT LOOKBOOK"
        maxWidth="sm"
      >
        <div className="space-y-4 font-poppins text-xs">
          <p className="text-[#666666]">
            Are you sure you want to reset the homepage lookbook section? All custom uploaded
            images, text copy, and craft metrics will revert to the original brand defaults.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
              CANCEL
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmReset}>
              YES, RESET
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
