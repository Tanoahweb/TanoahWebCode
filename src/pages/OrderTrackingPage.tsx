import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

const INDIA_POST_TRACKING_URL =
  'https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/trackconsignment.aspx';
const WHATSAPP_CONCIERGE_NUMBER = '918714141849';

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

  const [orderQuery, setOrderQuery] = useState(initialOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);

  const performLookup = async (queryStr: string) => {
    const clean = queryStr.trim();
    if (!clean) return;

    setIsLoading(true);
    setNotFoundQuery(null);

    try {
      const order = await api.getOrderByNumber(clean);
      if (order) {
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
          : 'Within 2–4 Business Days (India Post Speed Post)';

        setTrackingResult({
          orderNumber: order.order_number || order.orderNumber || clean.toUpperCase(),
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
        });
        setNotFoundQuery(null);
      } else {
        setTrackingResult(null);
        setNotFoundQuery(clean);
      }
    } catch {
      setTrackingResult(null);
      setNotFoundQuery(clean);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount when ?order= is present in URL
  useEffect(() => {
    if (initialOrder.trim()) {
      setOrderQuery(initialOrder.trim());
      performLookup(initialOrder.trim());
    }
  }, [initialOrder]);

  const handleCopyTracking = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;
    await performLookup(orderQuery);
  };

  // WhatsApp concierge helper
  const openWhatsAppSupport = (refCode?: string) => {
    const text = encodeURIComponent(
      `Hello TANOAH Concierge, I am inquiring about the consignment status of my order: ${
        refCode || orderQuery || ''
      }`
    );
    window.open(`https://wa.me/${WHATSAPP_CONCIERGE_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-16 text-left">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Luxury Subtitle */}
        <div className="text-center mb-10">
          <span className="text-[11px] text-[#3F3F8F] font-semibold tracking-widest uppercase block mb-1">
            CONCIERGE TRACKING & LOGISTICS
          </span>
          <h1 className="font-wondra text-3xl sm:text-4xl text-black">
            TRACK YOUR CONSIGNMENT
          </h1>
          <p className="text-xs text-[#666666] mt-2 max-w-lg mx-auto leading-relaxed">
            Track live dispatch scans, view handcraft milestones, or inspect your India Post Speed Post consignment status.
          </p>
        </div>

        {/* Tracking Search Form */}
        <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm mb-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1.5">
                Order Number or India Post Consignment Number *
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="E.g., TAN-752278 or ED849201948IN"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] uppercase font-mono tracking-wider shadow-2xs"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[10px] text-[#888888] mt-1.5">
                You can search with either your 6-digit TANOAH Order Reference (<code className="font-mono text-black">TAN-XXXXXX</code>) or your Speed Post consignment barcode.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
              icon={<Search className="w-4 h-4" />}
              className="w-full py-3.5 tracking-wider font-semibold text-xs uppercase shadow-sm"
            >
              LOCATE CONSIGNMENT
            </Button>
          </form>
        </div>

        {/* Order Not Found State */}
        {notFoundQuery && (
          <div className="bg-white p-6 sm:p-8 border border-amber-200 rounded-[4px] shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-sm text-black">
                  No Consignment Found for &ldquo;{notFoundQuery}&rdquo;
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  We could not locate an active shipment matching this reference code. Please verify the order number from your email confirmation receipt or SMS.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#FAFAFA] rounded-[4px] border border-[#E7E7E7] text-xs space-y-2">
              <div className="font-semibold text-neutral-800">Helpful Suggestions:</div>
              <ul className="list-disc pl-5 text-[11px] text-[#666666] space-y-1">
                <li>Check for typos in the reference (e.g. ensure format is <code className="font-mono text-black">TAN-XXXXXX</code>).</li>
                <li>If you just completed checkout, please allow up to 5 minutes for payment gateway synchronization.</li>
                <li>If your parcel has been dispatched, you can also search using the 13-digit India Post barcode.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => openWhatsAppSupport(notFoundQuery)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[4px] text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Ask Concierge on WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Milestone Tracker Result */}
        {trackingResult && (
          <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-8 animate-in fade-in duration-200 text-left">
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
                    If you believe this is an error, please reach out to our concierge.
                  </p>
                  <button
                    type="button"
                    onClick={() => openWhatsAppSupport(trackingResult.orderNumber)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-900 underline hover:text-black"
                  >
                    <span>Contact Concierge regarding cancellation</span>
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

            {/* Estimated Delivery & Security Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Support Concierge Bar */}
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
                <span>Chat with TANOAH Concierge</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
