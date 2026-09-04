import React, { useState, useEffect, useRef } from 'react';
import { getPresetImageDetails, isR2Asset } from '../../utils/imageUtils';
import { ImagePresetName } from '../../config/imagePresets';

export interface ProductImageProps {
  src: string;
  alt: string;
  preset?: ImagePresetName;
  priority?: boolean;
  className?: string;
  wrapperClassName?: string;
  aspectRatio?: string; // e.g. '4/5', '16/9', '1/1'
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  onLoad?: () => void;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  preset = 'productCard',
  priority = false,
  className = '',
  wrapperClassName = '',
  aspectRatio,
  onClick,
  style,
  onLoad,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const fallbackUrl = '/Assets/products/placeholder-product.svg';
  const hasValidSrc = Boolean(src && typeof src === 'string' && src.trim().length > 0);

  // If source changes, reset states
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const details = getPresetImageDetails(hasValidSrc ? src : fallbackUrl, preset);
  const activeAspectRatio = aspectRatio || details.aspectRatio || '4/5';

  const handleImageLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  const effectiveSrc = !hasValidSrc || hasError ? fallbackUrl : details.src;
  const effectiveSrcSet = hasError || !hasValidSrc || !isR2Asset(src) ? undefined : details.srcSet;

  // Immediate completion check for cached or fast SVG assets
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [effectiveSrc]);

  return (
    <div
      className={`relative overflow-hidden bg-[#F8F8F8] select-none ${wrapperClassName}`}
      style={{
        aspectRatio: activeAspectRatio,
      }}
      onClick={onClick}
    >
      {/* Subtle luxury placeholder shimmer while loading to guarantee zero CLS */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#F8F8F8] via-[#F0F0F0] to-[#F8F8F8] animate-pulse pointer-events-none"
          aria-hidden="true"
        />
      )}

      <img
        ref={imgRef}
        key={effectiveSrc}
        src={effectiveSrc}
        srcSet={effectiveSrcSet}
        sizes={details.sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        // @ts-ignore - fetchPriority is supported in modern browsers
        fetchpriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={style}
        className={`w-full h-full object-cover object-center transition-opacity duration-500 ease-out ${
          isLoaded || hasError ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
};
