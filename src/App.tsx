import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingWhatsApp } from './components/layout/FloatingWhatsApp';
import { MobileMenu } from './components/layout/MobileMenu';
import { CartDrawer } from './components/cart/CartDrawer';
import { QuickViewModal } from './components/product/QuickViewModal';
import { SearchOverlay } from './components/common/SearchOverlay';
import { OfferPopup } from './components/common/OfferPopup';
import { ToastContainer } from './components/common/ToastContainer';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { useAuthStore } from './store/useAuthStore';

// Customer Pages
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { LookbookPage } from './pages/LookbookPage';

// Auth & Account
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { AccountPage } from './pages/Account/AccountPage';
import { ReturnsPage } from './pages/Account/ReturnsPage';

// CMS Pages
import { AboutPage } from './pages/CMS/AboutPage';
import { ContactPage } from './pages/CMS/ContactPage';
import { PolicyPage } from './pages/CMS/PolicyPage';

// Admin Pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { ProductListPage } from './pages/admin/ProductListPage';
import { ProductEditPage } from './pages/admin/ProductEditPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { OrderListPage } from './pages/admin/OrderListPage';
import { OrderDetailPage } from './pages/admin/OrderDetailPage';
import { ReturnsQueuePage } from './pages/admin/ReturnsQueuePage';
import { CustomersPage } from './pages/admin/CustomersPage';
import { MediaLibraryPage } from './pages/admin/MediaLibraryPage';
import { CouponsPage } from './pages/admin/CouponsPage';
import { StoreSettingsPage } from './pages/admin/StoreSettingsPage';
import { CollectionsPage } from './pages/admin/CollectionsPage';
import { NavigationPage } from './pages/admin/NavigationPage';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isCheckoutRoute = location.pathname === '/checkout';

  useSmoothScroll();
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-black font-poppins selection:bg-[#3F3F8F] selection:text-white">
      {/* Customer Storefront Chrome (Hidden on Admin & Checkout) */}
      {!isAdminRoute && !isCheckoutRoute && (
        <>
          <AnnouncementBar />
          <Header />
        </>
      )}

      {/* Routes */}
      <main className="flex-1">
        <Routes>
          {/* Storefront Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/collections/:collection" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/tracking" element={<OrderTrackingPage />} />
          <Route path="/lookbook" element={<LookbookPage />} />

          {/* Auth & Account */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/returns" element={<ReturnsPage />} />

          {/* CMS */}
          <Route path="/pages/about" element={<AboutPage />} />
          <Route path="/pages/contact" element={<ContactPage />} />
          <Route path="/pages/:policyType" element={<PolicyPage />} />

          {/* Admin Panel */}
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/products" element={<ProductListPage />} />
          <Route path="/admin/products/new" element={<ProductEditPage />} />
          <Route path="/admin/products/:id" element={<ProductEditPage />} />
          <Route path="/admin/inventory" element={<InventoryPage />} />
          <Route path="/admin/orders" element={<OrderListPage />} />
          <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
          <Route path="/admin/returns" element={<ReturnsQueuePage />} />
          <Route path="/admin/customers" element={<CustomersPage />} />
          <Route path="/admin/collections" element={<CollectionsPage />} />
          <Route path="/admin/navigation" element={<NavigationPage />} />
          <Route path="/admin/media" element={<MediaLibraryPage />} />
          <Route path="/admin/coupons" element={<CouponsPage />} />
          <Route path="/admin/settings" element={<StoreSettingsPage />} />
        </Routes>
      </main>

      {/* Footer & Floating Helpers */}
      {!isAdminRoute && !isCheckoutRoute && (
        <>
          <Footer />
          <FloatingWhatsApp />
        </>
      )}

      {/* Global Interactive Modals & Drawers */}
      <CartDrawer />
      <QuickViewModal />
      <SearchOverlay />
      <MobileMenu />
      <OfferPopup />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
