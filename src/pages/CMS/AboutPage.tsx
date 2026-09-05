import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Feather, Leaf, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full bg-[#FCFCFB] text-[#1A1A1A] font-poppins min-h-screen selection:bg-[#3F3F8F] selection:text-white">
      {/* 1. Header & Hero Introduction */}
      <section className="pt-24 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#3F3F8F]/10 border border-[#3F3F8F]/20 text-[#3F3F8F] text-[11px] font-medium tracking-[0.2em] uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Maison Story</span>
          </div>

          <h1 className="font-wondra text-4xl sm:text-5xl lg:text-6xl text-[#111111] tracking-tight leading-[1.15]">
            ABOUT TANOAH
          </h1>

          <p className="text-sm sm:text-base text-[#666666] max-w-2xl mx-auto leading-relaxed font-light">
            Where digital precision meets artful drapery. An intentional journey from code to couture.
          </p>
        </div>

        {/* Hero Image Showcase */}
        <div className="mt-10 sm:mt-14 relative rounded-xl overflow-hidden border border-[#EBEBE8] shadow-sm group">
          <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-[#F0EFEA]">
            <img
              src="/Assets/about/atelier-story.jpg"
              alt="TANOAH Atelier - Sketches, Natural Fibres & Creative Studio"
              className="w-full h-full object-cover object-center transform group-hover:scale-102 transition-transform duration-700 ease-out"
              loading="eager"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-white">
            <div>
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-white/80 font-medium">
                Atelier TANOAH
              </span>
              <p className="text-base sm:text-xl font-light tracking-wide mt-0.5">
                Translating logic, geometry, and passion into timeless silhouettes.
              </p>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium rounded hover:bg-[#3F3F8F] hover:text-white transition-colors duration-300 shadow-lg"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Chapter 1: The Genesis — From Code to Couture */}
      <section className="py-16 sm:py-24 border-t border-[#EFEFED] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Story Content Left */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-[#3F3F8F] font-semibold">
                  Founding Origins
                </span>
                <h2 className="font-wondra text-3xl sm:text-4xl text-[#111111] leading-tight">
                  CODE IN MIND, COUTURE AT HEART
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                Three Medical Coding professionals, united by creativity beyond the screen, always
                believed that style is a language even more expressive than code. While they search
                codes in the digital world, their hearts were still drawn to the rich textures,
                colors, and craftsmanship.
              </p>

              {/* Quote callout */}
              <div className="p-6 bg-[#FBFBFA] border-l-2 border-[#3F3F8F] rounded-r-lg space-y-2">
                <p className="italic text-sm sm:text-base text-[#222222] font-normal leading-relaxed">
                  &ldquo;Style is a human algorithm—an authentic expression that transcends data
                  to touch texture, emotion, and individuality.&rdquo;
                </p>
                <p className="text-[11px] uppercase tracking-widest text-[#888888] font-medium">
                  — The Founders of Tanoah
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/lookbook"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] text-white text-xs uppercase tracking-widest font-medium rounded hover:bg-[#3F3F8F] transition-colors duration-300"
                >
                  <span>View Lookbook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/pages/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-[#CCCCCC] text-[#222222] text-xs uppercase tracking-widest font-medium rounded hover:border-[#3F3F8F] hover:text-[#3F3F8F] transition-colors duration-300"
                >
                  <span>Connect With Atelier</span>
                </Link>
              </div>
            </div>

            {/* Visual Right */}
            <div className="lg:col-span-6">
              <div className="relative rounded-xl overflow-hidden shadow-md border border-[#EAEAE6] bg-[#F7F6F2] group">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src="/Assets/about/craft-textile.jpg"
                    alt="Artisan craftsmanship, fine linen and precision hand-stitching"
                    className="w-full h-full object-cover transform group-hover:scale-103 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 sm:p-6 bg-white border-t border-[#EAEAE6]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-[#3F3F8F] font-semibold">
                        Mastery & Precision
                      </span>
                      <p className="text-sm font-medium text-[#111111] mt-0.5">
                        Tactile Permanence & Natural Fibres
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-[#F5F5F3] text-[#555555] rounded font-mono">
                      100% Pure Craft
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Chapter 2: Loomed From Dreams */}
      <section className="py-16 sm:py-24 bg-[#FBFBFA] border-t border-[#EFEFED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Visual Left */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative rounded-xl overflow-hidden shadow-md border border-[#EAEAE6] bg-[#F0EFEA] group">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src="/Assets/about/couture-living.jpg"
                    alt="Effortless elegance, modern tailored silhouettes celebrating confidence"
                    className="w-full h-full object-cover transform group-hover:scale-103 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 sm:p-6 bg-white border-t border-[#EAEAE6]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-[#3F3F8F] font-semibold">
                        Modern Silhouette
                      </span>
                      <p className="text-sm font-medium text-[#111111] mt-0.5">
                        Designed for Effortless Everyday Living
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-[#EBF0FF] text-[#3F3F8F] rounded font-medium">
                      Atelier Cut
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Story Content Right */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 sm:space-y-8">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-[#3F3F8F] font-semibold">
                  Intention & Intelligence
                </span>
                <h2 className="font-wondra text-3xl sm:text-4xl text-[#111111] leading-tight">
                  LOOMED FROM DREAMS
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                During countless coffee-break sketches and late-night brainstorming sessions, one
                idea kept growing stronger:
              </p>

              {/* Inquiry Highlight Box */}
              <div className="space-y-3 bg-white p-6 rounded-lg border border-[#E8E8E4] shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#3F3F8F] mt-2 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-[#111111] font-normal leading-relaxed italic">
                    What if fashion could be designed with the same intention and intelligence as
                    technology?
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#3F3F8F] mt-2 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-[#111111] font-normal leading-relaxed italic">
                    What if every piece of clothing could unite innovation, comfort, and cultural
                    beauty?
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#4A4A4A] leading-relaxed font-light">
                That vision became <strong className="font-semibold text-black">Tanoah</strong> — a
                brand where nature and innovation intertwine. Every stitch reflects our belief that
                fashion shouldn’t just look good; it should feel good and do good. From code to
                couture, we transformed passion into purpose, creating clothing that celebrates
                identity, confidence, and elegant everyday living.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#3F3F8F] text-white text-xs uppercase tracking-widest font-medium rounded hover:bg-[#2F2F75] transition-colors duration-300 shadow-sm"
                >
                  <span>Discover The Releases</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/pages/shipping-policy"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-[#CCCCCC] text-[#222222] text-xs uppercase tracking-widest font-medium rounded hover:border-[#3F3F8F] hover:text-[#3F3F8F] transition-colors duration-300"
                >
                  <span>Our Delivery Promise</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Chapter 3: The Three Brand Pillars (Content from user specification) */}
      <section className="py-20 sm:py-28 bg-white border-t border-[#EFEFED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-16 sm:mb-20">
            <span className="text-xs uppercase tracking-[0.25em] text-[#3F3F8F] font-semibold">
              The Guiding Principles
            </span>
            <h2 className="font-wondra text-3xl sm:text-4xl text-[#111111]">
              OUR FOUNDATIONAL PILLARS
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] font-light">
              Crafted with intention, delivered with integrity, and designed for lasting confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {/* Pillar 1: SUSTAINABILITY */}
            <div className="relative p-8 rounded-xl bg-[#FCFCFB] border border-[#EAEAE7] hover:border-[#3F3F8F]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-lg bg-[#3F3F8F]/10 text-[#3F3F8F] flex items-center justify-center group-hover:bg-[#3F3F8F] group-hover:text-white transition-colors duration-300">
                  <Leaf className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">
                    Pillar 01
                  </span>
                  <h3 className="font-wondra text-2xl text-[#111111] mt-1 tracking-wide">
                    SUSTAINABILITY
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed font-light">
                  We value your time and trust. Every order is carefully processed, packed, and
                  dispatched with precision to ensure timely delivery and customer satisfaction.
                  We take pride in ensuring that every Tanoah product reaches you on time and in
                  perfect condition.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#EAEAE7] flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#3F3F8F] uppercase tracking-wider">
                  Mindful Logistics & Care
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#3F3F8F]" />
              </div>
            </div>

            {/* Pillar 2: QUALITY */}
            <div className="relative p-8 rounded-xl bg-[#FCFCFB] border border-[#EAEAE7] hover:border-[#3F3F8F]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-lg bg-[#3F3F8F]/10 text-[#3F3F8F] flex items-center justify-center group-hover:bg-[#3F3F8F] group-hover:text-white transition-colors duration-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">
                    Pillar 02
                  </span>
                  <h3 className="font-wondra text-2xl text-[#111111] mt-1 tracking-wide">
                    QUALITY
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed font-light">
                  Every piece is crafted with care and precision. We use premium fabrics, skilled
                  craftsmanship, and strict quality checks to ensure lasting comfort, perfect fit,
                  and timeless elegance in every stitch.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#EAEAE7] flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#3F3F8F] uppercase tracking-wider">
                  Artisanal Excellence
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#3F3F8F]" />
              </div>
            </div>

            {/* Pillar 3: COMPACTABILITY & COMFORT */}
            <div className="relative p-8 rounded-xl bg-[#FCFCFB] border border-[#EAEAE7] hover:border-[#3F3F8F]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-lg bg-[#3F3F8F]/10 text-[#3F3F8F] flex items-center justify-center group-hover:bg-[#3F3F8F] group-hover:text-white transition-colors duration-300">
                  <Feather className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">
                    Pillar 03
                  </span>
                  <h3 className="font-wondra text-2xl text-[#111111] mt-1 tracking-wide">
                    COMPACTABILITY
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed font-light">
                  We craft comfortable clothing using soft, breathable, skin-friendly fabrics.
                  Designed for a natural fit, our styles balance comfort and confidence for every
                  body and every occasion.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#EAEAE7] flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#3F3F8F] uppercase tracking-wider">
                  Skin-Friendly Luxury
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#3F3F8F]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Classic Luxury Call to Action Banner */}
      <section className="py-16 sm:py-24 bg-[#111111] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-[0.3em] text-[#9D9DAE] font-medium">
              Step Into The Maison
            </span>
            <h2 className="font-wondra text-3xl sm:text-4xl lg:text-5xl text-white tracking-wide">
              EXPERIENCE TANOAH
            </h2>
            <p className="text-xs sm:text-sm text-[#A0A0A0] max-w-xl mx-auto leading-relaxed font-light">
              Explore thoughtfully engineered cuts, breathable organic fibers, and silhouettes
              designed to elevate your everyday presence.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black text-xs uppercase tracking-widest font-semibold rounded hover:bg-[#3F3F8F] hover:text-white transition-colors duration-300 shadow-md"
            >
              <span>Explore The Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/lookbook"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-transparent border border-white/30 text-white text-xs uppercase tracking-widest font-semibold rounded hover:bg-white/10 hover:border-white transition-colors duration-300"
            >
              <span>View Lookbook</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
