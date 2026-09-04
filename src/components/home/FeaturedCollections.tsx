import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { FeaturedCollectionsConfig } from '../../types';
import { DEFAULT_FEATURED_COLLECTIONS_CONFIG } from '../../data/mockData';
import { api } from '../../services/api';

export const FeaturedCollections: React.FC = () => {
  const containerRef = useGsapReveal({ stagger: 0.12 });
  const [config, setConfig] = useState<FeaturedCollectionsConfig>(DEFAULT_FEATURED_COLLECTIONS_CONFIG);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const loaded = await api.getFeaturedCollectionsConfig();
        if (isMounted && loaded) {
          setConfig(loaded);
        }
      } catch (e) {
        console.warn('Could not load featured collections config:', e);
      }
    };

    loadConfig();

    const handleUpdate = (e: CustomEvent<FeaturedCollectionsConfig>) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        loadConfig();
      }
    };

    window.addEventListener('tanoah_featured_collections_updated', handleUpdate as EventListener);
    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_featured_collections_updated', handleUpdate as EventListener);
    };
  }, []);

  const activeItems = (config.items || []).filter((cat) => cat.is_active !== false);
  const isSquare = config.aspect_ratio === '1:1';

  // Responsive grid layout based on number of active items
  const getGridColsClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-md mx-auto';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto';
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <section className="py-20 bg-white border-b border-[#E7E7E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[11px] font-poppins tracking-widest text-[#3F3F8F] font-semibold uppercase block mb-1">
            {config.section_subtitle || 'CURATED CATEGORIES'}
          </span>
          <h2 className="font-wondra text-3xl sm:text-4xl text-black">
            {config.section_title || 'EXPLORE THE EDITIONS'}
          </h2>
        </div>

        <div
          ref={containerRef}
          className={`grid gap-6 ${getGridColsClass(activeItems.length)}`}
        >
          {activeItems.map((cat) => (
            <Link
              key={cat.id || cat.title}
              to={cat.link}
              style={{ aspectRatio: isSquare ? '1 / 1' : '4 / 5' }}
              className={`group relative rounded-[4px] overflow-hidden border border-[#E7E7E7] stagger-item flex flex-col justify-end p-8 ${
                isSquare ? 'aspect-square' : 'aspect-[4/5] min-h-[440px]'
              }`}
            >
              <img
                src={cat.image || '/Assets/hero/hero-mobile.jpg'}
                alt={cat.title}
                onError={(e) => {
                  e.currentTarget.src = '/Assets/hero/hero-mobile.jpg';
                }}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="relative z-10 text-white space-y-1">
                {cat.subtitle && (
                  <span className="text-[10px] tracking-widest uppercase font-poppins text-white/80 line-clamp-1 block">
                    {cat.subtitle}
                  </span>
                )}
                <h3 className="font-wondra text-2xl text-white group-hover:text-[#EEEEF8] transition-colors leading-snug">
                  {cat.title}
                </h3>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-poppins font-semibold uppercase tracking-wider text-white underline underline-offset-4 group-hover:text-[#EEEEF8]">
                    DISCOVER NOW <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
