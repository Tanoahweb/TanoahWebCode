import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  MessageCircle,
  Truck,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { ReturnAddressConfig } from '../../types';

export const ReturnsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialOrder = searchParams.get('order') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [customerContact, setCustomerContact] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [hoursSinceDelivery, setHoursSinceDelivery] = useState<number | null>(null);

  // Claim form state
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [damageReason, setDamageReason] = useState('Damaged in Transit / Crushed Box');
  const [damageDescription, setDamageDescription] = useState('');
  const [confirmedVideo, setConfirmedVideo] = useState(false);
  const [confirmedTag, setConfirmedTag] = useState(false);
  const [confirmedSelfShip, setConfirmedSelfShip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-submission state
  const [submittedTicket, setSubmittedTicket] = useState<any | null>(null);
  const [returnStep, setReturnStep] = useState<'send_video' | 'shipment_tracking'>('send_video');
  const [isMarkingVideo, setIsMarkingVideo] = useState(false);
  const [courierName, setCourierName] = useState('');
  const [consignmentNo, setConsignmentNo] = useState('');
  const [isSavingConsignment, setIsSavingConsignment] = useState(false);
  const [consignmentSaved, setConsignmentSaved] = useState(false);

  // Store settings (for WhatsApp and return address)
  const [storeSettings, setStoreSettings] = useState<any>(null);

  const { addToast } = useUIStore();

  useEffect(() => {
    let isMounted = true;
    api.getStoreSettings().then((s) => {
      if (isMounted && s) setStoreSettings(s);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-verify if order param is in URL
  useEffect(() => {
    if (initialOrder) {
      handleVerifyOrder(initialOrder);
    }
  }, [initialOrder]);

  const handleVerifyOrder = async (orderIdToVerify?: string) => {
    const rawId = (orderIdToVerify || orderNumber).trim();
    if (!rawId) {
      setVerificationError('Please enter your Order Number to check eligibility.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedOrder(null);
    setHoursSinceDelivery(null);

    try {
      // 1. Check if a return ticket already exists for this order
      const existingTicket = await api.getReturnTicketByOrder(rawId);
      if (existingTicket) {
        setSubmittedTicket(existingTicket);

        let order = await api.getOrderByNumber(rawId);
        if (!order && !rawId.toUpperCase().startsWith('TAN-') && /^\d+$/.test(rawId)) {
          order = await api.getOrderByNumber(`TAN-${rawId}`);
        }
        if (order) setVerifiedOrder(order);

        if (existingTicket.customer_consignment_no) {
          setCourierName(existingTicket.customer_courier_name || '');
          setConsignmentNo(existingTicket.customer_consignment_no || '');
          setConsignmentSaved(true);
        }

        if (
          existingTicket.video_submitted ||
          (existingTicket.status && existingTicket.status !== 'awaiting_video' && existingTicket.status !== 'requested')
        ) {
          setReturnStep('shipment_tracking');
        } else {
          setReturnStep('send_video');
        }

        addToast({
          type: 'info',
          title: 'Existing Claim Resumed',
          description: `Found active Claim Ticket #${existingTicket.id} for Order ${existingTicket.order_number}.`,
        });
        return;
      }

      let order = await api.getOrderByNumber(rawId);
      if (!order && !rawId.toUpperCase().startsWith('TAN-') && /^\d+$/.test(rawId)) {
        order = await api.getOrderByNumber(`TAN-${rawId}`);
      }
      if (!order) {
        setVerificationError('Order not found. Please verify the order number from your confirmation email or invoice.');
        return;
      }

      setVerifiedOrder(order);

      // Check delivery status
      const status = (order.status || '').toLowerCase();
      if (status !== 'delivered') {
        setVerificationError(
          `This order is currently "${status.toUpperCase()}". Return claims can only be submitted once the package is marked as Delivered by India Post.`
        );
        return;
      }

      // Check delivery timestamp (fallback to updated_at or created_at if delivered_at missing)
      const deliveryTimeStr = order.delivered_at || order.updated_at || order.created_at;
      const deliveryTimestamp = new Date(deliveryTimeStr).getTime();
      const diffHours = (Date.now() - deliveryTimestamp) / (1000 * 60 * 60);
      setHoursSinceDelivery(diffHours);

      // Pre-fill contact if available
      if (order.shipping_address?.phone || order.guest_email) {
        setCustomerContact(order.shipping_address?.phone || order.guest_email);
      }
    } catch {
      setVerificationError('Unable to verify order at this moment. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVideoSent = async () => {
    if (!submittedTicket) return;
    setIsMarkingVideo(true);
    try {
      await api.markReturnVideoSent(submittedTicket.id);
      setSubmittedTicket((prev: any) => ({
        ...prev,
        video_submitted: true,
        status: prev.status === 'awaiting_video' ? 'claim_approved' : prev.status,
      }));
      setReturnStep('shipment_tracking');
      addToast({
        type: 'success',
        title: 'Video Submission Recorded',
        description: 'You may now proceed with customer self-shipment dispatch.',
      });
    } catch {
      setReturnStep('shipment_tracking');
    } finally {
      setIsMarkingVideo(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedOrder) return;

    if (!confirmedVideo || !confirmedTag || !confirmedSelfShip) {
      addToast({
        type: 'error',
        title: 'Mandatory Policy Requirements',
        description: 'Please acknowledge all three policy conditions to submit your damage claim.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedItem = verifiedOrder.items?.[selectedItemIndex] || {
        product_title: 'Tanoah Garment',
        variant_title: 'Standard',
      };

      const res = await api.submitReturn({
        order_number: verifiedOrder.order_number || verifiedOrder.orderNumber || orderNumber,
        reason: damageReason,
        customer_description: damageDescription,
        customer_name: `${verifiedOrder.shipping_address?.first_name || ''} ${verifiedOrder.shipping_address?.last_name || ''}`.trim() || 'Customer',
        customer_email: verifiedOrder.guest_email || '',
        customer_phone: customerContact || verifiedOrder.shipping_address?.phone || '',
        product_title: selectedItem.product_title || selectedItem.product?.title || 'Tanoah Garment',
        variant_info: selectedItem.variant_title || selectedItem.variant?.size || 'Standard',
        delivered_at: verifiedOrder.delivered_at || verifiedOrder.updated_at,
        hours_since_delivery: hoursSinceDelivery ?? 0,
        tag_intact_confirmed: confirmedTag,
        unboxing_video_confirmed: confirmedVideo,
        self_ship_confirmed: confirmedSelfShip,
        video_submitted_via: 'whatsapp',
      });

      if (res.success && res.ticket) {
        setSubmittedTicket(res.ticket);
        setReturnStep('send_video');
        addToast({
          type: 'success',
          title: 'Claim Ticket Registered',
          description: 'Please now send your 360° unboxing video to our WhatsApp support team.',
        });
      } else {
        throw new Error(res.message || 'Submission failed.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Error',
        description: err.message || 'Unable to register claim. Please contact support.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCustomerConsignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedTicket || !courierName.trim() || !consignmentNo.trim()) return;

    setIsSavingConsignment(true);
    try {
      await api.updateReturnCustomerShipment(submittedTicket.id, courierName, consignmentNo);
      setConsignmentSaved(true);
      addToast({
        type: 'success',
        title: 'Dispatch Details Recorded',
        description: 'Our warehouse team will track and inspect your parcel upon arrival.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error Saving Tracking',
        description: 'Failed to record tracking. Please inform support on WhatsApp.',
      });
    } finally {
      setIsSavingConsignment(false);
    }
  };

  const whatsappNumber =
    storeSettings?.support_phone?.replace(/\D/g, '') ||
    storeSettings?.whatsapp_number?.replace(/\D/g, '') ||
    '918714141849';

  const generateWhatsAppUrl = () => {
    if (!submittedTicket) return `https://wa.me/${whatsappNumber}`;
    const message = `Hello TANOAH Support Team,\n\nI have registered a damage/return claim.\n\n*Ticket ID:* ${submittedTicket.id}\n*Order Number:* ${submittedTicket.order_number}\n*Client Name:* ${submittedTicket.customer_name}\n*Item:* ${submittedTicket.product_title}\n*Reason:* ${submittedTicket.reason}\n\nI am attaching the mandatory 360° unboxing video showing the sealed parcel, shipping label, intact tag, and damaged area.`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const isWindowExpired = hoursSinceDelivery !== null && hoursSinceDelivery > 24;

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase block mb-1">
            CLIENT SERVICES & CLAIMS · GUEST & REGISTERED PATRONS
          </span>
          <h1 className="font-wondra text-3xl sm:text-4xl text-black">
            RETURN & DAMAGE CLAIM PORTAL
          </h1>
          <p className="text-xs text-[#666666] max-w-xl mx-auto mt-2 leading-relaxed">
            Guests and account holders can submit return and damage claims directly with their Order Number. We accept returns and refunds <strong>strictly for transit damage or defective items</strong> reported within <strong>24 hours</strong> of delivery with a mandatory <strong>360° unboxing video</strong>. Size and colour exchanges are not supported.
          </p>
        </div>

        {/* STEP 2 & 3: POST-SUBMISSION TICKET CONFIRMATION & STEPPED ACTIONS */}
        {submittedTicket ? (
          <div className="bg-white border border-[#E7E7E7] rounded-[4px] p-6 sm:p-8 shadow-sm space-y-6 text-left">
            {returnStep === 'send_video' ? (
              <>
                {/* STEP 2: SEND VIDEO NOW */}
                <div className="text-center pb-6 border-b border-[#E7E7E7]">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-[11px] font-mono uppercase bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-semibold">
                    TICKET #{submittedTicket.id}
                  </span>
                  <h2 className="font-wondra text-2xl text-black mt-3">
                    CLAIM REGISTERED · SEND VIDEO NOW
                  </h2>
                  <p className="text-xs text-[#555555] max-w-md mx-auto mt-1">
                    Your damage claim for Order <strong>{submittedTicket.order_number}</strong> has been logged in our system.
                  </p>
                </div>

                {/* Step 1 on screen: Send WhatsApp Video */}
                <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-[4px] p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#25D366] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </div>
                    <div className="text-xs space-y-1">
                      <h4 className="font-semibold text-black text-sm">
                        Action Required: Send 360° Unboxing Video
                      </h4>
                      <p className="text-[#444444] leading-relaxed">
                        Tap the button below to open our official WhatsApp support. Send the 360° opening video showing the shipping label, unopened parcel, intact brand price tag, and the defect.
                      </p>
                    </div>
                  </div>

                  <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs tracking-wider uppercase rounded-[4px] transition-all shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>SEND 360° VIDEO ON WHATSAPP</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Video Sent Confirmation Action */}
                <div className="pt-2 space-y-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleVideoSent}
                    isLoading={isMarkingVideo}
                    className="w-full py-4 text-xs font-semibold tracking-wider uppercase bg-[#3F3F8F] hover:bg-[#343476]"
                  >
                    <span>VIDEO SENT SUCCESSFULLY · PROCEED TO RETURN ADDRESS →</span>
                  </Button>
                  <p className="text-center text-[11px] text-[#666666] font-poppins">
                    Tap &ldquo;Video Sent Successfully&rdquo; once you have dispatched your 360° unboxing video to WhatsApp.
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap justify-between items-center gap-3 text-xs border-t border-[#E7E7E7]">
                  <Link to="/pages/refund-policy" className="text-[#3F3F8F] hover:underline">
                    Read Full Refund Policy →
                  </Link>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/collections/all')}>
                      Continue Shopping
                    </Button>
                    {user && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/account')}>
                        Back to My Account
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* STEP 3: RETURN ADDRESS & CONSIGNMENT TRACKING */}
                <div className="text-center pb-6 border-b border-[#E7E7E7]">
                  <div className="w-16 h-16 bg-[#EEEEF8] text-[#3F3F8F] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Truck className="w-8 h-8" />
                  </div>
                  <span className="text-[11px] font-mono uppercase bg-indigo-100 text-indigo-900 px-3 py-1 rounded font-semibold">
                    TICKET #{submittedTicket.id} · AWAITING DISPATCH
                  </span>
                  <h2 className="font-wondra text-2xl text-black mt-3">
                    CUSTOMER SELF-SHIPMENT & TRACKING
                  </h2>
                  <p className="text-xs text-[#555555] max-w-md mx-auto mt-1">
                    Your 360° unboxing video has been recorded for Order <strong>{submittedTicket.order_number}</strong>. Please dispatch the package to our returns address below and log your tracking number.
                  </p>
                </div>

                {/* Step 2 on screen: Return Shipping Address */}
                <div className="border border-[#E7E7E7] rounded-[4px] p-5 space-y-3 bg-[#FAFAFA]">
                  <div className="flex items-center gap-2 text-black font-semibold text-xs uppercase tracking-wider">
                    <Truck className="w-4 h-4 text-[#3F3F8F]" />
                    <span>Customer Self-Shipment Return Address</span>
                  </div>
                  <p className="text-[11px] text-[#666666]">
                    As per policy, Tanoah does not provide reverse pickup. Once your video is approved on WhatsApp, please dispatch the parcel to our return address:
                  </p>
                  <div className="p-3.5 bg-white border border-[#E7E7E7] rounded text-xs space-y-1 font-mono text-neutral-800">
                    <p className="font-bold text-black font-poppins">
                      {storeSettings?.return_address_config?.hub_name || 'TANOAH RETURNS HUB'}
                    </p>
                    <p>
                      {storeSettings?.return_address_config?.recipient_name || 'Tanoah'}
                    </p>
                    <p>
                      {storeSettings?.return_address_config?.address_line1 || 'Rappal, Pudukkad P O'}
                    </p>
                    <p>
                      {storeSettings?.return_address_config?.city || 'Thrissur'}, {storeSettings?.return_address_config?.state || 'Kerala'} {storeSettings?.return_address_config?.postal_code || '680301'}
                    </p>
                    <p className="pt-1 text-[#3F3F8F] font-semibold">
                      Contact: {storeSettings?.return_address_config?.contact_phone || '+91 8714141849'}
                    </p>
                  </div>
                  <p className="text-[10px] text-red-600 font-medium">
                    ⚠️ {storeSettings?.return_address_config?.instructions || 'Important: Do not remove or damage the price tag. Any parcel received with a missing or detached tag is strictly ineligible for refund.'}
                  </p>
                </div>

                {/* Step 3 on screen: Log Customer's Return Consignment */}
                <div className="border border-[#E7E7E7] rounded-[4px] p-5 space-y-3 bg-white">
                  <h4 className="font-semibold text-black text-xs uppercase tracking-wider">
                    Already Shipped the Parcel? Enter Your Tracking
                  </h4>
                  <p className="text-[11px] text-[#666666]">
                    Provide your return courier name and consignment number so our warehouse team can monitor its transit.
                  </p>

                  {consignmentSaved ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Return tracking registered: <strong>{courierName}</strong> - <strong>{consignmentNo}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
                        In Transit
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveCustomerConsignment} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      <div className="sm:col-span-5">
                        <input
                          required
                          type="text"
                          placeholder="Courier Name (e.g. India Post / DTDC)"
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <input
                          required
                          type="text"
                          placeholder="Consignment / Tracking Number"
                          value={consignmentNo}
                          onChange={(e) => setConsignmentNo(e.target.value)}
                          className="w-full p-2.5 border border-[#E7E7E7] rounded font-mono focus:outline-none focus:border-[#3F3F8F]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          isLoading={isSavingConsignment}
                          className="w-full h-full py-2.5 text-[11px]"
                        >
                          SAVE
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="pt-4 flex flex-wrap justify-between items-center gap-3 text-xs border-t border-[#E7E7E7]">
                  <button
                    type="button"
                    onClick={() => setReturnStep('send_video')}
                    className="text-xs text-[#3F3F8F] hover:underline font-medium"
                  >
                    ← View WhatsApp Video Instructions
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/collections/all')}>
                      Continue Shopping
                    </Button>
                    {user && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/account')}>
                        Back to My Account
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* STEP 1: ORDER LOOKUP CARD */}
            <div className="bg-white border border-[#E7E7E7] rounded-[4px] p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <h3 className="font-wondra text-xl text-black">1. VERIFY ORDER ELIGIBILITY</h3>
                <span className="text-[10px] uppercase font-semibold text-neutral-500">
                  24-Hour Policy Check
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Order Number (Guest or Account) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TAN-849201 or 849201"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F] font-mono text-xs uppercase"
                  />
                  <span className="text-[10px] text-[#888888] mt-1 block">
                    Found in your order confirmation email, SMS, or delivery slip.
                  </span>
                </div>
                <div className="sm:col-span-5 flex items-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleVerifyOrder()}
                    isLoading={isVerifying}
                    className="w-full py-2.5 text-xs font-semibold"
                  >
                    CHECK ORDER
                  </Button>
                </div>
              </div>

              {verificationError && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>{verificationError}</div>
                </div>
              )}

              {/* 24-HOUR EXPIRATION SCREEN */}
              {isWindowExpired && (
                <div className="p-5 bg-red-50 border border-red-200 rounded text-xs text-red-950 space-y-3">
                  <div className="flex items-center gap-2 text-red-800 font-bold uppercase tracking-wider text-sm">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <span>24-Hour Reporting Window Expired</span>
                  </div>
                  <p className="leading-relaxed text-red-900">
                    This order was delivered on{' '}
                    <strong>
                      {new Date(verifiedOrder.delivered_at || verifiedOrder.updated_at).toLocaleString()}
                    </strong>{' '}
                    ({hoursSinceDelivery?.toFixed(1)} hours ago).
                  </p>
                  <p className="text-red-800 text-[11px] leading-relaxed">
                    According to the Tanoah Refund Policy, transit damage claims must be reported within <strong>24 hours</strong> of parcel delivery. This return window has now elapsed and no return or refund can be initiated.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/pages/refund-policy"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
                    >
                      <span>Review our complete Refund Policy</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* ORDER VERIFIED & WITHIN 24 HOURS BANNER */}
              {verifiedOrder && !isWindowExpired && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded text-xs flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Order <strong>{verifiedOrder.order_number || verifiedOrder.orderNumber}</strong> verified · Delivered {hoursSinceDelivery ? `${hoursSinceDelivery.toFixed(1)} hrs ago` : 'recently'}.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded">
                    Eligible for Claim
                  </span>
                </div>
              )}
            </div>

            {/* STEP 2: DAMAGE CLAIM DETAILS & CHECKLIST (Rendered only if verified within 24h) */}
            {verifiedOrder && !isWindowExpired && (
              <form onSubmit={handleSubmitClaim} className="bg-white border border-[#E7E7E7] rounded-[4px] p-6 shadow-sm space-y-6 text-left">
                <div className="pb-3 border-b border-[#E7E7E7]">
                  <h3 className="font-wondra text-xl text-black">2. DAMAGE DETAILS & POLICY AGREEMENT</h3>
                  <p className="text-[11px] text-[#666666] mt-0.5">
                    Select the damaged garment and confirm policy compliance.
                  </p>
                </div>

                {/* Items in Order */}
                {verifiedOrder.items && verifiedOrder.items.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-black uppercase">
                      Select Damaged Item *
                    </label>
                    <div className="space-y-2">
                      {verifiedOrder.items.map((item: any, idx: number) => {
                        const isSelected = selectedItemIndex === idx;
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 border rounded-[4px] cursor-pointer transition-all ${
                              isSelected ? 'border-[#3F3F8F] bg-[#EEEEF8]/40' : 'border-[#E7E7E7]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="damagedItemSelect"
                              checked={isSelected}
                              onChange={() => setSelectedItemIndex(idx)}
                              className="accent-[#3F3F8F]"
                            />
                            <div className="flex-1 text-xs">
                              <div className="font-semibold text-black">
                                {item.product_title || item.product?.title || 'Tanoah Item'}
                              </div>
                              <div className="text-[10px] text-[#666666]">
                                {item.variant_title || item.variant?.size} • Qty {item.quantity}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Damage Nature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      Reason for Claim *
                    </label>
                    <select
                      value={damageReason}
                      onChange={(e) => setDamageReason(e.target.value)}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F] bg-white text-xs"
                    >
                      <option value="Damaged in Transit / Crushed Box">Damaged in Transit / Crushed Box</option>
                      <option value="Fabric Tear / Stitching Defect">Fabric Tear / Stitching Defect</option>
                      <option value="Stained / Soiled upon Unboxing">Stained / Soiled upon Unboxing</option>
                      <option value="Different / Wrong Item Delivered">Different / Wrong Item Delivered</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      Contact Phone / WhatsApp *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. +91 8714141849"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F] text-xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Describe Defect / Damage *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details on the location of damage, parcel condition when handed over by the postman, etc."
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F] text-xs"
                  />
                </div>

                {/* MANDATORY CHECKLIST (Strict policy enforcement) */}
                <div className="border-t border-[#E7E7E7] pt-4 space-y-3 text-xs bg-neutral-50 p-4 rounded-[4px]">
                  <div className="font-semibold text-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#3F3F8F]" />
                    <span>Mandatory Policy Attestation (Check all 3 to proceed)</span>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={confirmedVideo}
                      onChange={(e) => setConfirmedVideo(e.target.checked)}
                      className="accent-[#3F3F8F] w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-[#333333] leading-relaxed">
                      I have recorded a continuous <strong>360° unboxing video</strong> clearly showing the sealed package, shipping airway label, opening, and the damaged product.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={confirmedTag}
                      onChange={(e) => setConfirmedTag(e.target.checked)}
                      className="accent-[#3F3F8F] w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-[#333333] leading-relaxed">
                      The original <strong>brand price tag is 100% intact, attached, and undamaged</strong>. (I understand removing the tag voids any refund).
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={confirmedSelfShip}
                      onChange={(e) => setConfirmedSelfShip(e.target.checked)}
                      className="accent-[#3F3F8F] w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-[#333333] leading-relaxed">
                      I understand that <strong>Tanoah does not provide reverse pickup</strong>, and I will self-ship the package to the returns address at my own expense.
                    </span>
                  </label>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  isLoading={isSubmitting}
                  icon={<Send className="w-4 h-4" />}
                  className="w-full py-4 text-xs font-semibold tracking-wider uppercase"
                >
                  REGISTER CLAIM & CONNECT TO WHATSAPP
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
