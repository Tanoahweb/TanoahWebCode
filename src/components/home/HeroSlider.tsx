import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { gsap, isReducedMotion } from '../../animations/gsap';

export const HeroSlider: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const logoGroupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (isReducedMotion() || !heroRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        logoGroupRef.current,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0 }
      )
        .fromTo(
          buttonRef.current,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.6'
        )
        .fromTo(
          textRef.current,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.6'
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative w-full overflow-hidden bg-white min-h-[560px] sm:min-h-[620px] md:min-h-[660px] lg:min-h-[720px] xl:min-h-[780px] flex items-center justify-center select-none"
    >
      {/* Background Floral Art (Mobile & Desktop) */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
        <source media="(max-width: 768px)" srcSet="/Assets/hero/tanoah-hero-mobile.png" />
        <img
          src="/Assets/hero/tanoah-hero-desktop.png"
          alt="TANOAH Floral Motif"
          className="w-full h-full object-cover object-center"
          loading="eager"
          // @ts-ignore
          fetchpriority="high"
          decoding="sync"
        />
      </picture>

      {/* Hero Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 sm:px-8 flex flex-col items-center justify-center text-center py-12 sm:py-16 md:py-20">
        {/* 1. Co-Anchored TANOAH Logo & Doodle Art Group */}
        <div
          ref={logoGroupRef}
          className="order-1 relative inline-flex flex-col items-center mb-6 sm:mb-8 md:mb-8"
        >
          {/* Centered Logo & Tagline */}
          <div className="flex flex-col items-center select-none">
            <img
              src="/Assets/brand/logo-blue.png"
              alt="TANOAH"
              className="w-[190px] sm:w-[250px] md:w-[310px] lg:w-[350px] h-auto object-contain pointer-events-none"
            />
            <span className="font-poppins text-[9px] sm:text-[11px] md:text-xs tracking-[0.40em] sm:tracking-[0.46em] text-[#3b3a86] font-medium mt-1.5 sm:mt-2.5 uppercase select-none">
              L O O M E D &nbsp; F R O M &nbsp; D R E A M S
            </span>
          </div>

          {/* Permanently Anchored Doodle Art (Locked to Logo Container) */}
          <div
            className="absolute pointer-events-none select-none"
            style={{
              width: '48%',
              left: '83%',
              top: '-15%',
            }}
          >
            <img
              src="/Assets/hero/doodle-transparent.png"
              alt=""
              aria-hidden="true"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* 2. Subtitle: order-2 on mobile, order-3 on desktop */}
        <p
          ref={textRef}
          className="order-2 md:order-3 font-serif text-[#3e3e3e] text-xs sm:text-sm md:text-[15px] lg:text-base tracking-[0.22em] sm:tracking-[0.26em] uppercase font-normal select-none mb-10 sm:mb-12 md:mb-0"
        >
          PREMIUM WOMEN’S CLOTHING
        </p>

        {/* 3. Shop Now Button: order-3 on mobile, order-2 on desktop */}
        <div ref={buttonRef} className="order-3 md:order-2 md:mb-8">
          <Link
            to="/collections/women"
            className="inline-flex items-center gap-2 sm:gap-2.5 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#3b3a86] hover:bg-[#2d2c6b] text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] group"
          >
            <ShoppingBag
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0 -mt-0.5 transition-transform duration-300 group-hover:scale-110"
              strokeWidth={1.8}
            />
            <span className="font-poppins text-xs sm:text-[13px] font-medium tracking-[0.14em] uppercase">
              SHOP NOW
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};
