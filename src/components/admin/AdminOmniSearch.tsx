import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Settings,
  Truck,
  CreditCard,
  Percent,
  Sparkles,
  Gift,
  Mail,
  HardDrive,
  Globe,
  Zap,
  BookOpen,
  Compass,
  Tag,
  Star,
  Boxes,
  Package,
  ShoppingBag,
  RotateCcw,
  Users,
  X,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import { Product } from '../../types';

interface SettingSearchItem {
  id: string;
  title: string;
  category: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  keywords: string[];
}

const SITE_SETTINGS_INDEX: SettingSearchItem[] = [
  {
    id: 'setting-general',
    title: 'General Store Profile & Brand Name',
    category: 'Store Settings',
    description: 'Store name (TANOAH), currency (INR ₹), contact email & official phone',
    path: '/admin/settings?tab=store',
    icon: <Settings className="w-4 h-4 text-[#3F3F8F]" />,
    keywords: ['store', 'name', 'brand', 'tanoah', 'currency', 'inr', 'rupee', 'email', 'phone', 'contact', 'general', 'profile'],
  },
  {
    id: 'setting-gst',
    title: 'Taxes & GST Rate Settings',
    category: 'Store Settings',
    description: 'GST identification number (32AAAAA0000A1Z5) and 5% apparel tax rate',
    path: '/admin/settings?tab=store',
    icon: <Percent className="w-4 h-4 text-emerald-600" />,
    keywords: ['gst', 'tax', 'taxation', 'gstin', 'invoice', '5%', 'apparel tax', 'gst rate', 'tax rate'],
  },
  {
    id: 'setting-shipping',
    title: 'Shipping Rates & Free Delivery Threshold',
    category: 'Store Settings',
    description: 'Free shipping min cart value (₹1,999), Standard & Express shipping charges',
    path: '/admin/settings?tab=store',
    icon: <Truck className="w-4 h-4 text-blue-600" />,
    keywords: ['shipping', 'delivery', 'free shipping', 'threshold', 'standard shipping', 'express shipping', 'shipping fee', 'rates'],
  },
  {
    id: 'setting-delivery-speeds',
    title: 'Delivery Speeds & Courier Tiers',
    category: 'Delivery Settings',
    description: 'Configured delivery speed tiers, estimated transit days, and India Post integration',
    path: '/admin/settings?tab=delivery',
    icon: <Truck className="w-4 h-4 text-indigo-600" />,
    keywords: ['courier', 'delivery speed', 'speed post', 'india post', 'dispatch', 'delivery days', 'standard delivery', 'express delivery'],
  },
  {
    id: 'setting-payments',
    title: 'Payment Gateways & Razorpay',
    category: 'Payment Settings',
    description: 'Razorpay API keys, Cash on Delivery (COD), UPI & Card payments',
    path: '/admin/settings?tab=payments',
    icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
    keywords: ['payment', 'razorpay', 'cod', 'cash on delivery', 'upi', 'gateway', 'key id', 'key secret', 'cards', 'netbanking'],
  },
  {
    id: 'setting-editorial',
    title: 'Featured Editorial Section (Atelier Story)',
    category: 'Homepage Settings',
    description: 'Homepage craft story section, couture imagery, and brand narrative',
    path: '/admin/settings?tab=editorial',
    icon: <Sparkles className="w-4 h-4 text-amber-600" />,
    keywords: ['editorial', 'atelier', 'craft', 'story', 'heritage', 'homepage story', 'bespoke', 'couture'],
  },
  {
    id: 'setting-offer-popup',
    title: 'Special Offer Modal Popup',
    category: 'Marketing Settings',
    description: 'Newsletter promotional discount popup, coupon code & trigger delay',
    path: '/admin/settings?tab=offer_popup',
    icon: <Gift className="w-4 h-4 text-purple-600" />,
    keywords: ['popup', 'modal', 'offer popup', 'discount popup', 'welcome offer', 'newsletter modal', 'trigger delay', 'promo popup'],
  },
  {
    id: 'setting-email',
    title: 'Transactional Emails & Resend API',
    category: 'Email Settings',
    description: 'Order confirmation emails, Resend API key, and test email dispatcher',
    path: '/admin/settings?tab=email',
    icon: <Mail className="w-4 h-4 text-rose-600" />,
    keywords: ['email', 'resend', 'smtp', 'order confirmation email', 'test email', 'notifications', 'transactional emails'],
  },
  {
    id: 'setting-media',
    title: 'Media Storage & Cloudflare R2',
    category: 'Storage Settings',
    description: 'Cloudflare R2 bucket connection, storage metrics & orphan asset cleanup',
    path: '/admin/settings?tab=media',
    icon: <HardDrive className="w-4 h-4 text-cyan-600" />,
    keywords: ['media', 'r2', 'cloudflare r2', 'storage', 'images', 'orphan cleanup', 'bucket', 'cdn', 'upload'],
  },
  {
    id: 'setting-seo',
    title: 'Store SEO & Google Analytics (GA4)',
    category: 'SEO Settings',
    description: 'Canonical domain, Google Search Console, Bing, GA4 & Meta Pixel tokens',
    path: '/admin/settings?tab=seo',
    icon: <Globe className="w-4 h-4 text-[#3F3F8F]" />,
    keywords: ['seo', 'canonical', 'google search console', 'bing', 'ga4', 'google analytics', 'meta pixel', 'facebook pixel', 'sitemap', 'google merchant feed'],
  },
  {
    id: 'setting-seo-dashboard',
    title: 'Technical SEO Health & 404 Monitor',
    category: 'SEO & Health',
    description: 'Storewide SEO score, automated 404 crawler error monitor & diagnostic checklist',
    path: '/admin/seo',
    icon: <Globe className="w-4 h-4 text-blue-700" />,
    keywords: ['seo health', 'audit', '404', 'broken links', 'crawler', 'health score', 'technical seo'],
  },
  {
    id: 'setting-redirects',
    title: '301 / 302 URL Redirects Manager',
    category: 'SEO & Health',
    description: 'Permanent 301 URL redirects, slug change history, and hit analytics',
    path: '/admin/seo/redirects',
    icon: <Zap className="w-4 h-4 text-amber-600" />,
    keywords: ['301', 'redirect', 'url redirects', 'slug migration', '302', 'permanent redirect', 'link tracker'],
  },
  {
    id: 'setting-blog',
    title: 'Fashion Journal & Editorial Blog',
    category: 'Content',
    description: 'Artisanal articles, seasonal styling guides, and content cluster linking',
    path: '/admin/blog',
    icon: <BookOpen className="w-4 h-4 text-emerald-700" />,
    keywords: ['blog', 'journal', 'articles', 'stories', 'editorial posts', 'fashion journal', 'guide', 'styling'],
  },
  {
    id: 'setting-navigation',
    title: 'Header Menus & Navigation Links',
    category: 'Navigation',
    description: 'Main navigation bar, mega menu categories, footer links, and hide menu controls',
    path: '/admin/navigation',
    icon: <Compass className="w-4 h-4 text-purple-700" />,
    keywords: ['navigation', 'menu', 'header menu', 'mega menu', 'footer links', 'hide menu', 'navbar'],
  },
  {
    id: 'setting-coupons',
    title: 'Coupons & Promotional Discounts',
    category: 'Discounts',
    description: 'Promo codes, percentage off, fixed discounts, and coupon usage limits',
    path: '/admin/coupons',
    icon: <Tag className="w-4 h-4 text-rose-600" />,
    keywords: ['coupon', 'discount', 'promo code', 'voucher', 'percentage', 'promotion', 'sales coupon'],
  },
  {
    id: 'setting-reviews',
    title: 'Customer Reviews & Star Ratings',
    category: 'Reviews',
    description: 'Moderate customer reviews, star ratings, and verified buyer badges',
    path: '/admin/reviews',
    icon: <Star className="w-4 h-4 text-amber-500" />,
    keywords: ['reviews', 'ratings', 'testimonials', 'star rating', 'verified customer', 'review approval'],
  },
  {
    id: 'setting-inventory',
    title: 'Inventory Alerts & Low Stock Thresholds',
    category: 'Inventory',
    description: 'SKU stock levels, restock alerts, and low stock threshold rules',
    path: '/admin/inventory',
    icon: <Boxes className="w-4 h-4 text-amber-700" />,
    keywords: ['inventory', 'stock', 'low stock', 'threshold', 'alert', 'restock', 'quantity', 'out of stock'],
  },
  {
    id: 'setting-products',
    title: 'Product Catalog & Garment Variants',
    category: 'Catalog',
    description: 'Manage luxury apparel, prices, sizes, colors, images, and specifications',
    path: '/admin/products',
    icon: <Package className="w-4 h-4 text-[#3F3F8F]" />,
    keywords: ['products', 'catalog', 'clothing', 'dresses', 'kurtas', 'sarees', 'add product', 'variants'],
  },
  {
    id: 'setting-orders',
    title: 'Orders & Fulfillment Pipeline',
    category: 'Orders',
    description: 'Live order tracking, India Post consignments, fulfillment statuses, and invoices',
    path: '/admin/orders',
    icon: <ShoppingBag className="w-4 h-4 text-blue-600" />,
    keywords: ['orders', 'fulfillment', 'tracking', 'dispatch', 'india post', 'consignment', 'order status'],
  },
  {
    id: 'setting-returns',
    title: 'Returns & Exchange Requests',
    category: 'Orders',
    description: 'Customer return requests, exchange processing, and refund management',
    path: '/admin/returns',
    icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
    keywords: ['returns', 'exchanges', 'refunds', 'return request', 'return status'],
  },
  {
    id: 'setting-customers',
    title: 'Customers CRM & Patron Database',
    category: 'Customers',
    description: 'Verified customer profiles, lifetime value (LTV), and VIP patron badges',
    path: '/admin/customers',
    icon: <Users className="w-4 h-4 text-[#3F3F8F]" />,
    keywords: ['customers', 'clients', 'client base', 'patrons', 'vip', 'crm', 'ltv', 'profiles'],
  },
];

export const AdminOmniSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Live dynamic data for orders & products
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getProducts(), api.getAdminOrders()]).then(([p, o]) => {
      if (isMounted) {
        setProducts(p || []);
        setOrders(o || []);
      }
    });

    const handleOrdersUpdate = () => {
      api.getAdminOrders().then((o) => {
        if (isMounted) setOrders(o || []);
      });
    };

    window.addEventListener('tanoah_orders_updated', handleOrdersUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('tanoah_orders_updated', handleOrdersUpdate);
    };
  }, []);

  // Global keyboard shortcut: '/' or 'Cmd+K' to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return { settings: [], products: [], orders: [], all: [] };

    // 1. Filter Site Settings
    const matchedSettings = SITE_SETTINGS_INDEX.filter((item) => {
      return (
        item.title.toLowerCase().includes(clean) ||
        item.category.toLowerCase().includes(clean) ||
        item.description.toLowerCase().includes(clean) ||
        item.keywords.some((k) => k.includes(clean))
      );
    }).slice(0, 6);

    // 2. Filter Products & SKUs
    const matchedProducts = products
      .filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(clean);
        const skuMatch = (p.variants || []).some((v) => (v.sku || '').toLowerCase().includes(clean));
        const catMatch = (p.category_name || '').toLowerCase().includes(clean);
        return titleMatch || skuMatch || catMatch;
      })
      .slice(0, 4)
      .map((p) => ({
        id: `prod-${p.id}`,
        title: p.title,
        category: 'Product Catalog',
        description: `SKU: ${p.variants?.[0]?.sku || 'N/A'} • ${p.category_name || 'Apparel'}`,
        path: `/admin/products/${p.id}`,
        icon: <Package className="w-4 h-4 text-[#3F3F8F]" />,
      }));

    // 3. Filter Orders
    const matchedOrders = orders
      .filter((o) => {
        const num = (o.order_number || o.orderNumber || o.id || '').toLowerCase();
        const email = (o.guest_email || o.formData?.email || '').toLowerCase();
        const name = (o.shipping_address?.first_name || o.formData?.firstName || '').toLowerCase();
        const tracking = (o.tracking_number || o.trackingNumber || '').toLowerCase();
        return num.includes(clean) || email.includes(clean) || name.includes(clean) || tracking.includes(clean);
      })
      .slice(0, 4)
      .map((o) => {
        const orderNum = o.order_number || o.orderNumber || o.id;
        const name =
          o.shipping_address?.first_name || o.formData?.firstName || o.guest_email || 'Customer';
        return {
          id: `ord-${orderNum}`,
          title: `Order #${orderNum}`,
          category: 'Order Fulfillment',
          description: `${name} • Status: ${o.status || 'processing'}`,
          path: `/admin/orders/${orderNum}`,
          icon: <ShoppingBag className="w-4 h-4 text-blue-600" />,
        };
      });

    const all = [
      ...matchedSettings.map((s) => ({ ...s, group: 'settings' })),
      ...matchedOrders.map((o) => ({ ...o, group: 'orders' })),
      ...matchedProducts.map((p) => ({ ...p, group: 'products' })),
    ];

    return {
      settings: matchedSettings,
      products: matchedProducts,
      orders: matchedOrders,
      all,
    };
  }, [query, products, orders]);

  const handleSelect = (path: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.all.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.all.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.all.length) % searchResults.all.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = searchResults.all[selectedIndex];
      if (item) {
        handleSelect(item.path);
      }
    }
  };

  return (
    <div className="relative w-64 sm:w-80 md:w-96" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search settings, orders, SKU, products..."
          className="w-full bg-[#F8F8F8] border border-[#E7E7E7] rounded-[4px] py-2 pl-8 pr-12 text-xs focus:outline-none focus:border-[#3F3F8F] transition-colors"
        />
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-black rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-white border border-[#E7E7E7] rounded shadow-xs">
            /
          </kbd>
        )}
      </div>

      {/* Omni-Search Results Popover */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-[#E7E7E7] rounded-[4px] shadow-2xl z-50 overflow-hidden text-left max-h-[440px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
          {searchResults.all.length === 0 ? (
            <div className="p-6 text-center text-neutral-400 space-y-1">
              <p className="text-xs font-semibold text-neutral-600">No matching settings or records found</p>
              <p className="text-[11px] text-neutral-400">
                Try keywords like &ldquo;gst&rdquo;, &ldquo;shipping&rdquo;, &ldquo;razorpay&rdquo;, &ldquo;email&rdquo;, &ldquo;popup&rdquo;, &ldquo;seo&rdquo;, or an order reference.
              </p>
            </div>
          ) : (
            <div className="py-2 divide-y divide-[#F0F0F0]">
              {/* Site Settings Section */}
              {searchResults.settings.length > 0 && (
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-[#3F3F8F] uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Store Settings & Configuration</span>
                  </div>
                  {searchResults.settings.map((item) => {
                    const globalIdx = searchResults.all.findIndex((a) => a.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item.path)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-[#EEEEF8]' : 'hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded bg-neutral-100 text-neutral-700 shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-black truncate flex items-center gap-1.5">
                              <span>{item.title}</span>
                              <span className="text-[9px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                                {item.category}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Orders Section */}
              {searchResults.orders.length > 0 && (
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3 h-3" />
                    <span>Orders & Fulfillment</span>
                  </div>
                  {searchResults.orders.map((item) => {
                    const globalIdx = searchResults.all.findIndex((a) => a.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item.path)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`px-3.5 py-2 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded bg-blue-50 text-blue-600 shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-black truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Products Section */}
              {searchResults.products.length > 0 && (
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3 h-3" />
                    <span>Products & SKUs</span>
                  </div>
                  {searchResults.products.map((item) => {
                    const globalIdx = searchResults.all.findIndex((a) => a.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item.path)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`px-3.5 py-2 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-purple-50/60' : 'hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded bg-purple-50 text-purple-600 shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-black truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Popover Footer Info */}
          <div className="p-2 bg-[#F8F8F8] border-t border-[#E7E7E7] text-[10px] text-neutral-500 flex justify-between items-center px-3">
            <span>Use &uarr; &darr; to navigate, Enter to select</span>
            <span className="font-mono text-neutral-400">ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
