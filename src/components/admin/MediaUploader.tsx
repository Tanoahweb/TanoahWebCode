import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Info,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { ProductImage } from '../../types';
import { formatBytes } from '../../utils/imageUtils';
import { ProductImage as StorefrontImage } from '../common/ProductImage';

export interface MediaUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  colorOptions?: { id: string; name: string }[];
}

interface UploadingItem {
  id: string;
  name: string;
  progress: number;
  stage: string;
  originalSize: number;
  optimizedSize?: number;
  percentSaved?: number;
  isDuplicate?: boolean;
  status: 'processing' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  images,
  onChange,
  colorOptions = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preserveOriginal, setPreserveOriginal] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadingItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    let currentImages = [...images];

    for (const file of fileArray) {
      const queueId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const queueItem: UploadingItem = {
        id: queueId,
        name: file.name,
        progress: 10,
        stage: 'Reading image...',
        originalSize: file.size,
        status: 'processing',
      };

      setUploadQueue((prev) => [...prev, queueItem]);

      try {
        const result = await api.uploadMediaFile(file, {
          preserveOriginal,
          mediaType: 'product',
          onProgress: (p) => {
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === queueId
                  ? {
                      ...item,
                      progress: p.percent,
                      stage: p.message,
                      status: p.stage === 'done' ? 'uploading' : 'processing',
                    }
                  : item
              )
            );
          },
        });

        // Add newly uploaded/deduplicated image to the product's image array
        const newProductImage: ProductImage = {
          id: result.media.id || `img_${Date.now()}`,
          media_id: result.media.id,
          image_url: result.publicUrl,
          sort_order: currentImages.length,
          position: currentImages.length,
          is_primary: currentImages.length === 0,
          color_name: '',
          alt_text: file.name.replace(/\.[^/.]+$/, ''),
        };

        currentImages = [...currentImages, newProductImage];
        onChange(currentImages);

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  progress: 100,
                  stage: result.isDuplicate ? 'Deduplicated (Reused Master)' : 'Complete',
                  optimizedSize: result.optimizedSize,
                  percentSaved: result.percentSaved,
                  isDuplicate: result.isDuplicate,
                  status: 'completed',
                }
              : item
          )
        );

        // Remove from progress queue after a brief moment
        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((item) => item.id !== queueId));
        }, 3500);
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: err.message || 'Optimization failed',
                }
              : item
          )
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimary = (id: string) => {
    onChange(
      images.map((img) => ({
        ...img,
        is_primary: img.id === id,
      }))
    );
  };

  const handleRemove = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const handleColorAssign = (id: string, color: string) => {
    onChange(
      images.map((img) => (img.id === id ? { ...img, color_name: color } : img))
    );
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reindexed = copy.map((img, idx) => ({
      ...img,
      sort_order: idx,
      position: idx,
    }));

    onChange(reindexed);
  };

  return (
    <div className="space-y-4 text-left font-poppins">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-[6px] p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 scale-[0.99]'
            : 'border-[#E7E7E7] hover:border-[#3F3F8F] bg-[#FAFAFA]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center border border-[#E7E7E7]">
            <Upload className="w-6 h-6 text-[#3F3F8F]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-black uppercase tracking-wider">
              Drag & Drop Product Photography Here
            </span>
            <p className="text-[11px] text-[#666666] mt-0.5">
              Supports JPEG, PNG, WebP. High-res raw camera images are automatically optimized in-browser.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E7E7E7] text-[10px] text-[#3F3F8F] font-medium">
            <Sparkles className="w-3 h-3 text-[#3F3F8F]" />
            <span>4:5 Portrait Master • WebP Q=88 • Zero CLS • Cloudflare R2</span>
          </div>
        </div>
      </div>

      {/* Preservation & Settings Toggle */}
      <div className="flex items-center justify-between p-3 rounded-[4px] bg-[#F8F8F8] border border-[#E7E7E7] text-xs">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={preserveOriginal}
            onChange={(e) => setPreserveOriginal(e.target.checked)}
            className="w-4 h-4 text-[#3F3F8F] border-[#E7E7E7] rounded focus:ring-0 cursor-pointer"
          />
          <span className="text-black font-medium text-[11px]">
            Preserve original uncompressed RAW file in R2 (<code className="text-[#666666]">originals/</code>)
          </span>
        </label>
        <span className="text-[10px] text-[#888888]">
          {preserveOriginal ? '⚠️ Increases R2 storage usage' : 'Recommended: OFF (Saves 85-95% storage)'}
        </span>
      </div>

      {/* Active Upload Queue & Compression Readout */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 p-3 bg-white border border-[#E7E7E7] rounded-[4px]">
          <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block mb-2">
            Optimization & Upload Progress
          </span>
          {uploadQueue.map((item) => (
            <div key={item.id} className="text-xs space-y-1 p-2 rounded bg-[#FAFAFA] border border-[#E7E7E7]">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-black truncate max-w-[200px]">{item.name}</span>
                <span className="text-[#3F3F8F] font-bold">
                  {item.status === 'completed'
                    ? item.isDuplicate
                      ? 'Deduplicated (Reused Master)'
                      : `Saved ${item.percentSaved}% (${formatBytes(item.optimizedSize || 0)})`
                    : item.stage}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#E7E7E7] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    item.status === 'error'
                      ? 'bg-red-500'
                      : item.isDuplicate
                      ? 'bg-emerald-500'
                      : 'bg-[#3F3F8F]'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {item.isDuplicate && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium pt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Exact content match detected via SHA-256. Reused existing master without uploading new bytes.</span>
                </div>
              )}

              {item.status === 'error' && (
                <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium pt-0.5">
                  <AlertCircle className="w-3 h-3" />
                  <span>{item.errorMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attached Images Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-black uppercase tracking-wider">
              Configured Product Imagery ({images.length})
            </span>
            <span className="text-[11px] text-[#666666]">
              {images.filter((i) => i.color_name).length} image(s) tagged to color variants
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {images.map((img, idx) => (
              <div
                key={img.id || idx}
                className="group relative rounded-[4px] border border-[#E7E7E7] bg-white overflow-hidden shadow-xs flex flex-col justify-between"
              >
                {/* Image Preview with 4:5 Aspect Ratio */}
                <div className="relative aspect-[4/5] overflow-hidden bg-[#F8F8F8]">
                  <StorefrontImage
                    src={img.image_url}
                    alt=""
                    preset="thumbnail"
                    aspectRatio="4/5"
                    className="w-full h-full object-cover"
                    wrapperClassName="w-full h-full"
                  />

                  {/* Primary Badge or Make Primary Action */}
                  {img.is_primary ? (
                    <span className="absolute top-2 left-2 bg-[#3F3F8F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                      PRIMARY
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img.id)}
                      className="absolute top-2 left-2 bg-white/90 hover:bg-white text-black text-[9px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                    >
                      Make Primary
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(img.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Position Sorting Controls */}
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      className="p-1 bg-white/90 hover:bg-white text-black rounded shadow disabled:opacity-30"
                      title="Move Left"
                    >
                      <ArrowUp className="w-3 h-3 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      className="p-1 bg-white/90 hover:bg-white text-black rounded shadow disabled:opacity-30"
                      title="Move Right"
                    >
                      <ArrowDown className="w-3 h-3 -rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Color Tag Selector for Saree / Clothing Variant Image Switching */}
                <div className="p-2 bg-[#FAFAFA] border-t border-[#E7E7E7]">
                  <label className="block text-[9px] text-[#888888] uppercase font-semibold mb-1">
                    Shows For Color:
                  </label>
                  <select
                    value={img.color_name || ''}
                    onChange={(e) => handleColorAssign(img.id, e.target.value)}
                    className="w-full p-1 border border-[#E7E7E7] rounded text-[11px] bg-white font-medium focus:outline-none focus:border-[#3F3F8F] cursor-pointer"
                  >
                    <option value="">All Colors (General)</option>
                    {colorOptions.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
