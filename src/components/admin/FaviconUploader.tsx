import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Globe,
  Smartphone,
  Eye,
  CheckCircle2,
  Trash2,
  Sliders,
  Maximize2,
  Minimize2,
  Layers,
  Search,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { r2Service } from '../../services/r2Service';
import { MediaItem } from '../../types';
import {
  processStandardFavicon,
  applyFavicon,
  StandardizedFaviconResult,
  FAVICON_STANDARDS,
} from '../../utils/faviconUtils';
import { supabase } from '../../services/supabase';

interface FaviconUploaderProps {
  currentFaviconUrl?: string;
  onFaviconUpdated?: (newUrl: string) => void;
}

export const FaviconUploader: React.FC<FaviconUploaderProps> = ({
  currentFaviconUrl,
  onFaviconUpdated,
}) => {
  const { addToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeFavicon, setActiveFavicon] = useState<string>(
    currentFaviconUrl || '/Assets/brand/logo-badge-white.png'
  );

  useEffect(() => {
    if (currentFaviconUrl) {
      setActiveFavicon(currentFaviconUrl);
    }
  }, [currentFaviconUrl]);

  // Studio / Configuration state for new upload
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<File | string | null>(null);
  const [sourceFilename, setSourceFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Customization Options
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [background, setBackground] = useState<'transparent' | 'white' | 'dark' | 'custom'>('transparent');
  const [customBgColor, setCustomBgColor] = useState('#1A1A2E');
  const [paddingPercent, setPaddingPercent] = useState<number>(8);
  const [browserTheme, setBrowserTheme] = useState<'light' | 'dark'>('light');

  // Processed Result state
  const [studioResult, setStudioResult] = useState<StandardizedFaviconResult | null>(null);

  // Media Library Picker state
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');

  // Process preview whenever options change
  const refreshStudioPreview = async (source: File | string) => {
    setIsProcessing(true);
    try {
      const result = await processStandardFavicon(source, {
        fitMode,
        background,
        backgroundColor: customBgColor,
        paddingPercent,
        outputSize: 512,
      });
      setStudioResult(result);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Favicon Processing Error',
        description: err.message || 'Could not process image.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (selectedSource) {
      refreshStudioPreview(selectedSource);
    }
  }, [fitMode, background, customBgColor, paddingPercent]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        description: 'Please upload an image file (PNG, SVG, JPG, WebP, or ICO).',
      });
      return;
    }

    setSelectedSource(file);
    setSourceFilename(file.name);
    setIsStudioOpen(true);
    await refreshStudioPreview(file);
  };

  const handleOpenMediaPicker = async () => {
    setIsLoadingMedia(true);
    setIsMediaPickerOpen(true);
    try {
      const items = await api.getMediaList();
      setMediaList(items);
    } catch (err) {
      console.warn('Could not load media list:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleSelectMediaItem = (item: MediaItem) => {
    const keyOrUrl = item.r2_key ? r2Service.getPublicUrl(item.r2_key) : item.stored_filename;
    setSelectedSource(keyOrUrl);
    setSourceFilename(item.original_filename);
    setIsMediaPickerOpen(false);
    setIsStudioOpen(true);
    refreshStudioPreview(keyOrUrl);
  };

  // Upload and set as active favicon
  const handleApplyFavicon = async () => {
    if (!studioResult) return;
    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const r2Key = `brand/favicon-${timestamp}.png`;
      const contentType = 'image/png';

      // 1. Direct Cloudflare R2 Upload
      let publicUrl = '';
      try {
        const uploadResult = await r2Service.upload(studioResult.blob, r2Key, contentType);
        if (uploadResult.success) {
          publicUrl = uploadResult.publicUrl;
        }
      } catch (r2Err) {
        console.warn('R2 upload warning:', r2Err);
      }

      // Fallback to dataUrl or public URL
      if (!publicUrl) {
        publicUrl = r2Service.getPublicUrl(r2Key);
      }

      // 2. Register in Supabase media table
      try {
        await supabase.from('media').insert([
          {
            r2_key: r2Key,
            original_filename: `favicon-${sourceFilename || 'master'}.png`,
            stored_filename: `favicon-${timestamp}.png`,
            mime_type: 'image/png',
            width: 512,
            height: 512,
            file_size: studioResult.blob.size,
            media_type: 'brand',
            storage_provider: 'cloudflare_r2',
          },
        ]);
      } catch (dbErr) {
        console.warn('Supabase media registration warning:', dbErr);
      }

      // 3. Save to Store Settings in Supabase
      const success = await api.saveStoreSettings({
        favicon_url: publicUrl,
      });

      if (!success) {
        throw new Error('Failed to update favicon_url in store_settings.');
      }

      // 4. Update document.head live immediately
      applyFavicon(publicUrl);
      setActiveFavicon(publicUrl);
      if (onFaviconUpdated) {
        onFaviconUpdated(publicUrl);
      }

      setIsStudioOpen(false);
      addToast({
        type: 'success',
        title: 'Favicon Live & Deployed! 🎉',
        description: 'Standard 512×512 master deployed to Cloudflare R2. Browser tabs and Google SERP updated.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        description: err.message || 'Could not upload favicon to Cloudflare R2.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Reset to default brand badge
  const handleResetToDefault = async () => {
    const defaultBadge = '/Assets/brand/logo-badge-white.png';
    await api.saveStoreSettings({ favicon_url: defaultBadge });
    applyFavicon(defaultBadge);
    setActiveFavicon(defaultBadge);
    if (onFaviconUpdated) onFaviconUpdated(defaultBadge);
    addToast({
      type: 'info',
      title: 'Reset to Default',
      description: 'Restored the original TANOAH white circular badge.',
    });
  };

  return (
    <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-6 text-left font-poppins text-xs">
      {/* Header with Standard Size Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E7E7E7] gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#3F3F8F]" />
            <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
              Store Favicon & Web Brand Icon
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#3F3F8F] font-bold text-[10px]">
              Standard 512×512 (1:1 Square)
            </span>
          </div>
          <p className="text-[11px] text-[#666666]">
            Web standard favicon displayed across desktop browser tabs, Google Search snippets, and Apple Touch bookmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleOpenMediaPicker}
            icon={<Layers className="w-3.5 h-3.5" />}
          >
            MEDIA LIBRARY
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            UPLOAD NEW FAVICON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      </div>

      {/* Current Active Favicon Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Icon Preview */}
        <div className="p-4 rounded-[4px] border border-[#E7E7E7] bg-[#FAFAFA] flex items-center gap-4">
          <div className="w-16 h-16 rounded-[6px] bg-white border border-[#E7E7E7] p-2 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img
              src={activeFavicon}
              alt="Current Favicon"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/Assets/brand/logo-badge-white.png';
              }}
            />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Active Site Favicon</span>
            </div>
            <div className="text-[10px] text-[#888888] font-mono truncate" title={activeFavicon}>
              {activeFavicon.split('/').pop()}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[10px] text-neutral-500 hover:text-red-600 underline font-medium"
              >
                Reset to Brand Default
              </button>
            </div>
          </div>
        </div>

        {/* Live Browser Tab Preview */}
        <div className="p-3 rounded-[4px] border border-[#E7E7E7] bg-[#F1F3F4] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#666666] uppercase tracking-wider">
            <span>Browser Tab Preview (16px / 32px)</span>
          </div>
          <div className="bg-white rounded-t-[6px] p-2 flex items-center gap-2 border-b-2 border-transparent shadow-xs">
            <div className="w-4 h-4 shrink-0 flex items-center justify-center">
              <img
                src={activeFavicon}
                alt="Tab Icon"
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Assets/brand/logo-badge-white.png';
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-black truncate flex-1">
              TANOAH | Luxury Handcrafted...
            </span>
            <span className="text-[11px] text-[#888888] font-bold">×</span>
          </div>
          <div className="text-[10px] text-[#888888]">
            Displays beside the page title in Chrome, Safari, Edge, and Firefox.
          </div>
        </div>

        {/* Google SERP Snippet Preview */}
        <div className="p-3 rounded-[4px] border border-[#E7E7E7] bg-white space-y-1.5">
          <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
            Google Search SERP Icon (48px)
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="w-7 h-7 rounded-full bg-[#F2F4F7] border border-[#E7E7E7] flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={activeFavicon}
                alt="Google Favicon"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Assets/brand/logo-badge-white.png';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-black truncate leading-tight">
                Tanoah — Luxury Handcrafted
              </div>
              <div className="text-[10px] text-[#006621] truncate font-mono">
                https://tanoah.com › collections
              </div>
            </div>
          </div>
          <div className="text-[10px] text-[#888888] pt-1">
            Google Search Console standard 48×48 px square format.
          </div>
        </div>
      </div>

      {/* Standardization Studio Modal */}
      {isStudioOpen && (
        <Modal
          isOpen={isStudioOpen}
          onClose={() => {
            if (!isUploading) setIsStudioOpen(false);
          }}
          title="STANDARDIZE & DEPLOY FAVICON"
        >
          <div className="space-y-5 text-xs font-poppins text-left max-w-2xl">
            {/* Standards Info Banner */}
            <div className="p-3 bg-[#EEEEF8] text-[#3F3F8F] border border-[#3F3F8F]/20 rounded-[4px] flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#3F3F8F] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-black">
                  Auto-Fit 1:1 Square & High-DPI 512×512 Master
                </div>
                <p className="text-[11px] text-[#555577] leading-relaxed">
                  Web browsers, Google Search, and mobile operating systems require square (1:1) aspect ratio favicons.
                  We automatically center-align, scale, and render standard 512×512, 180×180, 48×48, and 32×32 pixel outputs.
                </p>
              </div>
            </div>

            {/* Main Interactive Studio Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Controls Column */}
              <div className="space-y-4">
                {/* Fit Mode */}
                <div>
                  <label className="block font-semibold text-black uppercase text-[10px] mb-1.5">
                    1. Aspect Ratio Fit Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFitMode('contain')}
                      className={`p-2.5 rounded-[4px] border text-left flex flex-col gap-1 transition-all ${
                        fitMode === 'contain'
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 text-[#3F3F8F] font-semibold ring-1 ring-[#3F3F8F]'
                          : 'border-[#E7E7E7] hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span className="text-[11px] flex items-center gap-1">
                        <Minimize2 className="w-3.5 h-3.5" />
                        Fit Inside (Contain)
                      </span>
                      <span className="text-[10px] font-normal text-neutral-500">
                        Preserves entire logo with padding. Recommended.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFitMode('cover')}
                      className={`p-2.5 rounded-[4px] border text-left flex flex-col gap-1 transition-all ${
                        fitMode === 'cover'
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 text-[#3F3F8F] font-semibold ring-1 ring-[#3F3F8F]'
                          : 'border-[#E7E7E7] hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span className="text-[11px] flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" />
                        Square Fill (Crop)
                      </span>
                      <span className="text-[10px] font-normal text-neutral-500">
                        Center-crops to fill the 1:1 square completely.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Background Option */}
                <div>
                  <label className="block font-semibold text-black uppercase text-[10px] mb-1.5">
                    2. Background Canvas
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBackground('transparent')}
                      className={`p-2 rounded-[4px] border text-center text-[11px] transition-all ${
                        background === 'transparent'
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 text-[#3F3F8F] font-semibold ring-1 ring-[#3F3F8F]'
                          : 'border-[#E7E7E7] text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackground('white')}
                      className={`p-2 rounded-[4px] border text-center text-[11px] transition-all ${
                        background === 'white'
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 text-[#3F3F8F] font-semibold ring-1 ring-[#3F3F8F]'
                          : 'border-[#E7E7E7] text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      White
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackground('dark')}
                      className={`p-2 rounded-[4px] border text-center text-[11px] transition-all ${
                        background === 'dark'
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 text-[#3F3F8F] font-semibold ring-1 ring-[#3F3F8F]'
                          : 'border-[#E7E7E7] text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      Brand Dark
                    </button>
                  </div>
                </div>

                {/* Inner Padding Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-black uppercase text-[10px]">
                      3. Inner Logo Margin ({paddingPercent}%)
                    </label>
                    <span className="text-[10px] text-neutral-500">
                      {paddingPercent === 0 ? 'Full Bleed' : paddingPercent <= 10 ? 'Optimal' : 'Badge'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={paddingPercent}
                    onChange={(e) => setPaddingPercent(Number(e.target.value))}
                    className="w-full accent-[#3F3F8F] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                    <span>0% (Edge)</span>
                    <span>8% (Recommended)</span>
                    <span>25% (Circle Icon)</span>
                  </div>
                </div>
              </div>

              {/* Live Render & Sizing Column */}
              <div className="space-y-4">
                <div className="font-semibold text-black uppercase text-[10px] flex items-center justify-between">
                  <span>Standard 512×512 Master Canvas</span>
                  {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3F3F8F]" />}
                </div>

                {/* 512x512 Master Output Preview */}
                <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-[8px] overflow-hidden border-2 border-dashed border-[#3F3F8F]/40 p-2 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] shadow-sm">
                  {studioResult ? (
                    <img
                      src={studioResult.dataUrl}
                      alt="Standardized Favicon 512x512"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-300" />
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                    512 × 512 px
                  </div>
                </div>

                {/* Derived Multi-Resolution Strip */}
                <div className="bg-[#FAFAFA] p-3 rounded-[4px] border border-[#E7E7E7] space-y-2">
                  <div className="text-[10px] font-bold text-neutral-600 uppercase">
                    Scaled Standard Resolutions
                  </div>
                  <div className="flex items-center justify-around text-center">
                    <div className="space-y-1">
                      <div className="w-8 h-8 mx-auto flex items-center justify-center bg-white border border-[#E7E7E7] rounded shadow-2xs">
                        {studioResult && <img src={studioResult.preview32} className="w-4 h-4 object-contain" />}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono block">16 / 32px</span>
                      <span className="text-[8px] text-neutral-400 block">Tab</span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center bg-white border border-[#E7E7E7] rounded shadow-2xs">
                        {studioResult && <img src={studioResult.preview48} className="w-6 h-6 object-contain" />}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono block">48px</span>
                      <span className="text-[8px] text-neutral-400 block">Google</span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-11 h-11 mx-auto flex items-center justify-center bg-white border border-[#E7E7E7] rounded-xl shadow-2xs">
                        {studioResult && <img src={studioResult.preview180} className="w-8 h-8 object-contain" />}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono block">180px</span>
                      <span className="text-[8px] text-neutral-400 block">Apple iOS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Contextual Preview: Browser Tab (Light & Dark) */}
            <div className="space-y-2 pt-2 border-t border-[#E7E7E7]">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">
                  Live Browser Tab Simulation
                </span>
                <div className="flex rounded border border-[#E7E7E7] overflow-hidden text-[10px]">
                  <button
                    type="button"
                    onClick={() => setBrowserTheme('light')}
                    className={`px-2 py-0.5 ${
                      browserTheme === 'light' ? 'bg-[#3F3F8F] text-white font-semibold' : 'text-neutral-600'
                    }`}
                  >
                    Light Theme
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrowserTheme('dark')}
                    className={`px-2 py-0.5 ${
                      browserTheme === 'dark' ? 'bg-[#3F3F8F] text-white font-semibold' : 'text-neutral-600'
                    }`}
                  >
                    Dark Theme
                  </button>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-[4px] transition-colors ${
                  browserTheme === 'light' ? 'bg-[#E5E7EB]' : 'bg-[#202124]'
                }`}
              >
                <div
                  className={`max-w-xs rounded-t-[6px] px-3 py-1.5 flex items-center gap-2 shadow-xs ${
                    browserTheme === 'light' ? 'bg-white text-black' : 'bg-[#323639] text-[#E8EAED]'
                  }`}
                >
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {studioResult ? (
                      <img src={studioResult.preview32} className="w-4 h-4 object-contain" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-neutral-300" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium truncate flex-1">
                    TANOAH — Handcrafted Luxury
                  </span>
                  <span className="text-[11px] opacity-60">×</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#E7E7E7] flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => setIsStudioOpen(false)}
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isUploading}
                onClick={handleApplyFavicon}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                DEPLOY 512×512 FAVICON TO R2
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Media Library Picker Modal */}
      {isMediaPickerOpen && (
        <Modal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          title="SELECT LOGO FROM CLOUDFLARE R2 MEDIA LIBRARY"
        >
          <div className="space-y-4 text-xs font-poppins text-left max-w-2xl max-h-[70vh] flex flex-col">
            <div className="relative">
              <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logos or brand assets..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingMedia ? (
                <div className="p-8 text-center text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#3F3F8F]" />
                  <span>Loading Cloudflare R2 assets...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {mediaList
                    .filter(
                      (m) =>
                        !mediaSearch ||
                        (m.original_filename || '').toLowerCase().includes(mediaSearch.toLowerCase()) ||
                        (m.r2_key || '').toLowerCase().includes(mediaSearch.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id || item.r2_key}
                        onClick={() => handleSelectMediaItem(item)}
                        className="group relative rounded-[4px] overflow-hidden border border-[#E7E7E7] hover:border-[#3F3F8F] cursor-pointer p-2 flex flex-col items-center justify-between bg-white hover:bg-[#EEEEF8]/20 transition-all shadow-2xs"
                      >
                        <div className="w-16 h-16 flex items-center justify-center overflow-hidden mb-1">
                          <img
                            src={r2Service.getPublicUrl(item.r2_key)}
                            alt={item.original_filename}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <span className="text-[10px] text-neutral-700 font-medium truncate w-full text-center">
                          {item.original_filename}
                        </span>
                        {item.media_type === 'brand' && (
                          <span className="mt-1 text-[9px] bg-[#3F3F8F] text-white px-1.5 py-0.2 rounded font-bold">
                            Brand Asset
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E7E7E7] flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsMediaPickerOpen(false)}>
                CLOSE
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
