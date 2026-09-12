import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Truck,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Package,
  Clock,
  MessageCircle,
  XCircle,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

const INDIA_POST_TRACKING_URL =
  'https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/trackconsignment.aspx';
const WHATSAPP_SUPPORT_NUMBER = '918714141849';

const STEPS = [
  { key: 'placed', label: 'Order Placed & Confirmed', desc: 'Order verified & entered into atelier schedule' },
  { key: 'processing', label: 'Handcrafted & Packaged', desc: 'Garments tailored, inspected, and packaged in luxury box' },
  { key: 'shipped', label: 'Dispatched via India Post', desc: 'Handed over to India Post (Speed Post / Parcel)' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Local India Post postman out for delivery to your address' },
  { key: 'delivered', label: 'Delivered', desc: 'Signed and safely handed over to client' },
];

export const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialOrder = searchParams.get('order') || '';
  const initialContact =
    searchParams.get('contact') ||
    searchParams.get('email') ||
    searchParams.get('phone') ||
    '';

  const [orderQuery, setOrderQuery] = useState(initialOrder);
  const [contactQuery, setContactQuery] = useState(initialContact);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [multipleOrders, setMultipleOrders] = useState<any[] | null>(null);
  const [notFoundInfo, setNotFoundInfo] = useState<{ query?: string; message?: string } | null>(null);
  const [verificationFailedInfo, setVerificationFailedInfo] = useState<{
    orderNumber?: string;
    contact?: string;
    message?: string;
  } | null>(null);
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);

  const formatTrackingData = (order: any, verified?: boolean, matchedContact?: string) => {
    const rawStatus = (order.status || 'confirmed').toLowerCase();
    let step = 0;
    let isCancelled = false;
    let isPendingPayment = false;

    if (rawStatus === 'cancelled') {
      isCancelled = true;
    } else if (rawStatus === 'pending_payment') {
      isPendingPayment = true;
    } else if (rawStatus === 'processing' || rawStatus === 'packed') {
      step = 1;
    } else if (rawStatus === 'shipped' || rawStatus === 'in_transit') {
      step = 2;
    } else if (rawStatus === 'out_for_delivery') {
      step = 3;
    } else if (rawStatus === 'delivered') {
      step = 4;
    }

    const isExpress = order.shipping_method?.toLowerCase().includes('express');
    const estDelivery = isExpress
      ? 'Within 1–2 Business Days (Express Priority)'
      : '10–15 Days (India Post Speed Post)';

    return {
      orderNumber: order.order_number || order.orderNumber || 'TANOAH-ORDER',
      rawStatus,
      isCancelled,
      isPendingPayment,
      currentStep: step,
      courier: order.courier_name || 'India Post (Speed Post)',
      trackingId: order.tracking_number || '',
      estimatedDelivery: estDelivery,
      grandTotal: order.grand_total,
      itemsCount: order.items?.length || 1,
      items: order.items || [],
      shippingAddress: order.shipping_address,
      createdAt: order.created_at,
      verified: Boolean(verified),
      matchedContact: matchedContact || '',
    };
  };

  const performLookup = async (orderVal: string, contactVal: string) => {
    const cleanOrder = orderVal.trim();
    const cleanContact = contactVal.trim();

    if (!cleanOrder && !cleanContact) {
      setFormValidationMsg('Please enter an Order / Consignment Barcode OR your registered Email / Mobile number.');
      return;
    }

    setFormValidationMsg(null);
    setIsLoading(true);
    setNotFoundInfo(null);
    setVerificationFailedInfo(null);
    setMultipleOrders(null);
    setTrackingResult(null);

    try {
      const res = await api.trackConsignment({
        orderNumberOrTracking: cleanOrder,
        contact: cleanContact,
      });

      if (res.status === 'found_single' && res.order) {
        setMultipleOrders(null);
        setTrackingResult(formatTrackingData(res.order, res.verified, res.matchedContact));
      } else if (res.status === 'found_multiple' && res.orders) {
        setMultipleOrders(res.orders);
        setTrackingResult(null);
      } else if (res.status === 'verification_failed') {
        setMultipleOrders(null);
        setVerificationFailedInfo({
          orderNumber: cleanOrder,
          contact: cleanContact,
          message: res.errorMessage,
        });
      } else {
        setMultipleOrders(null);
        setNotFoundInfo({
          query: cleanOrder || cleanContact,
          message: res.errorMessage,
        });
      }
    } catch {
      setMultipleOrders(null);
      setNotFoundInfo({
        query: cleanOrder || cleanContact,
        message: 'Could not connect to consignment database. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount if order or contact is in URL
  useEffect(() => {
    if (initialOrder.trim() || initialContact.trim()) {
      setOrderQuery(initialOrder.trim());
      setContactQuery(initialContact.trim());
      performLookup(initialOrder.trim(), initialContact.trim());
    }
  }, [initialOrder, initialContact]);

  const handleCopyTracking = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLookup(orderQuery, contactQuery);
  };

  const handleSelectFromList = (order: any) => {
    setTrackingResult(formatTrackingData(order, true, contactQuery.trim()));
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setTrackingResult(null);
  };

  // WhatsApp support helper
  const openWhatsAppSupport = (refCode?: string) => {
    const text = encodeURIComponent(
      `Hello TANOAH Support, I am inquiring about the consignment status of my order: ${
        refCode || orderQuery || contactQuery || ''
      }`
    );
    window.open(`https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-16 text-left">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Subtitle */}
        <div className="text-center mb-10">
          <span className="text-[11px] text-[#3F3F8F] font-semibold tracking-widest uppercase block mb-1">
            ORDER TRACKING & LOGISTICS
          </span>
          <h1 className="font-wondra text-3xl sm:text-4xl text-black">
            TRACK YOUR CONSIGNMENT
          </h1>
          <p className="text-xs text-[#666666] mt-2 max-w-lg mx-auto leading-relaxed">
            Track live dispatch scans, view handcraft milestones, or inspect your India Post Speed Post consignment status.
          </p>
        </div>

        {/* Tracking Search Form: "This or That" */}
        <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm mb-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
              {/* Option 1: Order / Consignment No. */}
              <div className="md:col-span-5">
                <label className="block text-[11px] font-semibold text-black uppercase mb-1.5 flex items-center justify-between">
                  <span>Order or Consignment No.</span>
                  <span className="text-[10px] font-normal text-neutral-400">TAN-XXXXXX / ED...IN</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="E.g., TAN-752278 or ED849201948IN"
                    value={orderQuery}
                    onChange={(e) => {
                      setOrderQuery(e.target.value);
                      setFormValidationMsg(null);
                    }}
                    className="w-full pl-3.5 pr-8 py-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] uppercase font-mono tracking-wider shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Visual "OR" Divider */}
              <div className="md:col-span-1 flex items-center justify-center my-1 md:my-0 md:pt-5">
                <div className="w-full border-t border-[#E7E7E7] md:hidden"></div>
                <span className="px-2.5 py-0.5 bg-[#FAF9F6] border border-[#E7E7E7] rounded-full text-[10px] font-bold text-[#3F3F8F] uppercase tracking-wider shrink-0">
                  OR
                </span>
                <div className="w-full border-t border-[#E7E7E7] md:hidden"></div>
              </div>

              {/* Option 2: Email or Mobile Verification Input */}
              <div className="md:col-span-5">
                <label className="block text-[11px] font-semibold text-black uppercase mb-1.5 flex items-center justify-between">
                  <span>Email or Mobile Number</span>
                  <span className="text-[10px] font-normal text-neutral-400">Verification</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="E.g., client@example.com or 9876543210"
                    value={contactQuery}
                    onChange={(e) => {
                      setContactQuery(e.target.value);
                      setFormValidationMsg(null);
                    }}
                    className="w-full pl-3.5 pr-8 py-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] font-sans tracking-normal shadow-2xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {formValidationMsg && (
              <p className="text-[11px] text-rose-600 font-medium">
                {formValidationMsg}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F2F2F2]">
              <p className="text-[10px] text-[#888888] leading-relaxed">
                Track using either your <strong>Order / Consignment Barcode</strong> or your registered <strong>Email / Mobile</strong>. Provide both for authenticated verification.
              </p>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isLoading}
                icon={<Search className="w-4 h-4" />}
                className="w-full sm:w-auto px-7 py-3 tracking-wider font-semibold text-xs uppercase shadow-sm shrink-0"
              >
                LOCATE CONSIGNMENT
              </Button>
            </div>
          </form>
        </div>

        {/* Verification Failed State */}
        {verificationFailedInfo && (
          <div className="bg-white p-6 sm:p-8 border border-rose-200 rounded-[4px] shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                    Security Verification Failed
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-black">
                  Contact Details Do Not Match Order {verificationFailedInfo.orderNumber}
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  {verificationFailedInfo.message || `The order reference was located in our system, but the provided email or mobile does not match the contact details registered for this consignment.`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#FAFAFA] rounded-[4px] border border-[#E7E7E7] text-xs space-y-2">
              <div className="font-semibold text-neutral-800">Troubleshooting Steps:</div>
              <ul className="list-disc pl-5 text-[11px] text-[#666666] space-y-1">
                <li>Verify you entered the same email address or mobile number used during checkout.</li>
                <li>You can clear the Email/Mobile field to track using your Order ID / Consignment Barcode only.</li>
                <li>If you recently updated your phone or email, our customer care team can assist with instant verification.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setContactQuery('');
                  setVerificationFailedInfo(null);
                  performLookup(orderQuery, '');
                }}
                className="text-xs text-[#3F3F8F] hover:underline font-semibold"
              >
                Track with Order Reference only →
              </button>

              <button
                type="button"
                onClick={() => openWhatsAppSupport(verificationFailedInfo.orderNumber)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[4px] text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Contact Customer Care on WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Order Not Found State */}
        {notFoundInfo && (
          <div className="bg-white p-6 sm:p-8 border border-amber-200 rounded-[4px] shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-sm text-black">
                  No Consignment Found for &ldquo;{notFoundInfo.query}&rdquo;
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  {notFoundInfo.message || `We could not locate an active shipment matching this reference code. Please verify the order number from your email confirmation receipt or SMS.`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#FAFAFA] rounded-[4px] border border-[#E7E7E7] text-xs space-y-2">
              <div className="font-semibold text-neutral-800">Helpful Suggestions:</div>
              <ul className="list-disc pl-5 text-[11px] text-[#666666] space-y-1">
                <li>Check for typos in the reference (e.g. ensure format is <code className="font-mono text-black">TAN-XXXXXX</code>).</li>
                <li>If tracking by mobile, ensure you provide your 10-digit Indian mobile number.</li>
                <li>If you just completed checkout, please allow up to 5 minutes for payment gateway synchronization.</li>
                <li>If your parcel has been dispatched, you can also search using the 13-digit India Post barcode.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => openWhatsAppSupport(notFoundInfo.query)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[4px] text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Contact Customer Care on WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Multiple Orders Found View */}
        {multipleOrders && !trackingResult && (
          <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E7E7E7] gap-3">
              <div>
                <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-wider uppercase block">
                  Multiple Consignments Located
                </span>
                <h3 className="text-base font-bold text-black">
                  Consignments Linked to &ldquo;{contactQuery}&rdquo;
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  We found {multipleOrders.length} orders registered under this contact. Select any consignment below to view live transit scans.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-[#EEEEF8] text-[#3F3F8F] text-xs font-semibold rounded shrink-0 self-start sm:self-center">
                {multipleOrders.length} Consignments
              </span>
            </div>

            <div className="space-y-3">
              {multipleOrders.map((ord) => {
                const ordNum = ord.order_number || ord.orderNumber || 'TAN-ORDER';
                const status = (ord.status || 'confirmed').replace('_', ' ');
                const isDispatched = ord.tracking_number || ord.trackingNumber;

                return (
                  <div
                    key={ord.id || ordNum}
                    className="p-4 rounded-[4px] border border-[#E7E7E7] hover:border-[#3F3F8F] bg-[#FAFAFA] hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-black">
                          {ordNum}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#EEEEF8] text-[#3F3F8F]">
                          {status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#666666] flex flex-wrap items-center gap-x-4 gap-y-1">
                        {ord.created_at && (
                          <span>
                            Date: {new Date(ord.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        <span>
                          Total: ₹{Number(ord.grand_total || ord.total || 0).toLocaleString('en-IN')}
                        </span>
                        {isDispatched && (
                          <span className="font-mono font-semibold text-[#3F3F8F]">
                            Speed Post: {isDispatched}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectFromList(ord)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#3F3F8F] hover:bg-black text-white text-xs font-semibold rounded-[4px] transition-colors shrink-0"
                    >
                      <span>Track Consignment</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestone Tracker Result */}
        {trackingResult && (
          <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-200 text-left">
            {/* Back Button if viewed from multiple orders */}
            {multipleOrders && multipleOrders.length > 1 && (
              <div className="pb-4 border-b border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 text-xs text-[#3F3F8F] hover:underline font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to all {multipleOrders.length} consignments for &ldquo;{contactQuery}&rdquo;</span>
                </button>
              </div>
            )}

            {/* Header / Order Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E7E7E7] gap-3">
              <div>
                <span className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Tracking Consignment</span>
                <h3 className="font-mono text-xl font-bold text-black">{trackingResult.orderNumber}</h3>
                {trackingResult.createdAt && (
                  <span className="text-[11px] text-[#666666] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    Ordered on {new Date(trackingResult.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {trackingResult.verified && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[11px] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Consignment {trackingResult.matchedContact ? `(${trackingResult.matchedContact})` : ''}</span>
                  </div>
                )}
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Carrier & Consignment No.</span>
                <p className="text-xs font-semibold text-[#3F3F8F]">
                  {trackingResult.courier}{' '}
                  {trackingResult.trackingId ? (
                    <span className="font-mono font-bold ml-1 text-black bg-[#EEEEF8] px-2 py-0.5 rounded">
                      {trackingResult.trackingId}
                    </span>
                  ) : (
                    <span className="italic text-neutral-500 font-normal ml-1">
                      (Awaiting Consignment Dispatch)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Special Case: Cancelled Order */}
            {trackingResult.isCancelled && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-[4px] flex items-start gap-3 text-rose-900">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-sm text-rose-950">Consignment Cancelled</div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    This order was marked as cancelled. Any processed refund has been returned to your original payment method.
                    If you believe this is an error, please reach out to our customer care team.
                  </p>
                  <button
                    type="button"
                    onClick={() => openWhatsAppSupport(trackingResult.orderNumber)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-900 underline hover:text-black"
                  >
                    <span>Contact Customer Care regarding cancellation</span>
                  </button>
                </div>
              </div>
            )}

            {/* Special Case: Pending Payment */}
            {trackingResult.isPendingPayment && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[4px] flex items-start gap-3 text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-sm text-amber-950">Awaiting Payment Confirmation</div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Payment verification is pending for this order. Once confirmation is received from Razorpay/Cashfree,
                    our master artisans will begin preparing your garments.
                  </p>
                </div>
              </div>
            )}

            {/* Active Milestone Stepper */}
            {!trackingResult.isCancelled && (
              <div className="relative pl-6 space-y-8 border-l-2 border-[#D5D5ED] ml-4">
                {STEPS.map((step, idx) => {
                  const isPassed = idx <= trackingResult.currentStep;
                  const isCurrent = idx === trackingResult.currentStep;

                  return (
                    <div key={step.key} className="relative group">
                      <div
                        className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                          isPassed
                            ? 'bg-[#3F3F8F] text-white shadow-md'
                            : 'bg-white border-2 border-[#D5D5ED] text-[#888888]'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-semibold uppercase tracking-wider ${
                              isCurrent
                                ? 'text-[#3F3F8F]'
                                : isPassed
                                ? 'text-black'
                                : 'text-[#888888]'
                            }`}
                          >
                            {step.label}
                          </h4>
                          {isCurrent && (
                            <span className="text-[9px] bg-[#EEEEF8] text-[#3F3F8F] px-2 py-0.5 rounded font-bold">
                              CURRENT STATUS
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#666666] mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* India Post Official Direct Tracking Portal Card */}
            <div className="bg-[#FAF9F6] p-5 sm:p-6 rounded-[4px] border border-[#3F3F8F]/25 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-[#3F3F8F] uppercase tracking-wider block mb-0.5">
                    Official India Post Track &lsquo;N Trace
                  </span>
                  <h4 className="font-semibold text-black text-sm">Direct Dispatch Scan Verification</h4>
                </div>
                <a
                  href={INDIA_POST_TRACKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3F3F8F] hover:bg-black text-white rounded-[4px] font-semibold text-xs tracking-wider transition-colors shadow-sm shrink-0"
                >
                  <span>OPEN INDIAPOST PORTAL</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-[11px] text-[#666666] leading-relaxed">
                TANOAH packages are dispatched securely through India Post (Speed Post / Insured Parcel).
                Once handed over, real-time transit scans are published directly to the Department of Posts national server.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-[#E7E7E7] rounded-[4px]">
                <div>
                  <span className="text-[10px] text-[#888888] uppercase block font-semibold">
                    India Post Consignment Barcode No.
                  </span>
                  <span
                    className={`font-mono text-sm tracking-wider ${
                      trackingResult.trackingId
                        ? 'font-bold text-black'
                        : 'text-[#888888] italic'
                    }`}
                  >
                    {trackingResult.trackingId || 'Consignment number will be assigned upon dispatch'}
                  </span>
                </div>

                {trackingResult.trackingId ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyTracking(trackingResult.trackingId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E7E7E7] hover:border-black rounded-[4px] text-xs font-semibold text-black bg-[#FAFAFA] hover:bg-white transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#3F3F8F]" />
                          <span>Copy Barcode</span>
                        </>
                      )}
                    </button>

                    <a
                      href={INDIA_POST_TRACKING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3F3F8F] text-white hover:bg-black rounded-[4px] text-xs font-semibold transition-colors"
                    >
                      <span>Track Now</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#3F3F8F] font-semibold bg-[#EEEEF8] px-2.5 py-1 rounded-[2px]">
                    Atelier Preparation in Progress
                  </span>
                )}
              </div>
            </div>

            {/* Estimated Delivery & Security Notice (Hidden once delivered) */}
            <div
              className={`grid grid-cols-1 ${
                trackingResult.rawStatus !== 'delivered' && trackingResult.shippingAddress
                  ? 'sm:grid-cols-2'
                  : ''
              } gap-4`}
            >
              {trackingResult.rawStatus !== 'delivered' && (
                <div className="p-4 bg-[#EEEEF8] rounded-[4px] border border-[#3F3F8F]/20 flex items-center gap-3 text-xs">
                  <Truck className="w-5 h-5 text-[#3F3F8F] shrink-0" />
                  <div>
                    <strong className="text-black block">
                      Estimated Delivery: {trackingResult.estimatedDelivery}
                    </strong>
                    <span className="text-[#666666] text-[11px]">
                      Insured postal transit with OTP / signature verification upon delivery.
                    </span>
                  </div>
                </div>
              )}

              {trackingResult.shippingAddress && (
                <div className="p-4 bg-white rounded-[4px] border border-[#E7E7E7] flex items-center gap-3 text-xs">
                  <MapPin className="w-5 h-5 text-neutral-400 shrink-0" />
                  <div className="truncate">
                    <strong className="text-black block truncate">
                      Destination: {trackingResult.shippingAddress.city || 'India'},{' '}
                      {trackingResult.shippingAddress.state || ''}
                    </strong>
                    <span className="text-[#666666] text-[11px] font-mono">
                      PIN: {trackingResult.shippingAddress.postal_code || trackingResult.shippingAddress.postalCode || 'Protected'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Delivered Status: Return & Damage Claim Option */}
            {trackingResult.rawStatus === 'delivered' && (
              <div className="p-4 bg-white border border-[#E7E7E7] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-black block font-medium">Delivered by India Post</strong>
                    <span className="text-[#666666] text-[11px]">
                      Need to report transit damage or initiate a return request within the 24-hour window?
                    </span>
                  </div>
                </div>
                <Link
                  to={`/return-request?order=${encodeURIComponent(trackingResult.orderNumber)}`}
                  className="inline-flex items-center justify-center gap-1 px-3.5 py-2 bg-[#3F3F8F] hover:bg-black text-white font-semibold text-xs rounded-[4px] transition-colors shrink-0"
                >
                  <span>Return Request</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Customer Support Bar */}
            <div className="pt-4 border-t border-[#E7E7E7] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#666666]">
                Need immediate assistance or special delivery instructions?
              </span>
              <button
                type="button"
                onClick={() => openWhatsAppSupport(trackingResult.orderNumber)}
                className="inline-flex items-center gap-1.5 text-[#3F3F8F] hover:underline font-semibold"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Chat with TANOAH Support</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
