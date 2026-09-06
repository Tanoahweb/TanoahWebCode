import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { HeaderMenuItem, MegaMenuColumn, MegaMenuSubLink } from '../../types/navigation';
import { Collection } from '../../types';
import { useNavigationStore } from '../../store/useNavigationStore';
import { api } from '../../services/api';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeMenuItem: HeaderMenuItem | null;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose, activeMenuItem }) => {
  const { config } = useNavigationStore();
  const [storeCollections, setStoreCollections] = useState<Collection[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadCollections = async () => {
      try {
        const list = await api.getCollections();
        if (isMounted) setStoreCollections(list || []);
      } catch (e) {
        console.warn('Failed to load collections for mega menu:', e);
      }
    };
    loadCollections();

    const handleCollectionsUpdated = () => {
      loadCollections();
    };
    window.addEventListener('tanoah_collections_updated', handleCollectionsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_collections_updated', handleCollectionsUpdated);
    };
  }, []);

  if (!isOpen || !activeMenuItem || !activeMenuItem.has_mega_menu) return null;

  // Use configured mega menu for this item, or fallback to first available mega menu
  const megaMenuData =
    activeMenuItem.mega_menu ||
    config.header_menu.find((i) => i.is_active && i.has_mega_menu && i.mega_menu)?.mega_menu;

  if (!megaMenuData) return null;

  // Resolve links for a column: if auto-sync is enabled, use dynamic collections from store
  const getResolvedColumnLinks = (col: MegaMenuColumn): MegaMenuSubLink[] => {
    if (col.auto_sync_collections) {
      const activeCols = storeCollections.filter((c) => c.is_active !== false);
      const filtered = activeCols.filter((c) => {
        if (!col.collection_filter || col.collection_filter === 'all') return true;
        const text = `${c.title} ${c.slug} ${c.description || ''}`.toLowerCase();
        return text.includes(col.collection_filter.toLowerCase());
      });

      if (filtered.length > 0) {
        return filtered.map((c) => ({
          id: `dyn_${c.id || c.slug}`,
          label: c.title,
          url: `/collections/${c.slug}`,
          collection_slug: c.slug,
          is_active: true,
        }));
      }
    }
    return col.links || [];
  };

  const columns = (megaMenuData.columns || []).filter((c) => {
    if (c.auto_sync_collections) return true;
    return c.links && c.links.length > 0;
  });
  const banner = megaMenuData.banner;
  const hasBanner = Boolean(banner && banner.is_active);

  // Determine grid column sizing based on number of link columns and banner
  const getColSpanClass = (totalCols: number, withBanner: boolean) => {
    if (withBanner) {
      if (totalCols === 1) return 'col-span-8';
      if (totalCols === 2) return 'col-span-4';
      return 'col-span-3';
    } else {
      if (totalCols === 1) return 'col-span-12';
      if (totalCols === 2) return 'col-span-6';
      if (totalCols === 3) return 'col-span-4';
      return 'col-span-3';
    }
  };

  const colSpanClass = getColSpanClass(columns.length, hasBanner);
  const bannerColSpanClass = columns.length <= 2 ? 'col-span-4' : 'col-span-3';

  return (
    <div
      onMouseLeave={onClose}
      className="absolute top-full left-0 w-full bg-white border-b border-[#E7E7E7] shadow-xl z-40 animate-fade-in transition-all duration-200"
    >
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-8 text-left">
        {/* Navigation Link Columns */}
        {columns.map((col, idx) => {
          const isLastCol = idx === columns.length - 1 && !hasBanner;
          return (
            <div
              key={col.id || idx}
              className={`${colSpanClass} ${!isLastCol ? 'border-r border-[#E7E7E7] pr-6' : ''}`}
            >
              <h4 className="font-wondra text-lg text-black mb-4 flex items-center justify-between">
                <span>{col.title}</span>
                {col.view_all_url && (
                  <Link
                    to={col.view_all_url}
                    onClick={onClose}
                    className="text-xs font-poppins text-[#3F3F8F] flex items-center gap-0.5 hover:underline"
                  >
                    {col.view_all_label || 'VIEW ALL'} <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </h4>

              <ul className="space-y-2.5 text-xs text-[#666666] font-poppins">
                {getResolvedColumnLinks(col)
                  .filter((lnk) => lnk.is_active)
                  .map((lnk) => (
                    <li key={lnk.id}>
                      <Link
                        to={lnk.url}
                        onClick={onClose}
                        className="hover:text-[#3F3F8F] transition-colors flex items-center justify-between group"
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          {lnk.label}
                        </span>

                        {lnk.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              lnk.badge.toLowerCase().includes('sale')
                                ? 'bg-red-50 text-red-600'
                                : lnk.badge.toLowerCase().includes('new') || lnk.badge.toLowerCase().includes('ss')
                                ? 'bg-[#EEEEF8] text-[#3F3F8F]'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {lnk.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}

        {/* Promotional Editorial Campaign Banner */}
        {hasBanner && banner && (
          <div className={bannerColSpanClass}>
            <div className="relative group overflow-hidden rounded-[4px] bg-[#F8F8F8] h-full min-h-[220px] flex flex-col justify-end p-6 border border-[#E7E7E7]">
              <img
                src={banner.image_url || '/Assets/hero/hero-mobile.jpg'}
                alt={banner.title || 'Campaign'}
                onError={(e) => {
                  e.currentTarget.src = '/Assets/hero/hero-mobile.jpg';
                }}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="relative z-10 text-white text-left">
                {banner.badge && (
                  <span className="text-[10px] tracking-widest uppercase font-poppins text-white/80 block mb-1">
                    {banner.badge}
                  </span>
                )}
                <h5 className="font-wondra text-xl text-white mb-2 leading-tight">
                  {banner.title}
                </h5>
                {banner.subtitle && (
                  <p className="text-[11px] text-white/80 font-poppins mb-3 line-clamp-2 leading-relaxed">
                    {banner.subtitle}
                  </p>
                )}
                {banner.cta_url && (
                  <Link
                    to={banner.cta_url}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs font-poppins tracking-wider text-white hover:text-[#EEEEF8] underline uppercase"
                  >
                    {banner.cta_label || 'DISCOVER NOW'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
