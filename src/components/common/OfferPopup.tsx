import React, { useState, useEffect } from 'react';
import { X, Clock, ShoppingBag, Mail, Loader2, Check } from 'lucide-react';
import { useOfferPopupStore } from '../../store/useOfferPopupStore';
import { useCartStore } from '../../store/useCartStore';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { useLocation } from 'react-router-dom';
import { getLenis } from '../../animations/smoothScroll';

export const OfferPopup: React.FC = () => {
  const location = useLocation();
  const {
    config,
    isOpen,
    openPopup,
    closePopup,
    dismissPopup,
    shouldShowPopup,
    fetchConfig,
  } = useOfferPopupStore();

  const { applyCoupon } = useCartStore();
  const { addToast } = useUIStore();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initial config load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Handle 3-second delay trigger after initial page load (excluding /admin)
  useEffect(() => {
    // Never show inside the admin panel
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    if (!shouldShowPopup()) {
      return;
    }

    const delayMs = Math.max(0, (config.delaySeconds ?? 3) * 1000);
    const timer = setTimeout(() => {
      if (!location.pathname.startsWith('/admin') && shouldShowPopup()) {
        openPopup();
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [config.delaySeconds, config.isEnabled, config.frequency, location.pathname, shouldShowPopup, openPopup]);

  // Handle body scroll lock & Lenis pause
  useEffect(() => {
    const lenis = getLenis();
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      lenis?.stop();
    } else {
      document.body.style.overflow = '';
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = '';
      lenis?.start();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!config.couponCode) return;
    try {
      navigator.clipboard.writeText(config.couponCode);
      setCopied(true);
      addToast({
        type: 'info',
        title: 'Code Copied',
        description: `Promo code "${config.couponCode}" copied to clipboard.`,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleUnlockOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Subscribe email to newsletter if provided
      if (email && email.includes('@')) {
        try {
          await api.subscribeNewsletter(email.trim());
        } catch (subErr) {
          console.warn('Newsletter subscription notice:', subErr);
        }
      }

      // 2. Apply promo code to cart automatically
      if (config.couponCode) {
        applyCoupon({
          id: `coupon_${config.couponCode.toLowerCase()}`,
          code: config.couponCode.toUpperCase(),
          description: config.headlineText || 'Special Offer',
          discount_type: 'percentage',
          discount_value: 20,
          is_active: true,
          is_automatic: true,
        });

        try {
          navigator.clipboard.writeText(config.couponCode);
        } catch {}
      }

      // 3. Trigger celebratory toast
      addToast({
        type: 'success',
        title: 'Offer Unlocked',
        description: config.successMessage || `Code ${config.couponCode} applied to your cart!`,
      });

      // 4. Dismiss modal & record session cooldown
      dismissPopup();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'Unable to unlock offer. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    dismissPopup();
  };

  const hasImage = Boolean(config.showImage && config.imageUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      {/* Modal Container */}
      <div
        data-lenis-prevent="true"
        className={`relative w-full bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden transition-all transform animate-scale-up ${
          hasImage ? 'max-w-[760px] md:max-w-[800px]' : 'max-w-[440px]'
        }`}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close offer popup"
          className="absolute top-3.5 right-3.5 z-20 p-2 text-neutral-400 hover:text-black hover:bg-neutral-100/80 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`w-full ${hasImage ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col'}`}>
          {/* Visual Column / Top Image on Mobile */}
          {hasImage && (
            <div className="relative w-full h-[220px] sm:h-[260px] md:h-full md:min-h-[460px] bg-[#F5F2ED] overflow-hidden">
              <img
                src={config.imageUrl}
                alt={config.imageAlt || 'Special Offer'}
                className="w-full h-full object-cover object-top md:object-center"
              />
              {/* Subtle ambient gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent md:hidden pointer-events-none" />
            </div>
          )}

          {/* Offer Content Column */}
          <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 md:p-10 bg-white font-poppins">
            {/* Pill Badge */}
            {config.showBadge && (
              <div className="inline-flex items-center gap-1.5 border border-[#191846] text-[#191846] px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase mb-3">
                {config.showBadgeIcon && <Clock className="w-3.5 h-3.5 stroke-[2]" />}
                <span>{config.badgeText || 'LIMITED TIME'}</span>
              </div>
            )}

            {/* Subtitle */}
            {config.showSubtitle && (
              <div className="text-[11px] sm:text-xs font-bold text-[#111111] tracking-[0.2em] uppercase mb-1.5">
                {config.subtitleText || 'SPECIAL OFFER'}
              </div>
            )}

            {/* Main Headline */}
            {config.showHeadline && (
              <h2 className="font-serif text-3xl sm:text-4xl text-[#191846] font-normal tracking-tight leading-tight mb-1">
                {config.headlineText || 'Get 20% OFF'}
              </h2>
            )}

            {/* Description Subtext */}
            {config.showDescription && (
              <p className="text-xs sm:text-sm text-neutral-600 font-normal mb-3">
                {config.descriptionText || 'on your first order'}
              </p>
            )}

            {/* Elegant Divider with Shopping Bag */}
            {config.showDivider && (
              <div className="w-full max-w-[260px] flex items-center justify-center gap-3 my-2 text-neutral-300">
                <div className="flex-1 h-[1px] bg-neutral-200" />
                <ShoppingBag className="w-4 h-4 text-neutral-400 stroke-[1.5]" />
                <div className="flex-1 h-[1px] bg-neutral-200" />
              </div>
            )}

            {/* Coupon Code Callout */}
            {config.showCouponCode && (
              <div
                onClick={handleCopyCode}
                title="Click to copy promo code"
                className="group flex items-center justify-center gap-1.5 text-xs sm:text-sm text-neutral-700 font-medium my-2 cursor-pointer transition-colors"
              >
                <span>{config.couponLabel || 'Use code: '}</span>
                <span className="font-bold text-[#191846] tracking-wider group-hover:underline underline-offset-2">
                  {config.couponCode || 'STYLE20'}
                </span>
                {copied && <Check className="w-3.5 h-3.5 text-emerald-600 ml-1 inline" />}
              </div>
            )}

            {/* Form Section */}
            <form onSubmit={handleUnlockOffer} className="w-full max-w-[280px] sm:max-w-[300px] mt-2 space-y-3">
              {/* Email Input */}
              {config.showEmailInput && (
                <div className="relative w-full">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={config.emailPlaceholder || 'Enter your email'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-[4px] text-xs text-black placeholder:text-neutral-400 focus:outline-none focus:border-[#191846] focus:ring-1 focus:ring-[#191846] transition-all"
                  />
                </div>
              )}

              {/* Primary Unlock Button */}
              {config.showButton && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 sm:py-3 bg-[#191846] hover:bg-[#252362] active:scale-[0.99] text-white font-semibold text-xs tracking-widest uppercase rounded-[4px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>UNLOCKING...</span>
                    </>
                  ) : (
                    <span>{config.buttonText || 'UNLOCK OFFER'}</span>
                  )}
                </button>
              )}
            </form>

            {/* Dismiss Link */}
            {config.showDismissLink && (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] sm:text-xs text-neutral-500 hover:text-black underline underline-offset-4 mt-4 transition-colors cursor-pointer"
              >
                {config.dismissText || 'No thanks'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferPopup;
