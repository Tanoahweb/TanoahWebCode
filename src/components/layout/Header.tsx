import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User as UserIcon, Menu, X } from 'lucide-react';
import { MegaMenu } from './MegaMenu';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { HeaderMenuItem } from '../../types/navigation';

interface HeaderProps {
  transparentOnTop?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ transparentOnTop = false }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState<HeaderMenuItem | null>(null);
  const location = useLocation();

  const cartItemCount = useCartStore((state) => state.getItemCount());
  const openCartDrawer = useCartStore((state) => state.openDrawer);
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const { toggleSearch, toggleMobileMenu, isMobileMenuOpen } = useUIStore();
  const { user, isAdmin } = useAuthStore();
  const { config, fetchNavigation, hasLoaded } = useNavigationStore();

  const isHomePage = location.pathname === '/';
  const shouldBeTransparent = transparentOnTop && isHomePage && !isScrolled;

  useEffect(() => {
    if (!hasLoaded) {
      fetchNavigation();
    }
  }, [hasLoaded, fetchNavigation]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isNavActive = (path: string) => {
    if (!path) return false;
    const cleanPath = path.split('?')[0];
    if (cleanPath === '/collections/all') {
      return location.pathname === '/collections/all' || location.pathname === '/catalog';
    }
    return location.pathname === cleanPath;
  };

  const activeMenuItems = (config.header_menu || []).filter((item) => item.is_active);

  return (
    <header
      onMouseLeave={() => setActiveMenuItem(null)}
      className="sticky top-0 z-40 w-full transition-all duration-300 bg-white text-black border-b border-[#E7E7E7] shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative">
        {/* Left: Mobile menu toggle & Desktop Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-1.5 -ml-1 text-black hover:text-[#3F3F8F] transition-colors"
            aria-label="Open menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-poppins tracking-wider uppercase">
            {activeMenuItems.map((item) => {
              const active = isNavActive(item.url);
              const isHovered = activeMenuItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => {
                    if (item.has_mega_menu) {
                      setActiveMenuItem(item);
                    } else {
                      setActiveMenuItem(null);
                    }
                  }}
                  className="relative py-6 cursor-pointer flex items-center gap-1.5"
                >
                  <Link
                    to={item.url}
                    className={`transition-colors flex items-center gap-1.5 ${
                      item.highlight_style === 'colored'
                        ? 'text-red-600 font-bold hover:text-red-700'
                        : item.highlight_style === 'bold'
                        ? 'font-bold text-black hover:text-[#3F3F8F]'
                        : active || isHovered
                        ? 'text-[#3F3F8F] font-bold'
                        : 'text-black hover:text-[#3F3F8F] font-medium'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge_text && (
                      <span className="text-[9px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                        {item.badge_text}
                      </span>
                    )}
                  </Link>

                  {(active || isHovered) && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#3F3F8F] rounded-full" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Center: Brand Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Link to="/" className="flex items-center group py-2">
            <img
              src="/Assets/brand/logo-blue.png"
              alt="TANOAH"
              className="h-9 md:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Right: Actions (Search, Account, Wishlist, Cart) */}
        <div className="flex items-center gap-4 sm:gap-6 text-black">
          {/* Search Button */}
          <button
            onClick={toggleSearch}
            className="p-1 hover:text-[#3F3F8F] transition-colors flex items-center"
            aria-label="Search catalog"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Account / Admin */}
          <Link
            to={user ? (isAdmin ? '/admin' : '/account') : '/login'}
            className="p-1 hover:text-[#3F3F8F] transition-colors hidden sm:flex items-center relative"
            title={user ? (isAdmin ? 'Admin Dashboard' : 'My Account') : 'Sign In'}
          >
            <UserIcon className="w-5 h-5" />
            {isAdmin && (
              <span className="absolute -top-1 -right-1.5 bg-[#3F3F8F] text-white text-[8px] font-bold px-1 rounded-full">
                ADMIN
              </span>
            )}
          </Link>

          {/* Wishlist Icon */}
          <Link
            to="/wishlist"
            className="p-1 hover:text-[#3F3F8F] transition-colors relative flex items-center"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#3F3F8F] text-white text-[10px] font-poppins font-medium w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon & Trigger Drawer */}
          <button
            onClick={openCartDrawer}
            className="p-1 hover:text-[#3F3F8F] transition-colors relative flex items-center cursor-pointer"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#3F3F8F] text-white text-[10px] font-poppins font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Mega Menu Dropdown */}
      <MegaMenu
        isOpen={activeMenuItem !== null}
        onClose={() => setActiveMenuItem(null)}
        activeMenuItem={activeMenuItem}
      />
    </header>
  );
};
