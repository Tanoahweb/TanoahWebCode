import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  HelpCircle,
  Ruler,
  FileText,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Accessibility,
} from 'lucide-react';

export const PolicyPage: React.FC = () => {
  const { policyType } = useParams<{ policyType: string }>();

  // --------------------------------------------------------------------------
  // Size Guide
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FAQ
  // --------------------------------------------------------------------------
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
                We strive to ship your order as quickly as possible. Standard shipping times vary by destination, with regular tracking updates delivered via SMS and email.
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">What is your return & refund policy?</h4>
              <p className="leading-relaxed">
                We accept returns and refunds exclusively for damaged items reported within 24 hours of delivery with a mandatory 360° unboxing video.
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">Do you offer Cash on Delivery (COD)?</h4>
              <p className="leading-relaxed">
                Yes, Cash on Delivery is available across most serviceable pincodes in India with a nominal handling fee.
              </p>
            </div>

            <div className="space-y-2 border-b border-[#E7E7E7] pb-4">
              <h4 className="font-semibold text-black text-sm">Are taxes included in the product price?</h4>
              <p className="leading-relaxed">
                Yes, all displayed prices are fully inclusive of Goods & Services Tax (GST 12%). A GST tax invoice is automatically generated with your order reference.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Store Locator
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 1. TERMS & CONDITIONS
  // --------------------------------------------------------------------------
  if (policyType === 'terms' || policyType === 'terms-and-conditions' || policyType === 'terms-of-service') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>LEGAL & USER AGREEMENT</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              Terms & Conditions
            </h1>
            <p className="text-xs sm:text-sm text-[#555555] mt-3 leading-relaxed">
              These Terms & Conditions govern your use of the TANOAH website and services. By accessing or using our website, you agree to be bound by these Terms. If you do not agree, you should not use our website or services.
            </p>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-[#444444] leading-relaxed">
            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Overview</h3>
              <p>
                This website is operated by TANOAH. Throughout the site, the terms “we”, “us”, and “our” refer to TANOAH. By visiting our site or purchasing from us, you engage in our Service and agree to these Terms & Conditions, including any additional policies linked on this site.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">General Conditions</h3>
              <p className="mb-2">
                We reserve the right to refuse service to anyone at any time for any reason. You understand that your content (excluding credit card information) may be transferred unencrypted over various networks. Credit card information is always encrypted during transfer.
              </p>
              <p>
                You agree not to reproduce, duplicate, copy, sell, resell, or exploit any part of the Service without our written permission. Headings used in this document are for convenience only and do not limit these Terms.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Modifications to Services and Prices</h3>
              <p>
                Prices for our products may change without prior notice. We reserve the right to modify or discontinue the Service at any time without notice. We are not liable for any changes, suspension, or discontinuation of the Service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Products and Services</h3>
              <p className="mb-2">
                Certain products may be available exclusively online and may have limited quantities. These products may only be returned or exchanged in accordance with our Return Policy.
              </p>
              <p className="mb-2">
                We make every effort to display product images and colors accurately, but we cannot guarantee that your device’s display will be accurate. We reserve the right to limit sales, discontinue products, or change descriptions and prices at any time.
              </p>
              <p>
                We do not guarantee that the quality of products or services will meet your expectations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Accuracy of Information</h3>
              <p>
                We are not responsible if information on this site is inaccurate, incomplete, or outdated. Content is provided for general use only and should not be your only source for decision-making. You agree to monitor changes to our site on your own.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Billing and Account Information</h3>
              <p>
                We may refuse or cancel any order at our discretion, including those that appear to be from resellers or distributors. You agree to provide accurate account and purchase information and promptly update your payment and contact details.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Optional Tools</h3>
              <p>
                We may provide access to third-party tools “as is” without warranties. Use of these tools is entirely at your own risk and subject to third-party terms.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Third-Party Links</h3>
              <p>
                We are not responsible for third-party websites linked from our site. Any transactions with third parties are at your own risk. Please review their policies before engaging with them.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">User Comments and Submissions</h3>
              <p className="mb-2">
                Any comments, ideas, or materials you send to us may be used by us without restriction. We are not obligated to keep submissions confidential, pay for them, or respond.
              </p>
              <p>
                You agree that your submissions will not violate any laws or rights of others and will not contain harmful or abusive content. You are responsible for your own comments.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Personal Information</h3>
              <p>
                Your personal information submitted through the store is governed by our Privacy Policy.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Errors and Inaccuracies</h3>
              <p>
                We reserve the right to correct any errors or update information without prior notice, even after you place an order. We are not obligated to update any information unless required by law.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Prohibited Uses</h3>
              <p>
                You are prohibited from using our site for unlawful purposes, to harm others, violate intellectual property, send malicious code, spam, collect data illegally, or interfere with security features. We may terminate your access if you violate these rules.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Disclaimer of Warranties</h3>
              <p className="mb-2">
                We do not guarantee uninterrupted or error-free service. Our Service and products are provided “as is” without warranties of any kind. Your use of the Service is at your own risk.
              </p>
              <p>
                We are not liable for any damages, including loss of data, revenue, profits, or other losses arising from the use of our Service or products.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Indemnification</h3>
              <p>
                You agree to defend and indemnify TANOAH against any claims arising from your breach of these Terms or violation of any law or third-party rights.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Severability</h3>
              <p>
                If any part of these Terms is found to be unenforceable, the remaining provisions will still apply.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Termination</h3>
              <p>
                We may suspend or terminate your access at any time if you violate these Terms. You remain responsible for any payments due up to the termination date.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Entire Agreement</h3>
              <p>
                These Terms along with any policies posted on our site form the entire agreement between you and TANOAH and replace any prior agreements.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Governing Law</h3>
              <p>
                These Terms are governed by the laws of India.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Changes to Terms</h3>
              <p>
                We may update these Terms at any time. You are responsible for checking this page regularly. Continued use of the site means you accept any changes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Dispute Resolution</h3>
              <p>
                Any disputes will be resolved under the jurisdiction of Ernakulam, India.
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-5 rounded-[4px] border border-[#E7E7E7] space-y-1.5">
              <h3 className="font-semibold text-black text-sm sm:text-base flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#3F3F8F]" /> Care Instructions
              </h3>
              <p className="text-neutral-700">
                For best results, dry clean only. If hand washing, use cold water and mild detergent. Do not soak, bleach, or wring. Dry in shade. Steam or iron on low heat with a cloth. Handle handcrafted pieces with care.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. PRIVACY POLICY
  // --------------------------------------------------------------------------
  if (policyType === 'privacy-policy' || policyType === 'privacy') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DATA PROTECTION & PRIVACY</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-[#555555] mt-3 leading-relaxed">
              At Tanoah, your privacy is our priority. We respect and protect your personal information and ensure it is handled securely. This policy explains how we collect, use, and safeguard your data when you interact with us.
            </p>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-[#444444] leading-relaxed">
            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Information We Collect</h3>
              <p className="mb-2">We collect the following types of information to process orders and enhance your shopping experience:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Personal Details:</strong> Name, email, contact number, billing and shipping address.
                </li>
                <li>
                  <strong>Payment Details:</strong> We do not store card information. Payments are processed securely via trusted third-party gateways.
                </li>
                <li>
                  <strong>Technical Data:</strong> Browser type, device details, pages visited, and referral links — used to improve performance and usability.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Use of Information</h3>
              <p className="mb-2">Your information helps us:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-3">
                <li>Process and deliver your orders</li>
                <li>Communicate updates, offers, and customer support</li>
                <li>Improve our products and website</li>
                <li>Send promotional updates (only if you opt in)</li>
              </ul>
              <p className="font-medium text-black">
                We do not sell, rent, or misuse your personal information.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Cookies & Tracking</h3>
              <p className="mb-2">We use cookies to:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-3">
                <li>Remember your preferences</li>
                <li>Personalize your shopping experience</li>
                <li>Analyze website performance</li>
              </ul>
              <p className="text-[#666666]">
                You can disable cookies through your browser settings anytime.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Data Security & Third-Party Access</h3>
              <p className="mb-3">
                We employ industry-standard measures to protect your data. While no system is completely secure, we continuously improve our practices.
              </p>
              <p className="mb-2">Trusted third parties may access limited information to provide:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-3">
                <li>Payment processing</li>
                <li>Delivery and logistics</li>
                <li>Email communications and analytics</li>
              </ul>
              <p className="text-[#666666]">
                These partners are obligated to protect your data and use it only as necessary.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Communications & Children’s Privacy</h3>
              <p className="mb-2">We contact you for:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-3">
                <li>Order confirmations and updates</li>
                <li>Customer service</li>
                <li>Exclusive offers (only if you subscribe)</li>
              </ul>
              <p className="mb-2 text-[#666666]">
                You may unsubscribe from promotional emails anytime.
              </p>
              <p className="text-[#666666]">
                Our website is not intended for children under 13 years, and we do not knowingly collect their data.
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-5 rounded-[4px] border border-[#E7E7E7] space-y-2">
              <h3 className="font-semibold text-black text-sm sm:text-base">Policy Updates & Contact</h3>
              <p>
                We may revise this Privacy Policy to meet legal or operational changes. Updates will be posted here, and continued site use implies acceptance of changes.
              </p>
              <div className="pt-2">
                <strong className="text-black block">Tanoah – Privacy Support</strong>
                <a
                  href="mailto:connectus.tanoah@gmail.com"
                  className="text-[#3F3F8F] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>connectus.tanoah@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. SHIPPING POLICY
  // --------------------------------------------------------------------------
  if (policyType === 'shipping-policy' || policyType === 'shipping' || policyType === 'shipping-and-delivery') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>DISPATCH & CARRIER TIMEFRAMES</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              Shipping Policy
            </h1>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-[#444444] leading-relaxed">
            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Shipping Charges</h3>
              <p>
                Shipping charges are calculated based on the weight, dimensions, and destination of your order. The shipping cost will be displayed during the checkout process before you finalize your order.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Shipping & Delivery Timeframes</h3>
              <p>
                We strive to ship your order as quickly as possible, and any delays will be communicated to you promptly. While we aim to deliver all orders within the specified timeframe, occasional delays may occur due to unforeseen circumstances such as weather conditions, carrier delays, or other factors beyond our control. In such cases, we will do our best to keep you informed and minimize any inconvenience.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">Shipping Method</h3>
              <p>
                We offer standard shipping through trusted carriers. Delivery times may vary depending on your location.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. REFUND POLICY (Return and exchange)
  // --------------------------------------------------------------------------
  if (
    policyType === 'refund-policy' ||
    policyType === 'refund' ||
    policyType === 'returns-policy' ||
    policyType === 'return-and-exchange' ||
    policyType === 'returns'
  ) {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETURNS & CANCELLATIONS</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              Refund Policy
            </h1>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-[#444444] leading-relaxed">
            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Eligibility for Return & Refund</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  We accept returns and refunds <strong>only for damaged products</strong>. To initiate a return and refund, send us a <strong>360° opening video</strong> showing the damage along with the package.
                </li>
                <li>
                  <strong>No size exchanges are allowed</strong>, so please choose your size carefully from our size chart.
                </li>
                <li>
                  We will entertain return requests <strong>only if reported within 24 hours</strong> of receiving the parcel.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Return Process</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  In case of return, we do not have a return pickup facility; therefore, the parcel must be sent by the customer to our address.
                </li>
                <li>
                  Refund will be provided within <strong>7 days</strong> if the product is delivered in a defective/damaged condition or different from the ordered item.
                </li>
                <li>
                  Otherwise, no return or refund is available.
                </li>
                <li>
                  <strong>No refund will be initiated if the price tag is removed or damaged.</strong>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Exclusions</h3>
              <p>
                Return and Refund Policies do not apply to Wholesale selling partners.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 5. ACCESSIBILITY STATEMENT
  // --------------------------------------------------------------------------
  if (policyType === 'accessibility' || policyType === 'accessibility-statement') {
    return (
      <div className="w-full bg-white font-poppins min-h-screen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="border-b border-[#E7E7E7] pb-6">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <Accessibility className="w-3.5 h-3.5" />
              <span>INCLUSIVITY & WEB STANDARDS</span>
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
              Accessibility Statement
            </h1>
            <p className="text-xs text-[#888888] mt-1.5">
              This statement was last updated on Nov 2025.
            </p>
            <p className="text-xs sm:text-sm text-[#555555] mt-2 leading-relaxed">
              We at Tanoah are working to make our site{' '}
              <a href="https://www.tanoah.com" target="_blank" rel="noreferrer" className="text-[#3F3F8F] underline">
                www.tanoah.com
              </a>{' '}
              accessible to people with disabilities.
            </p>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-[#444444] leading-relaxed">
            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">What web accessibility is</h3>
              <p>
                An accessible site allows visitors with disabilities to browse the site with the same or a similar level of ease and enjoyment as other visitors. This can be achieved with the capabilities of the system on which the site is operating, and through assistive technologies.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Accessibility adjustments on this site</h3>
              <p className="mb-3">
                We have adapted this site in accordance with WCAG 2.1 guidelines, and have made the site accessible to the level of AA . This site's contents have been adapted to work with assistive technologies, such as screen readers and keyboard use. As part of this effort, we have also:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Used the Accessibility Wizard to find and fix potential accessibility issues</li>
                <li>Set the language of the site</li>
                <li>Set the content order of the site’s pages</li>
                <li>Defined clear heading structures on all of the site’s pages</li>
                <li>Added alternative text to images</li>
                <li>Implemented color combinations that meet the required color contrast</li>
                <li>Reduced the use of motion on the site</li>
                <li>Ensured all videos, audio, and files on the site are accessible</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-black text-sm sm:text-base mb-1.5">
                Declaration of partial compliance with the standard due to third-party content
              </h3>
              <p>
                The accessibility of certain pages on the site depend on contents that do not belong to the organization, and instead belong to wix store. We therefore declare partial compliance with the standard for these pages.
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-5 rounded-[4px] border border-[#E7E7E7] space-y-2">
              <h3 className="font-semibold text-black text-sm sm:text-base">Requests, issues and suggestions</h3>
              <p>
                If you find an accessibility issue on the site, or if you require further assistance, you are welcome to contact us through the organization's accessibility coordinator:
              </p>
              <div className="pt-2 space-y-1">
                <strong className="text-black block text-sm">Abijith Devanandan</strong>
                <p className="flex items-center gap-2 text-neutral-700">
                  <Phone className="w-3.5 h-3.5 text-[#3F3F8F]" />
                  <span>8714141849</span>
                </p>
                <p className="flex items-center gap-2 text-neutral-700">
                  <Mail className="w-3.5 h-3.5 text-[#3F3F8F]" />
                  <a href="mailto:connectus.tanoah@gmail.com" className="text-[#3F3F8F] font-semibold hover:underline">
                    connectus.tanoah@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Default fallback policy
  // --------------------------------------------------------------------------
  return (
    <div className="w-full bg-white font-poppins min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
        <div className="border-b border-[#E7E7E7] pb-6">
          <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
            LEGAL & CLIENT COMMITMENT
          </span>
          <h1 className="font-wondra text-3xl sm:text-4xl text-black mt-1">
            TANOAH STORE POLICIES
          </h1>
        </div>

        <div className="prose max-w-none text-xs sm:text-sm text-[#555555] leading-relaxed space-y-4">
          <p>Please select a specific policy from the links below:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><Link to="/pages/terms" className="text-[#3F3F8F] underline">Terms & Conditions</Link></li>
            <li><Link to="/pages/privacy-policy" className="text-[#3F3F8F] underline">Privacy Policy</Link></li>
            <li><Link to="/pages/shipping-policy" className="text-[#3F3F8F] underline">Shipping Policy</Link></li>
            <li><Link to="/pages/refund-policy" className="text-[#3F3F8F] underline">Refund Policy</Link></li>
            <li><Link to="/pages/accessibility" className="text-[#3F3F8F] underline">Accessibility Statement</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
