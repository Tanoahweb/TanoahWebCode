import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  ExternalLink,
  Send,
  Copy,
  Check,
  Search,
  Filter,
  Download,
  RefreshCw,
  Package,
  Sparkles,
  Inbox,
  User,
  ArrowUpRight,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';

type ActiveTab = 'waitlist' | 'contact' | 'newsletter';

export const FormSubmissionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('waitlist');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [waitlistRequests, setWaitlistRequests] = useState<any[]>([]);
  const [contactInquiries, setContactInquiries] = useState<any[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [waitlistFilter, setWaitlistFilter] = useState<'all' | 'pending' | 'notified' | 'in_stock'>('all');
  const [contactFilter, setContactFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { addToast } = useUIStore();

  const loadAllFormData = async () => {
    try {
      const [waitlist, inquiries, subscribers] = await Promise.all([
        api.getBackInStockSubscriptions(),
        api.getContactInquiries(),
        api.getNewsletterSubscribers(),
      ]);

      setWaitlistRequests(waitlist || []);
      setContactInquiries(inquiries || []);
      setNewsletterSubscribers(subscribers || []);
    } catch (err) {
      console.warn('Error loading form submissions:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllFormData();

    // Supabase Realtime subscriptions for live form updates
    const channel = supabase
      .channel('admin_form_submissions_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'back_in_stock_subscriptions' }, () => {
        loadAllFormData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_inquiries' }, () => {
        loadAllFormData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'newsletter_subscribers' }, () => {
        loadAllFormData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAllFormData();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // Back in Stock Waitlist Actions
  // ---------------------------------------------------------------------------
  const handleToggleWaitlistNotified = async (req: any) => {
    const nextState = !req.notified_at;
    const success = await api.updateBackInStockStatus(req.id, nextState);
    if (success) {
      addToast({
        type: 'success',
        title: nextState ? 'Marked as Notified' : 'Reverted to Pending',
        description: `Customer ${req.email} status updated.`,
      });
      loadAllFormData();
    }
  };

  const handleDeleteWaitlist = async (id: string) => {
    if (!window.confirm('Delete this restock waitlist entry?')) return;
    const success = await api.deleteBackInStockSubscription(id);
    if (success) {
      addToast({
        type: 'success',
        title: 'Waitlist Entry Deleted',
        description: 'Record permanently removed.',
      });
      loadAllFormData();
    }
  };

  const handleSendWhatsAppRestockNotice = (req: any) => {
    const phone = (req.phone || '').replace(/\D/g, '');
    const productTitle = req.variant?.product?.title || 'TANOAH Piece';
    const variantTitle = req.variant ? `${req.variant.color_name || ''} ${req.variant.size || ''}`.trim() : '';
    const slug = req.variant?.product?.slug || '';
    const productUrl = slug ? `https://tanoah.com/products/${slug}` : 'https://tanoah.com/collections/all';

    const message = encodeURIComponent(
      `Hello! Great news from TANOAH: The handcrafted piece you requested — *${productTitle}* (${variantTitle}) — is now back in stock! ✨\n\nExplore and secure yours here:\n${productUrl}\n\nOur team is at your service for any assistance.`
    );

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }

    // Automatically mark as notified if not already
    if (!req.notified_at) {
      api.updateBackInStockStatus(req.id, true).then(() => loadAllFormData());
    }
  };

  const handleSendEmailRestockNotice = (req: any) => {
    const productTitle = req.variant?.product?.title || 'TANOAH Piece';
    const variantTitle = req.variant ? `${req.variant.color_name || ''} ${req.variant.size || ''}`.trim() : '';
    const slug = req.variant?.product?.slug || '';
    const productUrl = slug ? `https://tanoah.com/products/${slug}` : 'https://tanoah.com/collections/all';

    const subject = encodeURIComponent(`Back in Stock: ${productTitle} is Now Available at TANOAH`);
    const body = encodeURIComponent(
      `Hello,\n\nWe are pleased to inform you that the item you were waiting for—${productTitle} (${variantTitle})—has returned to our boutique.\n\nYou can view and purchase it here:\n${productUrl}\n\nWarm regards,\nTANOAH Maison`
    );

    window.open(`mailto:${req.email}?subject=${subject}&body=${body}`, '_blank');

    if (!req.notified_at) {
      api.updateBackInStockStatus(req.id, true).then(() => loadAllFormData());
    }
  };

  // ---------------------------------------------------------------------------
  // Contact Inquiries Actions
  // ---------------------------------------------------------------------------
  const handleUpdateContactStatus = async (id: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    const success = await api.updateContactInquiryStatus(id, newStatus);
    if (success) {
      addToast({
        type: 'success',
        title: 'Inquiry Status Updated',
        description: `Marked as ${newStatus.replace('_', ' ')}.`,
      });
      loadAllFormData();
    }
  };

  const handleDeleteContactInquiry = async (id: string) => {
    if (!window.confirm('Delete this contact inquiry?')) return;
    const success = await api.deleteContactInquiry(id);
    if (success) {
      addToast({
        type: 'success',
        title: 'Inquiry Deleted',
        description: 'Inquiry removed from system.',
      });
      loadAllFormData();
    }
  };

  const handleReplyContactEmail = (inquiry: any) => {
    const subject = encodeURIComponent(`Re: ${inquiry.subject || 'Your Inquiry'} - TANOAH Support`);
    const body = encodeURIComponent(
      `Hello ${inquiry.name},\n\nThank you for reaching out to TANOAH regarding "${inquiry.subject || 'your enquiry'}".\n\n\n\nWarm regards,\nTANOAH Customer Care`
    );
    window.open(`mailto:${inquiry.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleReplyContactWhatsApp = (inquiry: any) => {
    const phone = (inquiry.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hello ${inquiry.name}, thank you for contacting TANOAH regarding "${inquiry.subject || 'your enquiry'}". How may we assist you today?`
    );
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  // ---------------------------------------------------------------------------
  // Newsletter Actions
  // ---------------------------------------------------------------------------
  const handleToggleNewsletterActive = async (sub: any) => {
    const nextState = !sub.is_active;
    const success = await api.toggleNewsletterSubscriber(sub.id, nextState);
    if (success) {
      addToast({
        type: 'success',
        title: nextState ? 'Subscriber Activated' : 'Subscriber Deactivated',
        description: sub.email,
      });
      loadAllFormData();
    }
  };

  const handleDeleteNewsletter = async (id: string) => {
    if (!window.confirm('Remove this subscriber permanently?')) return;
    const success = await api.deleteNewsletterSubscriber(id);
    if (success) {
      addToast({
        type: 'success',
        title: 'Subscriber Removed',
        description: 'Record deleted from newsletter list.',
      });
      loadAllFormData();
    }
  };

  const handleExportNewsletterCSV = () => {
    if (newsletterSubscribers.length === 0) {
      addToast({ type: 'info', title: 'No Data', description: 'No subscribers to export.' });
      return;
    }
    const headers = ['Email', 'Status', 'Subscribed Date'];
    const rows = newsletterSubscribers.map((s) => [
      `"${s.email}"`,
      s.is_active ? 'Active' : 'Inactive',
      s.subscribed_at ? new Date(s.subscribed_at).toISOString() : '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tanoah_newsletter_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // Filtered Lists
  // ---------------------------------------------------------------------------
  const filteredWaitlist = waitlistRequests.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const productTitle = r.variant?.product?.title || '';
    const variantTitle = `${r.variant?.color_name || ''} ${r.variant?.size || ''} ${r.variant?.sku || ''}`;
    const matchesQuery =
      !q ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      productTitle.toLowerCase().includes(q) ||
      variantTitle.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (waitlistFilter === 'pending') return !r.notified_at;
    if (waitlistFilter === 'notified') return !!r.notified_at;
    if (waitlistFilter === 'in_stock') return (r.variant?.stock_quantity || 0) > 0;
    return true;
  });

  const filteredContact = contactInquiries.filter((inq) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inq.name?.toLowerCase().includes(q) ||
      inq.email?.toLowerCase().includes(q) ||
      inq.phone?.includes(q) ||
      inq.subject?.toLowerCase().includes(q) ||
      inq.message?.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (contactFilter !== 'all') return inq.status === contactFilter;
    return true;
  });

  const filteredNewsletter = newsletterSubscribers.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || sub.email?.toLowerCase().includes(q);
  });

  // KPI calculations
  const pendingWaitlistCount = waitlistRequests.filter((r) => !r.notified_at).length;
  const inStockWaitlistCount = waitlistRequests.filter((r) => (r.variant?.stock_quantity || 0) > 0 && !r.notified_at).length;
  const newInquiriesCount = contactInquiries.filter((i) => i.status === 'new').length;
  const activeSubscribersCount = newsletterSubscribers.filter((s) => s.is_active !== false).length;

  return (
    <AdminLayout>
      <div className="space-y-6 text-left max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                Customer Engagement Hub
              </span>
            </div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              FORM SUBMISSIONS &amp; WAITLISTS
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Inspect back-in-stock alerts, customer contact messages, and newsletter subscribers with direct actions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Back in Stock */}
          <div
            onClick={() => setActiveTab('waitlist')}
            className={`p-5 rounded-[4px] border transition-all cursor-pointer ${
              activeTab === 'waitlist'
                ? 'bg-[#FAF9F6] border-[#3F3F8F] shadow-sm'
                : 'bg-white border-[#E7E7E7] hover:border-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888888]">
                Restock Alerts (Waitlist)
              </span>
              <div className="w-8 h-8 rounded-full bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-wondra text-2xl sm:text-3xl text-black">
                {pendingWaitlistCount}
              </span>
              <span className="text-[11px] text-neutral-500">pending alerts</span>
            </div>
            {inStockWaitlistCount > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[10px] font-semibold animate-pulse">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{inStockWaitlistCount} Ready to Notify (In Stock Now!)</span>
              </div>
            )}
          </div>

          {/* Card 2: Contact Inquiries */}
          <div
            onClick={() => setActiveTab('contact')}
            className={`p-5 rounded-[4px] border transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-[#FAF9F6] border-[#3F3F8F] shadow-sm'
                : 'bg-white border-[#E7E7E7] hover:border-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888888]">
                Contact Inquiries
              </span>
              <div className="w-8 h-8 rounded-full bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-wondra text-2xl sm:text-3xl text-black">
                {newInquiriesCount}
              </span>
              <span className="text-[11px] text-neutral-500">new / awaiting reply</span>
            </div>
            <p className="mt-2 text-[10px] text-[#666666]">
              Total inquiries: {contactInquiries.length}
            </p>
          </div>

          {/* Card 3: Newsletter */}
          <div
            onClick={() => setActiveTab('newsletter')}
            className={`p-5 rounded-[4px] border transition-all cursor-pointer ${
              activeTab === 'newsletter'
                ? 'bg-[#FAF9F6] border-[#3F3F8F] shadow-sm'
                : 'bg-white border-[#E7E7E7] hover:border-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888888]">
                Newsletter Gazette
              </span>
              <div className="w-8 h-8 rounded-full bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-wondra text-2xl sm:text-3xl text-black">
                {activeSubscribersCount}
              </span>
              <span className="text-[11px] text-neutral-500">active subscribers</span>
            </div>
            <p className="mt-2 text-[10px] text-[#666666]">
              Total signups: {newsletterSubscribers.length}
            </p>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] p-4 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E7E7] pb-3">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab('waitlist');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-[4px] font-semibold text-xs transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'waitlist'
                    ? 'bg-[#3F3F8F] text-white'
                    : 'bg-[#FAFAFA] text-[#666666] hover:text-black border border-[#E7E7E7]'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notify Me When Restocked</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {waitlistRequests.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('contact');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-[4px] font-semibold text-xs transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'contact'
                    ? 'bg-[#3F3F8F] text-white'
                    : 'bg-[#FAFAFA] text-[#666666] hover:text-black border border-[#E7E7E7]'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Contact Inquiries</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {contactInquiries.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('newsletter');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-[4px] font-semibold text-xs transition-colors flex items-center gap-2 shrink-0 ${
                  activeTab === 'newsletter'
                    ? 'bg-[#3F3F8F] text-white'
                    : 'bg-[#FAFAFA] text-[#666666] hover:text-black border border-[#E7E7E7]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Newsletter Subscribers</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {newsletterSubscribers.length}
                </span>
              </button>
            </div>

            {/* Quick Export for Newsletter */}
            {activeTab === 'newsletter' && (
              <button
                onClick={handleExportNewsletterCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEEEF8] text-[#3F3F8F] hover:bg-[#3F3F8F] hover:text-white rounded-[4px] text-xs font-semibold transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {/* Sub-Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder={
                  activeTab === 'waitlist'
                    ? 'Search product, SKU, email, mobile...'
                    : activeTab === 'contact'
                    ? 'Search name, email, subject, message...'
                    : 'Search subscriber email...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filters per Tab */}
            {activeTab === 'waitlist' && (
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setWaitlistFilter('all')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    waitlistFilter === 'all'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All ({waitlistRequests.length})
                </button>
                <button
                  onClick={() => setWaitlistFilter('pending')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    waitlistFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Pending ({pendingWaitlistCount})
                </button>
                <button
                  onClick={() => setWaitlistFilter('in_stock')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    waitlistFilter === 'in_stock'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  In Stock Now ({inStockWaitlistCount})
                </button>
                <button
                  onClick={() => setWaitlistFilter('notified')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    waitlistFilter === 'notified'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  Notified ({waitlistRequests.length - pendingWaitlistCount})
                </button>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setContactFilter('all')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    contactFilter === 'all'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All ({contactInquiries.length})
                </button>
                <button
                  onClick={() => setContactFilter('new')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    contactFilter === 'new'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  New ({newInquiriesCount})
                </button>
                <button
                  onClick={() => setContactFilter('in_progress')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    contactFilter === 'in_progress'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setContactFilter('resolved')}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 ${
                    contactFilter === 'resolved'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Resolved
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: WAITLIST (Notify Me When Restocked) */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'waitlist' && (
          <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
            {filteredWaitlist.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 space-y-3">
                <Bell className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-800">No Restock Requests Found</p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  When visitors click &ldquo;NOTIFY ME WHEN RESTOCKED&rdquo; on sold-out pieces, their requests will appear here with instant WhatsApp &amp; Email actions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E7E7E7] text-[10px] uppercase font-semibold text-[#888888] tracking-wider">
                    <tr>
                      <th className="p-4">Requested Garment / Variant</th>
                      <th className="p-4">Live Inventory</th>
                      <th className="p-4">Customer Contact</th>
                      <th className="p-4">Date Requested</th>
                      <th className="p-4">Notification Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {filteredWaitlist.map((req) => {
                      const product = req.variant?.product;
                      const variant = req.variant;
                      const productTitle = product?.title || 'TANOAH Garment';
                      const variantTitle = variant
                        ? `${variant.color_name || 'Standard'} / ${variant.size || 'Free'}`
                        : 'Default Variant';
                      const sku = variant?.sku || 'TAN-SKU';
                      const stockQty = Number(variant?.stock_quantity ?? 0);
                      const isRestocked = stockQty > 0;
                      const isNotified = !!req.notified_at;
                      const img =
                        product?.images?.find((i: any) => i.is_primary)?.image_url ||
                        product?.images?.[0]?.image_url ||
                        '/Assets/hero/hero-landscape.jpg';

                      return (
                        <tr key={req.id} className="hover:bg-[#FAFAFA] transition-colors">
                          {/* 1. Product & Variant */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={img}
                                alt={productTitle}
                                className="w-12 h-14 object-cover rounded-[2px] border border-[#E7E7E7] shrink-0"
                              />
                              <div className="space-y-0.5">
                                {product?.slug ? (
                                  <Link
                                    to={`/products/${product.slug}`}
                                    target="_blank"
                                    className="font-semibold text-black hover:text-[#3F3F8F] hover:underline flex items-center gap-1"
                                  >
                                    <span>{productTitle}</span>
                                    <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-black">{productTitle}</span>
                                )}
                                <p className="text-[11px] text-[#666666] font-medium">{variantTitle}</p>
                                <span className="text-[10px] font-mono text-[#888888] block">SKU: {sku}</span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Live Inventory */}
                          <td className="p-4">
                            {isRestocked ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-semibold text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>In Stock Now ({stockQty})</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-medium">
                                Out of Stock (0)
                              </span>
                            )}
                          </td>

                          {/* 3. Customer Contact */}
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="font-medium text-black">{req.email}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(req.email, `email_${req.id}`)}
                                className="text-neutral-400 hover:text-black p-0.5"
                                title="Copy email"
                              >
                                {copiedId === `email_${req.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {req.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
                                <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                                <span>{req.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(req.phone, `phone_${req.id}`)}
                                  className="text-neutral-400 hover:text-black p-0.5"
                                  title="Copy phone"
                                >
                                  {copiedId === `phone_${req.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* 4. Date Requested */}
                          <td className="p-4 text-neutral-600 text-[11px]">
                            {req.created_at ? (
                              <div>
                                <span className="block font-medium text-black">
                                  {new Date(req.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  {new Date(req.created_at).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            ) : (
                              'Recently'
                            )}
                          </td>

                          {/* 5. Notification Status */}
                          <td className="p-4">
                            {isNotified ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded font-semibold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>Notified</span>
                                </span>
                                <span className="block text-[9px] text-neutral-400">
                                  {new Date(req.notified_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded font-semibold text-[10px]">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Notification</span>
                              </span>
                            )}
                          </td>

                          {/* 6. Action Buttons */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Send WhatsApp Notice */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppRestockNotice(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors shadow-2xs"
                                title="Send Restock Notice via WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>

                              {/* Send Email Notice */}
                              <button
                                type="button"
                                onClick={() => handleSendEmailRestockNotice(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3F3F8F] hover:bg-black text-white rounded text-[11px] font-medium transition-colors shadow-2xs"
                                title="Send Restock Notice via Email"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Email</span>
                              </button>

                              {/* Toggle Status */}
                              <button
                                type="button"
                                onClick={() => handleToggleWaitlistNotified(req)}
                                className="px-2 py-1 border border-[#E7E7E7] hover:border-black rounded text-[10px] font-semibold text-neutral-700 bg-white hover:bg-neutral-50 transition-colors"
                                title={isNotified ? 'Revert to Pending' : 'Mark as Notified'}
                              >
                                {isNotified ? 'Mark Pending' : 'Mark Notified'}
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteWaitlist(req.id)}
                                className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                                title="Delete request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: CONTACT INQUIRIES */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'contact' && (
          <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
            {filteredContact.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 space-y-3">
                <Inbox className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-800">No Contact Inquiries Found</p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  When visitors submit inquiries from the Contact page, their messages and inquiries will populate here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E7E7E7]">
                {filteredContact.map((inq) => {
                  return (
                    <div key={inq.id} className="p-5 hover:bg-[#FAFAFA] transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-sm text-black">{inq.name}</span>
                          <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-semibold px-2 py-0.5 rounded">
                            {inq.subject || 'General Inquiry'}
                          </span>
                          {inq.status === 'new' && (
                            <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded uppercase">
                              New Inquiry
                            </span>
                          )}
                          {inq.status === 'in_progress' && (
                            <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded uppercase">
                              In Progress
                            </span>
                          )}
                          {inq.status === 'resolved' && (
                            <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase">
                              Resolved
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                          {inq.created_at && (
                            <span>
                              {new Date(inq.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact Channels */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#555555]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="font-medium text-black">{inq.email}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(inq.email, `inq_email_${inq.id}`)}
                            className="text-neutral-400 hover:text-black p-0.5"
                          >
                            {copiedId === `inq_email_${inq.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {inq.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{inq.phone}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(inq.phone, `inq_phone_${inq.id}`)}
                              className="text-neutral-400 hover:text-black p-0.5"
                            >
                              {copiedId === `inq_phone_${inq.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="p-3 bg-[#FAF9F6] border border-[#E7E7E7] rounded-[4px] text-xs text-[#333333] leading-relaxed whitespace-pre-wrap">
                        {inq.message}
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F2F2F2]">
                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-neutral-600">Update Status:</span>
                          <select
                            value={inq.status || 'new'}
                            onChange={(e) =>
                              handleUpdateContactStatus(inq.id, e.target.value as any)
                            }
                            className="px-2.5 py-1 border border-[#E7E7E7] rounded text-xs bg-white focus:outline-none focus:border-[#3F3F8F]"
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReplyContactEmail(inq)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3F3F8F] hover:bg-black text-white rounded text-xs font-medium transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Reply Email</span>
                          </button>

                          {inq.phone && (
                            <button
                              type="button"
                              onClick={() => handleReplyContactWhatsApp(inq)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded text-xs font-medium transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteContactInquiry(inq.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors"
                            title="Delete Inquiry"
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
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: NEWSLETTER SUBSCRIBERS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'newsletter' && (
          <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
            {filteredNewsletter.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 space-y-3">
                <Mail className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-800">No Newsletter Subscribers Found</p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  When visitors subscribe to the TANOAH Gazette from the footer or popup, they will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E7E7E7] text-[10px] uppercase font-semibold text-[#888888] tracking-wider">
                    <tr>
                      <th className="p-4">Subscriber Email</th>
                      <th className="p-4">Subscribed Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {filteredNewsletter.map((sub) => {
                      const isActive = sub.is_active !== false;
                      return (
                        <tr key={sub.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="p-4 font-medium text-black">
                            <div className="flex items-center gap-2">
                              <span>{sub.email}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(sub.email, `sub_${sub.id}`)}
                                className="text-neutral-400 hover:text-black p-0.5"
                                title="Copy Email"
                              >
                                {copiedId === `sub_${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="p-4 text-neutral-600 text-[11px]">
                            {sub.subscribed_at ? (
                              new Date(sub.subscribed_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            ) : (
                              'Direct Signup'
                            )}
                          </td>

                          <td className="p-4">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px]">
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleNewsletterActive(sub)}
                                className="px-2.5 py-1 border border-[#E7E7E7] hover:border-black rounded text-[11px] font-medium bg-white hover:bg-neutral-50 transition-colors"
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteNewsletter(sub.id)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors"
                                title="Delete Subscriber"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
