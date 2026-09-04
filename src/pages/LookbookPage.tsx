import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/common/Button';

export const LookbookPage: React.FC = () => {
  return (
    <div className="w-full bg-white font-poppins min-h-screen">
      {/* Hero */}
      <div className="relative h-[60vh] sm:h-[70vh] bg-black overflow-hidden flex items-center justify-center text-center px-4">
        <img
          src="/Assets/editorial/tanoah-women-atelier.jpg"
          alt="TANOAH SS26 Editorial Lookbook"
          className="absolute inset-0 w-full h-full object-cover opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative z-10 space-y-4 max-w-2xl text-white">
          <span className="text-xs font-poppins tracking-widest text-[#EEEEF8] uppercase block">
            EDITORIAL ARCHIVE • SPRING / SUMMER 2026
          </span>
          <h1 className="font-wondra text-4xl sm:text-6xl text-white tracking-tight leading-[1.1]">
            THE ARCHITECTURAL SILHOUETTE
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-light max-w-lg mx-auto leading-relaxed">
            A visual exploration of loomed botanical linens, sculptural drapes, and artisanal raised embroidery.
          </p>
        </div>
      </div>

      {/* Editorial Grid Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
        {/* Look 01 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 aspect-[16/11] bg-neutral-100 rounded-[4px] overflow-hidden border border-[#E7E7E7] shadow-lg">
            <img
              src="/Assets/editorial/lookbook-hero-ivory.jpg"
              alt="Look 01 - Botanical Linen Kurta"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="lg:col-span-4 space-y-4 text-left">
            <span className="text-[10px] font-semibold text-[#3F3F8F] tracking-widest uppercase">LOOK 01</span>
            <h2 className="font-wondra text-3xl text-black">THE BOTANICAL LINEN KURTA</h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Sculpted from pure unbleached botanical linen with raised tonal floral embroidery. Paired with fluid wide-leg tailored trousers for an understated, elevated silhouette.
            </p>
            <Link to="/collections/all">
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                DISCOVER PIECE
              </Button>
            </Link>
          </div>
        </div>

        {/* Look 02 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-4 space-y-4 text-left order-2 lg:order-1">
            <span className="text-[10px] font-semibold text-[#3F3F8F] tracking-widest uppercase">LOOK 02</span>
            <h2 className="font-wondra text-3xl text-black">SCULPTED INDIGO DRAPE</h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Flowing 280 GSM modal silk tunic dip-dyed in authentic coastal indigo tones with cascading asymmetric hems and billowed sleeves.
            </p>
            <Link to="/collections/all">
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                DISCOVER PIECE
              </Button>
            </Link>
          </div>
          <div className="lg:col-span-8 aspect-[16/11] bg-neutral-100 rounded-[4px] overflow-hidden border border-[#E7E7E7] shadow-lg order-1 lg:order-2">
            <img
              src="/Assets/editorial/lookbook-drape-indigo.jpg"
              alt="Look 02 - Sculpted Indigo Drape"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Look 03 - Textile Close-Up Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 aspect-[16/11] bg-neutral-100 rounded-[4px] overflow-hidden border border-[#E7E7E7] shadow-lg">
            <img
              src="/Assets/editorial/lookbook-detail-embroidery.jpg"
              alt="Look 03 - Artisanal Raised Embroidery"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-4 space-y-4 text-left">
            <span className="text-[10px] font-semibold text-[#3F3F8F] tracking-widest uppercase">CRAFT FOCUS</span>
            <h2 className="font-wondra text-3xl text-black">HAND-LOOMED EMBROIDERY</h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Every detail is shaped by master artisans. Raised botanical stitches run seamlessly across hand-spun natural fibres, celebrating slow luxury and timeless craftsmanship.
            </p>
            <Link to="/collections/all">
              <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                EXPLORE COLLECTION
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

