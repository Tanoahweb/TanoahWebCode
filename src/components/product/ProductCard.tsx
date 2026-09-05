import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice, calculateDiscountPercentage } from '../../utils/formatters';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useCartStore } from '../../store/useCartStore';
import { useUIStore } from '../../store/useUIStore';
import { Badge } from '../common/Badge';
import { ProductImage } from '../common/ProductImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();
  const { openQuickView, addToast } = useUIStore();

  const isWishlisted = isInWishlist(product.id);

  // Group variants by color
  const colors = Array.from(
    new Map(
      product.variants.map((v) => [v.color_name, { name: v.color_name, hex: v.color_hex }])
    ).values()
  );

  const activeColor = colors[selectedColorIndex] || colors[0];
  const activeVariants = product.variants.filter(
    (v) => !activeColor || v.color_name === activeColor.name
  );

  const firstInStockVariant =
    activeVariants.find((v) => v.stock_quantity > 0) || activeVariants[0] || product.variants[0];

  // Filter out invalid, empty, or whitespace-only image records
  const validImages = (product.images || []).filter(
    (img) => img && typeof img.image_url === 'string' && img.image_url.trim().length > 0
  );

  const validImageUrls = new Set(validImages.map((img) => img.image_url));

  const fallbackProductImage = '/Assets/products/placeholder-product.svg';

  // Base fallback if no color-specific match is found
  const basePrimaryImage =
    validImages.find((img) => img.is_primary)?.image_url ||
    validImages[0]?.image_url ||
    fallbackProductImage;

  // Priority 1: Image tagged explicitly with activeColor.name
  const matchedByTag = activeColor
    ? validImages.find(
        (img) =>
          img.color_name &&
          img.color_name.toLowerCase().trim() === activeColor.name.toLowerCase().trim()
      )?.image_url
    : null;

  // Priority 2: Variant's explicit color_image_url (strictly verified against validImages)
  const variantImgUrl =
    (firstInStockVariant?.color_image_url && firstInStockVariant.color_image_url.trim()) ||
    activeVariants.find((v) => v.color_image_url && v.color_image_url.trim())?.color_image_url;

  const matchedByVariant = variantImgUrl && (validImageUrls.size === 0 || validImageUrls.has(variantImgUrl)) ? variantImgUrl : null;

  // Priority 3: Image URL containing the color name (e.g. 'yellow', 'green', 'blue', 'red')
  // Note: Skip base64 data URLs to prevent accidental substring collisions in base64 text
  const matchedByUrl = activeColor
    ? validImages.find((img) => {
        if (!img.image_url || img.image_url.startsWith('data:')) return false;
        return img.image_url.toLowerCase().includes(activeColor.name.toLowerCase().trim());
      })?.image_url
    : null;

  // Priority 4: Index alignment (if matching valid image exists for this color index)
  const matchedByIndex =
    selectedColorIndex >= 0 && selectedColorIndex < validImages.length
      ? validImages[selectedColorIndex]?.image_url
      : null;

  const primaryImage =
    matchedByTag ||
    matchedByVariant ||
    matchedByUrl ||
    matchedByIndex ||
    basePrimaryImage ||
    fallbackProductImage;

  // Secondary hover image: photo of the same color if available, or 2nd valid image, or primaryImage
  const secondaryImage =
    (activeColor &&
      validImages.find(
        (img) =>
          img.image_url !== primaryImage &&
          img.color_name &&
          img.color_name.toLowerCase().trim() === activeColor.name.toLowerCase().trim()
      )?.image_url) ||
    validImages.find((img) => img.image_url !== primaryImage)?.image_url ||
    primaryImage;

  const currentPrice = firstInStockVariant?.sale_price ?? firstInStockVariant?.price ?? product.base_price;
  const originalPrice = firstInStockVariant?.compare_at_price ?? firstInStockVariant?.price ?? product.base_price;
  const isSale = firstInStockVariant?.sale_price != null && firstInStockVariant.sale_price < firstInStockVariant.price;
  const discountPercent = isSale ? calculateDiscountPercentage(firstInStockVariant.price, firstInStockVariant.sale_price!) : 0;

  const isOutOfStock = product.variants.every((v) => v.stock_quantity <= 0);
  const isLowStock = !isOutOfStock && product.variants.some((v) => v.stock_quantity <= v.low_stock_threshold);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist(product);
    addToast({
      type: 'success',
      title: added ? 'Added to Wishlist' : 'Removed from Wishlist',
      description: `${product.title} has been ${added ? 'saved' : 'removed'}.`,
    });
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || !firstInStockVariant) {
      addToast({
        type: 'error',
        title: 'Out of Stock',
        description: 'This item is currently out of stock.',
      });
      return;
    }
    addToCart(product, firstInStockVariant, 1);
    addToast({
      type: 'success',
      title: 'Added to Bag',
      description: `${product.title} (${firstInStockVariant.size}) added to your bag.`,
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  return (
    <div
      className="group relative flex flex-col select-none stagger-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F8F8F8] rounded-[4px] border border-[#E7E7E7]/60">
        <Link
          to={`/products/${product.slug}${activeColor ? `?color=${encodeURIComponent(activeColor.name)}` : ''}`}
          className="block w-full h-full"
        >
          {/* Primary Image */}
          <div
            className={`w-full h-full transition-all duration-300 ease-out ${
              isHovered && secondaryImage !== primaryImage
                ? 'opacity-0 scale-105'
                : 'opacity-100 scale-100'
            }`}
          >
            <ProductImage
              key={primaryImage}
              src={primaryImage}
              alt={product.title}
              preset="productCard"
              aspectRatio="4/5"
              className="w-full h-full object-cover object-center"
              wrapperClassName="w-full h-full"
            />
          </div>

          {/* Secondary Hover Image */}
          {secondaryImage !== primaryImage && (
            <div
              className={`absolute inset-0 w-full h-full transition-all duration-500 ease-out ${
                isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <ProductImage
                src={secondaryImage}
                alt={`${product.title} alternate view`}
                preset="productCard"
                aspectRatio="4/5"
                className="w-full h-full object-cover object-center"
                wrapperClassName="w-full h-full"
              />
            </div>
          )}
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
          {isOutOfStock && <Badge variant="out-of-stock" label="SOLD OUT" />}
          {!isOutOfStock && isSale && <Badge variant="sale" label={`-${discountPercent}%`} />}
          {!isOutOfStock && product.is_new_arrival && <Badge variant="new" label="NEW" />}
          {!isOutOfStock && product.is_best_seller && <Badge variant="best-seller" label="BEST SELLER" />}
          {!isOutOfStock && isLowStock && <Badge variant="low-stock" label="LOW STOCK" />}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 z-10 ${
            isWishlisted
              ? 'bg-[#3F3F8F] text-white shadow-md'
              : 'bg-white/80 text-black hover:bg-white hover:text-[#3F3F8F] shadow-sm'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Quick Action Floating Bar on Hover */}
        <div
          className={`absolute bottom-3 inset-x-3 flex gap-2 transition-all duration-300 z-10 ${
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={handleQuickView}
            className="flex-1 py-2.5 px-3 bg-white/95 hover:bg-white text-black hover:text-[#3F3F8F] text-[11px] font-poppins font-semibold uppercase tracking-wider rounded-[4px] shadow-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>

          {!isOutOfStock && (
            <button
              onClick={handleQuickAdd}
              className="py-2.5 px-3 bg-[#3F3F8F] hover:bg-[#343476] text-white text-[11px] font-poppins font-semibold uppercase tracking-wider rounded-[4px] shadow-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
              title="Quick Add to Bag"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Bag</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-2.5 pb-1 flex flex-col font-poppins text-xs">
        {/* Title */}
        <Link
          to={`/products/${product.slug}${activeColor ? `?color=${encodeURIComponent(activeColor.name)}` : ''}`}
          className="font-medium text-black hover:text-[#3F3F8F] line-clamp-1 text-sm transition-colors"
        >
          {product.title}
        </Link>

        {/* Pricing */}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-black text-sm">
            {formatPrice(currentPrice)}
          </span>
          {isSale && (
            <span className="text-xs text-[#888888] line-through font-normal">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Color Swatches (Desktop only) */}
        {colors.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5 mt-2.5">
            {colors.map((color, idx) => (
              <button
                key={color.name}
                type="button"
                onMouseEnter={() => setSelectedColorIndex(idx)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorIndex(idx);
                }}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  selectedColorIndex === idx
                    ? 'border-[#3F3F8F] scale-125 ring-2 ring-[#3F3F8F]/50 shadow-xs'
                    : 'border-neutral-300 hover:scale-115'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
                aria-label={`Select color ${color.name}`}
              />
            ))}
          </div>
        )}

        {/* Available Sizes Pills (Desktop only) */}
        <div className="hidden md:flex items-center gap-1 mt-2 text-[10px] text-[#666666]">
          {activeVariants.slice(0, 5).map((v) => (
            <span
              key={v.id}
              className={`px-1.5 py-0.5 border rounded-[2px] ${
                v.stock_quantity > 0
                  ? 'border-[#E7E7E7] text-neutral-700'
                  : 'border-neutral-200 text-neutral-300 line-through'
              }`}
            >
              {v.size}
            </span>
          ))}
          {activeVariants.length > 5 && (
            <span className="text-neutral-400">+{activeVariants.length - 5}</span>
          )}
        </div>
      </div>
    </div>
  );
};
