import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { DEFAULT_NAVIGATION_CONFIG } from '../../data/defaultNavigation';
import { api } from '../../services/api';
import { validateEmail } from '../../utils/validation';

const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/_tanoah_/';
const DEFAULT_FACEBOOK_URL = 'https://www.facebook.com/people/Tanoah/61583636080509/';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1599);
  const [socialLinks, setSocialLinks] = useState({
    instagram: DEFAULT_INSTAGRAM_URL,
    facebook: DEFAULT_FACEBOOK_URL,
  });
  const { addToast } = useUIStore();
  const { config, hasLoaded, fetchNavigation } = useNavigationStore();

  useEffect(() => {
    if (!hasLoaded) {
      fetchNavigation();
    }
    const loadSettings = async () => {
      try {
        const settings = await api.getStoreSettings();
        if (settings?.free_shipping_threshold) {
          setFreeShippingThreshold(Number(settings.free_shipping_threshold));
        }
        const insta =
          settings?.instagram_url ||
          settings?.seo_config?.social_links?.instagram ||
          DEFAULT_INSTAGRAM_URL;
        const fb =
          settings?.facebook_url ||
          settings?.seo_config?.social_links?.facebook ||
          DEFAULT_FACEBOOK_URL;
        setSocialLinks({
          instagram: insta,
          facebook: fb,
        });
      } catch {}
    };
    loadSettings();

    const handleUpdate = () => loadSettings();
    window.addEventListener('tanoah_settings_updated', handleUpdate);
    return () => window.removeEventListener('tanoah_settings_updated', handleUpdate);
  }, [hasLoaded, fetchNavigation]);

  const activeColumns = (config?.footer_menu && config.footer_menu.length > 0
    ? config.footer_menu
    : DEFAULT_NAVIGATION_CONFIG.footer_menu || []
  )
    .filter((col) => col.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const bottomLinks = (config?.footer_bottom_links && config.footer_bottom_links.length > 0
    ? config.footer_bottom_links
    : DEFAULT_NAVIGATION_CONFIG.footer_bottom_links || []
  )
    .filter((l) => l.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        description: emailCheck.error || 'Please enter a valid email address.',
      });
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await api.subscribeNewsletter(email);
      addToast({
        type: 'success',
        title: 'Welcome to TANOAH Privé',
        description: res.message,
      });
      setEmail('');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Subscription Failed',
        description: err.message || 'Please try again later.',
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-[#3F3F8F] text-white">
      {/* Trust Badges Banner */}
      <div className="border-b border-white/10 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-white/10 text-white shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-poppins font-semibold uppercase tracking-wider">COMPLIMENTARY SHIPPING</h4>
              <p className="text-[11px] text-white/70 font-poppins mt-0.5">On all domestic orders over ₹{freeShippingThreshold.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-white/10 text-white shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-poppins font-semibold uppercase tracking-wider">QUALITY GUARANTEE</h4>
              <p className="text-[11px] text-white/70 font-poppins mt-0.5">Transit damage covered · 24h 360° video verification</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-white/10 text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-poppins font-semibold uppercase tracking-wider">SECURE PAYMENTS</h4>
              <p className="text-[11px] text-white/70 font-poppins mt-0.5">UPI, Cards, NetBanking & Razorpay 256-bit SSL</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-white/10 text-white shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-poppins font-semibold uppercase tracking-wider">100% AUTHENTIC</h4>
              <p className="text-[11px] text-white/70 font-poppins mt-0.5">Artisanal tailoring & premium fabrics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Story */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Brand Story & Newsletter */}
        <div className="md:col-span-4 space-y-6">
          <Link to="/" className="inline-block">
            <img
              src="/Assets/brand/logo-white.png"
              alt="TANOAH"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p className="text-xs font-poppins text-white/80 leading-relaxed max-w-sm">
            TANOAH embodies contemporary luxury fashion, marrying timeless tailoring with bold modern silhouettes. Crafted with uncompromising attention to detail.
          </p>

          <form onSubmit={handleSubscribe} className="space-y-2 pt-2">
            <label className="text-[11px] font-poppins tracking-wider uppercase font-semibold text-white block">
              SUBSCRIBE TO TANOAH PRIVÉ
            </label>
            <div className="flex items-center border border-white/30 rounded-[4px] overflow-hidden bg-white/5 focus-within:border-white transition-colors">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-transparent px-4 py-2.5 text-xs text-white placeholder-white/50 focus:outline-none font-poppins"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-white text-[#3F3F8F] font-semibold hover:bg-[#EEEEF8] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Subscribe"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-white/60">
              By subscribing you agree to our Terms and Privacy Policy.
            </p>
          </form>

          {/* Social Media Links */}
          <div className="pt-2">
            <span className="text-[11px] font-poppins tracking-wider uppercase font-semibold text-white/90 block mb-3">
              FOLLOW OUR JOURNEY
            </span>
            <div className="flex items-center gap-3">
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Follow Tanoah on Instagram"
                title="Follow Tanoah on Instagram"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-[#3F3F8F] flex items-center justify-center transition-all duration-200 border border-white/15 hover:border-white shadow-sm hover:scale-105"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Follow Tanoah on Facebook"
                title="Follow Tanoah on Facebook"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-[#3F3F8F] flex items-center justify-center transition-all duration-200 border border-white/15 hover:border-white shadow-sm hover:scale-105"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Dynamic Footer Menu Columns */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {activeColumns.map((column, colIdx) => {
            const activeLinks = (column.links || [])
              .filter((l) => l.is_active)
              .sort((a, b) => a.sort_order - b.sort_order);

            const isLastCol = colIdx === activeColumns.length - 1;

            return (
              <div key={column.id} className="space-y-4">
                <h4 className="font-wondra text-lg tracking-wider text-white uppercase">
                  {column.title}
                </h4>
                <ul className="space-y-2 text-xs font-poppins text-white/80">
                  {activeLinks.map((link) => {
                    const isExt = link.url.startsWith('http') || link.open_in_new_tab;
                    return (
                      <li key={link.id}>
                        {isExt ? (
                          <a
                            href={link.url}
                            target={link.open_in_new_tab ? '_blank' : undefined}
                            rel={link.open_in_new_tab ? 'noreferrer noopener' : undefined}
                            className="hover:text-white underline-offset-4 hover:underline transition-colors"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            to={link.url}
                            className="hover:text-white underline-offset-4 hover:underline transition-colors"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Show Customer Care Desk on the last column */}
                {isLastCol && (
                  <div className="pt-4 border-t border-white/10 mt-6">
                    <span className="text-[11px] font-poppins uppercase tracking-wider font-semibold text-white/90 block mb-2">
                      CUSTOMER CARE DESK
                    </span>
                    <p className="text-xs text-white/80 font-poppins">connectus.tanoah@gmail.com</p>
                    <p className="text-xs text-white/80 font-poppins mt-0.5">+91 8714141849 (Mon–Sat 10am–7pm)</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sub-footer */}
      <div className="border-t border-white/10 py-6 px-4 sm:px-6 lg:px-8 text-center md:flex md:justify-between md:items-center max-w-7xl mx-auto text-[11px] text-white/60 font-poppins">
        <div>
          © {new Date().getFullYear()} TANOAH. ALL RIGHTS RESERVED.
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center justify-center gap-6">
          {bottomLinks.map((link) => {
            const isExt = link.url.startsWith('http') || link.url.endsWith('.xml') || link.open_in_new_tab;
            return isExt ? (
              <a
                key={link.id}
                href={link.url}
                target={link.open_in_new_tab ? '_blank' : undefined}
                rel={link.open_in_new_tab ? 'noreferrer noopener' : undefined}
                className="hover:text-white uppercase transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.id}
                to={link.url}
                className="hover:text-white uppercase transition-colors"
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
