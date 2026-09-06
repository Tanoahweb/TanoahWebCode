/**
 * Favicon Standards & Canvas Processing Utility
 * Implements W3C, Google Search, and Apple Touch Icon standards:
 * - Master Resolution: 512x512 px (1:1 square PNG with 32-bit alpha)
 * - Derived Standards: 48x48 (Google SERP standard), 180x180 (Apple Touch), 32x32 & 16x16 (Browser Tabs)
 */

export interface FaviconStandardizeOptions {
  fitMode?: 'contain' | 'cover';
  background?: 'transparent' | 'white' | 'dark' | 'custom';
  backgroundColor?: string;
  paddingPercent?: number; // 0 to 30
  outputSize?: number; // default 512
}

export interface StandardizedFaviconResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  preview16: string;
  preview32: string;
  preview48: string;
  preview180: string;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
  isSquare: boolean;
}

/**
 * Standard sizes guide according to Google Search & W3C specs
 */
export const FAVICON_STANDARDS = {
  MASTER_SIZE: 512,
  GOOGLE_SERP_SIZE: 48,
  APPLE_TOUCH_SIZE: 180,
  BROWSER_TAB_SIZE: 32,
  FALLBACK_TAB_SIZE: 16,
  RECOMMENDED_FORMAT: 'image/png',
  ASPECT_RATIO: '1:1 (Square)',
};

/**
 * Dynamically updates document.head link tags for favicon and apple-touch-icon
 */
export function applyFavicon(faviconUrl: string): void {
  if (!faviconUrl || typeof document === 'undefined') return;

  // 1. Standard icon
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = faviconUrl.endsWith('.ico') ? 'image/x-icon' : 'image/png';
  link.href = faviconUrl;

  // 2. Apple touch icon
  let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = faviconUrl;

  // 3. Shortcut icon fallback
  let shortcutLink = document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']");
  if (shortcutLink) {
    shortcutLink.href = faviconUrl;
  }
}

/**
 * Loads an image from a File or URL into an HTMLImageElement
 */
export function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for favicon processing.'));

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Processes an input image into a standard 1:1 square favicon (512x512 master PNG)
 * with multi-resolution previews for Google SERP, Apple Touch, and browser tabs.
 */
export async function processStandardFavicon(
  source: File | string,
  options: FaviconStandardizeOptions = {}
): Promise<StandardizedFaviconResult> {
  const {
    fitMode = 'contain',
    background = 'transparent',
    backgroundColor = '#1A1A2E',
    paddingPercent = 8,
    outputSize = 512,
  } = options;

  const img = await loadImageElement(source);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const aspectRatio = origW / origH;
  const isSquare = Math.abs(aspectRatio - 1) < 0.02;

  // Master 512x512 canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Configure high-quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply background if requested
  if (background === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);
  } else if (background === 'dark') {
    ctx.fillStyle = '#1A1A2E'; // Luxury brand navy-black
    ctx.fillRect(0, 0, outputSize, outputSize);
  } else if (background === 'custom' && backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outputSize, outputSize);
  } else {
    // Transparent: clearRect guarantees clean alpha
    ctx.clearRect(0, 0, outputSize, outputSize);
  }

  // Calculate destination rectangle inside canvas
  const padding = (outputSize * Math.max(0, Math.min(40, paddingPercent))) / 100;
  const targetW = outputSize - padding * 2;
  const targetH = outputSize - padding * 2;

  let drawX = padding;
  let drawY = padding;
  let drawW = targetW;
  let drawH = targetH;

  if (fitMode === 'contain') {
    if (aspectRatio > 1) {
      // Wider than tall
      drawW = targetW;
      drawH = targetW / aspectRatio;
      drawY = padding + (targetH - drawH) / 2;
    } else {
      // Taller than wide
      drawH = targetH;
      drawW = targetH * aspectRatio;
      drawX = padding + (targetW - drawW) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Cover mode: center-crop
    let srcX = 0;
    let srcY = 0;
    let srcW = origW;
    let srcH = origH;

    if (aspectRatio > 1) {
      srcW = origH;
      srcX = (origW - srcW) / 2;
    } else {
      srcH = origW;
      srcY = (origH - srcH) / 2;
    }
    ctx.drawImage(img, srcX, srcY, srcW, srcH, padding, padding, targetW, targetH);
  }

  // Generate multi-size preview data URLs
  const createSizedPreview = (size: number): string => {
    const mini = document.createElement('canvas');
    mini.width = size;
    mini.height = size;
    const miniCtx = mini.getContext('2d');
    if (!miniCtx) return '';
    miniCtx.imageSmoothingEnabled = true;
    miniCtx.imageSmoothingQuality = 'high';
    miniCtx.drawImage(canvas, 0, 0, size, size);
    return mini.toDataURL('image/png');
  };

  const preview16 = createSizedPreview(16);
  const preview32 = createSizedPreview(32);
  const preview48 = createSizedPreview(48);
  const preview180 = createSizedPreview(180);
  const dataUrl = canvas.toDataURL('image/png');

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create PNG blob from canvas.'));
    }, 'image/png');
  });

  return {
    blob,
    dataUrl,
    width: outputSize,
    height: outputSize,
    preview16,
    preview32,
    preview48,
    preview180,
    originalWidth: origW,
    originalHeight: origH,
    aspectRatio,
    isSquare,
  };
}
