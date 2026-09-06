import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Truck,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
  AlertCircle,
  Star,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/mockData';
import { ProductCard } from '../components/product/ProductCard';
import { formatPrice, calculateDiscountPercentage } from '../utils/formatters';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { useUIStore } from '../store/useUIStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { api, ProductReview } from '../services/api';
import { Product, ProductVariant } from '../types';
import { ProductImage } from '../components/common/ProductImage';
import { getTransformedImageUrl } from '../utils/imageUtils';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const colorQueryParam = searchParams.get('color');
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  const [selectedColor, setSelectedColor] = useState<string>(colorQueryParam || '');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setIsLoading(true);
    setActiveImageIndex(0);
    api.getProductBySlug(slug).then((fetched) => {
      if (isMounted) {
        if (fetched) {
          setProduct(fetched);
          if (fetched.variants && fetched.variants.length > 0) {
            const matched = colorQueryParam
              ? fetched.variants.find((v) => v.color_name.toLowerCase() === colorQueryParam.toLowerCase())
              : null;
            setSelectedColor(matched?.color_name || fetched.variants[0].color_name || '');
            setSelectedSize(matched?.size || fetched.variants[0].size || '');
          }
        } else {
          setProduct(null);
        }
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setProduct(null);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [slug, colorQueryParam]);

  useEffect(() => {
    let isMounted = true;
    api.getProducts('active').then((data) => {
      if (isMounted && data && data.length > 0) {
        setCatalogProducts(data);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('details');
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Live reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Zoom lens state
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Waitlist state
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);

  const { addItem: addToCart, openDrawer } = useCartStore();
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    if (!product?.id) return;
    let isMounted = true;
    api.getProductReviews(product.id).then((data) => {
      if (isMounted) setReviews(data);
    });
    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="w-full bg-white font-poppins min-h-screen">
        {/* Breadcrumb Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-2">
            <div className="h-3 w-12 bg-neutral-200 animate-pulse rounded" />
            <span className="text-neutral-300">/</span>
            <div className="h-3 w-20 bg-neutral-200 animate-pulse rounded" />
            <span className="text-neutral-300">/</span>
            <div className="h-3 w-36 bg-neutral-200 animate-pulse rounded" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Gallery Skeleton */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="w-full aspect-[4/5] bg-neutral-100 animate-pulse rounded-[4px] border border-neutral-100" />
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[4/5] bg-neutral-100 animate-pulse rounded-[4px]" />
                ))}
              </div>
            </div>

            {/* Details Skeleton */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              <div>
                <div className="h-3 w-24 bg-neutral-200 animate-pulse rounded mb-3" />
                <div className="h-8 w-4/5 bg-neutral-200 animate-pulse rounded mb-3" />
                <div className="h-6 w-32 bg-neutral-200 animate-pulse rounded" />
              </div>

              <div className="h-[1px] bg-[#E7E7E7]" />

              {/* Color swatches skeleton */}
              <div>
                <div className="h-3 w-20 bg-neutral-200 animate-pulse rounded mb-3" />
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Size pills skeleton */}
              <div>
                <div className="h-3 w-24 bg-neutral-200 animate-pulse rounded mb-3" />
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-11 bg-neutral-100 animate-pulse rounded" />
                  ))}
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className="space-y-3 pt-4">
                <div className="h-13 bg-neutral-200 animate-pulse rounded" />
                <div className="h-13 bg-neutral-100 animate-pulse rounded" />
              </div>

              {/* Accordions skeleton */}
              <div className="space-y-3 pt-4">
                <div className="h-12 bg-neutral-50 animate-pulse rounded" />
                <div className="h-12 bg-neutral-50 animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full bg-white font-poppins min-h-[65vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <span className="text-xs uppercase tracking-widest text-[#3F3F8F] font-semibold mb-2">Tanoah Atelier</span>
        <h1 className="text-2xl sm:text-4xl font-wondra text-black mb-4">Product Not Found</h1>
        <p className="text-sm text-neutral-500 max-w-md mb-8">
          The creation you are seeking may have been archived or is temporarily unavailable.
        </p>
        <Link
          to="/collections/all"
          className="inline-flex items-center justify-center px-8 py-3.5 bg-black text-white text-xs tracking-widest uppercase font-semibold hover:bg-[#3F3F8F] transition-colors"
        >
          EXPLORE ALL COLLECTIONS
        </Link>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  // Group colors with explicit typing
  const colors: { name: string; hex: string }[] = Array.from(
    new Map<string, { name: string; hex: string }>(
      (product.variants || []).map((v: ProductVariant) => [v.color_name, { name: v.color_name, hex: v.color_hex }])
    ).values()
  );

  const activeColorName = selectedColor || colors[0]?.name || '';
  const colorVariants: ProductVariant[] = (product.variants || []).filter((v: ProductVariant) => v.color_name === activeColorName);

  // Sizes for selected color
  const sizes = colorVariants.map((v: ProductVariant) => ({
    size: v.size,
    inStock: v.stock_quantity > 0,
    stock: v.stock_quantity,
    variant: v,
  }));

  const activeSizeName = selectedSize || sizes.find((s) => s.inStock)?.size || sizes[0]?.size || '';
  const activeVariant =
    colorVariants.find((v: ProductVariant) => v.size === activeSizeName) || colorVariants[0] || product.variants[0];

  const currentPrice = activeVariant?.sale_price ?? activeVariant?.price ?? product.base_price;
  const originalPrice = activeVariant?.compare_at_price ?? activeVariant?.price ?? product.base_price;
  const isSale = activeVariant?.sale_price != null && activeVariant.sale_price < activeVariant.price;
  const discountPercent = isSale ? calculateDiscountPercentage(activeVariant.price, activeVariant.sale_price!) : 0;

  const isOutOfStock = !activeVariant || activeVariant.stock_quantity <= 0;
  const isLowStock = !isOutOfStock && activeVariant.stock_quantity <= (activeVariant.low_stock_threshold || 5);

  // Color-specific images: filter images matching activeColorName if tagged
  const validProductImages = (product.images || []).filter((img) => {
    return img && typeof img.image_url === 'string' && img.image_url.trim().length > 0;
  });

  const validProductImageUrls = new Set(validProductImages.map((img) => img.image_url));

  const colorMatchedImages = validProductImages.filter(
    (img) => img.color_name && img.color_name.toLowerCase().trim() === activeColorName.toLowerCase().trim()
  );

  let variantSpecificImages: { id: string; image_url: string; sort_order: number; is_primary: boolean }[] = [];
  if (colorMatchedImages.length > 0) {
    variantSpecificImages = colorMatchedImages;
  } else if (
    activeVariant?.color_image_url &&
    activeVariant.color_image_url.trim().length > 0 &&
    validProductImageUrls.has(activeVariant.color_image_url)
  ) {
    variantSpecificImages = [
      { id: 'var_img', image_url: activeVariant.color_image_url, sort_order: 0, is_primary: true },
      ...validProductImages.filter((img) => img.image_url !== activeVariant.color_image_url),
    ];
  } else if (validProductImages.length > 0) {
    variantSpecificImages = validProductImages;
  } else {
    variantSpecificImages = [
      { id: 'placeholder_p', image_url: '/Assets/products/placeholder-product.svg', sort_order: 0, is_primary: true },
    ];
  }

  const images = variantSpecificImages;

  const handleAddToCart = () => {
    if (isOutOfStock || !activeVariant) {
      addToast({ type: 'error', title: 'Out of Stock', description: 'Selected size is unavailable.' });
      return;
    }
    addToCart(product, activeVariant, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
    addToast({
      type: 'success',
      title: 'Added to Bag',
      description: `${product.title} (${activeVariant.color_name} / ${activeVariant.size}) added.`,
    });
  };

  const handleBuyNow = () => {
    if (isOutOfStock || !activeVariant) return;
    addToCart(product, activeVariant, quantity);
    navigate('/checkout');
  };

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.length < 6) {
      setPincodeStatus('invalid');
      return;
    }
    setPincodeStatus('valid');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast({ type: 'info', title: 'Link Copied', description: 'Product link copied to clipboard.' });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewText.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.submitReview({
        product_id: product.id,
        author_name: reviewAuthor.trim(),
        rating: reviewRating,
        review_text: reviewText.trim(),
        is_verified_buyer: true,
        status: 'approved',
      });

      addToast({
        type: 'success',
        title: 'Review Posted',
        description: res.message,
      });

      if (res.review) {
        setReviews((prev) => [res.review, ...prev.filter((r) => r.id !== res.review.id)]);
      } else {
        const freshReviews = await api.getProductReviews(product.id);
        setReviews(freshReviews);
      }

      setIsReviewModalOpen(false);
      setReviewAuthor('');
      setReviewText('');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Error',
        description: err.message || 'Unable to post review.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleSubscribeWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || !activeVariant) return;

    setIsSubmittingWaitlist(true);
    try {
      const res = await api.subscribeBackInStock(activeVariant.id, waitlistEmail.trim(), waitlistPhone.trim());
      addToast({
        type: 'success',
        title: 'Waitlist Registered',
        description: res.message,
      });
      setIsWaitlistOpen(false);
      setWaitlistEmail('');
      setWaitlistPhone('');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Waitlist Error',
        description: err.message || 'Could not register waitlist.',
      });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  const relatedProducts = (catalogProducts.length > 0 ? catalogProducts : SAMPLE_PRODUCTS)
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="w-full bg-white font-poppins min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-[#666666] tracking-widest uppercase border-b border-[#E7E7E7]">
        <div className="flex items-center gap-2">
          <Link to="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <Link to="/collections/all" className="hover:text-black">Collections</Link>
          <span>/</span>
          <span className="text-[#3F3F8F] font-semibold">{product.title}</span>
        </div>
      </div>

      {/* Main Product Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: Gallery (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Stage Image with Luxury Zoom Lens */}
            <div
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
              className="relative aspect-[4/5] w-full rounded-[4px] overflow-hidden bg-[#F8F8F8] border border-[#E7E7E7] shadow-sm cursor-crosshair group"
            >
              {/* Primary High-Performance Main Stage Image */}
              <ProductImage
                src={images[activeImageIndex]?.image_url || images[0]?.image_url}
                alt={product.title}
                preset="productMain"
                priority={true}
                aspectRatio="4/5"
                className="w-full h-full object-cover object-center pointer-events-none"
                wrapperClassName="w-full h-full"
              />

              {/* Delayed On-Demand High-Definition Atelier Zoom (Only loaded when hovered) */}
              {isZoomed && (
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                  style={{ zIndex: 5 }}
                >
                  <img
                    src={getTransformedImageUrl(
                      images[activeImageIndex]?.image_url || images[0]?.image_url,
                      { width: 2400, quality: 90 }
                    )}
                    alt={`${product.title} high-resolution zoom`}
                    style={{
                      transform: 'scale(2.2)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transition: 'transform 0.08s ease-out',
                    }}
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                  />
                </div>
              )}

              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-md text-black hover:text-[#3F3F8F] transition-colors z-10"
                title="Share Product"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {isZoomed && (
                <div className="absolute bottom-3 left-3 bg-black/75 text-white text-[9px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none uppercase tracking-wider font-semibold z-10">
                  2.2x High-Definition Atelier Zoom (2400px Master)
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-24 rounded-[3px] overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#3F3F8F] shadow-sm'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <ProductImage
                      src={img.image_url}
                      alt={`${product.title} view ${idx + 1}`}
                      preset="thumbnail"
                      aspectRatio="4/5"
                      className="w-full h-full object-cover"
                      wrapperClassName="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Purchasing & Customization Panel (Col 5) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Header / Brand */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-poppins font-semibold text-[#888888] tracking-widest uppercase">
                  {product.category_name ? `${product.category_name.toUpperCase()} • ` : ''}{product.gender?.toUpperCase() || 'UNISEX'}
                </span>
                <div className="flex items-center gap-1 text-[#3F3F8F] text-xs">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-semibold">4.9</span>
                  <span className="text-[#888888]">(28 reviews)</span>
                </div>
              </div>

              <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1 leading-tight">
                {product.title}
              </h1>

              {/* Pricing */}
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-semibold text-2xl text-black">
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
              <p className="text-[11px] text-[#888888] mt-1">
                Inclusive of all taxes (GST 12%). SKU: <strong className="font-mono text-black">{activeVariant?.sku || 'TAN-ATELIER'}</strong>
              </p>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed border-t border-[#E7E7E7] pt-4">
              {product.short_description || product.description}
            </p>

            {/* Color Palette */}
            {colors.length > 0 && (
              <div className="space-y-2 border-t border-[#E7E7E7] pt-4">
                <label className="text-xs font-semibold text-black uppercase tracking-wider block">
                  COLOR: <span className="font-normal text-[#666666]">{activeColorName}</span>
                </label>
                <div className="flex gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSelectedColor(c.name);
                        setSelectedSize('');
                        setActiveImageIndex(0);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        activeColorName === c.name
                          ? 'border-[#3F3F8F] scale-110 ring-2 ring-[#3F3F8F]/40'
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
            <div className="space-y-2 border-t border-[#E7E7E7] pt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-black uppercase tracking-wider">
                  SIZE: <span className="font-normal text-[#666666]">{activeSizeName}</span>
                </label>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs text-[#3F3F8F] hover:underline font-medium"
                >
                  Size & Fit Guide
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {sizes.map((s) => (
                  <button
                    key={s.size}
                    disabled={!s.inStock}
                    onClick={() => setSelectedSize(s.size)}
                    className={`py-3 text-xs font-medium uppercase rounded-[4px] border transition-all ${
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

              {isLowStock && (
                <p className="text-[11px] text-amber-600 font-medium mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Only {activeVariant.stock_quantity} left in stock - order soon!
                </p>
              )}
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-3 border-t border-[#E7E7E7] pt-4">
              <div className="flex gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-[#D5D5ED] rounded-[4px] bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-3 text-xs text-black hover:bg-[#EEEEF8]"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-semibold text-black">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(activeVariant?.stock_quantity || 10, quantity + 1))}
                    className="px-3.5 py-3 text-xs text-black hover:bg-[#EEEEF8]"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  icon={addedAnimation ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                  className="flex-1 py-3.5"
                >
                  {isOutOfStock ? 'SOLD OUT' : addedAnimation ? 'ADDED TO BAG ✓' : 'ADD TO BAG'}
                </Button>

                {/* Wishlist */}
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-3.5 rounded-[4px] border transition-colors ${
                    isWishlisted
                      ? 'bg-[#3F3F8F] text-white border-[#3F3F8F]'
                      : 'border-[#E7E7E7] text-black hover:border-[#3F3F8F] hover:text-[#3F3F8F]'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Buy Now Button */}
              {!isOutOfStock ? (
                <button
                  onClick={handleBuyNow}
                  className="w-full py-3.5 bg-black hover:bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors shadow-sm"
                >
                  BUY IT NOW
                </button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsWaitlistOpen(true)}
                  className="w-full py-3.5 text-xs font-semibold text-[#3F3F8F] border-[#3F3F8F] hover:bg-[#EEEEF8]"
                >
                  NOTIFY ME WHEN BACK IN STOCK
                </Button>
              )}
            </div>

            {/* Pincode Delivery Availability Checker */}
            <div className="p-4 bg-[#F8F8F8] rounded-[4px] border border-[#E7E7E7] space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-black uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#3F3F8F]" />
                <span>CHECK DELIVERY AVAILABILITY</span>
              </div>
              <form onSubmit={handlePincodeCheck} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit Pincode"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value.replace(/\D/g, ''));
                    setPincodeStatus('idle');
                  }}
                  className="flex-1 px-3 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-white border border-[#3F3F8F] text-[#3F3F8F] hover:bg-[#3F3F8F] hover:text-white rounded-[4px] font-semibold text-xs transition-colors"
                >
                  CHECK
                </button>
              </form>

              {pincodeStatus === 'valid' && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-[2px] mt-1 space-y-0.5">
                  <p className="font-semibold">✓ Express Delivery Available to {pincode}</p>
                  <p>Estimated Delivery: 3–5 Business Days | Insured Doorstep Delivery via India Post</p>
                </div>
              )}
              {pincodeStatus === 'invalid' && (
                <p className="text-[11px] text-red-600 mt-1">Please enter a valid 6-digit postal code.</p>
              )}
            </div>

            {/* Accordion Sections: Headings & Custom Points */}
            <div className="border-t border-[#E7E7E7] divide-y divide-[#E7E7E7] text-xs">
              {(product.custom_sections && product.custom_sections.length > 0
                ? product.custom_sections
                : [
                    {
                      id: 'details',
                      title: 'PRODUCT SPECIFICATIONS & FIT',
                      content:
                        (product.description || 'Artisanal silhouette with tailored drape.') +
                        '\n\n• Artisanal tailoring with reinforced double-needle seams\n• Pre-shrunk to maintain exact dimensions\n• Made in atelier workshop with zero-waste cutting',
                    },
                    {
                      id: 'shipping',
                      title: 'COMPLIMENTARY SHIPPING & EASY RETURNS',
                      content:
                        '• Complimentary express domestic shipping on orders over ₹1,999.\n• 7-day doorstep return and exchange pickup for all unworn apparel with tags intact.\n• Delivered in our luxury matte branded boxes with recycled garment tissue.',
                    },
                  ]
              ).map((section) => (
                <div key={section.id} className="py-3">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === section.id ? null : section.id)}
                    className="w-full flex justify-between items-center text-black font-semibold uppercase tracking-wider"
                  >
                    <span>{section.title}</span>
                    {openAccordion === section.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openAccordion === section.id && (
                    <div className="pt-3 text-[#666666] leading-relaxed space-y-1.5 whitespace-pre-line text-left">
                      {section.content}
                    </div>
                  )}
                </div>
              ))}

              {/* Client Reviews Accordion */}
              <div className="py-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'reviews' ? null : 'reviews')}
                  className="w-full flex justify-between items-center text-black font-semibold uppercase tracking-wider"
                >
                  <span className="flex items-center gap-2">
                    <span>CLIENT ATELIER REVIEWS ({reviews.length})</span>
                    <span className="flex text-amber-500 text-xs">
                      {'★'.repeat(Math.min(5, Math.max(1, Math.round(Number(avgRating)))))}
                    </span>
                  </span>
                  {openAccordion === 'reviews' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openAccordion === 'reviews' && (
                  <div className="pt-3 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#E7E7E7] pb-3">
                      <div>
                        <div className="font-semibold text-black">Verified Buyer Reviews</div>
                        <div className="text-[11px] text-[#666666]">Average Rating: {avgRating} / 5.0</div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsReviewModalOpen(true)}
                        className="text-[11px]"
                      >
                        WRITE A REVIEW
                      </Button>
                    </div>

                    {reviews.length === 0 ? (
                      <p className="text-[#666666] italic py-2">
                        Be the first to review this silhouette.
                      </p>
                    ) : (
                      <div className="space-y-3 divide-y divide-[#E7E7E7]">
                        {reviews.map((r) => (
                          <div key={r.id} className="pt-3 first:pt-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-black">{r.author_name}</span>
                              <div className="flex text-amber-500 text-xs">
                                {'★'.repeat(r.rating)}
                              </div>
                            </div>
                            {r.title && <div className="font-medium text-black mb-0.5">{r.title}</div>}
                            <p className="text-[#666666] leading-relaxed">{r.review_text}</p>
                            {r.is_verified_buyer && (
                              <span className="inline-block mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                                ✓ Verified Client
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Carousel */}
        <div className="mt-24 border-t border-[#E7E7E7] pt-16">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase block mb-1">
              COMPLETE THE LOOK
            </span>
            <h2 className="font-wondra text-3xl text-black">
              YOU MAY ALSO DESIRE
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <Modal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        title="TANOAH SIZE GUIDE"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs font-poppins">
          <p className="text-[#666666]">
            All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape.
          </p>
          <div className="overflow-x-auto border border-[#E7E7E7] rounded-[4px]">
            <table className="w-full text-left">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[11px] font-semibold uppercase">
                <tr>
                  <th className="p-3">Size</th>
                  <th className="p-3">Chest (in)</th>
                  <th className="p-3">Shoulder (in)</th>
                  <th className="p-3">Length (in)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                <tr><td className="p-3 font-semibold">S</td><td className="p-3">38 - 40</td><td className="p-3">18.5</td><td className="p-3">28.0</td></tr>
                <tr><td className="p-3 font-semibold">M</td><td className="p-3">41 - 43</td><td className="p-3">19.5</td><td className="p-3">29.0</td></tr>
                <tr><td className="p-3 font-semibold">L</td><td className="p-3">44 - 46</td><td className="p-3">20.5</td><td className="p-3">30.0</td></tr>
                <tr><td className="p-3 font-semibold">XL</td><td className="p-3">47 - 49</td><td className="p-3">21.5</td><td className="p-3">31.0</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Write Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="WRITE AN ATELIER REVIEW"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs font-poppins">
          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Your Name *
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Vikram Singhania"
              value={reviewAuthor}
              onChange={(e) => setReviewAuthor(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Rating *
            </label>
            <div className="flex gap-2 text-2xl cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={`transition-colors ${star <= reviewRating ? 'text-amber-500' : 'text-neutral-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Review Comments *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Share thoughts on the garment drape, silhouette, fabric quality, and fit..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmittingReview}
            >
              SUBMIT REVIEW
            </Button>
          </div>
        </form>
      </Modal>

      {/* Back in Stock Waitlist Modal */}
      <Modal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        title="NOTIFY ME WHEN RESTOCKED"
        maxWidth="md"
      >
        <form onSubmit={handleSubscribeWaitlist} className="space-y-4 text-xs font-poppins">
          <p className="text-[#666666]">
            Enter your email or mobile number below. Our atelier system will immediately notify you the moment <strong>{product.title} ({activeColorName} / {activeSizeName})</strong> is back in production.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Email Address *
            </label>
            <input
              required
              type="email"
              placeholder="e.g. client@example.com"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Phone / WhatsApp (Optional)
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={waitlistPhone}
              onChange={(e) => setWaitlistPhone(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setIsWaitlistOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmittingWaitlist}
            >
              JOIN WAITLIST
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E7E7E7] p-3 shadow-2xl z-30 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-black text-xs line-clamp-1">{product.title}</div>
          <div className="text-sm font-bold text-[#3F3F8F]">{formatPrice(currentPrice)}</div>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="shrink-0"
        >
          {isOutOfStock ? 'SOLD OUT' : 'ADD TO BAG'}
        </Button>
      </div>
    </div>
  );
};
