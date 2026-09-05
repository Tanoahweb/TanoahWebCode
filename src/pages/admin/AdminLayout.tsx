import React, { useState } from 'react';
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
  Settings,
  Image as ImageIcon,
  LogOut,
  ExternalLink,
  Bell,
  Search,
  Sparkles,
  Gift,
  CreditCard,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();

  const NAV_ITEMS = [
    { label: 'Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin' },
    { label: 'Products & Variants', icon: <Package className="w-4 h-4" />, path: '/admin/products' },
    { label: 'Inventory & Alerts', icon: <Boxes className="w-4 h-4" />, path: '/admin/inventory' },
    { label: 'Orders & Fulfillment', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/orders' },
    { label: 'Returns & Exchanges', icon: <RotateCcw className="w-4 h-4" />, path: '/admin/returns' },
    { label: 'Customers CRM', icon: <Users className="w-4 h-4" />, path: '/admin/customers' },
    { label: 'Collections & Edits', icon: <FolderTree className="w-4 h-4" />, path: '/admin/collections' },
    { label: 'Navigation & Menus', icon: <Compass className="w-4 h-4" />, path: '/admin/navigation' },
    { label: 'Media Library (R2)', icon: <ImageIcon className="w-4 h-4" />, path: '/admin/media' },
    { label: 'Coupons & Discounts', icon: <Tag className="w-4 h-4" />, path: '/admin/coupons' },
    { label: 'Payment Gateways', icon: <CreditCard className="w-4 h-4" />, path: '/admin/settings?tab=payments' },
    { label: 'Atelier Editorial Section', icon: <Sparkles className="w-4 h-4" />, path: '/admin/settings?tab=editorial' },
    { label: 'Special Offer Popup', icon: <Gift className="w-4 h-4" />, path: '/admin/settings?tab=offer_popup' },
    { label: 'Store & Tax Settings', icon: <Settings className="w-4 h-4" />, path: '/admin/settings' },
  ];

  return (
    <div className="fixed inset-0 flex bg-[#F8F8F8] font-poppins text-xs antialiased overflow-hidden z-0">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E7E7E7] flex flex-col justify-between shrink-0 shadow-sm select-none">
        <div>
          {/* Logo & Store Header */}
          <div className="p-5 border-b border-[#E7E7E7] flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-7 w-auto" />
              <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-1.5 py-0.5 rounded">
                STORE OS
              </span>
            </Link>
          </div>

          {/* Quick Storefront Link */}
          <div className="p-3 bg-[#EEEEF8]/40 border-b border-[#E7E7E7]">
            <Link
              to="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-[#3F3F8F] hover:underline"
            >
              <span>View Online Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {NAV_ITEMS.map((item) => {
              const currentFull = location.pathname + location.search;
              const isActive = item.path.includes('?')
                ? currentFull === item.path
                : location.pathname === item.path && (!location.search || item.path !== '/admin/settings');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#3F3F8F] text-white font-semibold shadow-sm'
                      : 'text-neutral-700 hover:bg-[#F8F8F8] hover:text-[#3F3F8F]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin User Footer */}
        <div className="p-4 border-t border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#3F3F8F] text-white flex items-center justify-center font-bold text-xs shrink-0">
              AD
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black truncate">{profile?.full_name || 'Store Admin'}</div>
              <div className="text-[10px] text-[#888888] truncate">{profile?.email || 'admin@tanoah.com'}</div>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="p-1.5 text-neutral-500 hover:text-red-600 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E7E7E7] px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 w-96">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search orders, SKU, customers, products..."
                className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase DB Connected
            </span>
          </div>
        </header>

        {/* Main Body */}
        <main id="admin-main-scroll" className="flex-1 overflow-y-auto p-6 sm:p-8 overscroll-contain">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
