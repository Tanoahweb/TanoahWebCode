import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useUIStore } from '../../store/useUIStore';
import { isCouponAvailable } from '../../utils/formatters';

interface AnnouncementItem {
  text: string;
  code?: string;
  link: string;
}

export const AnnouncementBar: React.FC = () => {
  const { addToast } = useUIStore();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([
    { text: 'COMPLIMENTARY SHIPPING ON ALL ORDERS ABOVE ₹1,599', link: '/shop' },
    { text: 'SPRING / SUMMER 2026 EDITORIAL COLLECTION NOW LIVE', link: '/collections/all' },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadDynamicAnnouncements = useCallback(async () => {
    try {
      const [coupons, settings] = await Promise.all([
        api.getCoupons(),
        api.getStoreSettings(),
      ]);

      const threshold = Number(settings?.free_shipping_threshold || 1599);
      const freeShippingNotice: AnnouncementItem = {
        text: `COMPLIMENTARY SHIPPING ON ALL ORDERS ABOVE ₹${threshold.toLocaleString('en-IN')}`,
        link: '/shop',
      };

      const activeCoupons = (coupons || []).filter((c) => isCouponAvailable(c));

      if (activeCoupons.length > 0) {
        const dynamicCouponItems: AnnouncementItem[] = activeCoupons.map((c) => {
          let msg = '';
          if (c.description?.trim()) {
            msg = `${c.description.trim().toUpperCase()} | USE CODE: ${c.code}`;
          } else if (c.discount_type === 'percentage') {
            msg = c.min_spend && c.min_spend > 0
              ? `GET ${c.discount_value}% OFF ON ORDERS ABOVE ₹${c.min_spend.toLocaleString('en-IN')} | USE CODE: ${c.code}`
              : `ENJOY ${c.discount_value}% OFF YOUR ORDER | USE CODE: ${c.code}`;
          } else if (c.discount_type === 'fixed') {
            msg = c.min_spend && c.min_spend > 0
              ? `FLAT ₹${c.discount_value} OFF ON ORDERS ABOVE ₹${c.min_spend.toLocaleString('en-IN')} | USE CODE: ${c.code}`
              : `SAVE ₹${c.discount_value} ON YOUR ORDER | USE CODE: ${c.code}`;
          } else if (c.discount_type === 'free_shipping') {
            msg = c.min_spend && c.min_spend > 0
              ? `FREE SHIPPING ON ORDERS ABOVE ₹${c.min_spend.toLocaleString('en-IN')} | USE CODE: ${c.code}`
              : `COMPLIMENTARY EXPRESS DELIVERY | USE CODE: ${c.code}`;
          } else {
            msg = `SPECIAL OFFER | USE CODE: ${c.code}`;
          }

          const targetLink =
            c.eligible_collections && c.eligible_collections.length > 0
              ? `/collections/${c.eligible_collections[0]}`
              : '/shop';

          return {
            text: msg,
            code: c.code,
            link: targetLink,
          };
        });

        // The active promotion(s) come FIRST so customers immediately see the offer
        setAnnouncements([
          ...dynamicCouponItems,
          freeShippingNotice,
          {
            text: 'SPRING / SUMMER 2026 EDITORIAL COLLECTION NOW LIVE',
            link: '/collections/all',
          },
        ]);
      } else {
        // No active coupons: display only free shipping and brand editorial notices
        setAnnouncements([
          freeShippingNotice,
          {
            text: 'SPRING / SUMMER 2026 EDITORIAL COLLECTION NOW LIVE',
            link: '/collections/all',
          },
        ]);
      }
    } catch (e) {
      console.error('Error fetching dynamic announcements:', e);
      setAnnouncements([
        {
          text: 'COMPLIMENTARY SHIPPING ON ALL ORDERS ABOVE ₹1,599',
          link: '/shop',
        },
        {
          text: 'SPRING / SUMMER 2026 EDITORIAL COLLECTION NOW LIVE',
          link: '/collections/all',
        },
      ]);
    }
  }, []);

  useEffect(() => {
    loadDynamicAnnouncements();

    const handleUpdate = () => {
      loadDynamicAnnouncements();
    };

    window.addEventListener('tanoah_coupons_updated', handleUpdate);
    window.addEventListener('tanoah_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('tanoah_coupons_updated', handleUpdate);
      window.removeEventListener('tanoah_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [loadDynamicAnnouncements]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const current = announcements[currentIndex] || announcements[0];
  if (!current) return null;

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast({
      type: 'success',
      title: 'Code Copied!',
      description: `Promo code "${code}" copied to clipboard. Paste it at checkout!`,
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="bg-[#3F3F8F] text-white text-[11px] font-poppins tracking-widest py-2 px-4 select-none relative overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-4 text-white/70 text-[10px]">
          <span>EST. 2026</span>
          <span>•</span>
          <span>HAUTE COUTURE & PRÊT-À-PORTER</span>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <div className="inline-flex items-center gap-2 uppercase font-medium text-center transition-all duration-300">
            <span className="flex items-center gap-1.5">{current.text}</span>

            {current.code && (
              <button
                type="button"
                onClick={(e) => handleCopyCode(e, current.code!)}
                className="ml-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px] font-mono tracking-normal flex items-center gap-1 text-white border border-white/20 transition-colors cursor-pointer"
                title="Click to copy promo code"
              >
                {copiedCode === current.code ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-emerald-300" />
                    <span className="text-emerald-300 font-bold">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5 opacity-80" />
                    <span>COPY</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-white/80 text-[10px]">
          <span>INDIA (INR ₹)</span>
          <span>•</span>
          <Link to="/pages/contact" className="hover:text-white">HELP</Link>
        </div>
      </div>
    </div>
  );
};

