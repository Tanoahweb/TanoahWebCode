import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  RotateCcw,
  Users,
  FolderTree,
  Compass,
  Tag,
  Ruler,
  Settings,
  Image as ImageIcon,
  LogOut,
  ExternalLink,
  Bell,
  Search,
  Sparkles,
  Gift,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Globe,
  BookOpen,
  Zap,
  Inbox,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminOmniSearch } from '../../components/admin/AdminOmniSearch';
import { AdminOrderNotificationBell } from '../../components/admin/AdminOrderNotificationBell';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('tanoah_admin_sidebar_collapsed') === 'true';
  });

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, location.search]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('tanoah_admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const NAV_ITEMS = [
    { label: 'Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin' },
    { label: 'Products & Variants', icon: <Package className="w-4 h-4" />, path: '/admin/products' },
    { label: 'Size Charts & Guides', icon: <Ruler className="w-4 h-4" />, path: '/admin/size-charts' },
    { label: 'Inventory & Alerts', icon: <Boxes className="w-4 h-4" />, path: '/admin/inventory' },
    { label: 'Orders & Fulfillment', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/orders' },
    { label: 'Returns & Exchanges', icon: <RotateCcw className="w-4 h-4" />, path: '/admin/returns' },
    { label: 'Customers CRM', icon: <Users className="w-4 h-4" />, path: '/admin/customers' },
    { label: 'Form Inquiries & Restocks', icon: <Inbox className="w-4 h-4" />, path: '/admin/forms' },
    { label: 'Collections & Edits', icon: <FolderTree className="w-4 h-4" />, path: '/admin/collections' },
    { label: 'Navigation & Menus', icon: <Compass className="w-4 h-4" />, path: '/admin/navigation' },
    { label: 'Media Library (R2)', icon: <ImageIcon className="w-4 h-4" />, path: '/admin/media' },
    { label: 'Coupons & Discounts', icon: <Tag className="w-4 h-4" />, path: '/admin/coupons' },
    { label: 'Reviews & Testimonials', icon: <Star className="w-4 h-4" />, path: '/admin/reviews' },
    { label: 'Technical SEO & Health', icon: <Globe className="w-4 h-4" />, path: '/admin/seo' },
    { label: '301 Redirects Manager', icon: <Zap className="w-4 h-4" />, path: '/admin/seo/redirects' },
    { label: 'Fashion Journal (Blog)', icon: <BookOpen className="w-4 h-4" />, path: '/admin/blog' },
    { label: 'Payment Gateways', icon: <CreditCard className="w-4 h-4" />, path: '/admin/settings?tab=payments' },
    { label: 'Featured Editorial Section', icon: <Sparkles className="w-4 h-4" />, path: '/admin/settings?tab=editorial' },
    { label: 'Special Offer Popup', icon: <Gift className="w-4 h-4" />, path: '/admin/settings?tab=offer_popup' },
    { label: 'Store & Tax Settings', icon: <Settings className="w-4 h-4" />, path: '/admin/settings' },
  ];

  return (
    <div className="fixed inset-0 flex bg-[#F8F8F8] font-poppins text-xs antialiased overflow-hidden z-0">
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`bg-white border-r border-[#E7E7E7] flex flex-col justify-between shrink-0 shadow-lg lg:shadow-sm select-none transition-all duration-300 z-50 fixed inset-y-0 left-0 ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full'
        } lg:static lg:translate-x-0 ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <div>
          {/* Logo & Store Header */}
          <div className="p-4 border-b border-[#E7E7E7] flex items-center justify-between min-h-[64px]">
            {!isCollapsed || isMobileOpen ? (
              <Link to="/admin" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-2 overflow-hidden">
                <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-7 w-auto" />
                <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1.5 py-0.5 rounded">
                  STORE OS
                </span>
              </Link>
            ) : (
              <Link to="/admin" className="mx-auto" title="TANOAH STORE OS">
                <span className="font-wondra text-lg text-[#3F3F8F] font-bold">T</span>
              </Link>
            )}

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className={`hidden lg:block p-1.5 rounded hover:bg-[#F8F8F8] text-neutral-500 hover:text-black transition-colors ${
                isCollapsed ? 'mx-auto mt-1' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded hover:bg-[#F8F8F8] text-neutral-500 hover:text-black transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Storefront Link */}
          <div className="p-2.5 bg-[#EEEEF8]/40 border-b border-[#E7E7E7]">
            <Link
              to="/"
              target="_blank"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center text-[11px] font-semibold text-[#3F3F8F] hover:underline ${
                isCollapsed && !isMobileOpen ? 'justify-center p-1.5' : 'justify-between px-3 py-1.5'
              }`}
              title="View Online Store"
            >
              {(!isCollapsed || isMobileOpen) && <span>View Online Store</span>}
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            {NAV_ITEMS.map((item) => {
              const currentFull = location.pathname + location.search;
              const isActive = item.path.includes('?')
                ? currentFull === item.path
                : location.pathname === item.path && (!location.search || item.path !== '/admin/settings');
              const showExpanded = !isCollapsed || isMobileOpen;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={!showExpanded ? item.label : undefined}
                  className={`flex items-center rounded-[4px] font-medium transition-colors ${
                    !showExpanded ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#3F3F8F] text-white font-semibold shadow-sm'
                      : 'text-neutral-700 hover:bg-[#F8F8F8] hover:text-[#3F3F8F]'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {showExpanded && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin User Footer */}
        <div className={`p-3 border-t border-[#E7E7E7] bg-[#FAFAFA] flex items-center ${isCollapsed && !isMobileOpen ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2 min-w-0" title={`${profile?.full_name || 'Store Admin'} (${profile?.email || 'admin@tanoah.com'})`}>
            <div className="w-8 h-8 rounded-full bg-[#3F3F8F] text-white flex items-center justify-center font-bold text-xs shrink-0">
              AD
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0">
                <div className="font-semibold text-black truncate">{profile?.full_name || 'Store Admin'}</div>
                <div className="text-[10px] text-[#888888] truncate">{profile?.email || 'admin@tanoah.com'}</div>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate('/admin/login', { replace: true });
            }}
            className="p-1.5 text-neutral-500 hover:text-red-600 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E7E7E7] px-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded border border-[#E7E7E7] hover:bg-[#F8F8F8] text-neutral-600 transition-colors shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Desktop Sidebar Collapse Button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-2 rounded border border-[#E7E7E7] hover:bg-[#F8F8F8] text-neutral-600 transition-colors shrink-0"
              title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <AdminOmniSearch />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden sm:flex text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold items-center gap-1.5 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase DB Connected
            </span>

            {/* Notification Bell for New Orders */}
            <AdminOrderNotificationBell />
          </div>
        </header>

        {/* Main Body */}
        <main id="admin-main-scroll" className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 overscroll-contain">
          <div className="w-full max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
