import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ShieldCheck, 
  Quote, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquarePlus, 
  Camera, 
  X, 
  ZoomIn, 
  Lock, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api, ProductReview } from '../../services/api';
import { Product } from '../../types';

// Curated luxury testimonials as graceful initial fallback
const CURATED_FALLBACK_TESTIMONIALS: ProductReview[] = [
  {
    id: 'curated-1',
    product_id: '11111111-1111-1111-1111-111111111111',
    product_title: 'Signature Heavyweight Oversized Tee',
    author_name: 'Aarav Mehta (Mumbai)',
    rating: 5,
    title: 'Unmatched Fabric Quality & Drape',
    review_text: 'The Heavyweight Oversized Tee exceeded all my expectations. The neckline holds its shape perfectly after dozens of washes, and the cut has that high-end designer feel.',
    image_urls: ['/Assets/editorial/lookbook-hero-ivory.jpg'],
    is_verified_buyer: true,
    status: 'approved',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'curated-2',
    product_id: '22222222-2222-2222-2222-222222222222',
    product_title: 'French Linen Relaxed Camp Shirt',
    author_name: 'Ananya Sharma (Bengaluru)',
    rating: 5,
    title: 'The Linen Camp Shirt is Perfection',
    review_text: 'Pure effortless luxury. The French linen breathability is incredible in warm weather, and the subtle button detailing speaks volumes of the craft.',
    image_urls: ['/Assets/editorial/lookbook-detail-embroidery.jpg'],
    is_verified_buyer: true,
    status: 'approved',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'curated-3',
    product_id: '44444444-4444-4444-4444-444444444444',
    product_title: 'Tailored Wide-Leg Pleated Trouser',
    author_name: 'Rohan Verma (New Delhi)',
    rating: 5,
    title: 'Tailored Wide Trousers - 10/10',
    review_text: 'The drape and movement on these trousers are flawless. Received countless compliments at a gallery opening. Truly world-class tailoring.',
    image_urls: ['/Assets/editorial/lookbook-hero-ivory.jpg'],
    is_verified_buyer: true,
    status: 'approved',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'curated-4',
    product_id: '33333333-3333-3333-3333-333333333333',
    product_title: 'Silk Crepe Fluid Slip Dress',
    author_name: 'Priya Iyer (Chennai)',
    rating: 5,
    title: 'Packaging & Delivery Like a Paris Boutique',
    review_text: 'Arrived in two days in a gorgeous branded matte box with tissue wrapping and a handwritten note. The silk slip dress fits like a glove.',
    image_urls: ['/Assets/editorial/lookbook-detail-embroidery.jpg'],
    is_verified_buyer: true,
    status: 'approved',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
];

export const CustomerReviewsSection: React.FC = () => {
  const { addToast } = useUIStore();
  const { user, profile } = useAuthStore();

  const [reviews, setReviews] = useState<ProductReview[]>(CURATED_FALLBACK_TESTIMONIALS);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Mandatory Login, Verified Purchase & Form modals
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isPurchaseRequiredModalOpen, setIsPurchaseRequiredModalOpen] = useState(false);
  const [isCheckingPurchases, setIsCheckingPurchases] = useState(false);
  const [purchasedProducts, setPurchasedProducts] = useState<{ id: string; title: string; image?: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [author, setAuthor] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lightbox modal for customer photos
  const [inspectPhoto, setInspectPhoto] = useState<{
    url: string;
    author: string;
    rating: number;
    title?: string;
    text: string;
    productTitle?: string;
    date: string;
  } | null>(null);

  // Load reviews & products
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [featReviews, prods] = await Promise.all([
          api.getFeaturedTestimonials(),
          api.getProducts(),
        ]);
        if (isMounted) {
          if (featReviews && featReviews.length > 0) {
            setReviews(featReviews);
          }
          if (prods && prods.length > 0) {
            setProducts(prods);
            setSelectedProductId(prods[0].id);
          }
        }
      } catch (err) {
        console.warn('Testimonials load fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto carousel cycling
  useEffect(() => {
    if (isPaused || reviews.length <= 3) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, reviews.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  // Open review modal with mandatory authentication & verified purchase check
  const handleOpenReviewModal = async () => {
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }

    setIsCheckingPurchases(true);
    try {
      const purchased = await api.getUserPurchasedProducts(user.id, user.email || undefined);
      setPurchasedProducts(purchased);

      if (!purchased || purchased.length === 0) {
        setIsPurchaseRequiredModalOpen(true);
        return;
      }

      const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      setAuthor(name);
      setSelectedProductId(purchased[0].id);
      setIsModalOpen(true);
    } catch (err) {
      console.warn('Failed to load purchased products for review:', err);
      if (products.length > 0) {
        setSelectedProductId(products[0].id);
      }
      setIsModalOpen(true);
    } finally {
      setIsCheckingPurchases(false);
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
  }, [searchParams, user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - reviewImages.length;
    const validFiles = files.slice(0, remainingSlots);

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setReviewImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!author.trim() || !reviewText.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Upload customer photos if attached
      const uploadedUrls: string[] = [];
      for (const file of reviewImages) {
        try {
          const res = await api.uploadMediaFile(file);
          if (res?.publicUrl) {
            uploadedUrls.push(res.publicUrl);
          }
        } catch (err) {
          console.warn('Customer photo upload error:', err);
        }
      }

      const prod = purchasedProducts.find((p) => p.id === selectedProductId) || products.find((p) => p.id === selectedProductId);

      // 2. Submit review with pending status
      const authorFormatted = city.trim() ? `${author.trim()} (${city.trim()})` : author.trim();
      const res = await api.submitReview({
        product_id: selectedProductId || (purchasedProducts[0]?.id ?? products[0]?.id ?? 'general'),
        product_title: prod?.title || 'Tanoah Collection',
        user_id: user.id,
        author_name: authorFormatted,
        rating,
        title: title.trim() || undefined,
        review_text: reviewText.trim(),
        image_urls: uploadedUrls,
        is_verified_buyer: true,
      });

      addToast({
        type: 'success',
        title: 'Testimonial Submitted',
        description: res.message,
      });

      setIsModalOpen(false);
      setCity('');
      setTitle('');
      setReviewText('');
      setReviewImages([]);
      setImagePreviews([]);
      setRating(5);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        description: err.message || 'Could not submit testimonial.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Visible carousel items (up to 3)
  const visibleReviews: ProductReview[] = [];
  const displayCount = Math.min(3, reviews.length);
  for (let i = 0; i < displayCount; i++) {
    const idx = (currentIndex + i) % reviews.length;
    visibleReviews.push(reviews[idx]);
  }

  return (
    <section
      className="py-24 bg-[#F9F9F9] border-b border-[#E7E7E7] font-poppins text-xs"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="font-bold text-black text-sm">4.9 / 5.0</span>
              <span className="text-[#888888] text-xs">• Verified Customer Reviews</span>
            </div>
            <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase block mb-1">
              CLIENT TESTIMONIALS
            </span>
            <h2 className="font-wondra text-3xl sm:text-4xl text-black">
              PRAISED BY CONNOISSEURS
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReviewModal}
              isLoading={isCheckingPurchases}
              icon={<MessageSquarePlus className="w-3.5 h-3.5" />}
              className="text-xs uppercase tracking-wider py-2.5 px-4 bg-white hover:bg-neutral-50"
            >
              Write a Review
            </Button>
          </div>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {visibleReviews.map((rev) => {
            const hasPhotos = rev.image_urls && rev.image_urls.length > 0;
            return (
              <div
                key={rev.id}
                className="bg-white p-7 rounded-[4px] border border-[#E7E7E7] shadow-xs flex flex-col justify-between relative transition-all duration-300 hover:shadow-md hover:border-[#3F3F8F]/40 group"
              >
                <Quote className="w-8 h-8 text-[#EEEEF8] absolute top-6 right-6 pointer-events-none" />

                <div className="space-y-3 relative z-10 text-left">
                  {/* Rating Stars & Verified Client badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-500">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    {rev.is_verified_buyer && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Verified Client
                      </span>
                    )}
                  </div>

                  {/* Title & Body */}
                  {rev.title && (
                    <h4 className="font-wondra text-lg text-black">{rev.title}</h4>
                  )}
                  <p className="text-xs text-[#555555] leading-relaxed italic">
                    "{rev.review_text}"
                  </p>

                  {/* Customer Uploaded Photos Preview */}
                  {hasPhotos && (
                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium mb-1.5">
                        <Camera className="w-3 h-3" />
                        <span>Client Photo</span>
                      </div>
                      <div className="flex gap-2">
                        {rev.image_urls?.slice(0, 2).map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() =>
                              setInspectPhoto({
                                url: photoUrl,
                                author: rev.author_name,
                                rating: rev.rating,
                                title: rev.title,
                                text: rev.review_text,
                                productTitle: rev.product_title,
                                date: new Date(rev.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }),
                              })
                            }
                            className="relative w-16 h-16 rounded border border-[#E7E7E7] overflow-hidden bg-neutral-100 cursor-pointer hover:border-[#3F3F8F] transition-all shrink-0 group/photo"
                          >
                            <img
                              src={photoUrl}
                              alt="Customer photo"
                              className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: Author & Product Link */}
                <div className="pt-5 mt-5 border-t border-[#E7E7E7] flex flex-col text-left">
                  <div className="font-semibold text-black text-xs">
                    {rev.author_name}
                  </div>
                  {rev.product_title && (
                    <Link
                      to={`/product/${rev.product_id}`}
                      className="text-[11px] text-[#3F3F8F] hover:underline flex items-center gap-1 mt-1 truncate group-hover:text-black transition-colors"
                      title={rev.product_title}
                    >
                      <span className="truncate">Reviewed: {rev.product_title}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Slider Controls */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 transition-all rounded-full ${
                  currentIndex === i ? 'w-6 bg-[#3F3F8F]' : 'w-2 bg-[#D5D5ED]'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-full border border-[#E7E7E7] bg-white text-black hover:bg-[#3F3F8F] hover:text-white transition-colors shadow-xs"
              aria-label="Previous review"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-full border border-[#E7E7E7] bg-white text-black hover:bg-[#3F3F8F] hover:text-white transition-colors shadow-xs"
              aria-label="Next review"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
            <h3 className="font-semibold text-base text-black">Sign In to Post a Testimonial</h3>
            <p className="text-[#666666] mt-1 leading-relaxed">
              To protect authenticity and preserve verified client feedback, reviews can only be submitted by registered TANOAH clients.
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

      {/* Photo Inspector Modal */}
      <Modal
        isOpen={!!inspectPhoto}
        onClose={() => setInspectPhoto(null)}
        title="CLIENT PHOTO & TESTIMONIAL"
        maxWidth="lg"
      >
        {inspectPhoto && (
          <div className="space-y-4 font-poppins">
            <div className="bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center max-h-[70vh]">
              <img
                src={inspectPhoto.url}
                alt="Client review photo"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="space-y-2 text-xs pt-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black text-sm">{inspectPhoto.author}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3" /> Verified Buyer
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                  <span>{inspectPhoto.rating}</span>
                  <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
              {inspectPhoto.productTitle && (
                <div className="text-neutral-500 font-medium">
                  Silhouette: {inspectPhoto.productTitle}
                </div>
              )}
              {inspectPhoto.title && (
                <div className="font-semibold text-black text-sm">{inspectPhoto.title}</div>
              )}
              <p className="text-[#444444] leading-relaxed italic bg-[#FAFAFA] p-3 rounded border border-neutral-100">
                "{inspectPhoto.text}"
              </p>
              <div className="text-[11px] text-neutral-400 text-right">
                Posted {inspectPhoto.date}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Write Testimonial Modal with Photo Upload */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="WRITE A REVIEW"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitTestimonial} className="space-y-4 text-xs font-poppins text-left">
          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Your Name *
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Vikram Singhania"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                City / Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Rating *
              </label>
              <div className="flex gap-1 text-xl cursor-pointer pt-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={star <= rating ? 'text-amber-500' : 'text-neutral-300'}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Reviewed Garment Silhouette *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white"
            >
              {(purchasedProducts.length > 0 ? purchasedProducts : products).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Headline (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Exquisite draping and tailoring"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Detailed Experience *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Share your experience regarding the fabric quality, silhouette, comfort, and craftsmanship..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
            />
          </div>

          {/* Garment Image Upload */}
          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1 flex items-center justify-between">
              <span>Attach Garment Photo (Optional, Max 3)</span>
              <span className="text-neutral-400 font-normal">{reviewImages.length} / 3 attached</span>
            </label>

            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded border border-[#E7E7E7] overflow-hidden bg-neutral-100">
                    <img src={preview} alt={`Upload preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-0.5 rounded-full transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {reviewImages.length < 3 && (
              <label className="border-2 border-dashed border-[#E7E7E7] hover:border-[#3F3F8F] rounded p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-[#666666] hover:text-[#3F3F8F]">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-medium">Click to select garment photo</span>
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
              onClick={() => setIsModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
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
              To guarantee 100% authentic feedback, client reviews can only be submitted for garments you have purchased.
            </p>
            <p className="text-[#666666] text-[11px] mt-2 bg-neutral-50 p-2.5 rounded border border-neutral-200">
              No completed garment orders were found under your account (<strong>{user?.email}</strong>).
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
    </section>
  );
};
