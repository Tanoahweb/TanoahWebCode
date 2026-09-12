import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  ArrowRight,
  Filter,
  Search,
  Truck,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Tag,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { ReturnAddressConfig } from '../../types';

interface ReturnTicket {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  return_type?: string;
  reason: string;
  customer_description?: string;
  product_title: string;
  variant_info: string;
  status:
    | 'awaiting_video'
    | 'video_submitted'
    | 'claim_approved'
    | 'in_transit'
    | 'item_received'
    | 'completed'
    | 'rejected'
    | 'requested'
    | 'approved';
  delivered_at?: string;
  hours_since_delivery?: number;
  tag_intact_confirmed?: boolean;
  unboxing_video_confirmed?: boolean;
  video_submitted?: boolean;
  video_submitted_at?: string;
  self_ship_confirmed?: boolean;
  customer_courier_name?: string;
  customer_consignment_no?: string;
  created_at: string;
}

export const ReturnsQueuePage: React.FC = () => {
  const { addToast } = useUIStore();
  const [tickets, setTickets] = useState<ReturnTicket[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tagInspectionModal, setTagInspectionModal] = useState<ReturnTicket | null>(null);

  // Return Address Management
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [returnAddress, setReturnAddress] = useState<ReturnAddressConfig>({
    hub_name: 'TANOAH RETURNS HUB',
    recipient_name: 'Tanoah',
    address_line1: 'Rappal, Pudukkad P O',
    city: 'Thrissur',
    state: 'Kerala',
    postal_code: '680301',
    contact_phone: '+91 8714141849',
    instructions: 'Important: Do not remove or damage the price tag. Any parcel received with a missing or detached tag is strictly ineligible for refund.',
  });

  const loadTickets = async () => {
    const live = await api.getReturnTickets();
    if (live && live.length > 0) {
      setTickets(live);
    }
  };

  useEffect(() => {
    loadTickets();
    api.getStoreSettings().then((s) => {
      if (s?.return_address_config) {
        setReturnAddress(s.return_address_config);
      }
    });
  }, []);

  const handleSaveReturnAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      const success = await api.saveStoreSettings({ return_address_config: returnAddress });
      if (success) {
        addToast({
          type: 'success',
          title: 'Return Address Saved',
          description: 'Customer self-shipment return address updated successfully.',
        });
        setIsEditingAddress(false);
      } else {
        throw new Error('Database save failed');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not update return address.',
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus as any } : t))
    );

    await api.updateReturnTicketStatus(ticketId, newStatus);

    addToast({
      type: 'success',
      title: 'Status Updated',
      description: `Claim ticket status updated to ${newStatus.replace('_', ' ').toUpperCase()}.`,
    });
  };

  const filteredTickets = tickets.filter((t) => {
    const status = t.status || 'awaiting_video';
    let matchesTab = true;
    if (activeTab === 'awaiting_video') {
      matchesTab = status === 'awaiting_video' || status === 'requested';
    } else if (activeTab === 'video_submitted') {
      matchesTab = status === 'video_submitted';
    } else if (activeTab === 'claim_approved') {
      matchesTab = status === 'claim_approved' || status === 'approved';
    } else if (activeTab === 'in_transit') {
      matchesTab = status === 'in_transit';
    } else if (activeTab === 'item_received') {
      matchesTab = status === 'item_received';
    } else if (activeTab === 'completed') {
      matchesTab = status === 'completed';
    } else if (activeTab === 'rejected') {
      matchesTab = status === 'rejected';
    }

    const matchesSearch =
      t.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_phone && t.customer_phone.includes(searchTerm)) ||
      (t.customer_consignment_no && t.customer_consignment_no.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_video':
      case 'requested':
        return <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Awaiting 360° Video</span>;
      case 'video_submitted':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Video Under Review
          </span>
        );
      case 'claim_approved':
      case 'approved':
        return <span className="bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Approved · Awaiting Dispatch</span>;
      case 'in_transit':
        return <span className="bg-sky-100 text-sky-900 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">In Transit by Client</span>;
      case 'item_received':
        return <span className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Parcel Received · 7D Refund SLA</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Refund Processed ✓</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-900 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Claim Rejected ✕</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 space-y-6 text-left font-poppins">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E7E7E7]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
                RETURNS & CLAIMS DISPATCH
              </span>
            </div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black mt-1">
              DAMAGE & REFUND CLAIMS QUEUE
            </h1>
            <p className="text-xs text-[#666666] mt-1">
              Enforcing the 24-hour reporting SLA, 360° unboxing video verification, intact price tag inspection, and 7-day refund fulfillment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingAddress(true)}
              className="text-xs font-semibold flex items-center gap-1.5 border-[#3F3F8F] text-[#3F3F8F] hover:bg-[#EEEEF8]"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Edit Return Address</span>
            </Button>
            <Link
              to="/pages/refund-policy"
              target="_blank"
              className="text-xs font-semibold text-[#3F3F8F] hover:underline flex items-center gap-1 bg-[#EEEEF8] px-3 py-1.5 rounded"
            >
              <span>View Store Policy</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Policy Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-[#E7E7E7] p-4 rounded-[4px] shadow-xs text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-black block">Strict 24-Hour SLA</span>
              <span className="text-[11px] text-[#666666]">Claims permitted only within 24h of delivery</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-black block">Mandatory 360° Video</span>
              <span className="text-[11px] text-[#666666]">Unopened parcel & damage verified via WhatsApp</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-black block">Intact Tag & 7-Day Refund</span>
              <span className="text-[11px] text-[#666666]">Refund void if tag removed; 7-day post-receipt SLA</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Claims' },
              { id: 'awaiting_video', label: 'Awaiting Video' },
              { id: 'video_submitted', label: 'Video Under Review' },
              { id: 'claim_approved', label: 'Awaiting Dispatch' },
              { id: 'in_transit', label: 'In Transit' },
              { id: 'item_received', label: 'Received (Inspect Tag)' },
              { id: 'completed', label: 'Refunded' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#3F3F8F] text-white'
                    : 'bg-[#F8F8F8] text-[#666666] hover:bg-[#EEEEF8] hover:text-[#3F3F8F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search by order #, client, phone, or tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[850px]">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Order Ref & Client</th>
                  <th className="p-4">24h SLA & Verification</th>
                  <th className="p-4">Garment & Defect</th>
                  <th className="p-4">Customer Self-Shipment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Support Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-neutral-500">
                      No claims found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const cleanPhone = (t.customer_phone || '').replace(/\D/g, '');
                    const whatsAppMsg = `Hello ${t.customer_name}, this is Tanoah Client Services regarding your Damage Claim for Order #${t.order_number}.`;
                    const whatsAppChatUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsAppMsg)}` : null;

                    return (
                      <tr key={t.id} className="hover:bg-[#FAFAFA] text-xs">
                        {/* 1. Order Ref & Client */}
                        <td className="p-4">
                          <Link to={`/admin/orders/${t.order_number}`} className="font-mono font-bold text-[#3F3F8F] hover:underline block">
                            {t.order_number}
                          </Link>
                          <div className="font-semibold text-black mt-0.5">{t.customer_name}</div>
                          <div className="text-[10px] text-[#888888]">{t.customer_email}</div>
                          {t.customer_phone && (
                            <div className="text-[10px] text-[#555555] font-mono mt-0.5 flex items-center gap-1">
                              <span>{t.customer_phone}</span>
                              {whatsAppChatUrl && (
                                <a
                                  href={whatsAppChatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#25D366] hover:underline font-bold"
                                  title="Chat on WhatsApp"
                                >
                                  [WA ↗]
                                </a>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. 24h SLA & Verification */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Within 24h SLA</span>
                            </span>
                            <div className="text-[10px] text-neutral-600">
                              Reported: {t.hours_since_delivery ? `${t.hours_since_delivery.toFixed(1)}h post-delivery` : 'Within 24h'}
                            </div>
                            <div className="text-[10px] text-[#444444]">
                              Tag Intact Attested: <strong className="text-black">Yes</strong>
                            </div>
                          </div>
                        </td>

                        {/* 3. Garment & Defect */}
                        <td className="p-4 max-w-xs">
                          <div className="font-semibold text-black">{t.product_title}</div>
                          <div className="text-[11px] text-[#666666]">{t.variant_info}</div>
                          <div className="text-[10px] text-red-700 font-semibold mt-1">Reason: {t.reason}</div>
                          {t.customer_description && (
                            <p className="text-[10px] text-[#666666] italic mt-0.5 line-clamp-2">
                              "{t.customer_description}"
                            </p>
                          )}
                        </td>

                        {/* 4. Customer Self-Shipment */}
                        <td className="p-4">
                          {t.customer_consignment_no ? (
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded block w-fit">
                                {t.customer_courier_name || 'Courier'}
                              </span>
                              <div className="font-mono text-xs font-semibold text-black">
                                {t.customer_consignment_no}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">
                              Awaiting dispatch details
                            </span>
                          )}
                        </td>

                        {/* 5. Status Badge */}
                        <td className="p-4">
                          {getStatusBadge(t.status)}
                        </td>

                        {/* 6. Support Actions */}
                        <td className="p-4 text-right space-y-1.5">
                          {/* Video Under Review / Awaiting Video */}
                          {(t.status === 'video_submitted' || t.status === 'awaiting_video' || t.status === 'requested') && (
                            <div className="flex flex-col items-end gap-1.5">
                              {whatsAppChatUrl && (
                                <a
                                  href={whatsAppChatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded text-[10px] font-semibold tracking-wider uppercase shadow-xs"
                                >
                                  <MessageCircle className="w-3 h-3 fill-current" />
                                  <span>REVIEW ON WHATSAPP</span>
                                </a>
                              )}
                              <div className="flex gap-1">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(t.id, 'claim_approved')}
                                  className="text-[10px] py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800 font-semibold"
                                >
                                  VERIFY & APPROVE VIDEO
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(t.id, 'rejected')}
                                  className="text-[10px] py-1 px-2 text-red-600 hover:text-red-700"
                                >
                                  REJECT
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Claim Approved / Awaiting Client Dispatch */}
                          {(t.status === 'claim_approved' || t.status === 'approved') && (
                            <div className="text-right">
                              <span className="text-[10px] text-neutral-500 italic block">
                                Awaiting customer parcel dispatch & tracking
                              </span>
                            </div>
                          )}

                          {/* In Transit - Customer Entered Courier Tracking */}
                          {t.status === 'in_transit' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTagInspectionModal(t)}
                              className="text-[10px] py-1 px-2.5 border-[#3F3F8F] text-[#3F3F8F] hover:bg-[#EEEEF8] font-medium"
                            >
                              VERIFY TAG & RECEIVE
                            </Button>
                          )}

                          {/* Item Received (7-Day SLA active) */}
                          {t.status === 'item_received' && (
                            <div className="space-y-1 text-right">
                              <div className="text-[10px] text-purple-800 font-semibold flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3 text-purple-600" />
                                <span>7-Day Refund Timer Active</span>
                              </div>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleUpdateStatus(t.id, 'completed')}
                                className="text-[10px] py-1 px-3 bg-emerald-700 hover:bg-emerald-800"
                              >
                                PROCESS REFUND
                              </Button>
                            </div>
                          )}

                          {/* Completed */}
                          {t.status === 'completed' && (
                            <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Refund Completed
                            </span>
                          )}

                          {/* Rejected */}
                          {t.status === 'rejected' && (
                            <span className="text-[11px] text-red-600 font-semibold inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Claim Voided
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tag Inspection Verification Modal */}
        {tagInspectionModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-[4px] p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center gap-2 text-black font-semibold text-sm uppercase">
                <Tag className="w-4 h-4 text-[#3F3F8F]" />
                <span>Physical Warehouse Tag Inspection</span>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                Order <strong>{tagInspectionModal.order_number}</strong> ({tagInspectionModal.product_title}).
                <br />
                As per policy: <em>"No refund will be initiated if the price tag is removed or damaged."</em>
              </p>
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs space-y-1">
                <p className="font-semibold">Inspection Checklist:</p>
                <p>• Is the original brand price tag fully attached and unclipped?</p>
                <p>• Does the defect match the 360° unboxing video provided?</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleUpdateStatus(tagInspectionModal.id, 'rejected');
                    setTagInspectionModal(null);
                  }}
                  className="text-red-600 hover:text-red-700 text-xs"
                >
                  TAG MISSING · REJECT REFUND
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleUpdateStatus(tagInspectionModal.id, 'item_received');
                    setTagInspectionModal(null);
                  }}
                  className="text-xs bg-emerald-700 hover:bg-emerald-800"
                >
                  TAG VERIFIED INTACT · ACCEPT
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Self-Shipment Return Address Modal */}
        <Modal
          isOpen={isEditingAddress}
          onClose={() => setIsEditingAddress(false)}
          title="Edit Customer Self-Shipment Return Address"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveReturnAddress} className="space-y-4 text-left font-poppins text-xs">
            <p className="text-[#666666] leading-relaxed">
              This address is displayed to customers on Step 3 of the Return Request Portal so they know where to self-ship their parcel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Return Hub Title *
                </label>
                <input
                  required
                  type="text"
                  value={returnAddress.hub_name}
                  onChange={(e) => setReturnAddress({ ...returnAddress, hub_name: e.target.value })}
                  placeholder="e.g. TANOAH RETURNS HUB"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Recipient / Business Name *
                </label>
                <input
                  required
                  type="text"
                  value={returnAddress.recipient_name}
                  onChange={(e) => setReturnAddress({ ...returnAddress, recipient_name: e.target.value })}
                  placeholder="e.g. Tanoah"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Address Line (Building, Street, Landmark) *
              </label>
              <input
                required
                type="text"
                value={returnAddress.address_line1}
                onChange={(e) => setReturnAddress({ ...returnAddress, address_line1: e.target.value })}
                placeholder="e.g. Rappal, Pudukkad P O"
                className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  City / District *
                </label>
                <input
                  required
                  type="text"
                  value={returnAddress.city}
                  onChange={(e) => setReturnAddress({ ...returnAddress, city: e.target.value })}
                  placeholder="e.g. Thrissur"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  State *
                </label>
                <input
                  required
                  type="text"
                  value={returnAddress.state}
                  onChange={(e) => setReturnAddress({ ...returnAddress, state: e.target.value })}
                  placeholder="e.g. Kerala"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  PIN Code *
                </label>
                <input
                  required
                  type="text"
                  value={returnAddress.postal_code}
                  onChange={(e) => setReturnAddress({ ...returnAddress, postal_code: e.target.value })}
                  placeholder="e.g. 680301"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Contact Phone / WhatsApp *
              </label>
              <input
                required
                type="text"
                value={returnAddress.contact_phone}
                onChange={(e) => setReturnAddress({ ...returnAddress, contact_phone: e.target.value })}
                placeholder="e.g. +91 8714141849"
                className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Policy & Tag Instructions (Customer Notice)
              </label>
              <textarea
                rows={2}
                value={returnAddress.instructions || ''}
                onChange={(e) => setReturnAddress({ ...returnAddress, instructions: e.target.value })}
                placeholder="e.g. Important: Do not remove or damage the price tag. Any parcel received with a missing or detached tag is strictly ineligible for refund."
                className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <div className="pt-3 border-t border-[#E7E7E7] flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingAddress(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingAddress}
              >
                Save Return Address
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};
