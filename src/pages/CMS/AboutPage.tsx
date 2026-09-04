import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full bg-white font-poppins min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-left">
        <div className="text-center space-y-2">
          <span className="text-[11px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
            THE MAISON
          </span>
          <h1 className="font-wondra text-4xl sm:text-5xl text-black">
            THE ESSENCE OF TANOAH
          </h1>
        </div>

        <div className="aspect-[16/9] rounded-[4px] overflow-hidden bg-[#F8F8F8] border border-[#E7E7E7]">
          <img src="/Assets/hero/hero-landscape.jpg" alt="Tanoah" className="w-full h-full object-cover" />
        </div>

        <div className="prose max-w-none text-xs sm:text-sm text-[#444444] leading-relaxed space-y-6">
          <p>
            Founded in 2026, <strong>TANOAH</strong> was established with a singular conviction: that contemporary luxury fashion should be defined by tactile permanence, sculptural silhouette, and unhurried tailoring rather than fleeting trends.
          </p>
          <p>
            Each garment begins in our atelier with the sourcing of authentic, ethically farmed natural fibres: 280 GSM long-staple organic cottons, French flax linens from Normandy, and cruelty-free Mulberry silk-satins.
          </p>
          <div className="p-6 bg-[#FAFAFA] border-l-4 border-[#3F3F8F] rounded-[2px] italic text-[#222222]">
            "We do not create disposable apparel; we build the foundational silhouettes that anchor your life's memorable moments."
          </div>
        </div>
      </div>
    </div>
  );
};
