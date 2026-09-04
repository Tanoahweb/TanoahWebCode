import { IMAGE_PIPELINE_CONFIG, IMAGE_PRESETS, ImagePresetName } from '../config/imagePresets';

/**
 * Format bytes to readable string (e.g. 1.2 MB, 450 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'avif' | 'webp' | 'jpeg';
  fit?: 'cover' | 'contain' | 'scale-down';
}

/**
 * Determines whether a URL or key represents a Cloudflare R2 managed asset.
 */
export function isR2Asset(urlOrKey: string): boolean {
  if (!urlOrKey || typeof urlOrKey !== 'string') return false;
  const trimmed = urlOrKey.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) return false;
  if (lower.startsWith('/assets/') || lower.startsWith('assets/')) return false;
  if (lower.startsWith('http://localhost') || lower.startsWith('https://localhost')) return false;
  if (lower.startsWith('http://127.0.0.1') || lower.startsWith('https://127.0.0.1')) return false;
  if (lower.startsWith('http://192.168.') || lower.startsWith('https://192.168.')) return false;

  // If it's a full HTTP/HTTPS URL, only treat as R2 if it points to our configured domain or R2
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    const cdnDomain =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_IMAGE_DOMAIN) ||
      IMAGE_PIPELINE_CONFIG.DEFAULT_CDN_DOMAIN;
    const cleanCdn = cdnDomain.replace(/^https?:\/\//, '').toLowerCase().replace(/\/.*$/, '');
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      return host === cleanCdn || host.endsWith('.r2.dev') || host.includes('r2.cloudflarestorage.com');
    } catch {
      return false;
    }
  }

  // Pure storage key format (e.g., 'products/xyz.webp', 'banners/abc.webp')
  return true;
}

/**
 * Normalizes an R2 key or public URL to extract just the storage key.
 */
export function extractR2Key(urlOrKey: string): string {
  if (!urlOrKey || typeof urlOrKey !== 'string') return '';
  const trimmed = urlOrKey.trim();

  // If it's already just a key like 'products/xyz.webp'
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.replace(/^\/+/, '');
  }

  try {
    const parsed = new URL(trimmed);
    // If URL is already in /cdn-cgi/image/.../<key> format
    const cdnCgiIndex = parsed.pathname.indexOf('/cdn-cgi/image/');
    if (cdnCgiIndex !== -1) {
      const parts = parsed.pathname.slice(cdnCgiIndex + 15).split('/');
      parts.shift(); // remove options part (width=...,quality=...)
      return parts.join('/');
    }
    // Standard URL: pathname without leading slash
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return trimmed;
  }
}

/**
 * Builds a dynamic Cloudflare Image Transformations URL.
 * URL format: https://<ZONE_DOMAIN>/cdn-cgi/image/width=${width},quality=${quality},format=auto/${r2Key}
 */
export function getTransformedImageUrl(
  urlOrKey: string,
  options: TransformOptions = {}
): string {
  if (!urlOrKey || typeof urlOrKey !== 'string' || !urlOrKey.trim()) {
    return '/Assets/products/placeholder-product.svg';
  }

  // Preserve local assets and data URLs without transformation overhead
  if (!isR2Asset(urlOrKey)) {
    return urlOrKey;
  }

  const cdnDomain =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_IMAGE_DOMAIN) ||
    IMAGE_PIPELINE_CONFIG.DEFAULT_CDN_DOMAIN;

  const key = extractR2Key(urlOrKey);

  // If using direct Cloudflare R2 public bucket (e.g. *.r2.dev), serve direct raw optimized WebP master
  if (cdnDomain.includes('r2.dev') || cdnDomain.includes('r2.cloudflarestorage.com')) {
    return `${cdnDomain.replace(/\/+$/, '')}/${key}`;
  }

  // If running in development without a live Cloudflare transformation domain configured
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.'));

  const hasConfiguredCustomDomain = Boolean(
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_IMAGE_DOMAIN
  );

  // If in local dev and no live custom domain is configured, do not hit unreachable images.tanoah.com
  if (isLocalDev && (!hasConfiguredCustomDomain || cdnDomain.includes('localhost'))) {
    return urlOrKey.startsWith('http') ? urlOrKey : `/${key.replace(/^\/+/, '')}`;
  }

  if (cdnDomain.includes('localhost') || !cdnDomain.startsWith('http')) {
    return `/${key}`;
  }

  const params: string[] = [];
  if (options.width) params.push(`width=${options.width}`);
  if (options.height) params.push(`height=${options.height}`);
  if (options.quality) params.push(`quality=${options.quality}`);
  params.push(`format=${options.format || 'auto'}`);
  params.push(`fit=${options.fit || 'cover'}`);

  const optionsString = params.join(',');
  return `${cdnDomain.replace(/\/+$/, '')}/cdn-cgi/image/${optionsString}/${key}`;
}

/**
 * Builds responsive srcSet string for an image key using configured widths.
 */
export function generateSrcSet(
  urlOrKey: string,
  widths: number[],
  quality?: number
): string {
  if (!urlOrKey || !isR2Asset(urlOrKey)) {
    return '';
  }

  const cdnDomain =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_IMAGE_DOMAIN) ||
    IMAGE_PIPELINE_CONFIG.DEFAULT_CDN_DOMAIN;

  // Direct R2 bucket URLs serve raw objects directly (no /cdn-cgi/ resizing)
  if (cdnDomain.includes('r2.dev') || cdnDomain.includes('r2.cloudflarestorage.com')) {
    return '';
  }

  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.'));

  const hasConfiguredCustomDomain = Boolean(
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_IMAGE_DOMAIN
  );

  // Skip generating srcSet in local dev if Cloudflare R2 is not yet connected
  if (isLocalDev && !hasConfiguredCustomDomain) {
    return '';
  }

  return widths
    .map((w) => {
      const transformedUrl = getTransformedImageUrl(urlOrKey, { width: w, quality });
      return `${transformedUrl} ${w}w`;
    })
    .join(', ');
}

/**
 * Helper to get delivery URL and srcSet for a predefined preset.
 */
export function getPresetImageDetails(
  urlOrKey: string,
  presetName: ImagePresetName = 'productCard'
) {
  const preset = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.productCard;
  const src = getTransformedImageUrl(urlOrKey, {
    width: preset.defaultWidth,
    quality: preset.quality,
  });
  const srcSet = generateSrcSet(urlOrKey, preset.widths, preset.quality);

  return {
    src,
    srcSet,
    sizes: preset.sizes,
    aspectRatio: preset.aspectRatio,
  };
}
