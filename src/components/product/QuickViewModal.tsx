import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { formatPrice, calculateDiscountPercentage } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const QuickViewModal: React.FC = () => {
  const { quickViewProduct, closeQuickView, addToast } = useUIStore();
  const { addItem: addToCart } = useCartStore();
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const navigate = useNavigate();

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!quickViewProduct) return null;

  const isWishlisted = isInWishlist(quickViewProduct.id);

  // Group colors
  const colors = Array.from(
    new Map(
      quickViewProduct.variants.map((v) => [v.color_name, { name: v.color_name, hex: v.color_hex }])
    ).values()
  );

  const activeColorName = selectedColor || colors[0]?.name || '';
  const colorVariants = quickViewProduct.variants.filter((v) => v.color_name === activeColorName);

  // Unique sizes for this color
  const sizes = colorVariants.map((v) => ({
    size: v.size,
    inStock: v.stock_quantity > 0,
    stock: v.stock_quantity,
    variant: v,
  }));

  const activeSizeName = selectedSize || sizes.find((s) => s.inStock)?.size || sizes[0]?.size || '';
  const activeVariant =
    colorVariants.find((v) => v.size === activeSizeName) || colorVariants[0] || quickViewProduct.variants[0];

  const currentPrice = activeVariant?.sale_price ?? activeVariant?.price ?? quickViewProduct.base_price;
  const originalPrice = activeVariant?.compare_at_price ?? activeVariant?.price ?? quickViewProduct.base_price;
  const isSale = activeVariant?.sale_price != null && activeVariant.sale_price < activeVariant.price;
  const discountPercent = isSale ? calculateDiscountPercentage(activeVariant.price, activeVariant.sale_price!) : 0;

  const validImages = (quickViewProduct.images || []).filter(
    (img) => img && typeof img.image_url === 'string' && img.image_url.trim().length > 0
  );
  const fallbackUrl = '/Assets/products/placeholder-product.svg';
  const images = validImages.length > 0 ? validImages : [
    { id: '1', image_url: fallbackUrl, sort_order: 0, is_primary: true }
  ];

  const isOutOfStock = !activeVariant || activeVariant.stock_quantity <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock || !activeVariant) {
      addToast({
        type: 'error',
        title: 'Unavailable',
        description: 'Selected size is currently out of stock.',
      });
      return;
    }

    addToCart(quickViewProduct, activeVariant, quantity);
    closeQuickView();
    addToast({
      type: 'success',
      title: 'Added to Bag',
      description: `${quickViewProduct.title} (${activeVariant.color_name} / ${activeVariant.size}) added to your bag.`,
    });
  };

  const handleWishlistToggle = () => {
    const added = toggleWishlist(quickViewProduct);
    addToast({
      type: 'success',
      title: added ? 'Wishlist Updated' : 'Removed from Wishlist',
      description: `${quickViewProduct.title} has been ${added ? 'saved' : 'removed'}.`,
    });
  };

  return (
    <Modal isOpen={Boolean(quickViewProduct)} onClose={closeQuickView} maxWidth="4xl">
      <div data-lenis-prevent="true" className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 font-poppins">
        {/* Left: Product Gallery */}
        <div className="space-y-3">
          <div className="aspect-[3/4] max-h-[460px] w-full rounded-[4px] overflow-hidden bg-[#F8F8F8] border border-[#E7E7E7]">
            <img
              src={images[activeImageIndex]?.image_url || images[0]?.image_url || fallbackUrl}
              alt={quickViewProduct.title}
              onError={(e) => {
                e.currentTarget.src = fallbackUrl;
              }}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" data-lenis-prevent="true">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-20 rounded-[2px] overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIndex === idx ? 'border-[#3F3F8F]' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.image_url || fallbackUrl}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = fallbackUrl;
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Variant Selectors */}
        <div className="flex flex-col justify-between text-left">
          <div className="space-y-4">
            <div className="text-[11px] text-[#888888] uppercase tracking-widest font-semibold">
              {quickViewProduct.category_name ? `${quickViewProduct.category_name.toUpperCase()} • ` : ''}{quickViewProduct.product_type || 'APPAREL'}
            </div>

            <h2 className="font-wondra text-2xl text-black leading-tight">
              {quickViewProduct.title}
            </h2>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-semibold text-xl text-black">
                {formatPrice(currentPrice)}
              </span>
              {isSale && (
                <>
                  <span className="text-sm text-[#888888] line-through font-normal">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-xs bg-[#3F3F8F] text-white px-2 py-0.5 rounded-[2px] font-medium">
                    SAVE {discountPercent}%
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-[#666666] leading-relaxed line-clamp-3">
              {quickViewProduct.short_description || quickViewProduct.description}
            </p>

            <div className="border-t border-[#E7E7E7] pt-4 space-y-4">
              {/* Color Selector */}
              {colors.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-black uppercase tracking-wider block mb-2">
                    COLOR: <span className="font-normal text-[#666666]">{activeColorName}</span>
                  </label>
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setSelectedColor(c.name);
                          setSelectedSize('');
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          activeColorName === c.name
                            ? 'border-[#3F3F8F] scale-110 ring-2 ring-[#3F3F8F]/30'
                            : 'border-neutral-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-black uppercase tracking-wider">
                    SIZE: <span className="font-normal text-[#666666]">{activeSizeName}</span>
                  </label>
                  <Link
                    to="/pages/size-guide"
                    onClick={closeQuickView}
                    className="text-[11px] text-[#3F3F8F] hover:underline"
                  >
                    Size Guide
                  </Link>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s.size}
                      disabled={!s.inStock}
                      onClick={() => setSelectedSize(s.size)}
                      className={`py-2 text-xs font-medium uppercase rounded-[4px] border transition-all ${
                        activeSizeName === s.size
                          ? 'border-[#3F3F8F] bg-[#3F3F8F] text-white'
                          : s.inStock
                          ? 'border-[#E7E7E7] text-black hover:border-black'
                          : 'border-neutral-200 text-neutral-300 bg-neutral-50 line-through cursor-not-allowed'
                      }`}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>

                {activeVariant && activeVariant.stock_quantity > 0 && activeVariant.stock_quantity <= activeVariant.low_stock_threshold && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Only {activeVariant.stock_quantity} left in stock - order soon!
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <label className="text-xs font-semibold text-black uppercase tracking-wider">
                  QTY:
                </label>
                <div className="flex items-center border border-[#D5D5ED] rounded-[4px]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-xs text-black hover:bg-[#EEEEF8]"
                  >
                    -
                  </button>
                  <span className="px-4 text-xs font-medium text-black">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(activeVariant?.stock_quantity || 10, quantity + 1))}
                    className="px-3 py-1.5 text-xs text-black hover:bg-[#EEEEF8]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 sm:pt-5 border-t border-[#E7E7E7] space-y-2.5">
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                icon={<ShoppingBag className="w-4 h-4" />}
                className="flex-1"
              >
                {isOutOfStock ? 'SOLD OUT' : 'ADD TO BAG'}
              </Button>

              <button
                onClick={handleWishlistToggle}
                className={`p-3.5 rounded-[4px] border transition-colors ${
                  isWishlisted
                    ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
                    : 'border-[#E7E7E7] text-black hover:border-[#3F3F8F] hover:text-[#3F3F8F]'
                }`}
                title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <Link
              to={`/products/${quickViewProduct.slug}`}
              onClick={closeQuickView}
              className="text-xs text-center text-[#3F3F8F] hover:underline flex items-center justify-center gap-1 pt-1"
            >
              View Full Product Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
};
