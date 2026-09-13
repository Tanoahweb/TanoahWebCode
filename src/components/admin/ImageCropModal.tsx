import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Check,
  Grid,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../common/Button';

export type AspectRatioOption = '3:4' | '4:5' | 'original' | '1:1' | 'free';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSource: File | string | null;
  onClose: () => void;
  onApply: (croppedFile: File) => void | Promise<void>;
  queueInfo?: {
    current: number;
    total: number;
    onSkip?: () => void;
    onUploadAllWithoutCrop?: () => void;
  };
  defaultAspectRatio?: AspectRatioOption;
}

interface CropRect {
  x: number; // 0 to 1 relative to container width
  y: number; // 0 to 1 relative to container height
  width: number; // 0 to 1
  height: number; // 0 to 1
}

type DragMode =
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'w'
  | 'e'
  | null;

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSource,
  onClose,
  onApply,
  queueInfo,
  defaultAspectRatio = '3:4',
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('product_photo');
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Crop & Transform state
  const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioOption>(defaultAspectRatio);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);

  // Normalized crop box: [0, 1] relative to rendered image display bounds
  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.05, width: 0.8, height: 0.9 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    cropStart: CropRect;
  } | null>(null);

  // Load image whenever imageSource changes
  useEffect(() => {
    if (!isOpen || !imageSource) {
      setImageSrc('');
      return;
    }

    setIsLoading(true);
    let objectUrl: string | null = null;

    if (imageSource instanceof File) {
      objectUrl = URL.createObjectURL(imageSource);
      setImageSrc(objectUrl);
      setSourceName(imageSource.name);
    } else if (typeof imageSource === 'string') {
      setImageSrc(imageSource);
      const parts = imageSource.split('/');
      const lastPart = parts[parts.length - 1]?.split('?')[0] || 'photo.webp';
      setSourceName(lastPart);
    }

    // Reset transformations
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setAspectRatioMode(defaultAspectRatio);

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, imageSource, defaultAspectRatio]);

  // Once the image element is loaded, measure dimensions and initialize crop box
  const handleImageLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalWidth(nw);
      setNaturalHeight(nh);
      setIsLoading(false);

      // Initialize crop according to chosen aspect ratio
      applyAspectRatioToCrop(aspectRatioMode, nw, nh);
    },
    [aspectRatioMode]
  );

  // Helper to compute numeric target ratio (width / height)
  const getNumericRatio = useCallback(
    (mode: AspectRatioOption, nw = naturalWidth, nh = naturalHeight): number | null => {
      if (mode === '3:4') return 3 / 4;
      if (mode === '4:5') return 4 / 5;
      if (mode === '1:1') return 1;
      if (mode === 'original' && nw > 0 && nh > 0) return nw / nh;
      return null; // 'free'
    },
    [naturalWidth, naturalHeight]
  );

  // Fit a crop box of the desired aspect ratio within the [0, 1] relative box
  const applyAspectRatioToCrop = useCallback(
    (mode: AspectRatioOption, nw = naturalWidth, nh = naturalHeight) => {
      const ratio = getNumericRatio(mode, nw, nh);
      if (!ratio || nw <= 0 || nh <= 0) {
        // Free mode: Default to 80% box centered
        setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
        return;
      }

      // The image itself has an aspect ratio of (nw / nh).
      // We want the crop box on the image to have aspect ratio `ratio`.
      // In normalized coordinates (where x: [0, 1] maps to nw, y: [0, 1] maps to nh):
      // (crop.width * nw) / (crop.height * nh) = ratio
      // => crop.width / crop.height = ratio * (nh / nw)
      const normalizedRatio = ratio * (nh / nw);

      let cropW: number;
      let cropH: number;

      if (normalizedRatio <= 1) {
        // Taller than wide in normalized terms
        cropH = 0.94;
        cropW = cropH * normalizedRatio;
        if (cropW > 0.94) {
          cropW = 0.94;
          cropH = cropW / normalizedRatio;
        }
      } else {
        // Wider than tall
        cropW = 0.94;
        cropH = cropW / normalizedRatio;
        if (cropH > 0.94) {
          cropH = 0.94;
          cropW = cropH * normalizedRatio;
        }
      }

      const cropX = Math.max(0, (1 - cropW) / 2);
      const cropY = Math.max(0, (1 - cropH) / 2);

      setCrop({
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      });
    },
    [getNumericRatio, naturalWidth, naturalHeight]
  );

  const handleAspectRatioChange = (newMode: AspectRatioOption) => {
    setAspectRatioMode(newMode);
    applyAspectRatioToCrop(newMode);
  };

  // Rotation controls (90-degree steps)
  const handleRotateCw = () => setRotation((r) => (r + 90) % 360);
  const handleRotateCcw = () => setRotation((r) => (r + 270) % 360);
  const handleFlipH = () => setIsFlippedH((f) => !f);

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    applyAspectRatioToCrop(aspectRatioMode);
  };

  // Pointer Drag Handlers for Smooth Box Moving and Resizing
  const handlePointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    dragStartRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      cropStart: { ...crop },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !containerRef.current) return;
    e.preventDefault();

    const { mode, startX, startY, cropStart } = dragStartRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - startX) / rect.width;
    const dy = (e.clientY - startY) / rect.height;

    const ratio = getNumericRatio(aspectRatioMode);
    const nw = naturalWidth || 1;
    const nh = naturalHeight || 1;
    const normalizedRatio = ratio ? ratio * (nh / nw) : null;

    if (mode === 'move') {
      let newX = cropStart.x + dx;
      let newY = cropStart.y + dy;
      newX = Math.max(0, Math.min(1 - cropStart.width, newX));
      newY = Math.max(0, Math.min(1 - cropStart.height, newY));
      setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      return;
    }

    // Resizing handles
    let { x, y, width, height } = cropStart;
    const minSize = 0.08;

    if (normalizedRatio) {
      // Locked aspect ratio resizing
      if (mode === 'se') {
        const targetW = Math.min(1 - x, Math.max(minSize, width + dx));
        const targetH = targetW / normalizedRatio;
        if (y + targetH <= 1 && targetH >= minSize) {
          width = targetW;
          height = targetH;
        }
      } else if (mode === 'sw') {
        const targetW = Math.min(x + width, Math.max(minSize, width - dx));
        const targetH = targetW / normalizedRatio;
        if (y + targetH <= 1 && targetH >= minSize) {
          x = cropStart.x + (cropStart.width - targetW);
          width = targetW;
          height = targetH;
        }
      } else if (mode === 'ne') {
        const targetW = Math.min(1 - x, Math.max(minSize, width + dx));
        const targetH = targetW / normalizedRatio;
        if (targetH >= minSize && cropStart.y + cropStart.height - targetH >= 0) {
          y = cropStart.y + (cropStart.height - targetH);
          width = targetW;
          height = targetH;
        }
      } else if (mode === 'nw') {
        const targetW = Math.min(x + width, Math.max(minSize, width - dx));
        const targetH = targetW / normalizedRatio;
        if (targetH >= minSize && cropStart.y + cropStart.height - targetH >= 0) {
          x = cropStart.x + (cropStart.width - targetW);
          y = cropStart.y + (cropStart.height - targetH);
          width = targetW;
          height = targetH;
        }
      }
    } else {
      // Free aspect ratio resizing
      if (mode === 'se' || mode === 'e' || mode === 's') {
        if (mode === 'se' || mode === 'e') width = Math.min(1 - x, Math.max(minSize, width + dx));
        if (mode === 'se' || mode === 's') height = Math.min(1 - y, Math.max(minSize, height + dy));
      }
      if (mode === 'nw' || mode === 'w' || mode === 'n') {
        if (mode === 'nw' || mode === 'w') {
          const newW = Math.min(x + width, Math.max(minSize, width - dx));
          x = cropStart.x + (cropStart.width - newW);
          width = newW;
        }
        if (mode === 'nw' || mode === 'n') {
          const newH = Math.min(y + height, Math.max(minSize, height - dy));
          y = cropStart.y + (cropStart.height - newH);
          height = newH;
        }
      }
      if (mode === 'ne') {
        width = Math.min(1 - x, Math.max(minSize, width + dx));
        const newH = Math.min(y + height, Math.max(minSize, height - dy));
        y = cropStart.y + (cropStart.height - newH);
        height = newH;
      }
      if (mode === 'sw') {
        const newW = Math.min(x + width, Math.max(minSize, width - dx));
        x = cropStart.x + (cropStart.width - newW);
        width = newW;
        height = Math.min(1 - y, Math.max(minSize, height + dy));
      }
    }

    setCrop({
      x: Math.max(0, Math.min(1 - width, x)),
      y: Math.max(0, Math.min(1 - height, y)),
      width: Math.min(1, Math.max(minSize, width)),
      height: Math.min(1, Math.max(minSize, height)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragStartRef.current = null;
    }
  };

  // High-Resolution Canvas Cropping & Export
  const handleApplyCrop = async () => {
    if (!imageSrc || naturalWidth <= 0 || naturalHeight <= 0) return;
    setIsProcessing(true);

    try {
      // 1. Create a memory image to load with crossOrigin
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(new Error('Failed to load image for cropping: ' + e));
        img.src = imageSrc;
      });

      // 2. Compute pixel coordinates of crop on original unscaled image
      const srcCropX = Math.round(crop.x * naturalWidth);
      const srcCropY = Math.round(crop.y * naturalHeight);
      const srcCropW = Math.round(crop.width * naturalWidth);
      const srcCropH = Math.round(crop.height * naturalHeight);

      // 3. Create offscreen canvas for cropped piece
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = srcCropW;
      cropCanvas.height = srcCropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Could not create canvas context');

      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = 'high';

      // Draw the sub-rectangle from original image
      cropCtx.drawImage(
        img,
        srcCropX,
        srcCropY,
        srcCropW,
        srcCropH,
        0,
        0,
        srcCropW,
        srcCropH
      );

      // 4. Handle Rotation & Flip if any
      let finalCanvas = cropCanvas;
      if (rotation !== 0 || isFlippedH) {
        const transCanvas = document.createElement('canvas');
        const isRotated90or270 = rotation === 90 || rotation === 270;
        transCanvas.width = isRotated90or270 ? srcCropH : srcCropW;
        transCanvas.height = isRotated90or270 ? srcCropW : srcCropH;

        const transCtx = transCanvas.getContext('2d');
        if (!transCtx) throw new Error('Failed to transform canvas');

        transCtx.imageSmoothingEnabled = true;
        transCtx.imageSmoothingQuality = 'high';

        transCtx.translate(transCanvas.width / 2, transCanvas.height / 2);
        if (rotation !== 0) {
          transCtx.rotate((rotation * Math.PI) / 180);
        }
        if (isFlippedH) {
          transCtx.scale(-1, 1);
        }
        transCtx.drawImage(cropCanvas, -srcCropW / 2, -srcCropH / 2);
        finalCanvas = transCanvas;
      }

      // 5. Convert to high quality WebP blob
      const blob = await new Promise<Blob | null>((resolve) => {
        finalCanvas.toBlob(
          (b) => resolve(b),
          'image/webp',
          0.92
        );
      });

      if (!blob) throw new Error('Failed to create cropped image blob');

      const cleanBase = sourceName.replace(/\.[^/.]+$/, '').replace(/_cropped$/, '');
      const croppedFilename = `${cleanBase}_cropped.webp`;
      const croppedFile = new File([blob], croppedFilename, { type: 'image/webp' });

      await onApply(croppedFile);
    } catch (err: any) {
      console.error('Error applying crop:', err);
      alert('Could not apply crop: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Compute calculated output dimensions for display
  const outputW = Math.round(crop.width * (naturalWidth || 1000));
  const outputH = Math.round(crop.height * (naturalHeight || 1000));
  const displayW = (rotation === 90 || rotation === 270) ? outputH : outputW;
  const displayH = (rotation === 90 || rotation === 270) ? outputW : outputH;

  return (
    <div
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="relative bg-[#111118] text-white w-full max-w-5xl rounded-[8px] shadow-2xl border border-white/10 max-h-[96vh] flex flex-col overflow-hidden animate-fade-in font-poppins">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#161622] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#3F3F8F] flex items-center justify-center text-white shadow">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-wondra text-lg tracking-wide text-white">Product Photo Studio</h3>
                {queueInfo && queueInfo.total > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#3F3F8F]/40 border border-[#3F3F8F] text-[11px] font-semibold text-indigo-200">
                    Photo {queueInfo.current} of {queueInfo.total}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50 truncate max-w-[340px]">
                {sourceName} • {naturalWidth > 0 ? `${naturalWidth} × ${naturalHeight} px` : 'Loading...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queueInfo && queueInfo.onUploadAllWithoutCrop && queueInfo.total > 1 && (
              <button
                type="button"
                onClick={queueInfo.onUploadAllWithoutCrop}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Skip cropping for all remaining images and upload as-is"
              >
                <span>Upload All Uncropped</span>
              </button>
            )}

            {queueInfo && queueInfo.onSkip && queueInfo.total > 1 && (
              <button
                type="button"
                onClick={queueInfo.onSkip}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Skip cropping this image"
              >
                <span>Skip Photo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Aspect Ratio Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#1A1A28] border-b border-white/10 text-xs shrink-0">
          {/* Aspect Ratio Buttons (Preserving Current Image Size Setting) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider mr-1 shrink-0">
              Ratio Presets:
            </span>

            <button
              type="button"
              onClick={() => handleAspectRatioChange('3:4')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aspectRatioMode === '3:4'
                  ? 'bg-[#3F3F8F] text-white shadow-sm ring-1 ring-white/30 font-semibold'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              3:4 (Portrait Fashion)
            </button>

            <button
              type="button"
              onClick={() => handleAspectRatioChange('4:5')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aspectRatioMode === '4:5'
                  ? 'bg-[#3F3F8F] text-white shadow-sm ring-1 ring-white/30 font-semibold'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              4:5 (Storefront Master)
            </button>

            <button
              type="button"
              onClick={() => handleAspectRatioChange('original')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aspectRatioMode === 'original'
                  ? 'bg-[#3F3F8F] text-white shadow-sm ring-1 ring-white/30 font-semibold'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Preserve the original image aspect ratio and dimensions"
            >
              Original Ratio
            </button>

            <button
              type="button"
              onClick={() => handleAspectRatioChange('1:1')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aspectRatioMode === '1:1'
                  ? 'bg-[#3F3F8F] text-white shadow-sm ring-1 ring-white/30 font-semibold'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              1:1 (Square)
            </button>

            <button
              type="button"
              onClick={() => handleAspectRatioChange('free')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aspectRatioMode === 'free'
                  ? 'bg-[#3F3F8F] text-white shadow-sm ring-1 ring-white/30 font-semibold'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Free Crop
            </button>
          </div>

          {/* Quick Edit Tools: 3*4 Grid Toggle, Rotate, Flip, Reset */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* 3*4 Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowGrid((g) => !g)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                showGrid
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
              title="Toggle 3×4 Composition Grid Lines"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>3×4 Grid</span>
            </button>

            {/* Rotate CCW */}
            <button
              type="button"
              onClick={handleRotateCcw}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Rotate 90° Left"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Rotate CW */}
            <button
              type="button"
              onClick={handleRotateCw}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Rotate 90° Right"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Flip Horizontal */}
            <button
              type="button"
              onClick={handleFlipH}
              className={`p-1.5 rounded transition-colors ${
                isFlippedH
                  ? 'bg-[#3F3F8F] text-white'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
              }`}
              title="Flip Horizontal (Mirror)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Reset Crop & Orientations"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Studio Viewport Area */}
        <div className="relative flex-1 bg-[#09090D] flex items-center justify-center overflow-hidden min-h-[380px] sm:min-h-[460px] select-none p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 text-white/60">
              <RefreshCw className="w-6 h-6 animate-spin text-[#3F3F8F]" />
              <span className="text-xs">Loading photography...</span>
            </div>
          )}

          {imageSrc && (
            <div
              className="relative max-w-full max-h-[62vh] flex items-center justify-center"
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.15s ease-out',
              }}
            >
              {/* Relative Container that wraps the rendered image bounds */}
              <div
                ref={containerRef}
                className="relative inline-block overflow-hidden shadow-2xl"
                style={{
                  touchAction: 'none',
                }}
              >
                {/* Source Image */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={handleImageLoaded}
                  className="max-h-[62vh] max-w-full block object-contain pointer-events-none transition-all duration-200"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                  }}
                  draggable={false}
                />

                {/* Dark Dimmer Mask for Area Outside the Active Crop Box */}
                {!isLoading && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(transparent, transparent)`,
                      boxShadow: 'inset 0 0 0 9999px rgba(0, 0, 0, 0.55)',
                      clipPath: `polygon(
                        0% 0%,
                        100% 0%,
                        100% 100%,
                        0% 100%,
                        0% 0%,
                        ${crop.x * 100}% ${crop.y * 100}%,
                        ${crop.x * 100}% ${(crop.y + crop.height) * 100}%,
                        ${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%,
                        ${(crop.x + crop.width) * 100}% ${crop.y * 100}%,
                        ${crop.x * 100}% ${crop.y * 100}%
                      )`,
                    }}
                  />
                )}

                {/* Active Interactive Crop Box */}
                {!isLoading && (
                  <div
                    className="absolute border border-white/90 shadow-2xl cursor-move touch-none"
                    style={{
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.width * 100}%`,
                      height: `${crop.height * 100}%`,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 8px 30px rgba(0,0,0,0.7)',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'move')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    {/* 3×4 Grid Lines Overlay (3 Columns × 4 Rows) */}
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* 2 Vertical Lines dividing width into 3 equal columns */}
                        <div
                          className="absolute top-0 bottom-0 border-r border-white/70"
                          style={{
                            left: '33.333%',
                            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))',
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 border-r border-white/70"
                          style={{
                            left: '66.666%',
                            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))',
                          }}
                        />

                        {/* 3 Horizontal Lines dividing height into 4 equal rows */}
                        <div
                          className="absolute left-0 right-0 border-b border-white/70"
                          style={{
                            top: '25%',
                            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))',
                          }}
                        />
                        <div
                          className="absolute left-0 right-0 border-b border-white/70"
                          style={{
                            top: '50%',
                            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))',
                          }}
                        />
                        <div
                          className="absolute left-0 right-0 border-b border-white/70"
                          style={{
                            top: '75%',
                            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))',
                          }}
                        />

                        {/* Subtle Grid Intersection Highlights */}
                        <div
                          className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white/90"
                          style={{ left: '33.333%', top: '25%', filter: 'drop-shadow(0 0 1px #000)' }}
                        />
                        <div
                          className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white/90"
                          style={{ left: '66.666%', top: '25%', filter: 'drop-shadow(0 0 1px #000)' }}
                        />
                        <div
                          className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white/90"
                          style={{ left: '33.333%', top: '50%', filter: 'drop-shadow(0 0 1px #000)' }}
                        />
                        <div
                          className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white/90"
                          style={{ left: '66.666%', top: '50%', filter: 'drop-shadow(0 0 1px #000)' }}
                        />
                        <div
                          className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white/90"
                          style={{ left: '33.333%', top: '75%', filter: 'drop-shadow(0 0 1px #000)' }}
                        />
                        <div
                          className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-white/90"
                          style={{ left: '66.666%', top: '75%', filter: 'drop-shadow(0 0 1px #000)' }}
                        />
                      </div>
                    )}

                    {/* Corner Brackets / Drag Handles */}
                    {/* Top-Left */}
                    <div
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-[#3F3F8F] shadow rounded-xs cursor-nwse-resize touch-none"
                      onPointerDown={(e) => handlePointerDown(e, 'nw')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* Top-Right */}
                    <div
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-[#3F3F8F] shadow rounded-xs cursor-nesw-resize touch-none"
                      onPointerDown={(e) => handlePointerDown(e, 'ne')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* Bottom-Left */}
                    <div
                      className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-[#3F3F8F] shadow rounded-xs cursor-nesw-resize touch-none"
                      onPointerDown={(e) => handlePointerDown(e, 'sw')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* Bottom-Right */}
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-[#3F3F8F] shadow rounded-xs cursor-nwse-resize touch-none"
                      onPointerDown={(e) => handlePointerDown(e, 'se')}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* Edge Handles (Only visible in Free mode) */}
                    {aspectRatioMode === 'free' && (
                      <>
                        {/* North */}
                        <div
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white/90 border border-[#3F3F8F] rounded-xs cursor-ns-resize touch-none"
                          onPointerDown={(e) => handlePointerDown(e, 'n')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                        {/* South */}
                        <div
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white/90 border border-[#3F3F8F] rounded-xs cursor-ns-resize touch-none"
                          onPointerDown={(e) => handlePointerDown(e, 's')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                        {/* West */}
                        <div
                          className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-4 bg-white/90 border border-[#3F3F8F] rounded-xs cursor-ew-resize touch-none"
                          onPointerDown={(e) => handlePointerDown(e, 'w')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                        {/* East */}
                        <div
                          className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-4 bg-white/90 border border-[#3F3F8F] rounded-xs cursor-ew-resize touch-none"
                          onPointerDown={(e) => handlePointerDown(e, 'e')}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                      </>
                    )}

                    {/* Center Crosshair / Drag indicator */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="w-3 h-3 border-t border-l border-white/60 -mr-1 -mb-1" />
                      <div className="w-3 h-3 border-b border-r border-white/60 -ml-1 -mt-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Floating Zoom Control in Bottom-Left of Viewport */}
          <div className="absolute bottom-3 left-3 bg-[#161622]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg text-xs z-20">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
              className="text-white/60 hover:text-white p-0.5"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 accent-[#3F3F8F] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))}
              className="text-white/60 hover:text-white p-0.5"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-white/50 w-8 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Live Composition Guide Readout in Bottom-Right */}
          <div className="absolute bottom-3 right-3 bg-[#161622]/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 flex items-center gap-2.5 shadow-lg text-[11px] z-20">
            <Sparkles className="w-3.5 h-3.5 text-[#3F3F8F]" />
            <span className="text-white/80 font-mono">
              Output: {displayW} × {displayH} px
            </span>
            <span className="text-white/40 font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-white/5">
              {aspectRatioMode}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-white/10 bg-[#161622] shrink-0 text-xs">
          <div className="flex items-center gap-2 text-white/60 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[#3F3F8F]" />
            <span>
              Preserving original native clarity • 3×4 compositional alignment • High-Q WebP
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>

            {queueInfo && queueInfo.onSkip && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={queueInfo.onSkip}
                className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
              >
                Use Uncropped
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleApplyCrop}
              disabled={isProcessing || isLoading}
              className="bg-[#3F3F8F] hover:bg-[#343477] text-white flex items-center gap-1.5 shadow-md px-5"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {queueInfo && queueInfo.total > 1 && queueInfo.current < queueInfo.total
                      ? 'Apply & Next Photo'
                      : 'Apply & Save Crop'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
