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
  RefreshCw,
  Lock,
  Tag,
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

  // Listen for admin returns update event
  useEffect(() => {
    const handleUpdate = () => {
      const orderNum = submittedTicket?.order_number || orderNumber;
      if (orderNum) {
        api.getReturnTicketByOrder(orderNum).then((updated) => {
          if (updated) setSubmittedTicket(updated);
        });
      }
    };

    window.addEventListener('tanoah_returns_updated', handleUpdate);
    return () => {
      window.removeEventListener('tanoah_returns_updated', handleUpdate);
    };
  }, [submittedTicket?.order_number, orderNumber]);

  // Auto-poll in background while on Step 3 awaiting admin review
  useEffect(() => {
    if (!submittedTicket?.order_number) return;
    const isCompleted = Boolean(
      consignmentSaved ||
      submittedTicket?.customer_consignment_no ||
      submittedTicket?.status === 'in_transit' ||
      submittedTicket?.status === 'item_received' ||
      submittedTicket?.status === 'completed'
    );
    const isStep3 =
      !isCompleted &&
      (submittedTicket.status === 'video_submitted' || submittedTicket.video_submitted) &&
      !['claim_approved', 'approved', 'in_transit', 'item_received', 'completed', 'rejected'].includes(
        submittedTicket.status
      );

    if (!isStep3) return;

    const interval = setInterval(async () => {
      const freshTicket = await api.getReturnTicketByOrder(submittedTicket.order_number);
      if (freshTicket && freshTicket.status !== submittedTicket.status) {
        setSubmittedTicket(freshTicket);
        if (freshTicket.status === 'claim_approved' || freshTicket.status === 'approved') {
          addToast({
            type: 'success',
            title: 'Video Verified & Return Approved!',
            description: 'Your unboxing video has been approved. Self-shipment return address is now unlocked.',
          });
        }
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [submittedTicket?.order_number, submittedTicket?.status, submittedTicket?.customer_consignment_no, consignmentSaved]);

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

      setVerifiedOrder(order);
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
        status: 'video_submitted',
      }));
      addToast({
        type: 'success',
        title: 'Video Submitted for Verification',
        description: 'Our team will review your unboxing video. Please check back within 24 hours.',
      });
    } catch {
      setSubmittedTicket((prev: any) => ({
        ...prev,
        video_submitted: true,
        status: 'video_submitted',
      }));
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
      const success = await api.updateReturnCustomerShipment(
        submittedTicket.id,
        courierName.trim(),
        consignmentNo.trim()
      );
      if (success) {
        setConsignmentSaved(true);
        setSubmittedTicket((prev: any) => ({
          ...prev,
          customer_courier_name: courierName.trim(),
          customer_consignment_no: consignmentNo.trim(),
          status: 'in_transit',
        }));
        addToast({
          type: 'success',
          title: 'Return Completed Successfully',
          description: 'Your courier tracking number has been recorded. 7-Day Refund SLA active.',
        });
      } else {
        throw new Error('Save failed');
      }
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

  const getCurrentStepNumber = () => {
    if (!submittedTicket) return 1;
    if (
      consignmentSaved ||
      submittedTicket.customer_consignment_no ||
      submittedTicket.status === 'in_transit' ||
      submittedTicket.status === 'item_received' ||
      submittedTicket.status === 'completed'
    ) {
      return 4;
    }
    if (submittedTicket.status === 'claim_approved' || submittedTicket.status === 'approved') {
      return 4;
    }
    if (submittedTicket.status === 'video_submitted' || submittedTicket.video_submitted) {
      return 3;
    }
    return 2;
  };

  const currentStep = getCurrentStepNumber();
  const isAllCompleted = Boolean(
    consignmentSaved ||
    submittedTicket?.customer_consignment_no ||
    submittedTicket?.status === 'in_transit' ||
    submittedTicket?.status === 'item_received' ||
    submittedTicket?.status === 'completed'
  );

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
  const shouldShowStepper = Boolean(submittedTicket || (verifiedOrder && !isWindowExpired));

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

        {/* 4-STEP RETURN LIFECYCLE STEPPER - SHOWN ONLY FOR DELIVERED & ELIGIBLE ORDERS OR ACTIVE TICKETS */}
        {shouldShowStepper && (
          <div className="w-full bg-white border border-[#E7E7E7] rounded-[4px] p-4 sm:p-5 shadow-xs text-left mb-6">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, label: 'Report Damage' },
                { step: 2, label: 'Submit Video' },
                { step: 3, label: 'Admin Review' },
                { step: 4, label: 'Self-Shipment' },
              ].map((s) => {
                const isCompleted = isAllCompleted ? true : currentStep > s.step;
                const isCurrent = !isAllCompleted && currentStep === s.step;
                return (
                  <div key={s.step} className="flex flex-col items-center space-y-1 relative">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-[#3F3F8F] text-white ring-4 ring-[#EEEEF8]'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {isCompleted ? '✓' : s.step}
                    </div>
                    <span
                      className={`text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold ${
                        isCurrent ? 'text-[#3F3F8F]' : isCompleted ? 'text-black' : 'text-neutral-400'
                      }`}
                    >
                      Step {s.step}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] hidden sm:block ${
                        isCurrent ? 'text-black font-medium' : 'text-[#888888]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#666666]">
              <span className="font-medium">
                {currentStep === 1 && 'Step 1 of 4: Report transit damage details and agree to return policy.'}
                {currentStep === 2 && 'Step 2 of 4: Send your mandatory 360° unboxing video on WhatsApp.'}
                {currentStep === 3 && 'Step 3 of 4: Verification pending. Admin inspection team is reviewing your video.'}
                {currentStep === 4 && !isAllCompleted && 'Step 4 of 4: Dispatch parcel & enter courier tracking. Process is completed only after entering tracking.'}
                {isAllCompleted && 'All Steps Completed: Return tracking logged. 7-day refund SLA active.'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F3F8F] bg-[#EEEEF8] px-2 py-0.5 rounded shrink-0">
                {isAllCompleted ? 'Completed ✓' : `Step ${currentStep} of 4`}
              </span>
            </div>
          </div>
        )}

        {/* POST-SUBMISSION TICKET CONFIRMATION & STEPPED ACTIONS */}
        {submittedTicket ? (
          <div className="bg-white border border-[#E7E7E7] rounded-[4px] p-6 sm:p-8 shadow-sm space-y-6 text-left">
            {/* REJECTION VIEW */}
            {submittedTicket.status === 'rejected' ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-mono uppercase bg-red-100 text-red-800 px-3 py-1 rounded font-semibold">
                  TICKET #{submittedTicket.id} · CLAIM REJECTED
                </span>
                <h2 className="font-wondra text-2xl text-black">
                  RETURN CLAIM REJECTED / VOIDED
                </h2>
                <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded text-xs text-red-900 leading-relaxed text-left space-y-2">
                  <p className="font-semibold">Reason for voiding claim:</p>
                  <p>
                    As per Tanoah Return Policy, returns and refunds are strictly eligible only when the original brand price tag is 100% intact, defects are proven via an unedited 360° unboxing video, and reported within 24 hours of delivery.
                  </p>
                  <p>
                    This ticket does not fulfill these conditions and has been marked as void.
                  </p>
                </div>
                <div className="pt-4 flex justify-center gap-3 text-xs">
                  <Button variant="outline" size="sm" onClick={() => setSubmittedTicket(null)}>
                    Check Another Order
                  </Button>
                  <Link to="/pages/refund-policy">
                    <Button variant="secondary" size="sm">
                      Read Refund Policy
                    </Button>
                  </Link>
                </div>
              </div>
            ) : isAllCompleted ? (
              /* CASE A: ALL COMPLETED (Tracking submitted) */
              <>
                <div className="text-center pb-6 border-b border-[#E7E7E7]">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-[11px] font-mono uppercase bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-semibold">
                    TICKET #{submittedTicket.id} · SLA ACTIVE
                  </span>
                  <h2 className="font-wondra text-2xl text-black mt-3">
                    RETURN REGISTRATION COMPLETE
                  </h2>
                  <p className="text-xs text-[#555555] max-w-md mx-auto mt-1">
                    Your return parcel tracking for Order <strong>{submittedTicket.order_number}</strong> has been registered.
                  </p>
                </div>

                {/* 7-Day Refund Notice Card (Requirement 6) */}
                <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-[4px] space-y-2 text-xs text-neutral-800">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold uppercase tracking-wider text-xs">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Refund Processing Timeline (7-Day SLA)</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed font-poppins">
                    Your refund amount will credit to your account with in 7 days after product damage test finshed.
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    As soon as our warehouse team physically receives the package and verifies that the brand price tag is intact and matches the unboxing video, your refund will be processed directly to your original payment method.
                  </p>
                </div>

                {/* Registered Tracking Details */}
                <div className="border border-[#E7E7E7] rounded-[4px] p-4 bg-[#FAFAFA] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">
                    Registered Return Consignment
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-black block">
                        Courier: <strong>{courierName || submittedTicket.customer_courier_name}</strong>
                      </span>
                      <span className="text-xs font-mono text-[#3F3F8F] font-bold">
                        Tracking #: {consignmentNo || submittedTicket.customer_consignment_no}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-1 rounded">
                      In Transit
                    </span>
                  </div>
                </div>

                {/* Hub Destination Info */}
                <div className="border border-[#E7E7E7] rounded-[4px] p-4 bg-white text-xs space-y-1 font-mono text-neutral-700">
                  <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block font-poppins mb-1">
                    Shipped To Destination Hub
                  </span>
                  <p className="font-bold text-black font-poppins">
                    {storeSettings?.return_address_config?.hub_name || 'TANOAH RETURNS HUB'}
                  </p>
                  <p>{storeSettings?.return_address_config?.recipient_name || 'Tanoah'}</p>
                  <p>{storeSettings?.return_address_config?.address_line1 || 'Rappal, Pudukkad P O'}</p>
                  <p>
                    {storeSettings?.return_address_config?.city || 'Thrissur'}, {storeSettings?.return_address_config?.state || 'Kerala'} {storeSettings?.return_address_config?.postal_code || '680301'}
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
            ) : currentStep === 4 ? (
              /* CASE B: STEP 4 OF 4 - Video verified & approved by admin, awaiting customer shipment & tracking */
              <>
                <div className="text-center pb-6 border-b border-[#E7E7E7]">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-[11px] font-mono uppercase bg-emerald-100 text-emerald-900 px-3 py-1 rounded font-semibold">
                    STEP 4 OF 4 · TICKET #{submittedTicket.id}
                  </span>
                  <h2 className="font-wondra text-2xl text-black mt-3">
                    STEP 4 OF 4: CUSTOMER SELF-SHIPMENT & TRACKING
                  </h2>
                  <p className="text-xs text-[#555555] max-w-md mx-auto mt-1">
                    Your 360° unboxing video has been verified and approved by admin. Please dispatch the parcel to our return address below. The return process is completed only after entering your tracking number.
                  </p>
                </div>

                {/* Verification Success Alert */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Video Verified & Return Approved:</strong> You are authorized to ship the item back. Please keep the original brand price tag intact.
                  </span>
                </div>

                {/* Return Shipping Address Card */}
                <div className="border border-[#E7E7E7] rounded-[4px] p-5 space-y-3 bg-[#FAFAFA]">
                  <div className="flex items-center gap-2 text-black font-semibold text-xs uppercase tracking-wider">
                    <Truck className="w-4 h-4 text-[#3F3F8F]" />
                    <span>Customer Self-Shipment Return Address</span>
                  </div>
                  <p className="text-[11px] text-[#666666]">
                    As per policy, Tanoah does not provide reverse pickup. Please dispatch the package to our warehouse address below:
                  </p>
                  <div className="p-3.5 bg-white border border-[#E7E7E7] rounded text-xs space-y-1 font-mono text-neutral-800">
                    <p className="font-bold text-black font-poppins">
                      {storeSettings?.return_address_config?.hub_name || 'TANOAH RETURNS HUB'}
                    </p>
                    <p>{storeSettings?.return_address_config?.recipient_name || 'Tanoah'}</p>
                    <p>{storeSettings?.return_address_config?.address_line1 || 'Rappal, Pudukkad P O'}</p>
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

                {/* Enter Tracking Form (Requirement 2: 'Complete Return' button) */}
                <div className="border border-[#E7E7E7] rounded-[4px] p-5 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-black text-xs uppercase tracking-wider">
                      Already Shipped the Parcel? Enter Your Tracking
                    </h4>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Final Action Required
                    </span>
                  </div>
                  <p className="text-[11px] text-[#666666]">
                    Provide your return courier name and consignment number so our warehouse team can monitor its transit. The return process is officially completed only after submitting this tracking.
                  </p>

                  <form onSubmit={handleSaveCustomerConsignment} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-5">
                      <input
                        required
                        type="text"
                        placeholder="Courier Name (e.g. India Post / DTDC)"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="w-full h-[42px] px-3.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        required
                        type="text"
                        placeholder="Consignment / Tracking Number"
                        value={consignmentNo}
                        onChange={(e) => setConsignmentNo(e.target.value)}
                        className="w-full h-[42px] px-3.5 border border-[#E7E7E7] rounded font-mono focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        isLoading={isSavingConsignment}
                        className="w-full h-[42px] text-xs font-semibold uppercase tracking-wider bg-[#3F3F8F] hover:bg-[#343476]"
                      >
                        Complete Return
                      </Button>
                    </div>
                  </form>
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
            ) : currentStep === 3 ? (
              /* CASE C: STEP 3 OF 4 - Video submitted, verification pending by admin */
              <>
                <div className="text-center pb-6 border-b border-[#E7E7E7]">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase bg-blue-100 text-blue-900 px-3 py-1 rounded font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    STEP 3 OF 4 · STATUS: VERIFICATION PENDING
                  </span>
                  <h2 className="font-wondra text-2xl text-black mt-3">
                    STEP 3 OF 4: RETURN REQUEST IS UNDER PROCESS
                  </h2>
                  <p className="text-xs text-[#555555] max-w-md mx-auto mt-1">
                    Your 360° unboxing video has been submitted for Order <strong>{submittedTicket.order_number}</strong>.
                  </p>
                </div>

                {/* 24-Hour Review Notice (Requirement 1) */}
                <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-5 space-y-3 text-left">
                  <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider text-xs">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Video Under Review · Check Back in 24 Hours</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium">
                    Your unboxing video has been submitted and is currently being verified by our inspection team on WhatsApp. Return request is under process — please check back in 24 hours.
                  </p>
                  <div className="p-3 bg-white/80 border border-amber-200 rounded text-[11px] text-neutral-700 leading-relaxed">
                    <strong>Next Steps:</strong> Once our admin verifies and approves your unboxing video, your return authorization, Customer Self-Shipment Return Address, and courier tracking form will unlock here automatically.
                  </div>
                </div>

                {/* Locked Next Steps Indicator */}
                <div className="border border-dashed border-[#CCCCCC] rounded-[4px] p-5 space-y-2 bg-[#FBFBFB] text-neutral-500">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Step 4: Self-Shipment Return Address & Tracking (Locked)</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    The return warehouse address and courier consignment input will be available once your unboxing video is approved by our team.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleVerifyOrder(submittedTicket.order_number)}
                    isLoading={isVerifying}
                    className="flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 bg-[#3F3F8F] hover:bg-[#343476]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>CHECK / REFRESH STATUS</span>
                  </Button>

                  <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs tracking-wider uppercase rounded-[4px] transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>CHAT ON WHATSAPP</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
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
              /* CASE D: STEP 2 OF 4 - Awaiting unboxing video submission on WhatsApp */
              <>
                <div className="text-center pb-6 border-b border-[#E7E7E7]">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-8 h-8" />
                  </div>
                  <span className="text-[11px] font-mono uppercase bg-amber-100 text-amber-900 px-3 py-1 rounded font-semibold">
                    STEP 2 OF 4 · TICKET #{submittedTicket.id}
                  </span>
                  <h2 className="font-wondra text-2xl text-black mt-3">
                    STEP 2 OF 4: SEND 360° UNBOXING VIDEO
                  </h2>
                  <p className="text-xs text-[#555555] max-w-md mx-auto mt-1">
                    Your damage claim for Order <strong>{submittedTicket.order_number}</strong> is registered. Send your unboxing video to WhatsApp for verification.
                  </p>
                </div>

                {/* WhatsApp Video Instruction Card */}
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
                    <span>VIDEO SENT SUCCESSFULLY · SUBMIT FOR REVIEW →</span>
                  </Button>
                  <p className="text-center text-[11px] text-[#666666] font-poppins">
                    Tap &ldquo;Video Sent Successfully&rdquo; once you have dispatched your unboxing video to WhatsApp. Our team will review it within 24 hours.
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
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* ORDER LOOKUP & ELIGIBILITY VERIFICATION CARD */}
            <div className="bg-white border border-[#E7E7E7] rounded-[4px] p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <h3 className="font-wondra text-xl text-black">VERIFY ORDER ELIGIBILITY</h3>
                <span className="text-[10px] uppercase font-semibold text-[#3F3F8F] bg-[#EEEEF8] px-2 py-0.5 rounded">
                  24-Hour Policy Check
                </span>
              </div>

              {/* Order input row with perfect alignment (Screenshot 2 fix) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-black uppercase">
                  Order Number (Guest or Account) *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <input
                    type="text"
                    placeholder="e.g. TAN-849201 or 849201"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] font-mono text-xs uppercase h-[42px]"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleVerifyOrder()}
                    isLoading={isVerifying}
                    className="sm:w-48 text-xs font-semibold h-[42px] shrink-0"
                  >
                    CHECK ORDER
                  </Button>
                </div>
                <span className="text-[10px] text-[#888888] block pt-0.5">
                  Found in your order confirmation email, SMS, or delivery slip.
                </span>
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

            {/* STEP 1 OF 4: DAMAGE CLAIM DETAILS & POLICY (Rendered only if verified within 24h) */}
            {verifiedOrder && !isWindowExpired && (
              <form onSubmit={handleSubmitClaim} className="bg-white border border-[#E7E7E7] rounded-[4px] p-6 shadow-sm space-y-6 text-left">
                <div className="pb-3 border-b border-[#E7E7E7]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F3F8F] bg-[#EEEEF8] px-2.5 py-0.5 rounded inline-block mb-1">
                    Step 1 of 4
                  </span>
                  <h3 className="font-wondra text-xl text-black">
                    STEP 1 OF 4: REPORT DAMAGE DETAILS & POLICY AGREEMENT
                  </h3>
                  <p className="text-[11px] text-[#666666] mt-0.5">
                    Select the damaged garment and confirm policy compliance to initiate your claim.
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
                  className="w-full py-4 text-xs font-semibold tracking-wider uppercase bg-[#3F3F8F] hover:bg-[#343476]"
                >
                  REGISTER CLAIM · PROCEED TO STEP 2 (SEND VIDEO) →
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
