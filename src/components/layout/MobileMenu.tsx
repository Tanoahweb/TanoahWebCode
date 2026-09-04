import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ChevronDown, ChevronRight, Heart, User, Search } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { MegaMenuColumn, MegaMenuSubLink } from '../../types/navigation';
import { Collection } from '../../types';
import { api } from '../../services/api';

export const MobileMenu: React.FC = () => {
  const { isMobileMenuOpen, closeMobileMenu, openSearch } = useUIStore();
  const { user, isAdmin } = useAuthStore();
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const { config } = useNavigationStore();
  const location = useLocation();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [storeCollections, setStoreCollections] = useState<Collection[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const list = await api.getCollections();
        if (isMounted) setStoreCollections(list || []);
      } catch {}
    };
    load();

    const handleUpdate = () => {
      load();
    };
    window.addEventListener('tanoah_collections_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_collections_updated', handleUpdate);
    };
  }, []);

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
          id: `mob_dyn_${c.id || c.slug}`,
          label: c.title,
          url: `/collections/${c.slug}`,
          collection_slug: c.slug,
          is_active: true,
        }));
      }
    }
    return col.links || [];
  };

  if (!isMobileMenuOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const activeMenuItems = (config.header_menu || []).filter((item) => item.is_active);

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeMobileMenu}
      />

      {/* Slide Drawer */}
      <div className="relative bg-white w-5/6 max-w-sm h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-fade-in text-left">
        {/* Top bar */}
        <div>
          <div className="flex items-center justify-between p-5 border-b border-[#E7E7E7]">
            <Link to="/" onClick={closeMobileMenu}>
              <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-8 w-auto" />
            </Link>
            <button
              onClick={closeMobileMenu}
              className="p-1 rounded-full text-black hover:text-[#3F3F8F]"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="p-4 border-b border-[#E7E7E7]">
            <button
              onClick={() => {
                closeMobileMenu();
                openSearch();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] text-xs text-[#666666] font-poppins"
            >
              <Search className="w-4 h-4 text-[#3F3F8F]" />
              <span>Search fashion, shirts, dresses...</span>
            </button>
          </div>

          {/* Dynamic Navigation Accordion */}
          <nav className="p-4 space-y-2 font-poppins text-xs uppercase tracking-wider">
            {activeMenuItems.map((item) => {
              const hasMega = Boolean(item.has_mega_menu && item.mega_menu?.columns?.length);
              const isExpanded = expandedSection === item.id;
              const isSale = item.highlight_style === 'colored';

              if (hasMega) {
                return (
                  <div key={item.id} className="border-b border-[#E7E7E7]/80 pb-2">
                    <button
                      onClick={() => toggleSection(item.id)}
                      className="w-full flex items-center justify-between py-2 text-black font-semibold uppercase hover:text-[#3F3F8F] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={isSale ? 'text-red-600 font-bold' : ''}>{item.label}</span>
                        {item.badge_text && (
                          <span className="text-[9px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1.5 py-0.2 rounded font-mono">
                            {item.badge_text}
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                    </button>

                    {isExpanded && (
                      <div className="pl-3 py-2 space-y-4 bg-[#FAFAFA] rounded-[4px] p-3 mt-1">
                        {/* View All Primary Destination */}
                        <div>
                          <Link
                            to={item.url}
                            onClick={closeMobileMenu}
                            className="font-bold text-[#3F3F8F] text-[11px] block tracking-wide"
                          >
                            All {item.label} &rarr;
                          </Link>
                        </div>

                        {/* Columns & Sub-links */}
                        {item.mega_menu?.columns.map((col) => (
                          <div key={col.id} className="space-y-2">
                            <div className="text-[10px] font-bold text-black border-b border-[#E7E7E7]/60 pb-1">
                              {col.title}
                            </div>
                            <div className="pl-2 space-y-2">
                              {getResolvedColumnLinks(col)
                                .filter((lnk) => lnk.is_active)
                                .map((lnk) => (
                                  <div key={lnk.id}>
                                    <Link
                                      to={lnk.url}
                                      onClick={closeMobileMenu}
                                      className="text-[11px] text-[#666666] hover:text-[#3F3F8F] flex items-center justify-between"
                                    >
                                      <span>{lnk.label}</span>
                                      {lnk.badge && (
                                        <span className="text-[8px] font-mono px-1 rounded bg-neutral-200/60 text-neutral-600">
                                          {lnk.badge}
                                        </span>
                                      )}
                                    </Link>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Direct link
              return (
                <div key={item.id} className="border-b border-[#E7E7E7]/80 pb-2">
                  <Link
                    to={item.url}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between py-2 text-xs font-semibold ${
                      isSale
                        ? 'text-red-600 font-bold'
                        : location.pathname === item.url
                        ? 'text-[#3F3F8F] font-bold'
                        : 'text-black hover:text-[#3F3F8F]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge_text && (
                      <span className="text-[9px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1.5 py-0.2 rounded font-mono">
                        {item.badge_text}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Account / Wishlist */}
        <div className="p-5 border-t border-[#E7E7E7] bg-[#FAFAFA] space-y-3 font-poppins text-xs">
          <Link
            to="/wishlist"
            onClick={closeMobileMenu}
            className="flex items-center justify-between text-black hover:text-[#3F3F8F]"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>My Wishlist</span>
            </div>
            {wishlistCount > 0 && (
              <span className="bg-[#3F3F8F] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            to={user ? (isAdmin ? '/admin' : '/account') : '/login'}
            onClick={closeMobileMenu}
            className="flex items-center gap-2 text-black hover:text-[#3F3F8F]"
          >
            <User className="w-4 h-4" />
            <span>{user ? (isAdmin ? 'Admin Dashboard' : 'My Account') : 'Sign In / Register'}</span>
          </Link>

          <div className="pt-3 text-[10px] text-[#888888] tracking-widest uppercase">
            EST. 2026 • INDIA (INR ₹)
          </div>
        </div>
      </div>
    </div>
  );
};
