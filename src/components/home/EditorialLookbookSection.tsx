import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { useEditorialLookbookStore } from '../../store/useEditorialLookbookStore';

interface EditorialLook {
  id: string;
  volume: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  detailImage: string;
  detailAlt: string;
  detailTag: string;
  tag: string;
  stats: {
    value1: string;
    label1: string;
    value2: string;
    label2: string;
  };
}

const EDITORIAL_LOOKS: EditorialLook[] = [
  {
    id: 'look-01',
    volume: 'VOLUME 01 • SS26 EDITORIAL',
    title: 'AN EXPLORATION OF TEXTURE, FORM & ELEVATION',
    subtitle: 'THE BOTANICAL LINEN KURTA',
    description:
      'Every garment in the Spring / Summer 2026 collection is sculpted from pure botanical linens, heavyweight double-mercerized cottons, and fluid modal blends. We prioritize enduring design over fleeting cycles.',
    heroImage: '/Assets/editorial/lookbook-hero-ivory.jpg',
    heroAlt: 'TANOAH SS26 Editorial Lookbook - Botanical Linen Kurta',
    detailImage: '/Assets/editorial/lookbook-detail-embroidery.jpg',
    detailAlt: 'Artisanal Hand-Loomed Linen Weave Detail',
    detailTag: 'Raised Botanical Needlework',
    tag: 'LOOK 01 • BOTANICAL LINEN',
    stats: {
      value1: '100%',
      label1: 'Botanical Linen Fibres',
      value2: 'ARTISANAL',
      label2: 'Handcrafted Precision Fit',
    },
  },
  {
    id: 'look-02',
    volume: 'VOLUME 02 • RESORT COLLECTION',
    title: 'FLUID GRACE THROUGH SCULPTURAL DRAPES',
    subtitle: 'THE RESORT INDIGO SILHOUETTE',
    description:
      'Hand-dyed indigo modal and fluid raw silk tailored into flowing asymmetric silhouettes. Designed for seamless transitions between sun-drenched coastal days and dusk salon soirees.',
    heroImage: '/Assets/editorial/lookbook-drape-indigo.jpg',
    heroAlt: 'TANOAH Resort Indigo Drape Silhouette',
    detailImage: '/Assets/editorial/lookbook-detail-embroidery.jpg',
    detailAlt: 'Tactile Handloom Silk-Modal Weave',
    detailTag: 'Textile Weave & Structure',
    tag: 'LOOK 02 • SCULPTED INDIGO',
    stats: {
      value1: '280 GSM',
      label1: 'Fluid Modal Drape',
      value2: 'BESPOKE',
      label2: 'Hand-Dyed Indigo Hue',
    },
  },
];

export const EditorialLookbookSection: React.FC = () => {
  const { config, fetchConfig, hasLoaded } = useEditorialLookbookStore();
  const [activeLookIndex, setActiveLookIndex] = useState(0);

  useEffect(() => {
    if (!hasLoaded) {
      fetchConfig();
    }
  }, [hasLoaded, fetchConfig]);

  if (!config.isEnabled) {
    return null;
  }

  // Derive dynamic look data, defaulting to configured admin settings for Look 01
  const currentLook: EditorialLook =
    activeLookIndex === 0
      ? {
          id: 'look-01',
          volume: config.volume || EDITORIAL_LOOKS[0].volume,
          title: config.title || EDITORIAL_LOOKS[0].title,
          subtitle: config.subtitle || EDITORIAL_LOOKS[0].subtitle,
          description: config.description || EDITORIAL_LOOKS[0].description,
          heroImage: config.heroImage || EDITORIAL_LOOKS[0].heroImage,
          heroAlt: config.heroAlt || EDITORIAL_LOOKS[0].heroAlt,
          detailImage: config.detailImage || EDITORIAL_LOOKS[0].detailImage,
          detailAlt: config.detailAlt || EDITORIAL_LOOKS[0].detailAlt,
          detailTag: config.detailTag || EDITORIAL_LOOKS[0].detailTag,
          tag: config.tag || EDITORIAL_LOOKS[0].tag,
          stats: {
            value1: config.stat1Value || EDITORIAL_LOOKS[0].stats.value1,
            label1: config.stat1Label || EDITORIAL_LOOKS[0].stats.label1,
            value2: config.stat2Value || EDITORIAL_LOOKS[0].stats.value2,
            label2: config.stat2Label || EDITORIAL_LOOKS[0].stats.label2,
          },
        }
      : EDITORIAL_LOOKS[1];

  const primaryLink = config.primaryButtonLink || '/collections/all';
  const primaryText = config.primaryButtonText || 'VIEW FULL LOOKBOOK';
  const secondaryLink = config.secondaryButtonLink || '/about';
  const secondaryText = config.secondaryButtonText || 'EXPLORE ARCHIVE';

  return (
    <section className="py-20 sm:py-28 bg-[#FAFAFA] border-b border-[#E7E7E7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Magazine Image Composition */}
          <div className="lg:col-span-7 relative">
            {/* Main Editorial Hero Frame */}
            <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-[4px] overflow-hidden bg-[#ECECEB] border border-[#E7E7E7] shadow-xl group">
              <img
                key={currentLook.heroImage}
                src={currentLook.heroImage}
                alt={currentLook.heroAlt}
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Editorial Frame Badge */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-[2px] border border-black/5 shadow-sm text-left">
                <span className="text-[10px] font-poppins font-semibold tracking-widest text-[#3F3F8F] uppercase block">
                  {currentLook.tag}
                </span>
              </div>
            </div>

            {/* Overlapping Floating Detail Card */}
            <div className="absolute -bottom-6 -right-2 sm:-bottom-8 sm:-right-6 w-44 sm:w-56 aspect-[3/4] rounded-[4px] overflow-hidden border-4 border-white shadow-2xl bg-white transition-all duration-500 hover:-translate-y-1.5">
              <img
                src={currentLook.detailImage}
                alt={currentLook.detailAlt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 text-left">
                <span className="text-[9px] uppercase tracking-wider text-white/70 block font-poppins">
                  FIG. 01 — TACTILE CRAFT
                </span>
                <span className="text-[11px] font-semibold text-white leading-tight block">
                  {currentLook.detailTag}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Editorial Narrative */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Look Switcher Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {EDITORIAL_LOOKS.map((look, idx) => (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => setActiveLookIndex(idx)}
                  className={`px-3 py-1 rounded-[2px] text-[10px] font-poppins font-semibold tracking-wider transition-all uppercase ${
                    activeLookIndex === idx
                      ? 'bg-[#3F3F8F] text-white shadow-sm'
                      : 'bg-white border border-[#E7E7E7] text-[#666666] hover:text-black hover:border-black'
                  }`}
                >
                  {look.id === 'look-01' ? 'Look 01: Featured' : 'Look 02: Indigo'}
                </button>
              ))}
              <span className="text-[10px] text-[#888888] font-mono tracking-wide uppercase">
                {currentLook.volume}
              </span>
            </div>

            <h2 className="font-wondra text-3xl sm:text-4xl lg:text-5xl text-black leading-[1.12] transition-opacity duration-300">
              {currentLook.title}
            </h2>

            <p className="text-xs sm:text-sm font-poppins text-[#666666] leading-relaxed">
              {currentLook.description}
            </p>

            {/* Editorial Stats */}
            <div className="grid grid-cols-2 gap-6 pt-4 font-poppins border-t border-[#E7E7E7]">
              <div>
                <span className="text-2xl sm:text-3xl font-wondra text-black block">
                  {currentLook.stats.value1}
                </span>
                <span className="text-[11px] text-[#888888] uppercase tracking-wider block mt-0.5">
                  {currentLook.stats.label1}
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-wondra text-[#3F3F8F] block">
                  {currentLook.stats.value2}
                </span>
                <span className="text-[11px] text-[#888888] uppercase tracking-wider block mt-0.5">
                  {currentLook.stats.label2}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center gap-3 flex-wrap">
              {primaryLink.startsWith('http') ? (
                <a href={primaryLink} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="primary"
                    size="md"
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {primaryText}
                  </Button>
                </a>
              ) : (
                <Link to={primaryLink}>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {primaryText}
                  </Button>
                </Link>
              )}

              {secondaryLink.startsWith('http') ? (
                <a href={secondaryLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="md">
                    {secondaryText}
                  </Button>
                </a>
              ) : (
                <Link to={secondaryLink}>
                  <Button variant="outline" size="md">
                    {secondaryText}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

