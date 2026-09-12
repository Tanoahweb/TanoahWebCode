import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Banknote, ArrowRight, Lock, Tag, CheckCircle2, Plus, MapPin, Sparkles, LogOut, Check } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatPrice, isCouponAvailable } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { api, isProductInCollection } from '../services/api';
import { openRazorpayPayment } from '../services/razorpay';
import { openCashfreePayment } from '../services/cashfree';
import { paymentService } from '../services/paymentService';
import { PublicPaymentConfig } from '../types/paymentGateway';
import { emailService } from '../services/emailService';
import { SavedAddress, DeliverySpeedTier, Coupon, Collection } from '../types';
import { DEFAULT_DELIVERY_SPEEDS } from '../data/mockData';
import { safeSetItem, sanitizeOrderForStorage } from '../utils/safeStorage';
import { validateEmail, validatePhone } from '../utils/validation';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, getDiscountAmount, getShippingFee, coupon, applyCoupon, clearCart, validateCurrentCoupon } = useCartStore();
  const { addToast } = useUIStore();
  const { user, profile, signOut } = useAuthStore();

  const [voucherInput, setVoucherInput] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  useEffect(() => {
    validateCurrentCoupon();
  }, [items, validateCurrentCoupon]);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: 'Maharashtra',
    postalCode: '',
    shippingMethod: 'standard',
    paymentMethod: 'razorpay',
    saveInfo: true,
  });

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [deliverySpeeds, setDeliverySpeeds] = useState<DeliverySpeedTier[]>(DEFAULT_DELIVERY_SPEEDS);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});

  useEffect(() => {
    let isMounted = true;
    api.getStoreSettings().then((s) => {
      if (isMounted && s) setStoreSettings(s);
    });
    api.getCoupons().then((cpns) => {
      if (isMounted && cpns) setAvailableCoupons(cpns);
    });
    api.getCollections().then((cols) => {
      if (isMounted && cols) setCollections(cols);
    });
    api.getDeliverySpeeds().then((speeds) => {
      if (isMounted && speeds && speeds.length > 0) {
        setDeliverySpeeds(speeds);
        const defaultTier = speeds.find((s) => s.is_default && s.is_active) || speeds.find((s) => s.is_active);
        if (defaultTier) {
          setFormData((prev) => ({ ...prev, shippingMethod: defaultTier.id }));
        }
      }
    });
    paymentService.getPublicPaymentConfig().then((cfg) => {
      if (isMounted && cfg) {
        setPaymentConfig(cfg);
        if (cfg.active_gateway === 'cashfree' && cfg.cashfree.enabled) {
          setFormData((prev) => ({ ...prev, paymentMethod: 'cashfree' }));
        } else if (!cfg.razorpay.enabled && cfg.cashfree.enabled) {
          setFormData((prev) => ({ ...prev, paymentMethod: 'cashfree' }));
        } else {
          setFormData((prev) => ({ ...prev, paymentMethod: 'razorpay' }));
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Pre-populate authenticated user's contact information and saved addresses
  useEffect(() => {
    if (!user) return;

    const fullName = profile?.full_name || (user.user_metadata?.full_name as string) || '';
    const nameParts = fullName.trim().split(/\s+/);
    const userFirstName = nameParts[0] || '';
    const userLastName = nameParts.slice(1).join(' ') || '';
    const userPhone = profile?.phone || (user.user_metadata?.phone as string) || '';
    const userEmail = user.email || profile?.email || '';

    setFormData((prev) => ({
      ...prev,
      email: prev.email || userEmail,
      phone: prev.phone || userPhone,
      firstName: prev.firstName || userFirstName,
      lastName: prev.lastName || userLastName,
    }));

    setIsLoadingAddresses(true);
    api.getUserAddresses(user.id, user.email).then((addrs) => {
      setSavedAddresses(addrs);
      setIsLoadingAddresses(false);

      if (addrs.length > 0) {
        const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
        setSelectedAddressId(defaultAddr.id);
        setIsAddingNewAddress(false);
        setFormData((prev) => ({
          ...prev,
          firstName: defaultAddr.first_name || prev.firstName || userFirstName,
          lastName: defaultAddr.last_name || prev.lastName || userLastName,
          address: defaultAddr.address,
          apartment: defaultAddr.apartment || '',
          city: defaultAddr.city,
          state: defaultAddr.state || 'Maharashtra',
          postalCode: defaultAddr.postal_code,
          phone: defaultAddr.phone || prev.phone || userPhone,
        }));
      } else {
        setIsAddingNewAddress(true);
      }
    });
  }, [user, profile]);

  const handleSelectAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setIsAddingNewAddress(false);
    setFormData((prev) => ({
      ...prev,
      firstName: addr.first_name,
      lastName: addr.last_name,
      address: addr.address,
      apartment: addr.apartment || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postal_code,
      phone: addr.phone || prev.phone,
    }));
  };

  const handleAddNewAddress = () => {
    setIsAddingNewAddress(true);
    setSelectedAddressId('');
    setFormData((prev) => ({
      ...prev,
      address: '',
      apartment: '',
      city: '',
      postalCode: '',
    }));
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const freeShipThreshold = storeSettings?.free_shipping_threshold ?? 1999;

  const activeSpeeds = deliverySpeeds.filter((s) => s.is_active);
  const selectedSpeed =
    activeSpeeds.find((s) => s.id === formData.shippingMethod) ||
    activeSpeeds.find((s) => s.is_default) ||
    activeSpeeds[0] ||
    deliverySpeeds[0];

  const isFreeEligible = Boolean(selectedSpeed?.is_free_eligible && subtotal >= freeShipThreshold);
  const shipping = isFreeEligible ? 0 : (selectedSpeed?.charge ?? 0);
  const grandTotal = Math.max(0, subtotal - discount + shipping);

  const handleApplyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherInput).trim().toUpperCase();
    if (!code) return;

    setIsApplyingVoucher(true);
    try {
      const res = await api.validateCoupon(code, subtotal, items);
      if (res.valid && res.coupon) {
        applyCoupon(res.coupon);
        addToast({ type: 'success', title: 'Voucher Applied', description: res.message });
        setVoucherInput('');
      } else {
        addToast({ type: 'error', title: 'Invalid Voucher', description: res.message });
      }
    } catch {
      addToast({ type: 'error', title: 'Voucher Error', description: 'Could not validate voucher.' });
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const getCouponEvaluation = (c: Coupon) => {
    const isApplied = coupon?.code.toUpperCase() === c.code.toUpperCase();
    const hasCollections = Boolean(c.eligible_collections && c.eligible_collections.length > 0);

    let isEligible = true;
    let difference = 0;
    let eligibleSubtotal = subtotal;
    let descriptionText = '';
    let savingsText = '';

    const colNames = hasCollections
      ? c.eligible_collections!
          .map((slug) => collections.find((col) => col.slug === slug || col.id === slug)?.title || slug)
          .join(', ')
      : '';

    if (hasCollections) {
      const matchingItems = items.filter((item) =>
        c.eligible_collections!.some((colSlug) => isProductInCollection(item.product, colSlug))
      );

      if (matchingItems.length === 0) {
        isEligible = false;
        descriptionText = `Add products from "${colNames}" to get this offer`;
      } else {
        eligibleSubtotal = matchingItems.reduce((acc, item) => {
          const price =
            item.variant?.sale_price ??
            item.variant?.price ??
            item.product?.sale_price ??
            item.product?.base_price ??
            0;
          return acc + price * item.quantity;
        }, 0);

        if (c.min_spend && eligibleSubtotal < c.min_spend) {
          isEligible = false;
          difference = Math.round(c.min_spend - eligibleSubtotal);
          descriptionText = `Add ₹${difference.toLocaleString('en-IN')} more of "${colNames}" to get this offer`;
        }
      }
    } else {
      if (c.min_spend && subtotal < c.min_spend) {
        isEligible = false;
        difference = Math.round(c.min_spend - subtotal);
        descriptionText = `Add ₹${difference.toLocaleString('en-IN')} more to get this offer`;
      }
    }

    let discountAmount = 0;
    const baseAmount = isEligible ? eligibleSubtotal : Math.max(subtotal, c.min_spend || 0);

    if (c.discount_type === 'percentage') {
      let estSave = (baseAmount * c.discount_value) / 100;
      if (c.max_discount && estSave > c.max_discount) estSave = c.max_discount;
      discountAmount = estSave;
      if (isEligible) {
        savingsText = `Save ₹${Math.round(estSave).toLocaleString('en-IN')}`;
      }
    } else if (c.discount_type === 'fixed') {
      const estSave = Math.min(c.discount_value, baseAmount > 0 ? baseAmount : c.discount_value);
      discountAmount = estSave;
      if (isEligible) {
        savingsText = `Save ₹${Math.round(estSave).toLocaleString('en-IN')}`;
      }
    } else if (c.discount_type === 'free_shipping') {
      discountAmount = shipping > 0 ? shipping : 150;
      if (isEligible) {
        savingsText = 'Free Express Delivery';
      }
    }

    if (isEligible && !descriptionText) {
      descriptionText = c.description || (c.min_spend ? `Valid on orders above ₹${c.min_spend.toLocaleString('en-IN')}` : 'Storewide instant offer');
    }

    return {
      isApplied,
      isEligible,
      difference,
      descriptionText,
      savingsText,
      discountAmount,
      hasCollections,
      colNames,
    };
  };

  const sortedCoupons = useMemo(() => {
    return availableCoupons
      .filter((c) => isCouponAvailable(c))
      .map((c) => ({ coupon: c, evalInfo: getCouponEvaluation(c) }))
      .sort((a, b) => {
        const aEligible = a.evalInfo.isApplied || a.evalInfo.isEligible;
        const bEligible = b.evalInfo.isApplied || b.evalInfo.isEligible;

        if (aEligible && !bEligible) return -1;
        if (!aEligible && bEligible) return 1;

        if (b.evalInfo.discountAmount !== a.evalInfo.discountAmount) {
          return b.evalInfo.discountAmount - a.evalInfo.discountAmount;
        }

        if (b.coupon.discount_value !== a.coupon.discount_value) {
          return b.coupon.discount_value - a.coupon.discount_value;
        }

        if (a.evalInfo.isApplied && !b.evalInfo.isApplied) return -1;
        if (!a.evalInfo.isApplied && b.evalInfo.isApplied) return 1;

        return a.coupon.code.localeCompare(b.coupon.code);
      });
  }, [availableCoupons, coupon, subtotal, items, shipping, collections]);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-poppins">
        <h2 className="font-wondra text-3xl text-black">NO ITEMS TO CHECKOUT</h2>
        <p className="text-xs text-[#666666] mt-2 mb-6">Your shopping bag is empty.</p>
        <Link to="/collections/all">
          <Button variant="primary" size="md">RETURN TO SHOP</Button>
        </Link>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // While typing, if the value becomes valid, dismiss the error immediately
      if (name === 'email' && fieldErrors.email) {
        const check = validateEmail(value);
        if (check.isValid) {
          setFieldErrors((prev) => ({ ...prev, email: undefined }));
        }
      } else if (name === 'phone' && fieldErrors.phone) {
        const check = validatePhone(value);
        if (check.isValid) {
          setFieldErrors((prev) => ({ ...prev, phone: undefined }));
        }
      }
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') {
      if (value && value.trim()) {
        const check = validateEmail(value);
        setFieldErrors((prev) => ({ ...prev, email: check.isValid ? undefined : check.error }));
      } else {
        setFieldErrors((prev) => ({ ...prev, email: undefined }));
      }
    } else if (name === 'phone') {
      if (value && value.trim()) {
        const check = validatePhone(value);
        setFieldErrors((prev) => ({ ...prev, phone: check.isValid ? undefined : check.error }));
      } else {
        setFieldErrors((prev) => ({ ...prev, phone: undefined }));
      }
    }
  };

  const processOrderCreation = async (paymentRef?: string, paymentStatus: string = 'paid') => {
    // If logged in customer requested to save new address
    if (user && formData.saveInfo && (isAddingNewAddress || savedAddresses.length === 0)) {
      try {
        await api.saveUserAddress({
          user_id: user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: 'India',
          is_default: savedAddresses.length === 0,
        });
      } catch (err) {
        console.warn('Failed to save address during checkout', err);
      }
    }

    const res = await api.createOrder({
      user_id: user?.id || null,
      guest_email: formData.email,
      guest_phone: formData.phone,
      shipping_address: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address: formData.address,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        country: 'India',
      },
      payment_method: formData.paymentMethod,
      payment_status: paymentStatus,
      payment_gateway_ref: paymentRef,
      courier_name: `India Post (${selectedSpeed?.name || 'Standard'})`,
      subtotal,
      discount_total: discount,
      shipping_total: shipping,
      tax_total: Math.round(subtotal - (subtotal / 1.05)), // 5% GST included in price
      grand_total: grandTotal,
      items,
    });

    if (coupon?.code) {
      api.recordCouponUsage(coupon.code).catch(() => {});
    }

    const orderNum = res.order_number || `TAN-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderPayload = {
      orderNumber: orderNum,
      order_number: orderNum,
      user_id: user?.id || null,
      items,
      formData,
      shipping_address: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address: formData.address,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        country: 'India',
      },
      subtotal,
      discount,
      discount_total: discount,
      shipping,
      shipping_total: shipping,
      codFee: 0,
      grandTotal,
      grand_total: grandTotal,
      payment_method: formData.paymentMethod,
      payment_status: paymentStatus,
      payment_gateway_ref: paymentRef,
      paymentGatewayRef: paymentRef,
      courier_name: `India Post (${selectedSpeed?.name || 'Standard'})`,
      date: new Date().toISOString(),
    };

    // Sanitize order payload for storage (strips giant base64 images & deep structures to < 2KB)
    const sanitizedOrder = sanitizeOrderForStorage(orderPayload);

    // Dispatch real-time automatic email alert to admin and order confirmation to customer
    emailService.sendOrderNotification(sanitizedOrder as any).catch((err) => {
      console.warn('[CheckoutPage] Non-critical error sending order notification:', err);
    });

    try {
      safeSetItem('tanoah_last_order', JSON.stringify(sanitizedOrder));
    } catch (storageErr) {
      console.warn('[CheckoutPage] Non-critical safeSetItem error:', storageErr);
    }

    clearCart();
    setIsProcessing(false);
    navigate(`/order-confirmation?order=${orderNum}`);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone || !formData.address || !formData.postalCode) {
      addToast({
        type: 'error',
        title: 'Missing Details',
        description: 'Please complete all required shipping & contact fields.',
      });
      return;
    }

    const emailValidation = validateEmail(formData.email);
    const phoneValidation = validatePhone(formData.phone);

    if (!emailValidation.isValid || !phoneValidation.isValid) {
      setFieldErrors({
        email: emailValidation.isValid ? undefined : emailValidation.error,
        phone: phoneValidation.isValid ? undefined : phoneValidation.error,
      });
      if (!emailValidation.isValid) {
        addToast({
          type: 'error',
          title: 'Invalid Email Address',
          description: emailValidation.error || 'Please enter a valid email address (e.g. name@example.com).',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Invalid Mobile Number',
          description: phoneValidation.error || 'Please enter a valid 10-digit mobile number.',
        });
      }
      return;
    }

    if (!agreedToTerms) {
      addToast({
        type: 'error',
        title: 'Agreement Required',
        description: 'Please agree to the Terms & Conditions and Refund Policy to proceed.',
      });
      return;
    }

    setIsProcessing(true);

    try {

      // Online Cashfree Payment Flow
      if (formData.paymentMethod === 'cashfree') {
        const cfOrderData = await paymentService.createPaymentOrder({
          grand_total: grandTotal,
          currency: 'INR',
          gateway: 'cashfree',
          customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
          customer_email: formData.email,
          customer_phone: formData.phone,
        });

        await openCashfreePayment({
          paymentSessionId: cfOrderData.payment_session_id,
          orderId: cfOrderData.order_id,
          environment: cfOrderData.environment,
          amount: grandTotal,
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerEmail: formData.email,
          customerPhone: formData.phone,
          onSuccess: async (paymentResult) => {
            const verifyRes = await paymentService.verifyPayment({
              gateway: 'cashfree',
              cashfree_order_id: paymentResult.order_id,
            });
            await processOrderCreation(
              paymentResult.payment_id || paymentResult.order_id,
              verifyRes.verified ? 'paid' : 'pending'
            );
          },
          onFailure: (err) => {
            setIsProcessing(false);
            addToast({
              type: 'error',
              title: 'Cashfree Payment Failed',
              description: err?.message || 'Payment could not be processed. Please try again.',
            });
          },
          onDismiss: () => {
            setIsProcessing(false);
            addToast({
              type: 'info',
              title: 'Payment Incomplete',
              description: 'Payment was cancelled or dismissed. You can try again whenever ready.',
            });
          },
        });
        return;
      }

      // Online Razorpay Payment Flow (Default)
      const rzpOrderData = await paymentService.createPaymentOrder({
        grand_total: grandTotal,
        currency: 'INR',
        gateway: 'razorpay',
        customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
        customer_email: formData.email,
        customer_phone: formData.phone,
      });

      await openRazorpayPayment({
        orderId: rzpOrderData.order_id,
        amount: rzpOrderData.amount || Math.round(grandTotal * 100),
        currency: 'INR',
        keyId: rzpOrderData.key_id,
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerEmail: formData.email,
        customerPhone: formData.phone,
        onSuccess: async (paymentResult) => {
          const verifyRes = await paymentService.verifyPayment({
            gateway: 'razorpay',
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          });
          await processOrderCreation(
            paymentResult.razorpay_payment_id,
            verifyRes.verified ? 'paid' : 'pending'
          );
        },
        onDismiss: () => {
          setIsProcessing(false);
          addToast({
            type: 'info',
            title: 'Payment Incomplete',
            description: 'Payment was not completed. You can reattempt whenever ready.',
          });
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      addToast({
        type: 'error',
        title: 'Order Placement Error',
        description: err.message || 'Unable to place order. Please try again.',
      });
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between pb-8 border-b border-[#E7E7E7] mb-8">
          <Link to="/">
            <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase">
            <Lock className="w-4 h-4 text-[#3F3F8F]" />
            <span>SECURE 256-BIT CHECKOUT</span>
          </div>
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-xs">
          <div className="lg:col-span-7 space-y-8 text-left">
            {/* 1. Contact Information */}
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-wondra text-xl text-black">1. CONTACT INFORMATION</h3>
                  {user && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Account
                    </span>
                  )}
                </div>

                {user ? (
                  <div className="flex items-center gap-2 text-xs text-[#666666]">
                    <span>
                      Logged in as <strong className="text-black">{profile?.full_name || user?.user_metadata?.full_name || user.email?.split('@')[0]}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-xs text-[#3F3F8F] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Log out</span>
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="text-xs text-[#3F3F8F] font-semibold hover:underline">
                    Already have an account? Sign in
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="you@domain.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={`w-full p-2.5 border rounded-[4px] focus:outline-none ${
                      fieldErrors.email
                        ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                        : 'border-[#E7E7E7] focus:border-[#3F3F8F]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <span className="text-[10px] text-red-600 block mt-1">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    required
                    type="tel"
                    name="phone"
                    placeholder="+91 8714141849"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={`w-full p-2.5 border rounded-[4px] focus:outline-none ${
                      fieldErrors.phone
                        ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                        : 'border-[#E7E7E7] focus:border-[#3F3F8F]'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <span className="text-[10px] text-red-600 block mt-1">
                      {fieldErrors.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Delivery Address */}
            {user && savedAddresses.length > 0 && !isAddingNewAddress ? (
              <div className="p-6 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-wondra text-xl text-black">2. DELIVERY ADDRESS</h3>
                      <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-semibold px-2 py-0.5 rounded">
                        {savedAddresses.length} Saved {savedAddresses.length === 1 ? 'Address' : 'Addresses'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#666666] mt-0.5">
                      Select your destination address or enter a new delivery address.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewAddress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#3F3F8F] text-[#3F3F8F] hover:bg-[#3F3F8F] hover:text-white rounded-[4px] font-semibold text-xs transition-colors self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Deliver to Different Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`p-4 border rounded-[4px] cursor-pointer transition-all relative text-left select-none ${
                          isSelected
                            ? 'border-[#3F3F8F] bg-[#EEEEF8]/30 shadow-sm ring-2 ring-[#3F3F8F]'
                            : 'border-[#E7E7E7] hover:border-black/30 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="savedAddressSelect"
                              checked={isSelected}
                              onChange={() => handleSelectAddress(addr)}
                              className="accent-[#3F3F8F] w-4 h-4 cursor-pointer"
                            />
                            <span className="font-semibold text-black text-sm">
                              {addr.first_name} {addr.last_name}
                            </span>
                          </div>
                          {addr.is_default && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#3F3F8F] text-white px-2 py-0.5 rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <div className="pl-6 space-y-1 text-xs">
                          <p className="text-[#333333] leading-relaxed">
                            {addr.address}
                            {addr.apartment ? `, ${addr.apartment}` : ''}
                          </p>
                          <p className="text-[#666666]">
                            {addr.city}, {addr.state} - <span className="font-mono font-medium">{addr.postal_code}</span>
                          </p>
                          <p className="text-[#666666] pt-0.5">
                            Phone: <span className="font-medium text-black">{addr.phone}</span>
                          </p>
                        </div>

                        {isSelected && (
                          <div className="mt-3 pt-2.5 border-t border-[#3F3F8F]/20 pl-6 flex items-center gap-1.5 text-[11px] text-[#3F3F8F] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#3F3F8F]" />
                            <span>Selected for delivery</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="font-wondra text-xl text-black">2. DELIVERY ADDRESS</h3>
                    {user && (
                      <p className="text-[11px] text-[#666666] mt-0.5">
                        Enter your delivery address details below.
                      </p>
                    )}
                  </div>

                  {user && savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const def = savedAddresses.find((a) => a.is_default) || savedAddresses[0];
                        handleSelectAddress(def);
                      }}
                      className="text-xs text-[#3F3F8F] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>← Back to saved addresses</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      First Name *
                    </label>
                    <input
                      required
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      Last Name *
                    </label>
                    <input
                      required
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Street Address / House No. *
                  </label>
                  <input
                    required
                    type="text"
                    name="address"
                    placeholder="House number, building name, street"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Apartment, Suite, Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    value={formData.apartment}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      City *
                    </label>
                    <input
                      required
                      type="text"
                      name="city"
                      placeholder="Mumbai"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white"
                    >
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Kerala">Kerala</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Other">Other States</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      Postal Code *
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      name="postalCode"
                      placeholder="400001"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] font-mono"
                    />
                  </div>
                </div>

                {user && (
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 text-xs text-black cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="saveInfo"
                        checked={formData.saveInfo}
                        onChange={handleInputChange}
                        className="accent-[#3F3F8F] w-4 h-4 rounded cursor-pointer"
                      />
                      <span className="font-medium">
                        Save this delivery address to my account for 1-click checkout
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* 3. Shipping Method */}
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-wondra text-xl text-black">3. DELIVERY SPEED</h3>
                <span className="text-[11px] text-neutral-500 font-medium">
                  Doorstep Delivery via India Post
                </span>
              </div>
              <div className="space-y-3">
                {activeSpeeds.map((tier) => {
                  const isSelected = formData.shippingMethod === tier.id;
                  const tierFee =
                    tier.is_free_eligible && subtotal >= freeShipThreshold ? 0 : tier.charge;
                  return (
                    <label
                      key={tier.id}
                      className={`flex items-center justify-between p-4 border rounded-[4px] cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40 shadow-xs'
                          : 'border-[#E7E7E7] hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={tier.id}
                          checked={isSelected}
                          onChange={handleInputChange}
                          className="accent-[#3F3F8F]"
                        />
                        <div>
                          <div className="font-semibold text-black flex items-center gap-2">
                            <span>{tier.name}</span>
                            <span className="text-[10px] font-normal text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                              {tier.estimated_days}
                            </span>
                          </div>
                          {tier.description && (
                            <div className="text-[11px] text-[#666666] mt-0.5">{tier.description}</div>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-black text-sm">
                        {tierFee === 0 ? (
                          <strong className="text-[#3F3F8F]">FREE</strong>
                        ) : (
                          formatPrice(tierFee)
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Payment Method */}
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-4">
              <h3 className="font-wondra text-xl text-black">4. PAYMENT GATEWAY</h3>
              <div className="space-y-3">
                {/* Razorpay Option */}
                {(!paymentConfig ||
                  (paymentConfig.active_gateway !== 'cashfree' && paymentConfig.razorpay?.enabled !== false)) && (
                  <label
                    className={`flex items-center justify-between p-4 border rounded-[4px] cursor-pointer transition-all ${
                      formData.paymentMethod === 'razorpay'
                        ? 'border-[#3F3F8F] bg-[#EEEEF8]/40'
                        : 'border-[#E7E7E7]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="razorpay"
                        checked={formData.paymentMethod === 'razorpay'}
                        onChange={handleInputChange}
                        className="accent-[#3F3F8F]"
                      />
                      <div>
                        <div className="font-semibold text-black flex items-center gap-2">
                          <span>Online Payment (Razorpay)</span>
                          <CreditCard className="w-4 h-4 text-[#3F3F8F]" />
                        </div>
                        <div className="text-[11px] text-[#666666]">
                          UPI, Google Pay, Cards, Net Banking & Wallets
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-[2px]">
                      Instant
                    </span>
                  </label>
                )}

                {/* Cashfree Option */}
                {paymentConfig?.cashfree?.enabled &&
                  (paymentConfig.active_gateway === 'both' || paymentConfig.active_gateway === 'cashfree') && (
                    <label
                      className={`flex items-center justify-between p-4 border rounded-[4px] cursor-pointer transition-all ${
                        formData.paymentMethod === 'cashfree'
                          ? 'border-[#3F3F8F] bg-[#EEEEF8]/40'
                          : 'border-[#E7E7E7]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cashfree"
                          checked={formData.paymentMethod === 'cashfree'}
                          onChange={handleInputChange}
                          className="accent-[#3F3F8F]"
                        />
                        <div>
                          <div className="font-semibold text-black flex items-center gap-2">
                            <span>Cashfree Payments</span>
                            <CreditCard className="w-4 h-4 text-[#3F3F8F]" />
                          </div>
                          <div className="text-[11px] text-[#666666]">
                            UPI, Debit/Credit Cards, Net Banking & PayLater
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-[2px]">
                        Fast
                      </span>
                    </label>
                  )}
              </div>
            </div>
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-5">
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 sticky top-28">
              <h3 className="font-wondra text-2xl text-black">SUMMARY ({items.length})</h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-[#E7E7E7]">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                    <div className="w-14 h-18 bg-neutral-100 rounded-[2px] overflow-hidden shrink-0 border border-[#E7E7E7]">
                      <img
                        src={item.variant?.color_image_url || item.product.images?.[0]?.image_url || '/Assets/products/placeholder-product.svg'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-black line-clamp-1">{item.product.title}</div>
                      <div className="text-[10px] text-[#666666]">
                        {item.variant.color_name} • {item.variant.size} • Qty {item.quantity}
                      </div>
                      <div className="font-semibold text-black mt-0.5">
                        {formatPrice((item.variant.sale_price ?? item.variant.price) * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Voucher / Promo Code Box & Dynamic Available Offers */}
              <div className="pt-3 border-t border-[#E7E7E7] space-y-3">
                {coupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#EEEEF8] border border-[#3F3F8F]/30 rounded-[4px]">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#3F3F8F]" />
                      <div>
                        <span className="font-bold text-[#3F3F8F] font-mono text-xs">{coupon.code}</span>
                        <span className="text-[10px] text-[#666666] ml-2">
                          ({coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : coupon.discount_type === 'free_shipping' ? 'Free Shipping' : `₹${coupon.discount_value} OFF`})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyCoupon(null)}
                      className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Promo or Voucher Code"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      className="flex-1 p-2 bg-white border border-[#E7E7E7] rounded-[4px] text-xs uppercase font-mono focus:outline-none focus:border-[#3F3F8F]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyVoucher();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyVoucher()}
                      disabled={isApplyingVoucher}
                      className="px-4 py-2 bg-black hover:bg-[#3F3F8F] text-white rounded-[4px] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isApplyingVoucher ? '...' : 'APPLY'}
                    </button>
                  </div>
                )}

                {/* Dynamic Available Offers & Upsell Cards */}
                {sortedCoupons.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#F0F0F0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#3F3F8F]" />
                        Available Offers & Coupons
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {sortedCoupons.length} Available
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                      {sortedCoupons.map(({ coupon: c, evalInfo }) => {
                          return (
                            <div
                              key={c.id || c.code}
                              className={`p-2.5 rounded-[5px] border transition-all text-left ${
                                evalInfo.isApplied
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                                  : evalInfo.isEligible
                                  ? 'bg-[#FAF9FE] border-[#3F3F8F]/25 hover:border-[#3F3F8F]'
                                  : 'bg-[#FAFAFA] border-[#EEEEEE]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-[#E0E0E0] text-[#3F3F8F] tracking-wide">
                                    {c.code}
                                  </span>
                                  <span className="text-[11px] font-semibold text-neutral-900">
                                    {c.discount_type === 'percentage'
                                      ? `${c.discount_value}% OFF`
                                      : c.discount_type === 'free_shipping'
                                      ? 'FREE SHIPPING'
                                      : `₹${c.discount_value} OFF`}
                                  </span>
                                  {c.max_discount && (
                                    <span className="text-[10px] text-neutral-500">
                                      (Max ₹{c.max_discount.toLocaleString('en-IN')})
                                    </span>
                                  )}
                                </div>

                                {evalInfo.isApplied ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded">
                                    <Check className="w-3 h-3" /> APPLIED
                                  </span>
                                ) : evalInfo.isEligible ? (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyVoucher(c.code)}
                                    disabled={isApplyingVoucher}
                                    className="px-2.5 py-1 bg-[#3F3F8F] hover:bg-black text-white text-[10px] font-bold rounded tracking-wider uppercase transition-colors"
                                  >
                                    APPLY
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyVoucher(c.code)}
                                    className="px-2 py-0.5 bg-neutral-200 text-neutral-600 text-[10px] font-semibold rounded hover:bg-neutral-300 transition-colors"
                                    title="Click to check eligibility"
                                  >
                                    DETAILS
                                  </button>
                                )}
                              </div>

                              {/* Dynamic upsell / description message */}
                              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                                {!evalInfo.isEligible ? (
                                  <p className="text-amber-800 font-medium flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                    <span>{evalInfo.descriptionText}</span>
                                  </p>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {evalInfo.savingsText && (
                                      <span className="font-semibold text-emerald-700">
                                        {evalInfo.savingsText}
                                      </span>
                                    )}
                                    {evalInfo.descriptionText && (
                                      <span className="text-neutral-500">
                                        • {evalInfo.descriptionText}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-4 border-t border-[#E7E7E7] text-xs">
                <div className="flex justify-between text-[#666666]">
                  <span>Subtotal</span>
                  <span className="text-black font-medium">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#3F3F8F] font-semibold">
                    <span>Discount ({coupon?.code})</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#666666]">
                  <span>Delivery ({selectedSpeed?.name || 'Standard'})</span>
                  <span>{shipping === 0 ? <strong className="text-[#3F3F8F]">FREE</strong> : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-black pt-3 border-t border-[#E7E7E7]">
                  <span>Total Amount</span>
                  <span className="text-[#3F3F8F] text-xl font-bold">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Terms & Conditions and Refund Policy Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-xs text-[#444444] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="accent-[#3F3F8F] w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                  />
                  <span className="leading-snug">
                    I agree to the{' '}
                    <Link to="/pages/terms" target="_blank" className="text-[#3F3F8F] underline hover:text-black font-semibold">
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/pages/refund-policy" target="_blank" className="text-[#3F3F8F] underline hover:text-black font-semibold">
                      Refund Policy
                    </Link>.
                  </span>
                </label>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isProcessing}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full py-4 text-sm font-semibold"
              >
                PAY {formatPrice(grandTotal)}
              </Button>

              <div className="pt-2 text-center text-[10px] text-[#888888] space-y-1">
                <p>100% Encrypted & Insured Checkout</p>
                <div className="flex items-center justify-center gap-1.5 text-black font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3F3F8F]" />
                  <span>Returns accepted exclusively for transit damage reported within 24h</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
