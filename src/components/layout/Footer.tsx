import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { addToast } = useUIStore();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
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
              <p className="text-[11px] text-white/70 font-poppins mt-0.5">On all domestic orders over ₹1,999</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="p-3 rounded-full bg-white/10 text-white shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-poppins font-semibold uppercase tracking-wider">EASY 7-DAY RETURNS</h4>
              <p className="text-[11px] text-white/70 font-poppins mt-0.5">Hassle-free exchange & doorstep pickup</p>
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
        </div>

        {/* Navigation Column 1: SHOP */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="font-wondra text-lg tracking-wider text-white">COLLECTIONS</h4>
          <ul className="space-y-2 text-xs font-poppins text-white/80">
            <li><Link to="/collections/new-arrivals" className="hover:text-white underline-offset-4 hover:underline">New Arrivals SS26</Link></li>
            <li><Link to="/collections/men" className="hover:text-white underline-offset-4 hover:underline">Men's Apparel</Link></li>
            <li><Link to="/collections/women" className="hover:text-white underline-offset-4 hover:underline">Women's Apparel</Link></li>
            <li><Link to="/collections/best-sellers" className="hover:text-white underline-offset-4 hover:underline">Best Sellers</Link></li>
            <li><Link to="/collections/sale" className="hover:text-white underline-offset-4 hover:underline">Sale & Archives</Link></li>
            <li><Link to="/lookbook" className="hover:text-white underline-offset-4 hover:underline">Editorial Lookbook</Link></li>
          </ul>
        </div>

        {/* Navigation Column 2: CLIENT SERVICES */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="font-wondra text-lg tracking-wider text-white">CLIENT SERVICES</h4>
          <ul className="space-y-2 text-xs font-poppins text-white/80">
            <li><Link to="/tracking" className="hover:text-white underline-offset-4 hover:underline">Track Your Order</Link></li>
            <li><Link to="/account/returns" className="hover:text-white underline-offset-4 hover:underline">Returns & Exchanges</Link></li>
            <li><Link to="/pages/size-guide" className="hover:text-white underline-offset-4 hover:underline">Fit & Size Guide</Link></li>
            <li><Link to="/pages/shipping-policy" className="hover:text-white underline-offset-4 hover:underline">Shipping & Delivery</Link></li>
            <li><Link to="/pages/faq" className="hover:text-white underline-offset-4 hover:underline">Frequently Asked Questions</Link></li>
            <li><Link to="/pages/contact" className="hover:text-white underline-offset-4 hover:underline">Contact Concierge</Link></li>
          </ul>
        </div>

        {/* Navigation Column 3: LEGAL & BOUTIQUE */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="font-wondra text-lg tracking-wider text-white">THE MAISON</h4>
          <ul className="space-y-2 text-xs font-poppins text-white/80">
            <li><Link to="/pages/about" className="hover:text-white underline-offset-4 hover:underline">About TANOAH</Link></li>
            <li><Link to="/pages/store-locator" className="hover:text-white underline-offset-4 hover:underline">Store Locator</Link></li>
            <li><Link to="/pages/privacy-policy" className="hover:text-white underline-offset-4 hover:underline">Privacy Policy</Link></li>
            <li><Link to="/pages/terms" className="hover:text-white underline-offset-4 hover:underline">Terms of Service</Link></li>
            <li><Link to="/pages/refund-policy" className="hover:text-white underline-offset-4 hover:underline">Refund Policy</Link></li>
          </ul>

          <div className="pt-4">
            <span className="text-[11px] font-poppins uppercase tracking-wider font-semibold text-white/90 block mb-2">
              CONCIERGE DESK
            </span>
            <p className="text-xs text-white/80 font-poppins">concierge@tanoah.com</p>
            <p className="text-xs text-white/80 font-poppins mt-0.5">+91 98765 43210 (Mon–Sat 10am–7pm)</p>
          </div>
        </div>
      </div>

      {/* Bottom Sub-footer */}
      <div className="border-t border-white/10 py-6 px-4 sm:px-6 lg:px-8 text-center md:flex md:justify-between md:items-center max-w-7xl mx-auto text-[11px] text-white/60 font-poppins">
        <div>
          © {new Date().getFullYear()} TANOAH MAISON INC. ALL RIGHTS RESERVED.
        </div>
        <div className="mt-4 md:mt-0 flex items-center justify-center gap-6">
          <Link to="/pages/privacy-policy" className="hover:text-white">PRIVACY</Link>
          <Link to="/pages/terms" className="hover:text-white">TERMS</Link>
          <Link to="/pages/shipping-policy" className="hover:text-white">SHIPPING</Link>
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-white">SITEMAP</a>
        </div>
      </div>
    </footer>
  );
};
