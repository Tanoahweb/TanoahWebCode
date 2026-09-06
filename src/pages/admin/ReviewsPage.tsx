import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Check, 
  X, 
  Trash2, 
  Sparkles, 
  Clock, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  ImageIcon, 
  MessageSquare,
  ChevronRight,
  ZoomIn
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { ProductReview } from '../../types';

export const ReviewsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'featured' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lightbox for reviewing customer uploaded photos
  const [inspectPhoto, setInspectPhoto] = useState<{
    url: string;
    reviewTitle?: string;
    author: string;
    productTitle?: string;
  } | null>(null);

  // Review being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllAdminReviews();
      setReviews(data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      addToast({
        type: 'error',
        title: 'Error Loading Reviews',
        description: 'Could not fetch reviews from the database.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Handlers
  const handleApprove = async (id: string) => {
    try {
      const success = await api.updateReviewStatus(id, 'approved');
      if (success) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        addToast({
          type: 'success',
          title: 'Review Approved',
          description: 'The review is now live on the storefront.'
        });
      } else {
        addToast({ type: 'error', title: 'Action Failed', description: 'Could not approve review in database.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Action Failed', description: 'Could not approve review.' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const success = await api.updateReviewStatus(id, 'rejected');
      if (success) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
        addToast({
          type: 'info',
          title: 'Review Rejected',
          description: 'The review has been rejected and hidden from clients.'
        });
      } else {
        addToast({ type: 'error', title: 'Action Failed', description: 'Could not reject review in database.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Action Failed', description: 'Could not reject review.' });
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const nextVal = !currentFeatured;
      const success = await api.toggleReviewFeatured(id, nextVal);
      if (success) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, is_featured: nextVal } : r));
        addToast({
          type: 'success',
          title: nextVal ? 'Featured on Homepage' : 'Removed from Homepage',
          description: nextVal 
            ? 'This review is now prominently showcased in Client Testimonials.' 
            : 'Review removed from homepage featured list.'
        });
      } else {
        addToast({ type: 'error', title: 'Action Failed', description: 'Could not update featured state in database.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Action Failed', description: 'Could not update featured state.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await api.deleteReview(id);
      if (success) {
        setReviews(prev => prev.filter(r => r.id !== id));
        setDeletingId(null);
        addToast({
          type: 'success',
          title: 'Review Deleted',
          description: 'The review has been permanently removed.'
        });
      }
    } catch {
      addToast({ type: 'error', title: 'Action Failed', description: 'Could not delete review.' });
    }
  };

  // Metrics
  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const featuredCount = reviews.filter(r => r.is_featured && r.status === 'approved').length;
  const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
  const totalCount = reviews.length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalCount).toFixed(1) 
    : '5.0';

  // Filtered reviews
  const filtered = reviews.filter(r => {
    // Tab filter
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'approved' && r.status !== 'approved') return false;
    if (activeTab === 'featured' && (!r.is_featured || r.status !== 'approved')) return false;
    if (activeTab === 'rejected' && r.status !== 'rejected') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAuthor = r.author_name?.toLowerCase().includes(q);
      const matchProduct = r.product_title?.toLowerCase().includes(q) || r.product_id?.toLowerCase().includes(q);
      const matchText = r.review_text?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q);
      return matchAuthor || matchProduct || matchText;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E7E7] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-[#3F3F8F] text-white px-2 py-0.5 rounded uppercase tracking-wider">
                Store Moderation
              </span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingCount} Pending Approval
                </span>
              )}
            </div>
            <h1 className="text-2xl font-wondra text-black tracking-wide mt-1">
              REVIEWS & TESTIMONIALS MODERATION
            </h1>
            <p className="text-[#666666] text-xs">
              Verify customer reviews, inspect submitted product photos, and curate featured client testimonials for the storefront.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReviews}
              className="text-xs"
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div 
            onClick={() => setActiveTab('pending')}
            className={`cursor-pointer p-4 rounded border transition-all ${
              activeTab === 'pending' 
                ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300' 
                : 'bg-white border-[#E7E7E7] hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[11px] font-semibold uppercase">Pending Verification</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
            <div className="text-[10px] text-amber-600 mt-1">Requires admin approval</div>
          </div>

          <div 
            onClick={() => setActiveTab('approved')}
            className={`cursor-pointer p-4 rounded border transition-all ${
              activeTab === 'approved' 
                ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' 
                : 'bg-white border-[#E7E7E7] hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-semibold uppercase">Live Approved</span>
              <Check className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
            <div className="text-[10px] text-emerald-600 mt-1">Visible on product pages</div>
          </div>

          <div 
            onClick={() => setActiveTab('featured')}
            className={`cursor-pointer p-4 rounded border transition-all ${
              activeTab === 'featured' 
                ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-300' 
                : 'bg-white border-[#E7E7E7] hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-[11px] font-semibold uppercase">Homepage Featured</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-purple-700">{featuredCount}</div>
            <div className="text-[10px] text-purple-600 mt-1">Showcased on homepage</div>
          </div>

          <div 
            onClick={() => setActiveTab('rejected')}
            className={`cursor-pointer p-4 rounded border transition-all ${
              activeTab === 'rejected' 
                ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-300' 
                : 'bg-white border-[#E7E7E7] hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-[11px] font-semibold uppercase">Rejected / Spam</span>
              <X className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-rose-700">{rejectedCount}</div>
            <div className="text-[10px] text-rose-600 mt-1">Hidden from storefront</div>
          </div>

          <div 
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer p-4 rounded border transition-all ${
              activeTab === 'all' 
                ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300' 
                : 'bg-white border-[#E7E7E7] hover:border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between text-[#3F3F8F] mb-1">
              <span className="text-[11px] font-semibold uppercase">Average Rating</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-black">{avgRating} <span className="text-sm font-normal text-neutral-400">/ 5.0</span></div>
            <div className="text-[10px] text-[#666666] mt-1">{totalCount} total submissions</div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white p-4 rounded border border-[#E7E7E7] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b md:border-b-0 pb-2 md:pb-0 border-[#E7E7E7]">
              {[
                { id: 'pending', label: 'Pending Verification', count: pendingCount, color: 'text-amber-700' },
                { id: 'approved', label: 'Approved (Live)', count: approvedCount, color: 'text-emerald-700' },
                { id: 'featured', label: 'Homepage Featured', count: featuredCount, color: 'text-purple-700' },
                { id: 'rejected', label: 'Rejected', count: rejectedCount, color: 'text-rose-700' },
                { id: 'all', label: 'All Reviews', count: totalCount, color: 'text-neutral-700' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'text-[#666666] hover:bg-neutral-100 hover:text-black'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by client, product or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F8F8F8] border border-[#E7E7E7] rounded text-xs focus:outline-none focus:border-black"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="bg-white p-12 rounded border border-[#E7E7E7] text-center text-[#888888]">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-[#3F3F8F] rounded-full animate-spin mx-auto mb-3" />
            <p>Loading client reviews and testimonials...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded border border-[#E7E7E7] text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <h3 className="font-semibold text-black text-sm">No reviews found</h3>
            <p className="text-xs text-[#666666] mt-1 max-w-sm mx-auto">
              {activeTab === 'pending'
                ? 'All pending reviews have been processed! No pending items currently require moderation.'
                : 'No reviews match your current tab or search criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((rev) => {
              const hasPhotos = rev.image_urls && rev.image_urls.length > 0;
              return (
                <div 
                  key={rev.id} 
                  className={`bg-white rounded border p-5 transition-all hover:shadow-sm ${
                    rev.status === 'pending' 
                      ? 'border-amber-200 bg-amber-50/20' 
                      : rev.is_featured 
                        ? 'border-purple-200 bg-purple-50/10'
                        : 'border-[#E7E7E7]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left Column: Author, Rating, Review */}
                    <div className="space-y-2.5 flex-1">
                      {/* Top status bar for this review */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Rating pill */}
                        <div className="flex items-center gap-1 bg-neutral-900 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                          <span>{rev.rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>

                        {/* Status badge */}
                        {rev.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> Under Moderation
                          </span>
                        )}
                        {rev.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            <Check className="w-3 h-3" /> Live Approved
                          </span>
                        )}
                        {rev.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                            <X className="w-3 h-3" /> Rejected
                          </span>
                        )}

                        {/* Featured Tag */}
                        {rev.is_featured && rev.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" /> Homepage Featured
                          </span>
                        )}

                        {/* Verified Buyer badge */}
                        {rev.is_verified_buyer && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Buyer
                          </span>
                        )}

                        <span className="text-[11px] text-neutral-400 ml-auto">
                          {new Date(rev.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Author & Product Line */}
                      <div className="flex flex-wrap items-center gap-x-2 text-xs">
                        <span className="font-bold text-black">{rev.author_name}</span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-[#666666]">Reviewed:</span>
                        <span className="font-medium text-[#3F3F8F]">
                          {rev.product_title || `Product ID: ${rev.product_id.slice(0, 8)}...`}
                        </span>
                      </div>

                      {/* Title & Body */}
                      {rev.title && (
                        <h4 className="font-semibold text-black text-sm">{rev.title}</h4>
                      )}
                      <p className="text-[#444444] text-xs leading-relaxed bg-[#FAFAFA] p-3 rounded border border-neutral-100">
                        {rev.review_text}
                      </p>

                      {/* Customer Uploaded Photos Strip */}
                      {hasPhotos && (
                        <div className="pt-2">
                          <div className="text-[11px] font-semibold text-[#666666] mb-1.5 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Customer Uploaded Photos ({rev.image_urls?.length}):</span>
                            <span className="text-[10px] text-neutral-400 font-normal">(Click photo to inspect)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {rev.image_urls?.map((url, idx) => (
                              <div
                                key={idx}
                                onClick={() => setInspectPhoto({
                                  url,
                                  reviewTitle: rev.title,
                                  author: rev.author_name,
                                  productTitle: rev.product_title
                                })}
                                className="relative group cursor-pointer w-20 h-20 rounded border border-[#E7E7E7] overflow-hidden bg-neutral-100 shrink-0 shadow-sm hover:border-[#3F3F8F] transition-all"
                              >
                                <img
                                  src={url}
                                  alt={`Customer photo ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-4 h-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E7E7E7]">
                      {/* Approve button */}
                      {rev.status !== 'approved' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(rev.id)}
                          icon={<Check className="w-3.5 h-3.5" />}
                          className="text-xs bg-emerald-700 hover:bg-emerald-800 border-emerald-700 w-full lg:w-auto"
                        >
                          Approve Review
                        </Button>
                      )}

                      {/* Homepage Featured Toggle */}
                      {rev.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFeatured(rev.id, !!rev.is_featured)}
                          icon={<Sparkles className={`w-3.5 h-3.5 ${rev.is_featured ? 'text-purple-600 fill-purple-600' : ''}`} />}
                          className={`text-xs w-full lg:w-auto ${
                            rev.is_featured 
                              ? 'border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100' 
                              : 'hover:border-purple-300'
                          }`}
                        >
                          {rev.is_featured ? 'Featured on Homepage' : 'Feature on Homepage'}
                        </Button>
                      )}

                      {/* Reject button */}
                      {rev.status !== 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(rev.id)}
                          icon={<X className="w-3.5 h-3.5" />}
                          className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 w-full lg:w-auto"
                        >
                          Reject
                        </Button>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => setDeletingId(rev.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Review Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo Inspector Modal */}
        <Modal
          isOpen={!!inspectPhoto}
          onClose={() => setInspectPhoto(null)}
          title="INSPECT CUSTOMER UPLOADED PHOTO"
          maxWidth="lg"
        >
          {inspectPhoto && (
            <div className="space-y-4">
              <div className="bg-neutral-950 rounded overflow-hidden flex items-center justify-center max-h-[70vh]">
                <img
                  src={inspectPhoto.url}
                  alt="Customer upload full view"
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-black">
                  Review by: {inspectPhoto.author}
                </div>
                {inspectPhoto.productTitle && (
                  <div className="text-neutral-500">
                    Product: {inspectPhoto.productTitle}
                  </div>
                )}
                {inspectPhoto.reviewTitle && (
                  <div className="text-neutral-700 italic">
                    "{inspectPhoto.reviewTitle}"
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          title="CONFIRM DELETION"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs font-poppins">
            <div className="flex items-center gap-2 text-rose-600 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Permanently Delete Review?</span>
            </div>
            <p className="text-[#666666]">
              This will permanently remove the review and any attached customer photos from both the database and storefront. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => deletingId && handleDelete(deletingId)}
                className="bg-rose-600 hover:bg-rose-700 border-rose-600"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};
