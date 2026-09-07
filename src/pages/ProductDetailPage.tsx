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
  Camera,
  ThumbsUp,
  ZoomIn,
  Lock,
  LogIn,
  X,
  MessageSquarePlus,
} from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/mockData';
import { ProductCard } from '../components/product/ProductCard';
import { formatPrice, calculateDiscountPercentage } from '../utils/formatters';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { SEOHead } from '../components/common/SEOHead';
import { getProductMeta, generateProductJsonLd, generateBreadcrumbJsonLd } from '../services/seoEngine';
import { api, ProductReview } from '../services/api';
import { Product, ProductVariant } from '../types';
import { ProductImage } from '../components/common/ProductImage';
import { getTransformedImageUrl } from '../utils/imageUtils';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const colorQueryParam = searchParams.get('color');
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  const [selectedColor, setSelectedColor] = useState<string>(colorQueryParam || '');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

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

  // Auth state for mandatory review login & purchase verification
  const { user, profile } = useAuthStore();
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(false);
  const [isPurchaseRequiredModalOpen, setIsPurchaseRequiredModalOpen] = useState(false);

  // Live reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Reviews filtering and gallery lightbox
  const [reviewsFilter, setReviewsFilter] = useState<'all' | 'with_photos' | '5' | '4' | '3' | '2' | '1'>('all');
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<{
    url: string;
    author: string;
    rating: number;
    title?: string;
    text: string;
    date: string;
  } | null>(null);

  // Helpful votes state (persisted locally)
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('tanoah_review_helpful_votes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [userVotedReviews, setUserVotedReviews] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('tanoah_review_user_voted');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

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

  const handleOpenReviewModal = async () => {
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!product) return;

    setIsCheckingPurchase(true);
    try {
      const hasPurchased = await api.checkUserPurchasedProduct({
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug,
        userId: user.id,
        userEmail: user.email || undefined,
      });

      if (!hasPurchased) {
        setIsPurchaseRequiredModalOpen(true);
        return;
      }

      const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      setReviewAuthor(name);
      setIsReviewModalOpen(true);
    } catch (err) {
      console.warn('Purchase check error:', err);
      setIsReviewModalOpen(true);
    } finally {
      setIsCheckingPurchase(false);
    }
  };

  // Trigger review modal if user returned from login with action=write_review
  useEffect(() => {
    if (searchParams.get('action') === 'write_review') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });

      if (user) {
        handleOpenReviewModal();
      } else {
        setIsAuthPromptOpen(true);
      }
    }
  }, [searchParams, user, product]);

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
        <span className="text-xs uppercase tracking-widest text-[#3F3F8F] font-semibold mb-2">Tanoah Collection</span>
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

  const totalReviewsCount = reviews.length;

  // 5-to-1 Star Distribution (Myntra-style)
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : (stars === 5 ? 100 : 0);
    return { stars, count, percentage };
  });

  // Extract all customer photos for the gallery row
  const customerPhotos = reviews.flatMap((r) =>
    (r.image_urls || []).map((url) => ({
      url,
      author: r.author_name,
      rating: r.rating,
      title: r.title,
      text: r.review_text,
      date: new Date(r.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }))
  );

  // Filtered reviews list
  const filteredReviews = reviews.filter((r) => {
    if (reviewsFilter === 'with_photos') return (r.image_urls || []).length > 0;
    if (reviewsFilter === '5') return r.rating === 5;
    if (reviewsFilter === '4') return r.rating === 4;
    if (reviewsFilter === '3') return r.rating === 3;
    if (reviewsFilter === '2') return r.rating === 2;
    if (reviewsFilter === '1') return r.rating === 1;
    return true;
  });

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

  const isStandardColor = (c: string) => {
    const norm = (c || '').trim().toLowerCase();
    return !norm || norm === 'standard' || norm === 'default';
  };

  const isStandardSize = (s: string) => {
    const norm = (s || '').trim().toLowerCase();
    return !norm || norm === 'one size' || norm === 'standard' || norm === 'free size' || norm === 'os' || norm === 'n/a';
  };

  const hasMultipleColors = colors.length > 1;
  const showSingleColor = colors.length === 1 && !isStandardColor(colors[0].name);

  const hasMultipleSizes = sizes.length > 1;
  const isSingleStandardSize = sizes.length === 1 && isStandardSize(sizes[0].size);
  const showSingleCustomSize = sizes.length === 1 && !isStandardSize(sizes[0].size);

  const images = variantSpecificImages;

  const handleAddToCart = () => {
    if (isOutOfStock || !activeVariant) {
      addToast({ type: 'error', title: 'Out of Stock', description: 'Selected item is unavailable.' });
      return;
    }
    addToCart(product, activeVariant, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);

    const isStdCol = isStandardColor(activeVariant.color_name);
    const isStdSz = isStandardSize(activeVariant.size);
    let variantDesc = '';
    if (!isStdCol && !isStdSz) {
      variantDesc = ` (${activeVariant.color_name} / ${activeVariant.size})`;
    } else if (!isStdCol) {
      variantDesc = ` (${activeVariant.color_name})`;
    } else if (!isStdSz) {
      variantDesc = ` (${activeVariant.size})`;
    }

    addToast({
      type: 'success',
      title: 'Added to Bag',
      description: `${product.title}${variantDesc} added.`,
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const remainingSlots = 4 - reviewImages.length;
    const validFiles = files.slice(0, remainingSlots);

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setReviewImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleHelpfulVote = (reviewId: string) => {
    if (userVotedReviews.has(reviewId)) {
      addToast({
        type: 'info',
        title: 'Already Recorded',
        description: 'You have already marked this review as helpful.',
      });
      return;
    }
    const nextVotes = { ...helpfulVotes, [reviewId]: (helpfulVotes[reviewId] || 0) + 1 };
    setHelpfulVotes(nextVotes);
    const nextSet = new Set(userVotedReviews);
    nextSet.add(reviewId);
    setUserVotedReviews(nextSet);
    try {
      localStorage.setItem('tanoah_review_helpful_votes', JSON.stringify(nextVotes));
      localStorage.setItem('tanoah_review_user_voted', JSON.stringify(Array.from(nextSet)));
    } catch {}
    addToast({
      type: 'success',
      title: 'Feedback Appreciated',
      description: 'Thank you for your review feedback!',
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!reviewAuthor.trim() || !reviewText.trim()) return;

    setIsSubmittingReview(true);
    try {
      // 1. Upload customer photos if any
      const uploadedUrls: string[] = [];
      for (const file of reviewImages) {
        try {
          const mediaRes = await api.uploadMediaFile(file);
          if (mediaRes?.publicUrl) {
            uploadedUrls.push(mediaRes.publicUrl);
          }
        } catch (uploadErr) {
          console.warn('Review photo upload fallback:', uploadErr);
        }
      }

      // 2. Submit to API (enforces pending status until admin moderation)
      const res = await api.submitReview({
        product_id: product.id,
        product_title: product.title,
        user_id: user.id,
        author_name: reviewAuthor.trim(),
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        review_text: reviewText.trim(),
        image_urls: uploadedUrls,
        is_verified_buyer: true,
      });

      addToast({
        type: 'success',
        title: 'Review Submitted for Moderation',
        description: res.message,
      });

      setIsReviewModalOpen(false);
      setReviewTitle('');
      setReviewText('');
      setReviewImages([]);
      setImagePreviews([]);
      setReviewRating(5);
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

  const productMeta = product ? getProductMeta(product) : null;
  const productJsonLd = product ? generateProductJsonLd(product, reviews) : undefined;
  const breadcrumbJsonLd = product
    ? generateBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: product.category_name || 'Collections', path: '/collections/all' },
        { name: product.title, path: `/products/${product.slug}` },
      ])
    : undefined;
  const combinedJsonLd = productJsonLd && breadcrumbJsonLd ? [productJsonLd, breadcrumbJsonLd] : productJsonLd;

  return (
    <div className="w-full bg-white font-poppins min-h-screen pb-20 lg:pb-0">
      {productMeta && (
        <SEOHead
          title={productMeta.title}
          description={productMeta.description}
          canonical={productMeta.canonical}
          image={productMeta.image}
          type="product"
          noindex={productMeta.isNoindex}
          jsonLd={combinedJsonLd}
        />
      )}
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

              {/* Delayed On-Demand High-Definition Zoom (Only loaded when hovered) */}
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
                  2.2x High-Definition Zoom (2400px Master)
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
                <div 
                  onClick={() => {
                    const el = document.getElementById('ratings-and-reviews-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1 text-[#3F3F8F] text-xs cursor-pointer hover:underline"
                  title="View client ratings and customer photos"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-semibold">{avgRating}</span>
                  <span className="text-[#888888]">({reviews.length} reviews)</span>
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
                Inclusive of all taxes (GST 5%). SKU: <strong className="font-mono text-black">{activeVariant?.sku || 'TAN-TANOAH'}</strong>
              </p>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed border-t border-[#E7E7E7] pt-4">
              {product.short_description || product.description}
            </p>

            {/* Color Palette or Single Color Display */}
            {hasMultipleColors ? (
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
            ) : showSingleColor ? (
              <div className="space-y-1.5 border-t border-[#E7E7E7] pt-4">
                <div className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-2">
                  <span>COLOR:</span>
                  <span className="font-medium text-[#222222]">{colors[0].name}</span>
                  {colors[0].hex && (
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-neutral-300 inline-block shadow-2xs"
                      style={{ backgroundColor: colors[0].hex }}
                    />
                  )}
                </div>
              </div>
            ) : null}

            {/* Size Selector or Single Size Display */}
            {hasMultipleSizes ? (
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
                    Only {activeVariant?.stock_quantity} left in stock - order soon!
                  </p>
                )}

                <p className="text-[10px] text-[#666666] pt-1">
                  ⓘ No size or colour exchanges. Please consult our{' '}
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-[#3F3F8F] underline font-medium"
                  >
                    Size & Fit Guide
                  </button>{' '}
                  prior to placing your order.
                </p>
              </div>
            ) : isSingleStandardSize ? (
              <div className="space-y-1.5 border-t border-[#E7E7E7] pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-black uppercase tracking-wider">SIZE:</span>
                  <span className="px-2.5 py-0.5 bg-[#F4F4F8] border border-[#D5D5ED] text-black text-[11px] font-semibold tracking-wider uppercase rounded-[3px]">
                    {sizes[0]?.size || 'ONE SIZE'}
                  </span>
                </div>
                {isLowStock && (
                  <p className="text-[11px] text-amber-600 font-medium mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Only {activeVariant?.stock_quantity} left in stock - order soon!
                  </p>
                )}
              </div>
            ) : showSingleCustomSize ? (
              <div className="space-y-2 border-t border-[#E7E7E7] pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-black uppercase tracking-wider">
                    SIZE: <span className="font-normal text-[#666666]">{sizes[0]?.size}</span>
                  </label>
                  <button
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-xs text-[#3F3F8F] hover:underline font-medium"
                  >
                    Size & Fit Guide
                  </button>
                </div>
                <div className="inline-flex">
                  <span className="px-4 py-2 text-xs font-semibold uppercase rounded-[4px] border border-[#3F3F8F] bg-[#3F3F8F] text-white">
                    {sizes[0]?.size}
                  </span>
                </div>
                {isLowStock && (
                  <p className="text-[11px] text-amber-600 font-medium mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Only {activeVariant?.stock_quantity} left in stock - order soon!
                  </p>
                )}
              </div>
            ) : null}

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

            {/* Pincode Delivery Availability Checker (Hidden on Sold Out products) */}
            {!isOutOfStock && (
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
                    <p className="font-semibold">✓ Delivery Available to {pincode}</p>
                    <p>Estimated Delivery: 10–15 Business Days | Insured Doorstep Delivery</p>
                  </div>
                )}
                {pincodeStatus === 'invalid' && (
                  <p className="text-[11px] text-red-600 mt-1">Please enter a valid 6-digit postal code.</p>
                )}
              </div>
            )}

            {/* Accordion Sections: Headings & Custom Points */}
            <div className="border-t border-[#E7E7E7] divide-y divide-[#E7E7E7] text-xs">
              {(() => {
                let sectionsList: { id: string; title: string; content: string }[] = [];
                if (Array.isArray(product.custom_sections) && product.custom_sections.length > 0) {
                  sectionsList = product.custom_sections;
                } else if (typeof product.custom_sections === 'string') {
                  try {
                    const parsed = JSON.parse(product.custom_sections);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      sectionsList = parsed;
                    }
                  } catch {}
                }

                if (sectionsList.length === 0) {
                  sectionsList = [
                    {
                      id: 'details',
                      title: 'PRODUCT SPECIFICATIONS & FIT',
                      content:
                        (product.description || 'Artisanal silhouette with tailored drape.') +
                        '\n\n• Artisanal tailoring with reinforced double-needle seams\n• Pre-shrunk to maintain exact dimensions\n• Crafted in precision workshop with zero-waste cutting',
                    },
                    {
                      id: 'shipping',
                      title: 'SHIPPING & TRANSIT DAMAGE GUARANTEE',
                      content:
                        '• Insured domestic shipping across India via India Post.\n• Transit damage protection covered within 24 hours of delivery with mandatory 360° unboxing video.\n• Delivered in our luxury matte branded boxes with recycled garment tissue.',
                    },
                  ];
                }

                return sectionsList.map((section, idx) => {
                  const isSectionOpen =
                    openAccordion === section.id ||
                    (openAccordion === 'details' && (section.id === 'details' || section.id === 'sec_spec' || idx === 0));

                  return (
                    <div key={section.id || idx} className="py-3">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(isSectionOpen ? null : section.id)}
                        className="w-full flex justify-between items-center text-black font-semibold uppercase tracking-wider text-left"
                      >
                        <span>{section.title}</span>
                        {isSectionOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>
                      {isSectionOpen && (
                        <div className="pt-3 text-[#666666] leading-relaxed space-y-1.5 whitespace-pre-line text-left">
                          {section.content}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Client Reviews Accordion */}
              <div className="py-3">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'reviews' ? null : 'reviews')}
                  className="w-full flex justify-between items-center text-black font-semibold uppercase tracking-wider"
                >
                  <span className="flex items-center gap-2">
                    <span>CLIENT REVIEWS ({reviews.length})</span>
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
                        <div className="text-[11px] text-[#666666]">Average Rating: {avgRating} / 5.0 ({reviews.length})</div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenReviewModal}
                        isLoading={isCheckingPurchase}
                        className="text-[11px]"
                      >
                        WRITE A REVIEW
                      </Button>
                    </div>

                    <p className="text-xs text-[#666666] leading-relaxed">
                      Read authentic client feedback and inspect real customer photos for this silhouette.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('ratings-and-reviews-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-semibold rounded uppercase tracking-wider transition-colors text-center block"
                    >
                      View Full Ratings & Customer Photos ({customerPhotos.length}) ↓
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MYNTRA-STYLE RATINGS & REVIEWS SECTION */}
        {/* ========================================================================= */}
        <div id="ratings-and-reviews-section" className="mt-20 border-t border-[#E7E7E7] pt-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase">
                  VERIFIED CLIENT FEEDBACK
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" /> 100% Genuine Verified Reviews
                </span>
              </div>
              <h2 className="font-wondra text-2xl sm:text-3xl text-black">
                RATINGS & CUSTOMER REVIEWS
              </h2>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenReviewModal}
              isLoading={isCheckingPurchase}
              icon={<MessageSquarePlus className="w-4 h-4" />}
              className="text-xs uppercase tracking-wider px-6 py-3 shrink-0"
            >
              Rate & Review Product
            </Button>
          </div>

          {/* Top Rating Summary Card & Distribution Bar Chart (Myntra Layout) */}
          <div className="bg-[#FAFAFA] border border-[#E7E7E7] rounded-lg p-6 sm:p-8 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left: Overall Big Score */}
              <div className="md:col-span-4 flex flex-col items-center md:items-start justify-center border-b md:border-b-0 md:border-r border-[#E7E7E7] pb-6 md:pb-0 md:pr-8">
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold font-poppins text-black">{avgRating}</span>
                  <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
                </div>
                <p className="text-xs text-[#666666] font-medium mt-2">
                  Based on <span className="font-bold text-black">{totalReviewsCount}</span> verified ratings
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 bg-white px-3 py-1.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Buyer Community</span>
                </div>
              </div>

              {/* Right: 5-to-1 Star Distribution Bar Chart */}
              <div className="md:col-span-8 space-y-2.5">
                {ratingDistribution.map(({ stars, count, percentage }) => (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-8 font-semibold text-black flex items-center gap-1 shrink-0">
                      <span>{stars}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>

                    {/* Progress Bar Container */}
                    <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          stars >= 4
                            ? 'bg-emerald-600'
                            : stars === 3
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="w-10 text-right text-[#888888] font-medium text-[11px] shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Photos Gallery Row (Clickable to Lightbox) */}
          {customerPhotos.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#3F3F8F]" />
                  <h3 className="font-semibold text-black text-sm uppercase tracking-wide">
                    Customer Photos ({customerPhotos.length})
                  </h3>
                </div>
                <span className="text-xs text-[#888888]">Click photo to inspect full details</span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin">
                {customerPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoLightbox(photo)}
                    className="relative group cursor-pointer w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden bg-neutral-100 border border-[#E7E7E7] hover:border-[#3F3F8F] shrink-0 shadow-xs transition-all"
                  >
                    <img
                      src={photo.url}
                      alt={`Customer photo by ${photo.author}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1">
                      <ZoomIn className="w-5 h-5" />
                      <span className="text-[9px] uppercase font-bold tracking-wider">Inspect</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E7E7] pb-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewsFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  reviewsFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-white text-[#666666] border border-[#E7E7E7] hover:border-black'
                }`}
              >
                All Reviews ({reviews.length})
              </button>

              {customerPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewsFilter('with_photos')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                    reviewsFilter === 'with_photos'
                      ? 'bg-black text-white'
                      : 'bg-white text-[#666666] border border-[#E7E7E7] hover:border-black'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>With Photos ({reviews.filter((r) => (r.image_urls || []).length > 0).length})</span>
                </button>
              )}

              {[5, 4, 3, 2, 1].map((st) => {
                const count = reviews.filter((r) => r.rating === st).length;
                if (count === 0) return null;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setReviewsFilter(String(st) as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                      reviewsFilter === String(st)
                        ? 'bg-black text-white'
                        : 'bg-white text-[#666666] border border-[#E7E7E7] hover:border-black'
                    }`}
                  >
                    <span>{st}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-[#888888]">
              Showing <span className="font-semibold text-black">{filteredReviews.length}</span> verified customer reviews
            </div>
          </div>

          {/* Individual Reviews Cards List */}
          {filteredReviews.length === 0 ? (
            <div className="bg-[#FAFAFA] border border-[#E7E7E7] rounded-lg p-10 text-center">
              <Star className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <h3 className="font-semibold text-black text-base">No reviews match your selection</h3>
              <p className="text-xs text-[#666666] mt-1 mb-4">
                Be the first verified connoisseur to review this silhouette.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenReviewModal}
                isLoading={isCheckingPurchase}
                className="text-xs uppercase"
              >
                Write a Review
              </Button>
            </div>
          ) : (
            <div className="space-y-6 divide-y divide-[#E7E7E7]">
              {filteredReviews.map((rev) => {
                const votes = helpfulVotes[rev.id] || 0;
                const hasVoted = userVotedReviews.has(rev.id);
                return (
                  <div key={rev.id} className="pt-6 first:pt-0 space-y-3">
                    {/* Header Row: Rating badge & Review Title */}
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded text-xs font-bold shadow-xs">
                        <span>{rev.rating}</span>
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                      {rev.title && (
                        <h4 className="font-semibold text-black text-sm">{rev.title}</h4>
                      )}
                    </div>

                    {/* Review Body */}
                    <p className="text-[#444444] text-xs leading-relaxed max-w-3xl">
                      {rev.review_text}
                    </p>

                    {/* Customer Photos for this review */}
                    {rev.image_urls && rev.image_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {rev.image_urls.map((imgUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() =>
                              setActivePhotoLightbox({
                                url: imgUrl,
                                author: rev.author_name,
                                rating: rev.rating,
                                title: rev.title,
                                text: rev.review_text,
                                date: new Date(rev.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }),
                              })
                            }
                            className="relative group cursor-pointer w-20 h-20 rounded border border-[#E7E7E7] overflow-hidden bg-neutral-100 hover:border-black transition-all"
                          >
                            <img
                              src={imgUrl}
                              alt={`Customer photo ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Author Footer & Helpful Reaction */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 text-[#888888]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-black">{rev.author_name}</span>
                        <span>•</span>
                        <span>
                          {new Date(rev.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {rev.is_verified_buyer && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" /> Verified Buyer
                            </span>
                          </>
                        )}
                      </div>

                      {/* Helpful Button */}
                      <button
                        type="button"
                        onClick={() => handleHelpfulVote(rev.id)}
                        disabled={hasVoted}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                          hasVoted
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'hover:bg-neutral-100 text-[#666666] hover:text-black'
                        }`}
                        title="Mark review as helpful"
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                        <span>Helpful {votes > 0 ? `(${votes})` : ''}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Mandatory Login Prompt Modal */}
      <Modal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
        title="CLIENT AUTHENTICATION REQUIRED"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs font-poppins text-center py-2">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-[#3F3F8F]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-black">Sign In to Rate & Review</h3>
            <p className="text-[#666666] mt-1 leading-relaxed">
              To protect authenticity and preserve verified buyer integrity, product reviews and customer photos can only be submitted by registered TANOAH clients.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to={`/login?from=${encodeURIComponent(window.location.pathname)}&action=write_review`}
              state={{ from: window.location.pathname, openReview: true }}
              className="w-full py-2.5 bg-black text-white font-semibold rounded text-xs uppercase tracking-wider hover:bg-[#3F3F8F] transition-colors inline-block"
            >
              Sign In to Your Account
            </Link>
            <Link
              to={`/register?from=${encodeURIComponent(window.location.pathname)}&action=write_review`}
              state={{ from: window.location.pathname, openReview: true }}
              className="w-full py-2.5 border border-[#E7E7E7] text-black font-semibold rounded text-xs uppercase tracking-wider hover:border-black transition-colors inline-block"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </Modal>

      {/* Customer Photo Fullscreen Lightbox Modal */}
      <Modal
        isOpen={!!activePhotoLightbox}
        onClose={() => setActivePhotoLightbox(null)}
        title="CUSTOMER PHOTO & VERIFIED REVIEW"
        maxWidth="lg"
      >
        {activePhotoLightbox && (
          <div className="space-y-4 font-poppins">
            <div className="bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center max-h-[70vh]">
              <img
                src={activePhotoLightbox.url}
                alt={`Customer review by ${activePhotoLightbox.author}`}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black text-sm">{activePhotoLightbox.author}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3" /> Verified Buyer
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                  <span>{activePhotoLightbox.rating}</span>
                  <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
              {activePhotoLightbox.title && (
                <div className="font-semibold text-black text-sm">{activePhotoLightbox.title}</div>
              )}
              <p className="text-[#444444] leading-relaxed italic bg-[#FAFAFA] p-3 rounded border border-neutral-100">
                "{activePhotoLightbox.text}"
              </p>
              <div className="text-[11px] text-neutral-400 text-right">
                Posted {activePhotoLightbox.date}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Write Review Modal with Image Upload */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="WRITE A REVIEW"
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
              Review Headline (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Unmatched Fabric Quality & Drape"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
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

          {/* Customer Product Image Upload */}
          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1 flex items-center justify-between">
              <span>Upload Garment Photos (Optional, Max 4)</span>
              <span className="text-neutral-400 font-normal">{reviewImages.length} / 4 attached</span>
            </label>

            {/* Thumbnail previews with remove button */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded border border-[#E7E7E7] overflow-hidden bg-neutral-100">
                    <img src={preview} alt={`Upload preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-0.5 rounded-full transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {reviewImages.length < 4 && (
              <label className="border-2 border-dashed border-[#E7E7E7] hover:border-[#3F3F8F] rounded p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-[#666666] hover:text-[#3F3F8F]">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-medium">Click to select photo(s) of the product</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
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
              SUBMIT
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verified Purchase Required Modal */}
      <Modal
        isOpen={isPurchaseRequiredModalOpen}
        onClose={() => setIsPurchaseRequiredModalOpen(false)}
        title="VERIFIED PURCHASE REQUIRED"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs font-poppins text-center py-2">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-black">Only Verified Buyers Can Review</h3>
            <p className="text-[#666666] mt-1 leading-relaxed">
              To guarantee 100% authentic feedback, reviews are reserved exclusively for clients who have purchased this garment.
            </p>
            <p className="text-[#666666] text-[11px] mt-2 bg-neutral-50 p-2.5 rounded border border-neutral-200">
              No completed order for <strong>{product?.title}</strong> was found under your account (<strong>{user?.email}</strong>).
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/shop"
              onClick={() => setIsPurchaseRequiredModalOpen(false)}
              className="w-full py-2.5 bg-black text-white font-semibold rounded text-xs uppercase tracking-wider hover:bg-[#3F3F8F] transition-colors inline-block"
            >
              Explore Tanoah Collection
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPurchaseRequiredModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
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
            Enter your email or mobile number below. Our team will immediately notify you the moment <strong>{product.title} ({activeColorName} / {activeSizeName})</strong> is back in production.
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
              placeholder="+91 8714141849"
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
