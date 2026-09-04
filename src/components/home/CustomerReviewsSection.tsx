import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, Quote, ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/useUIStore';

interface ReviewItem {
  id: string;
  author: string;
  city?: string;
  rating: number;
  title: string;
  review: string;
  product: string;
  verified: boolean;
  category: 'all' | 'fabric' | 'fit' | 'delivery';
  date?: string;
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: '1',
    author: 'Aarav Mehta',
    city: 'Mumbai',
    rating: 5,
    title: 'Unmatched Fabric Quality & Drape',
    review: 'The Heavyweight Oversized Tee exceeded all my expectations. The neckline holds its shape perfectly after dozens of washes, and the cut has that high-end atelier feel.',
    product: 'Signature Heavyweight Oversized Tee',
    verified: true,
    category: 'fabric',
    date: '3 days ago',
  },
  {
    id: '2',
    author: 'Ananya Sharma',
    city: 'Bengaluru',
    rating: 5,
    title: 'The Linen Camp Shirt is Perfection',
    review: 'Pure effortless luxury. The French linen breathability is incredible in warm weather, and the subtle button detailing speaks volumes of the craft.',
    product: 'French Linen Relaxed Camp Shirt',
    verified: true,
    category: 'fabric',
    date: '1 week ago',
  },
  {
    id: '3',
    author: 'Rohan Verma',
    city: 'New Delhi',
    rating: 5,
    title: 'Tailored Wide Trousers - 10/10',
    review: 'The drape and movement on these trousers are flawless. Received countless compliments at a gallery opening. Truly world-class tailoring.',
    product: 'Tailored Wide-Leg Pleated Trouser',
    verified: true,
    category: 'fit',
    date: '2 weeks ago',
  },
  {
    id: '4',
    author: 'Priya Iyer',
    city: 'Chennai',
    rating: 5,
    title: 'Packaging & Delivery Like a Paris Boutique',
    review: 'Arrived in two days in a gorgeous branded matte box with tissue wrapping and a handwritten note. The silk slip dress fits like a glove.',
    product: 'Silk Crepe Fluid Slip Dress',
    verified: true,
    category: 'delivery',
    date: '2 weeks ago',
  },
  {
    id: '5',
    author: 'Kabir Singhania',
    city: 'Hyderabad',
    rating: 5,
    title: 'Heavy 280 GSM Cotton is the Real Deal',
    review: 'Most brands claim heavyweight but feel thin. TANOAH is true 280 GSM combed cotton. Boxy drop-shoulder silhouette that does not sag.',
    product: 'Minimalist Boxy Heavyweight Tee',
    verified: true,
    category: 'fit',
    date: '3 weeks ago',
  },
  {
    id: '6',
    author: 'Zoya Merchant',
    city: 'Pune',
    rating: 5,
    title: 'The Linen-Wool Overshirt is a Masterpiece',
    review: 'Sublime material blend. It has the structure of lightweight outerwear with the breathable softness of artisan linen. Worth every rupee.',
    product: 'Atelier Relaxed Linen Overshirt',
    verified: true,
    category: 'fabric',
    date: '1 month ago',
  },
];

export const CustomerReviewsSection: React.FC = () => {
  const { addToast } = useUIStore();
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [activeCategory, setActiveCategory] = useState<'all' | 'fabric' | 'fit' | 'delivery'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Review Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [productName, setProductName] = useState('Signature Heavyweight Oversized Tee');

  // Load any stored reviews
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tanoah_homepage_testimonials');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviews([...parsed, ...INITIAL_REVIEWS]);
        }
      }
    } catch {
      // fallback to initial
    }
  }, []);

  const filteredReviews = reviews.filter(
    (r) => activeCategory === 'all' || r.category === activeCategory
  );

  // Auto-advance slides every 5 seconds if not hovered
  useEffect(() => {
    if (isPaused || filteredReviews.length <= 3) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredReviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, filteredReviews.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredReviews.length) % filteredReviews.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredReviews.length);
  };

  const handleSubmitTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !reviewText.trim()) return;

    const newRev: ReviewItem = {
      id: `rev_home_${Date.now()}`,
      author: author.trim(),
      city: city.trim() || 'India',
      rating,
      title: title.trim() || 'Exquisite Atelier Experience',
      review: reviewText.trim(),
      product: productName,
      verified: true,
      category: activeCategory === 'all' ? 'fabric' : activeCategory,
      date: 'Just now',
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem('tanoah_homepage_testimonials', JSON.stringify([newRev]));
    } catch {}

    addToast({
      type: 'success',
      title: 'Testimonial Published',
      description: 'Thank you for your valued atelier review.',
    });

    setIsModalOpen(false);
    setAuthor('');
    setCity('');
    setTitle('');
    setReviewText('');
    setCurrentIndex(0);
  };

  // Determine items to display in grid (showing up to 3 visible at a time)
  const visibleReviews = [];
  const count = Math.min(3, filteredReviews.length);
  for (let i = 0; i < count; i++) {
    const idx = (currentIndex + i) % filteredReviews.length;
    visibleReviews.push(filteredReviews[idx]);
  }

  return (
    <section
      className="py-20 bg-[#F8F8F8] border-b border-[#E7E7E7] font-poppins text-xs"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Stats & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#3F3F8F]">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="font-bold text-black text-sm">4.9 / 5.0</span>
              <span className="text-[#888888]">• 1,420+ Verified Client Reviews</span>
            </div>
            <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase block mb-1">
              CLIENT TESTIMONIALS
            </span>
            <h2 className="font-wondra text-3xl sm:text-4xl text-black">
              PRAISED BY CONNOISSEURS
            </h2>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center bg-white p-1 rounded-[4px] border border-[#E7E7E7]">
              {(['all', 'fabric', 'fit', 'delivery'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setCurrentIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-[2px] text-[11px] uppercase font-semibold transition-all ${
                    activeCategory === cat
                      ? 'bg-[#3F3F8F] text-white'
                      : 'text-[#666666] hover:text-black'
                  }`}
                >
                  {cat === 'all' ? 'All Reviews' : cat === 'fabric' ? 'Fabric Quality' : cat === 'fit' ? 'Fit & Cut' : 'Delivery'}
                </button>
              ))}
            </div>

            {/* Write Review Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              icon={<MessageSquarePlus className="w-3.5 h-3.5" />}
              className="text-[11px] py-2"
            >
              WRITE A REVIEW
            </Button>
          </div>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {visibleReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white p-7 rounded-[4px] border border-[#E7E7E7] shadow-sm flex flex-col justify-between relative transition-all duration-300 hover:shadow-md hover:border-[#3F3F8F]/40"
            >
              <Quote className="w-8 h-8 text-[#EEEEF8] absolute top-6 right-6 pointer-events-none" />

              <div className="space-y-3 relative z-10 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  {rev.date && (
                    <span className="text-[10px] text-[#888888]">{rev.date}</span>
                  )}
                </div>

                <h4 className="font-wondra text-lg text-black">{rev.title}</h4>
                <p className="text-xs text-[#666666] leading-relaxed">
                  "{rev.review}"
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-[#E7E7E7] flex items-center justify-between text-left">
                <div>
                  <div className="font-semibold text-black flex items-center gap-1.5">
                    <span>{rev.author}</span>
                    {rev.city && <span className="text-[#888888] font-normal">({rev.city})</span>}
                    {rev.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[#3F3F8F] font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#888888] block mt-0.5 truncate max-w-[200px]">
                    {rev.product}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Slider Controls */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {filteredReviews.map((_, i) => (
              <button
                key={i}
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
              onClick={handlePrev}
              className="p-2 rounded-full border border-[#E7E7E7] bg-white text-black hover:bg-[#3F3F8F] hover:text-white transition-colors"
              aria-label="Previous review"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-full border border-[#E7E7E7] bg-white text-black hover:bg-[#3F3F8F] hover:text-white transition-colors"
              aria-label="Next review"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Write Homepage Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="WRITE AN ATELIER TESTIMONIAL"
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
                City / Location
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
                Rating
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
              Garment Silhouette
            </label>
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white"
            >
              <option value="Signature Heavyweight Oversized Tee">Signature Heavyweight Oversized Tee</option>
              <option value="French Linen Relaxed Camp Shirt">French Linen Relaxed Camp Shirt</option>
              <option value="Tailored Wide-Leg Pleated Trouser">Tailored Wide-Leg Pleated Trouser</option>
              <option value="Silk Crepe Fluid Slip Dress">Silk Crepe Fluid Slip Dress</option>
              <option value="Minimalist Boxy Heavyweight Tee">Minimalist Boxy Heavyweight Tee</option>
              <option value="Atelier Relaxed Linen Overshirt">Atelier Relaxed Linen Overshirt</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Review Title
            </label>
            <input
              type="text"
              placeholder="e.g. Best t-shirt I have ever owned"
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
              placeholder="Share your experience regarding the texture, silhouette, comfort, and craftsmanship..."
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
              onClick={() => setIsModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
            >
              POST TESTIMONIAL
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
