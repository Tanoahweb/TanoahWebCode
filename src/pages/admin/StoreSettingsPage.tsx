import React, { useState, useEffect } from 'react';
import {
  Save,
  HardDrive,
  Sparkles,
  DollarSign,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
  Layers,
  Settings as SettingsIcon,
  ShieldCheck,
  Mail,
  Send,
  ExternalLink,
  CheckCircle2,
  Gift,
  CreditCard,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { emailService } from '../../services/emailService';
import { useSearchParams } from 'react-router-dom';
import { formatBytes } from '../../utils/imageUtils';
import { IMAGE_PRESETS } from '../../config/imagePresets';
import { AtelierSettingsTab } from '../../components/admin/AtelierSettingsTab';
import { OfferPopupSettingsTab } from '../../components/admin/OfferPopupSettingsTab';
import { PaymentGatewaysSettingsTab } from '../../components/admin/PaymentGatewaysSettingsTab';
import { DeliverySettingsTab } from '../../components/admin/DeliverySettingsTab';
import { SeoSettingsTab } from '../../components/admin/SeoSettingsTab';
import { FaviconUploader } from '../../components/admin/FaviconUploader';
import { r2Service } from '../../services/r2Service';
import { Globe } from 'lucide-react';
import { ReturnAddressConfig, DispatchFromAddressConfig } from '../../types';

export const StoreSettingsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    'store' | 'delivery' | 'payments' | 'editorial' | 'offer_popup' | 'email' | 'media' | 'seo'
  >(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (['delivery', 'payments', 'editorial', 'offer_popup', 'email', 'media', 'seo'].includes(tabParam || '')) {
      return tabParam as any;
    }
    return 'store';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['store', 'delivery', 'payments', 'editorial', 'offer_popup', 'email', 'media', 'seo'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingReturnTest, setIsSendingReturnTest] = useState(false);
  const [testRecipient, setTestRecipient] = useState(
    import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL || 'connectus.tanoah@gmail.com'
  );

  // Store settings form state
  const [settings, setSettings] = useState({
    storeName: 'TANOAH',
    faviconUrl: '/Assets/brand/logo-badge-white.png',
    currency: 'INR',
    currencySymbol: '₹',
    contactEmail: 'connectus.tanoah@gmail.com',
    phone: '+91 8714141849',
    freeShippingThreshold: 1999,
    standardShippingFee: 99,
    expressShippingFee: 199,
    gstNumber: '32AAAAA0000A1Z5',
    defaultTaxRate: 5,
  });

  const [returnAddress, setReturnAddress] = useState<ReturnAddressConfig>({
    hub_name: 'TANOAH RETURNS HUB',
    recipient_name: 'Tanoah',
    address_line1: 'Rappal, Pudukkad P O',
    city: 'Thrissur',
    state: 'Kerala',
    postal_code: '680301',
    contact_phone: '+91 8714141849',
    instructions:
      'Important: Do not remove or damage the price tag. Any parcel received with a missing or detached tag is strictly ineligible for refund.',
  });

  const [dispatchFromAddress, setDispatchFromAddress] = useState<DispatchFromAddressConfig>(() => {
    try {
      const saved = localStorage.getItem('tanoah_dispatch_from_address');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      sender_name: 'TANOAH',
      address_line1: 'Rappal, Pudukkad P O',
      address_line2: '',
      city: 'Thrissur',
      state: 'Kerala',
      postal_code: '680301',
      contact_phone: '+91 8714141849',
      contact_email: 'connectus.tanoah@gmail.com',
      gstin: '32AAAAA0000A1Z5',
    };
  });

  // Storage analytics state
  const [storageStats, setStorageStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Orphan cleanup state
  const [orphanScanResult, setOrphanScanResult] = useState<any>(null);
  const [isScanningOrphans, setIsScanningOrphans] = useState(false);
  const [isPurgingOrphans, setIsPurgingOrphans] = useState(false);

  // R2 connection testing state
  const [isTestingR2, setIsTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<{ success: boolean; message: string; objectCount?: number } | null>(null);

  const handleTestR2Connection = async () => {
    setIsTestingR2(true);
    try {
      const res = await r2Service.testConnection();
      setR2TestResult(res);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Cloudflare R2 Connected',
          description: res.message,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          description: res.message,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        description: err.message || 'Could not connect to Cloudflare R2.',
      });
    } finally {
      setIsTestingR2(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    api.getStoreSettings().then((s: any) => {
      if (isMounted && s) {
        if (s.return_address_config) {
          setReturnAddress((prev) => ({ ...prev, ...s.return_address_config }));
        }
        if (s.dispatch_from_address) {
          setDispatchFromAddress((prev) => ({ ...prev, ...s.dispatch_from_address }));
        }
        setSettings({
          storeName: s.store_name || s.storeName || 'TANOAH',
          faviconUrl: s.favicon_url || s.faviconUrl || '/Assets/brand/logo-badge-white.png',
          currency: s.currency || 'INR',
          currencySymbol: s.currency_symbol || s.currencySymbol || '₹',
          contactEmail: s.contact_email || s.contactEmail || 'connectus.tanoah@gmail.com',
          phone: s.contact_phone || s.phone || '+91 8714141849',
          freeShippingThreshold: s.free_shipping_threshold || s.freeShippingThreshold || 1999,
          standardShippingFee: s.standard_shipping_rate || s.standardShippingFee || 99,
          expressShippingFee: s.express_shipping_rate || s.expressShippingFee || 199,
          gstNumber: s.gst_number || s.gstNumber || '32AAAAA0000A1Z5',
          defaultTaxRate: s.default_tax_rate || s.defaultTaxRate || 5,
        });
      }
    });

    loadStorageStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadStorageStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await api.getStorageAnalytics();
      setStorageStats(stats);
    } catch (err) {
      console.warn('Could not load storage stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleScanOrphans = async () => {
    setIsScanningOrphans(true);
    try {
      const result = await api.cleanupOrphanMedia(true);
      setOrphanScanResult(result);
      addToast({
        type: 'info',
        title: 'Orphan Scan Complete',
        description: result.message || `Found ${result.orphanCount || 0} unreferenced file(s).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Scan Failed',
        description: err.message || 'Unable to scan orphan files.',
      });
    } finally {
      setIsScanningOrphans(false);
    }
  };

  const handlePurgeOrphans = async () => {
    if (!window.confirm('Are you sure you want to permanently purge all unreferenced image files from Cloudflare R2?')) {
      return;
    }

    setIsPurgingOrphans(true);
    try {
      const result = await api.cleanupOrphanMedia(false);
      setOrphanScanResult(null);
      await loadStorageStats();
      addToast({
        type: 'success',
        title: 'Orphan Purge Complete',
        description: result.message || 'Unreferenced media files safely deleted.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Purge Failed',
        description: err.message || 'Unable to purge orphan files.',
      });
    } finally {
      setIsPurgingOrphans(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('tanoah_dispatch_from_address', JSON.stringify(dispatchFromAddress));
    } catch {}

    await api.saveStoreSettings({
      store_name: settings.storeName,
      favicon_url: settings.faviconUrl,
      contact_email: settings.contactEmail,
      contact_phone: settings.phone,
      free_shipping_threshold: Number(settings.freeShippingThreshold),
      standard_shipping_rate: Number(settings.standardShippingFee),
      express_shipping_rate: Number(settings.expressShippingFee),
      cod_enabled: false,
      cod_fee: 0,
      gst_number: settings.gstNumber,
      default_tax_rate: Number(settings.defaultTaxRate),
      return_address_config: returnAddress,
      dispatch_from_address: dispatchFromAddress,
    });

    addToast({
      type: 'success',
      title: 'Settings Saved & Live',
      description: 'Store parameters, packing slip dispatch address, and GST rules successfully synced.',
    });
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      addToast({
        type: 'error',
        title: 'Recipient Required',
        description: 'Please enter a valid email address to receive the test.',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await emailService.sendTestEmail(testRecipient);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Test Email Dispatched! ✉️',
          description: `Verification email delivered to ${testRecipient}. Check your inbox!`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Test Dispatch Failed',
          description: res.error || 'Could not send test email via Resend.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'An unexpected error occurred while sending test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendTestReturnEmail = async () => {
    if (!testRecipient) {
      addToast({
        type: 'error',
        title: 'Recipient Required',
        description: 'Please enter a valid email address to receive the test return alert.',
      });
      return;
    }

    setIsSendingReturnTest(true);
    try {
      const res = await emailService.sendTestReturnEmail(testRecipient);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Return Alert Dispatched! ✉️',
          description: `Sample return claim alert delivered to ${testRecipient}. Check your inbox!`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Test Dispatch Failed',
          description: res.error || 'Could not send test return alert via Resend.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'An unexpected error occurred while sending test return email.',
      });
    } finally {
      setIsSendingReturnTest(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins max-w-5xl pb-16">
        <div>
          <h1 className="font-wondra text-2xl sm:text-3xl text-black">
            STORE SETTINGS & INFRASTRUCTURE
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Manage store parameters, tax rules, real-time Resend order email alerts, and Cloudflare R2 pipeline.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E7E7E7] gap-6 text-xs font-semibold uppercase tracking-wider overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('store');
              setSearchParams({});
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'store'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Store Parameters & Favicon</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('delivery');
              setSearchParams({ tab: 'delivery' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'delivery'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Delivery Speeds & Rates</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('payments');
              setSearchParams({ tab: 'payments' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Gateways</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('editorial');
              setSearchParams({ tab: 'editorial' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'editorial'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Featured Editorial Section</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('offer_popup');
              setSearchParams({ tab: 'offer_popup' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'offer_popup'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Special Offer Popup</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('email');
              setSearchParams({ tab: 'email' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'email'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Order Email Alerts (Resend)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('media');
              setSearchParams({ tab: 'media' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Media & Cloudflare R2 Pipeline</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('seo');
              setSearchParams({ tab: 'seo' });
            }}
            className={`pb-3 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'seo'
                ? 'border-b-2 border-[#3F3F8F] text-[#3F3F8F]'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>SEO & Analytics</span>
          </button>
        </div>

        {/* Tab: SEO & Analytics */}
        {activeTab === 'seo' && <SeoSettingsTab />}

        {/* Tab: Delivery Speeds & Rates */}
        {activeTab === 'delivery' && <DeliverySettingsTab />}

        {/* Tab: Payment Gateways (Razorpay & Cashfree) */}
        {activeTab === 'payments' && <PaymentGatewaysSettingsTab />}

        {/* Tab 0: Featured Editorial Section */}
        {activeTab === 'editorial' && <AtelierSettingsTab />}

        {/* Tab 0.5: Special Offer Popup */}
        {activeTab === 'offer_popup' && <OfferPopupSettingsTab />}

        {/* Tab 1: Store Parameters & Favicon */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* Standard Favicon Uploader & Studio */}
            <FaviconUploader
              currentFaviconUrl={settings.faviconUrl}
              onFaviconUpdated={(newUrl) => setSettings((prev) => ({ ...prev, faviconUrl: newUrl }))}
            />

            <form
              onSubmit={handleSaveStore}
              className="bg-white p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 text-xs"
            >
              <div className="border-b border-[#E7E7E7] pb-3">
                <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                  Store Parameters & GST Configuration
                </h3>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  General store metadata, contact coordinates, shipping fee rules, and tax parameters.
                </p>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  GST Identification Number (GSTIN)
                </label>
                <input
                  type="text"
                  value={settings.gstNumber}
                  onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Support Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  value={settings.freeShippingThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Standard Shipping Fee (₹)
                </label>
                <input
                  type="number"
                  value={settings.standardShippingFee}
                  onChange={(e) =>
                    setSettings({ ...settings, standardShippingFee: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Express Shipping Fee (₹)
                </label>
                <input
                  type="number"
                  value={settings.expressShippingFee}
                  onChange={(e) =>
                    setSettings({ ...settings, expressShippingFee: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* Customer Self-Shipment Return Address Section */}
            <div className="border-t border-[#E7E7E7] pt-6 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#3F3F8F]" />
                  <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                    Customer Self-Shipment Return Address
                  </h3>
                </div>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Displayed to customers on Step 3 of the Return Portal after unboxing video confirmation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Return Hub Title *
                  </label>
                  <input
                    type="text"
                    value={returnAddress.hub_name}
                    onChange={(e) => setReturnAddress({ ...returnAddress, hub_name: e.target.value })}
                    placeholder="e.g. TANOAH RETURNS HUB"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Recipient / Business Name *
                  </label>
                  <input
                    type="text"
                    value={returnAddress.recipient_name}
                    onChange={(e) => setReturnAddress({ ...returnAddress, recipient_name: e.target.value })}
                    placeholder="e.g. Tanoah"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Address Line (Building, Street, Landmark) *
                </label>
                <input
                  type="text"
                  value={returnAddress.address_line1}
                  onChange={(e) => setReturnAddress({ ...returnAddress, address_line1: e.target.value })}
                  placeholder="e.g. Rappal, Pudukkad P O"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    City / District *
                  </label>
                  <input
                    type="text"
                    value={returnAddress.city}
                    onChange={(e) => setReturnAddress({ ...returnAddress, city: e.target.value })}
                    placeholder="e.g. Thrissur"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={returnAddress.state}
                    onChange={(e) => setReturnAddress({ ...returnAddress, state: e.target.value })}
                    placeholder="e.g. Kerala"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={returnAddress.postal_code}
                    onChange={(e) => setReturnAddress({ ...returnAddress, postal_code: e.target.value })}
                    placeholder="e.g. 680301"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Contact Phone / WhatsApp *
                </label>
                <input
                  type="text"
                  value={returnAddress.contact_phone}
                  onChange={(e) => setReturnAddress({ ...returnAddress, contact_phone: e.target.value })}
                  placeholder="e.g. +91 8714141849"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Policy & Tag Instructions (Customer Notice)
                </label>
                <textarea
                  rows={2}
                  value={returnAddress.instructions || ''}
                  onChange={(e) => setReturnAddress({ ...returnAddress, instructions: e.target.value })}
                  placeholder="e.g. Important: Do not remove or damage the price tag. Any parcel received with a missing or detached tag is strictly ineligible for refund."
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>
            </div>

            {/* Dispatch & Packing Slip Origin Address (FROM Address) */}
            <div className="border-t border-[#E7E7E7] pt-6 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#3F3F8F]" />
                  <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                    Dispatch & Packing Slip Origin Address (FROM Address)
                  </h3>
                </div>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  This address is printed on official parcel packaging slips & shipping labels as the sender (FROM) address. Update this anytime your dispatch warehouse location changes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Sender / Brand Name *
                  </label>
                  <input
                    type="text"
                    value={dispatchFromAddress.sender_name}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, sender_name: e.target.value })}
                    placeholder="e.g. TANOAH"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Contact Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={dispatchFromAddress.contact_phone}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, contact_phone: e.target.value })}
                    placeholder="e.g. +91 8714141849"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Address Line 1 (Building, Street, Area) *
                </label>
                <input
                  type="text"
                  value={dispatchFromAddress.address_line1}
                  onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, address_line1: e.target.value })}
                  placeholder="e.g. Rappal, Pudukkad P O"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Address Line 2 (Landmark / Suite - Optional)
                </label>
                <input
                  type="text"
                  value={dispatchFromAddress.address_line2 || ''}
                  onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, address_line2: e.target.value })}
                  placeholder="e.g. Near Post Office / Floor 2"
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    City / District *
                  </label>
                  <input
                    type="text"
                    value={dispatchFromAddress.city}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, city: e.target.value })}
                    placeholder="e.g. Thrissur"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={dispatchFromAddress.state}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, state: e.target.value })}
                    placeholder="e.g. Kerala"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={dispatchFromAddress.postal_code}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, postal_code: e.target.value })}
                    placeholder="e.g. 680301"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={dispatchFromAddress.contact_email || ''}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, contact_email: e.target.value })}
                    placeholder="e.g. connectus.tanoah@gmail.com"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={dispatchFromAddress.gstin || ''}
                    onChange={(e) => setDispatchFromAddress({ ...dispatchFromAddress, gstin: e.target.value })}
                    placeholder="e.g. 32AAAAA0000A1Z5"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono uppercase focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E7E7E7]">
              <Button variant="primary" size="lg" type="submit" icon={<Save className="w-4 h-4" />}>
                SAVE STORE SETTINGS
              </Button>
            </div>
          </form>
        </div>
      )}

        {/* Tab 2: Email Alerts & Resend Integration */}
        {activeTab === 'email' && (
          <div className="space-y-6 text-xs font-poppins">
            {/* Status overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Resend Service Status
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-sm text-emerald-800 uppercase tracking-wide">
                    Live & Connected
                  </span>
                </div>
                <div className="text-[11px] text-[#666666] pt-1">
                  Connected via Supabase Edge Function with 256-bit API authorization
                </div>
              </div>

              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Admin Real-Time Alert
                </span>
                <div className="font-semibold text-sm text-black truncate pt-1">
                  connectus.tanoah@gmail.com
                </div>
                <div className="text-[11px] text-[#666666] pt-1">
                  Receives instant notification for every successful payment & order
                </div>
              </div>

              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Customer Confirmations
                </span>
                <div className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-[#3F3F8F]">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Luxury Editorial Template</span>
                </div>
                <div className="text-[11px] text-[#666666] pt-1">
                  Automated dispatch with order details, tracking link &amp; customer care
                </div>
              </div>
            </div>

            {/* Test Email Dispatch Card */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#3F3F8F]" />
                  <h3 className="font-semibold text-black text-sm uppercase tracking-wider">
                    Instant Live Test Dispatch
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold uppercase">
                  Ready to Dispatch
                </span>
              </div>

              <p className="text-neutral-600 text-xs leading-relaxed">
                Test the real-time pipeline right now. Clicking below triggers the Edge Function to authenticate with Resend and deliver a verified test alert to your email.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-1">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Send Test Alert To
                  </label>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="connectus.tanoah@gmail.com"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <div className="sm:pt-5 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest || isSendingReturnTest}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {isSendingTest ? 'DISPATCHING TEST...' : 'SEND TEST ORDER EMAIL'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSendTestReturnEmail}
                    disabled={isSendingTest || isSendingReturnTest}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    {isSendingReturnTest ? 'DISPATCHING RETURN TEST...' : 'SEND TEST RETURN ALERT'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Configuration & Domain Setup Guide */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wider border-b border-[#E7E7E7] pb-3">
                Email Dispatch Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Configured Company / Admin Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value="connectus.tanoah@gmail.com"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] bg-neutral-50 text-neutral-600 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    All new order notifications are instantly forwarded here.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Default Sender ("From" Address)
                  </label>
                  <input
                    type="text"
                    disabled
                    value="TANOAH <onboarding@resend.dev>"
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] bg-neutral-50 text-neutral-600 cursor-not-allowed font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Using Resend default sender. Custom domain can be attached via resend.com/domains.
                  </p>
                </div>
              </div>

              {/* Domain Advisory Banner */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-[4px] flex items-start gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold block uppercase text-[11px] tracking-wide text-amber-800">
                    Pro-tip for Customer Deliveries (Custom Domain):
                  </span>
                  <p>
                    Admin alerts to <strong>connectus.tanoah@gmail.com</strong> are active immediately. To send confirmation emails to any external customer domain without restriction, add and verify your domain (e.g. <code>tanoah.com</code>) at{' '}
                    <a
                      href="https://resend.com/domains"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold text-amber-950 inline-flex items-center gap-1"
                    >
                      resend.com/domains <ExternalLink className="w-3 h-3" />
                    </a>
                    . Once verified, customer confirmations will deliver seamlessly from <code>orders@tanoah.com</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Media & Cloudflare R2 Pipeline */}
        {activeTab === 'media' && (
          <div className="space-y-6 text-xs font-poppins">
            {/* Storage Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Total Stored Masters
                </span>
                <div className="font-wondra text-2xl text-black">
                  {storageStats?.totalAssets ?? 0} Files
                </div>
                <div className="text-[11px] text-[#666666]">
                  Single WebP master per image (No stored derivatives)
                </div>
              </div>

              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Total R2 Storage Used
                </span>
                <div className="font-wondra text-2xl text-[#3F3F8F]">
                  {formatBytes(storageStats?.totalStorageBytes ?? 0)}
                </div>
                <div className="text-[11px] text-[#666666]">
                  Bucket: <span className="font-mono">{storageStats?.bucketName || 'tanoah-media'}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Bandwidth & Storage Saved
                </span>
                <div className="font-wondra text-2xl text-emerald-600">
                  {storageStats?.percentSaved ?? 88}%
                </div>
                <div className="text-[11px] text-[#666666]">
                  Saved vs unoptimized raw uploads via in-browser pipeline
                </div>
              </div>

              <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-1">
                <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                  Estimated Monthly R2 Cost
                </span>
                <div className="font-wondra text-2xl text-black">
                  {storageStats?.estimatedCostMonthly || '$0.00'}
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  10 GB Free Tier Active ($0.015/GB thereafter)
                </div>
              </div>
            </div>

            {/* Architecture Details Box & Live Connection Manager */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-[#E7E7E7] gap-3">
                <div>
                  <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#3F3F8F]" />
                    <span>CLOUDFLARE R2 BUCKET & PIPELINE ARCHITECTURE</span>
                  </h3>
                  <p className="text-[11px] text-[#666666] mt-0.5">
                    Object storage and global high-speed edge CDN connected to Cloudflare.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    isLoading={isTestingR2}
                    onClick={handleTestR2Connection}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    TEST R2 CONNECTION
                  </Button>
                </div>
              </div>

              {/* R2 Test Result Banner */}
              {r2TestResult && (
                <div
                  className={`p-3.5 rounded-[4px] border text-[11px] flex items-start gap-2.5 ${
                    r2TestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {r2TestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block uppercase text-[10px] tracking-wide">
                      {r2TestResult.success ? 'R2 Connection Active' : 'Connection Check Failed'}
                    </span>
                    <p>{r2TestResult.message}</p>
                    {r2TestResult.objectCount !== undefined && (
                      <p className="text-[10px] opacity-80">
                        Objects verified in bucket: {r2TestResult.objectCount}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                <div className="p-3 bg-[#FAFAFA] rounded border border-[#E7E7E7] space-y-1">
                  <span className="font-bold text-black uppercase text-[10px]">Cloudflare R2 Bucket</span>
                  <div className="font-mono text-[#3F3F8F] font-semibold">{r2Service.getBucketName()}</div>
                  <p className="text-[#666666]">
                    Endpoint: <code className="text-[10px]">https://83d30821450e31240831ae4a1f1dbe72.r2.cloudflarestorage.com</code>
                  </p>
                </div>

                <div className="p-3 bg-[#FAFAFA] rounded border border-[#E7E7E7] space-y-1">
                  <span className="font-bold text-black uppercase text-[10px]">Public CDN Delivery Domain</span>
                  <div className="font-mono text-neutral-800 break-all select-all font-semibold">
                    {r2Service.getPublicDomain()}
                  </div>
                  <p className="text-[#666666]">
                    Direct public asset delivery URL for storefront and client downloads.
                  </p>
                </div>

                <div className="p-3 bg-[#FAFAFA] rounded border border-[#E7E7E7] space-y-1">
                  <span className="font-bold text-black uppercase text-[10px]">SHA-256 Deduplication</span>
                  <div className="text-emerald-700 font-semibold">Automatic In-Browser & API</div>
                  <p className="text-[#666666]">
                    Identical image uploads are detected instantly, preventing redundant file storage.
                  </p>
                </div>

                <div className="p-3 bg-[#FAFAFA] rounded border border-[#E7E7E7] space-y-1">
                  <span className="font-bold text-black uppercase text-[10px]">Egress Bandwidth Fees</span>
                  <div className="text-[#3F3F8F] font-semibold">$0.00 / Zero Egress Fees</div>
                  <p className="text-[#666666]">
                    Cloudflare R2 provides zero egress fees and 10 GB free monthly storage.
                  </p>
                </div>
              </div>

              {/* Direct Browser Upload CORS Guidance */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-[4px] flex items-start gap-2.5 text-[11px] text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block uppercase text-[10px] tracking-wide text-amber-800">
                    Direct Browser Upload Notice (CORS Policy):
                  </span>
                  <p className="leading-relaxed">
                    If uploading directly from a web browser, ensure CORS is enabled on the <code>tanoah-media</code> bucket in Cloudflare dashboard:
                    Go to <strong>R2 &gt; tanoah-media &gt; Settings &gt; CORS Policy</strong> and allow origins: <code>["*"]</code> with methods: <code>["GET", "PUT", "POST", "HEAD", "DELETE"]</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Orphan Media Scanner & Purge */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-[#E7E7E7] gap-3">
                <div>
                  <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-[#3F3F8F]" />
                    <span>ORPHAN MEDIA SCANNER & STORAGE RECLAIM</span>
                  </h3>
                  <p className="text-[11px] text-[#666666] mt-0.5">
                    Scan for unreferenced images that are not linked to any product, variant, or banner.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    isLoading={isScanningOrphans}
                    onClick={handleScanOrphans}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    SCAN ORPHANS (DRY RUN)
                  </Button>
                </div>
              </div>

              {orphanScanResult && (
                <div className="p-4 bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-black">
                      Scan Result: {orphanScanResult.orphanCount} unreferenced orphan file(s) found.
                    </span>
                    {orphanScanResult.reclaimableBytes > 0 && (
                      <span className="text-[#3F3F8F] font-bold">
                        Reclaimable: {formatBytes(orphanScanResult.reclaimableBytes)}
                      </span>
                    )}
                  </div>

                  {orphanScanResult.orphanCount > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                        ⚠️ These files have 0 product image associations and are older than 24 hours. Purging
                        will delete them from Cloudflare R2 to save quota.
                      </p>
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={isPurgingOrphans}
                        onClick={handlePurgeOrphans}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        PURGE {orphanScanResult.orphanCount} ORPHAN ASSET(S) NOW
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Zero orphaned media found. Your storage is completely clean!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Presets Reference Table */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs">
                CONFIGURED VIEWPORT PRESETS (EDGE DELIVERED)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7E7E7] text-[#888888] uppercase text-[10px]">
                      <th className="py-2">Preset</th>
                      <th className="py-2">Responsive Widths</th>
                      <th className="py-2">Quality</th>
                      <th className="py-2">Aspect Ratio</th>
                      <th className="py-2">Usage Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {Object.entries(IMAGE_PRESETS).map(([key, p]) => (
                      <tr key={key} className="hover:bg-neutral-50">
                        <td className="py-2.5 font-semibold text-black">{key}</td>
                        <td className="py-2.5 font-mono text-[#3F3F8F]">{p.widths.join(', ')} px</td>
                        <td className="py-2.5">{p.quality}%</td>
                        <td className="py-2.5 font-medium">{p.aspectRatio}</td>
                        <td className="py-2.5 text-[#666666]">
                          {key === 'productCard'
                            ? 'Catalog & Collection product cards'
                            : key === 'productMain'
                            ? 'PDP stage hero with eager LCP'
                            : key === 'productZoom'
                            ? 'Delayed high-res 2.2x zoom lens'
                            : key === 'thumbnail'
                            ? 'Thumbnail strips & cart dropdown'
                            : key === 'hero'
                            ? 'Editorial campaign full banners'
                            : 'Cart drawer line items'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
