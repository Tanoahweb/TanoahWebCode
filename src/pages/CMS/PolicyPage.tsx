import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Truck, RotateCcw, HelpCircle, Ruler } from 'lucide-react';

export const PolicyPage: React.FC = () => {
  const { policyType } = useParams<{ policyType: string }>();

  if (policyType === 'size-guide') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              <span>ATELIER MEASUREMENTS & SIZING</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              FIT & SIZE SPECIFICATION GUIDE
            </h1>
            <p className="text-xs text-[#666666] mt-2">
              All TANOAH garments are tailored to Indian body measurements with contemporary global drape ergonomics.
            </p>
          </div>

          <div className="space-y-6 text-xs text-[#444444]">
            <h3 className="font-wondra text-xl text-black">1. MEN'S APPAREL SIZING (INCHES)</h3>
            <div className="overflow-x-auto border border-[#E7E7E7] rounded-[4px]">
              <table className="w-full text-left">
                <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Chest (in)</th>
                    <th className="p-3.5">Shoulder (in)</th>
                    <th className="p-3.5">Length (in)</th>
                    <th className="p-3.5">Waist (Trousers)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  <tr><td className="p-3.5 font-bold text-black">S</td><td className="p-3.5">38 – 40</td><td className="p-3.5">18.5</td><td className="p-3.5">28.0</td><td className="p-3.5">30 – 31 in</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">M</td><td className="p-3.5">41 – 43</td><td className="p-3.5">19.5</td><td className="p-3.5">29.0</td><td className="p-3.5">32 – 33 in</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">L</td><td className="p-3.5">44 – 46</td><td className="p-3.5">20.5</td><td className="p-3.5">30.0</td><td className="p-3.5">34 – 35 in</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">XL</td><td className="p-3.5">47 – 49</td><td className="p-3.5">21.5</td><td className="p-3.5">31.0</td><td className="p-3.5">36 – 38 in</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">XXL</td><td className="p-3.5">50 – 52</td><td className="p-3.5">22.5</td><td className="p-3.5">31.5</td><td className="p-3.5">39 – 40 in</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-wondra text-xl text-black pt-4">2. WOMEN'S APPAREL SIZING (INCHES)</h3>
            <div className="overflow-x-auto border border-[#E7E7E7] rounded-[4px]">
              <table className="w-full text-left">
                <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Bust (in)</th>
                    <th className="p-3.5">Waist (in)</th>
                    <th className="p-3.5">Hip (in)</th>
                    <th className="p-3.5">Blouse / Dress Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  <tr><td className="p-3.5 font-bold text-black">XS</td><td className="p-3.5">32 – 33</td><td className="p-3.5">25 – 26</td><td className="p-3.5">35 – 36</td><td className="p-3.5">Standard Atelier</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">S</td><td className="p-3.5">34 – 35</td><td className="p-3.5">27 – 28</td><td className="p-3.5">37 – 38</td><td className="p-3.5">Standard Atelier</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">M</td><td className="p-3.5">36 – 37</td><td className="p-3.5">29 – 30</td><td className="p-3.5">39 – 40</td><td className="p-3.5">Standard Atelier</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">L</td><td className="p-3.5">38 – 40</td><td className="p-3.5">31 – 33</td><td className="p-3.5">41 – 43</td><td className="p-3.5">Standard Atelier</td></tr>
                  <tr><td className="p-3.5 font-bold text-black">XL</td><td className="p-3.5">41 – 43</td><td className="p-3.5">34 – 36</td><td className="p-3.5">44 – 46</td><td className="p-3.5">Standard Atelier</td></tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] mt-4 space-y-1">
              <strong className="text-black block text-xs">NEED TAILORING ADVICE?</strong>
              <p className="text-[11px] text-[#666666]">
                Our styling advisors are on hand to guide you to the perfect cut. Contact us on WhatsApp at +91 98765 43210 or email concierge@tanoah.com.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (policyType === 'faq') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FREQUENTLY ASKED QUESTIONS</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              CLIENT CONCIERGE HELP
            </h1>
          </div>

          <div className="space-y-6 text-xs text-[#555555]">
            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">How long does delivery take?</h4>
              <p className="leading-relaxed">
                Orders are dispatched from our Mumbai atelier within 24–48 hours via BlueDart Express Air. Metro deliveries typically arrive within 2–3 business days, while other destinations arrive within 3–5 business days.
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">What is your return & exchange policy?</h4>
              <p className="leading-relaxed">
                We offer a complimentary 7-day doorstep size exchange and return service. You can initiate a request directly from your <Link to="/account/returns" className="text-[#3F3F8F] underline">Account Returns Portal</Link>.
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">Do you offer Cash on Delivery (COD)?</h4>
              <p className="leading-relaxed">
                Yes, Cash on Delivery is available across most serviceable pincodes in India for orders up to ₹15,000.
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">Are taxes included in the product price?</h4>
              <p className="leading-relaxed">
                Yes, all displayed prices are fully inclusive of Indian Goods & Services Tax (GST 12%). A GST tax invoice is automatically generated with your order reference.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (policyType === 'store-locator') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>BOUTIQUE & ATELIER PRESENCE</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              FLAGSHIP ATELIER STUDIOS
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-6 border border-[#E7E7E7] rounded-[4px] bg-[#FAFAFA] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-wondra text-xl text-black">MUMBAI FLAGSHIP</h3>
                <span className="bg-[#3F3F8F] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">MAIN ATELIER</span>
              </div>
              <p className="text-[#666666]">
                Worli Sea Face, Worli, Mumbai 400018, Maharashtra, India
              </p>
              <div className="space-y-1 text-[#555555] pt-2 border-t border-[#E7E7E7]">
                <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#3F3F8F]" /> Mon – Sat: 11:00 AM – 8:00 PM</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#3F3F8F]" /> +91 98765 43210</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#3F3F8F]" /> concierge@tanoah.com</p>
              </div>
            </div>

            <div className="p-6 border border-[#E7E7E7] rounded-[4px] bg-[#FAFAFA] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-wondra text-xl text-black">NEW DELHI SUITE</h3>
                <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">BY APPOINTMENT</span>
              </div>
              <p className="text-[#666666]">
                The Chanakya, Chanakyapuri, New Delhi 110021, India
              </p>
              <div className="space-y-1 text-[#555555] pt-2 border-t border-[#E7E7E7]">
                <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#3F3F8F]" /> Tue – Sun: 11:30 AM – 7:30 PM</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#3F3F8F]" /> +91 98765 43211</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#3F3F8F]" /> delhi@tanoah.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    switch (policyType) {
      case 'shipping-policy': return 'SHIPPING & COMPLIMENTARY DELIVERY POLICY';
      case 'returns-policy': return '7-DAY RETURNS & BESPOKE EXCHANGE POLICY';
      case 'refund-policy': return 'REFUND & PAYMENT SETTLEMENT POLICY';
      case 'privacy-policy': return 'PRIVACY & DATA PROTECTION POLICY';
      case 'terms': return 'TERMS & CONDITIONS OF SERVICE';
      default: return 'TANOAH MAISON STORE POLICY';
    }
  };

  return (
    <div className="w-full bg-white font-poppins min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
        <div className="border-b border-[#E7E7E7] pb-6">
          <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
            LEGAL & CLIENT COMMITMENT
          </span>
          <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
            {getTitle()}
          </h1>
        </div>

        <div className="prose max-w-none text-xs sm:text-sm text-[#555555] leading-relaxed space-y-4 font-light">
          <p>
            At <strong>TANOAH</strong>, we are committed to delivering an exceptional, transparent luxury experience for all our patrons across India and worldwide.
          </p>
          <h3 className="font-wondra text-xl text-black font-normal pt-2">1. COMPLIMENTARY SHIPPING & TIMELINES</h3>
          <p>
            All domestic orders with a basket value over ₹1,999 qualify for complimentary insured air delivery via BlueDart Express or Delhivery. Orders below ₹1,999 incur a flat fee of ₹149. Most domestic shipments arrive within 2–5 business days depending on location.
          </p>
          <h3 className="font-wondra text-xl text-black font-normal pt-2">2. 7-DAY DOORSTEP RETURNS & EXCHANGES</h3>
          <p>
            If a garment does not fit as desired, you may initiate a doorstep size exchange or return within 7 calendar days of receipt. The garment must remain in unworn, unwashed condition with all woven brand tags attached.
          </p>
          <h3 className="font-wondra text-xl text-black font-normal pt-2">3. REFUNDS & SECURITY</h3>
          <p>
            Approved refunds are credited directly back to the original source method (Razorpay / UPI / Card) within 3–5 banking days after receipt at our atelier inspection facility.
          </p>
        </div>
      </div>
    </div>
  );
};
export default PolicyPage;
