export interface ImagePresetConfig {
  widths: number[];
  quality: number;
  sizes: string;
  defaultWidth: number;
  aspectRatio: string; // e.g. '4/5'
}

export const IMAGE_PIPELINE_CONFIG = {
  // Master image optimization constraints
  MAX_MASTER_WIDTH: 2400,
  MAX_MASTER_HEIGHT: 3000,
  TARGET_ASPECT_RATIO: 4 / 5, // 0.8 portrait fashion ratio
  DEFAULT_WEBP_QUALITY: 0.88, // Preserves luxury textile & stitch micro-detail
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB max upload
  DEFAULT_STORAGE_BUCKET: 'tanoah-media',
  DEFAULT_CDN_DOMAIN:
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_R2_PUBLIC_DOMAIN || import.meta.env?.VITE_CLOUDFLARE_IMAGE_DOMAIN)) ||
    'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev',
};

export const IMAGE_PRESETS: Record<string, ImagePresetConfig> = {
  thumbnail: {
    widths: [150, 300],
    quality: 80,
    sizes: '150px',
    defaultWidth: 150,
    aspectRatio: '4/5',
  },
  cartThumb: {
    widths: [160, 240],
    quality: 80,
    sizes: '100px',
    defaultWidth: 160,
    aspectRatio: '4/5',
  },
  productCard: {
    widths: [360, 480, 720],
    quality: 85,
    sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    defaultWidth: 480,
    aspectRatio: '4/5',
  },
  productMain: {
    widths: [600, 900, 1200, 1600],
    quality: 88,
    sizes: '(max-width: 1024px) 100vw, 58vw',
    defaultWidth: 1200,
    aspectRatio: '4/5',
  },
  productZoom: {
    widths: [2000, 2400],
    quality: 90,
    sizes: '100vw',
    defaultWidth: 2400,
    aspectRatio: '4/5',
  },
  hero: {
    widths: [800, 1200, 1920],
    quality: 88,
    sizes: '100vw',
    defaultWidth: 1920,
    aspectRatio: '16/9',
  },
};

export type ImagePresetName = keyof typeof IMAGE_PRESETS;
