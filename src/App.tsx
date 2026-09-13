import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Preloader } from './components/common/Preloader';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { useAuthStore } from './store/useAuthStore';
import { api } from './services/api';
import { applyFavicon } from './utils/faviconUtils';

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
import { NotFoundPage } from './pages/NotFoundPage';

// Auth & Account
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
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
import { ReviewsPage } from './pages/admin/ReviewsPage';
import { SeoDashboardPage } from './pages/admin/SeoDashboardPage';
import { SeoRedirectsPage } from './pages/admin/SeoRedirectsPage';
import { BlogAdminPage } from './pages/admin/BlogAdminPage';
import { BlogListPage } from './pages/Blog/BlogListPage';
import { BlogPostPage } from './pages/Blog/BlogPostPage';
import { FormSubmissionsPage } from './pages/admin/FormSubmissionsPage';
import { SizeChartsPage } from './pages/admin/SizeChartsPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminGuard } from './components/admin/AdminGuard';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isCheckoutRoute = location.pathname === '/checkout';

  useSmoothScroll();
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    // Synchronize Store Favicon on app mount
    api
      .getStoreSettings()
      .then((settings) => {
        if (settings?.favicon_url) {
          applyFavicon(settings.favicon_url);
        }
      })
      .catch(() => {});
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
          <Route path="/collections" element={<Navigate to="/collections/all" replace />} />
          <Route path="/catalog" element={<Navigate to="/collections/all" replace />} />
          <Route path="/collections/:collection" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/tracking" element={<OrderTrackingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/return-request" element={<ReturnsPage />} />
          <Route path="/lookbook" element={<LookbookPage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/categories/:collection" element={<CatalogPage />} />

          {/* Auth & Account */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/returns" element={<ReturnsPage />} />

          {/* CMS */}
          <Route path="/pages/about" element={<AboutPage />} />
          <Route path="/pages/contact" element={<ContactPage />} />
          <Route path="/pages/:policyType" element={<PolicyPage />} />

          {/* Dedicated Admin Login Gateway (Unprotected) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Panel OS */}
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/products" element={<ProductListPage />} />
            <Route path="/admin/products/new" element={<ProductEditPage />} />
            <Route path="/admin/products/:id" element={<ProductEditPage />} />
            <Route path="/admin/inventory" element={<InventoryPage />} />
            <Route path="/admin/size-charts" element={<SizeChartsPage />} />
            <Route path="/admin/orders" element={<OrderListPage />} />
            <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
            <Route path="/admin/returns" element={<ReturnsQueuePage />} />
            <Route path="/admin/customers" element={<CustomersPage />} />
            <Route path="/admin/collections" element={<CollectionsPage />} />
            <Route path="/admin/navigation" element={<NavigationPage />} />
            <Route path="/admin/media" element={<MediaLibraryPage />} />
            <Route path="/admin/coupons" element={<CouponsPage />} />
            <Route path="/admin/reviews" element={<ReviewsPage />} />
            <Route path="/admin/seo" element={<SeoDashboardPage />} />
            <Route path="/admin/seo/redirects" element={<SeoRedirectsPage />} />
            <Route path="/admin/forms" element={<FormSubmissionsPage />} />
            <Route path="/admin/blog" element={<BlogAdminPage />} />
            <Route path="/admin/settings" element={<StoreSettingsPage />} />
          </Route>

          {/* 404 Catch-All Page for Unmatched URLs */}
          <Route path="*" element={<NotFoundPage />} />
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
    <ErrorBoundary>
      <Preloader />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
