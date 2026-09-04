import { IMAGE_PIPELINE_CONFIG } from '../config/imagePresets';

export interface ProcessedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  fileHash: string;
  originalFilename: string;
  originalSize: number;
  optimizedSize: number;
  percentSaved: number;
  width: number;
  height: number;
  mimeType: string;
  previewUrl: string;
  preserveOriginal: boolean;
  rawOriginalFile?: File;
}

export interface ProcessingProgress {
  stage: 'reading' | 'resizing' | 'compressing' | 'hashing' | 'done';
  percent: number;
  message: string;
}

/**
 * Computes SHA-256 hash for a given ArrayBuffer using Web Crypto API.
 */
export async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Loads an image file into an HTMLImageElement or ImageBitmap with correct orientation.
 */
async function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to read image file: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Calculates optimal bounding dimensions respecting target max boundaries and aspect ratio.
 */
function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth = IMAGE_PIPELINE_CONFIG.MAX_MASTER_WIDTH,
  maxHeight = IMAGE_PIPELINE_CONFIG.MAX_MASTER_HEIGHT
): { width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;

  // Scale down proportionally if larger than master bounds
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const bestRatio = Math.min(widthRatio, heightRatio);

    width = Math.round(width * bestRatio);
    height = Math.round(height * bestRatio);
  }

  return { width, height };
}

/**
 * In-browser client-side optimization engine:
 * 1. Reads image and applies auto-orientation
 * 2. Downscales to max 2400x3000 master standard
 * 3. Strips EXIF and personal metadata
 * 4. Compresses to WebP (Quality ~88)
 * 5. Calculates SHA-256 content hash for deduplication
 * 6. Calculates exact byte savings
 */
export async function processImageForUpload(
  file: File,
  options: {
    preserveOriginal?: boolean;
    quality?: number;
    onProgress?: (p: ProcessingProgress) => void;
  } = {}
): Promise<ProcessedImageResult> {
  const { preserveOriginal = false, quality = IMAGE_PIPELINE_CONFIG.DEFAULT_WEBP_QUALITY, onProgress } = options;

  onProgress?.({ stage: 'reading', percent: 20, message: 'Reading image data...' });

  const img = await loadImageElement(file);
  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
    img.naturalWidth,
    img.naturalHeight
  );

  onProgress?.({ stage: 'resizing', percent: 45, message: 'Resizing to master resolution...' });

  // Create canvas for high-quality rasterization and EXIF stripping
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context could not be initialized.');
  }

  // Smooth bicubic resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  onProgress?.({ stage: 'compressing', percent: 70, message: 'Compressing to WebP master...' });

  // Convert to WebP blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('WebP canvas compression failed.'));
      },
      'image/webp',
      quality
    );
  });

  onProgress?.({ stage: 'hashing', percent: 85, message: 'Computing SHA-256 hash...' });

  const arrayBuffer = await blob.arrayBuffer();
  const fileHash = await computeSha256(arrayBuffer);

  const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const storedFilename = `${fileHash.slice(0, 16)}-${cleanBaseName}.webp`;
  const optimizedFile = new File([blob], storedFilename, { type: 'image/webp' });

  const originalSize = file.size;
  const optimizedSize = blob.size;
  const percentSaved = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

  const previewUrl = URL.createObjectURL(blob);

  // Generate persistent WebP data URL for instant display and offline / dev sandbox resilience
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(previewUrl);
    reader.readAsDataURL(blob);
  });

  onProgress?.({ stage: 'done', percent: 100, message: 'Image optimized successfully.' });

  return {
    file: optimizedFile,
    blob,
    dataUrl,
    fileHash,
    originalFilename: file.name,
    originalSize,
    optimizedSize,
    percentSaved,
    width: targetWidth,
    height: targetHeight,
    mimeType: 'image/webp',
    previewUrl,
    preserveOriginal,
    rawOriginalFile: preserveOriginal ? file : undefined,
  };
}
