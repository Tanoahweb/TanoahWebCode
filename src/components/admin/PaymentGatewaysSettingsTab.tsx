import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Save,
  RotateCcw,
  Zap,
  Globe,
  Lock,
  ArrowRight,
  Info,
  Radio,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { paymentService } from '../../services/paymentService';
import {
  PaymentGatewaysConfig,
  DEFAULT_PAYMENT_GATEWAYS_CONFIG,
  TestConnectionResult,
} from '../../types/paymentGateway';

export const PaymentGatewaysSettingsTab: React.FC = () => {
  const { addToast } = useUIStore();

  const [config, setConfig] = useState<PaymentGatewaysConfig>(DEFAULT_PAYMENT_GATEWAYS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sub-tab selection: 'razorpay' | 'cashfree' | 'cod'
  const [activeSubTab, setActiveSubTab] = useState<'razorpay' | 'cashfree' | 'cod'>('razorpay');

  // Password / Secret visibility toggles
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showCashfreeSecret, setShowCashfreeSecret] = useState(false);

  // Connection testing states
  const [isTestingRazorpay, setIsTestingRazorpay] = useState(false);
  const [razorpayTestResult, setRazorpayTestResult] = useState<TestConnectionResult | null>(null);

  const [isTestingCashfree, setIsTestingCashfree] = useState(false);
  const [cashfreeTestResult, setCashfreeTestResult] = useState<TestConnectionResult | null>(null);

  // Webhook copy states
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    let isMounted = true;
    paymentService.getAdminPaymentGatewaysConfig().then((data) => {
      if (isMounted && data) {
        setConfig(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await paymentService.saveAdminPaymentGatewaysConfig(config);
    setIsSaving(false);

    if (success) {
      addToast({
        type: 'success',
        title: 'Payment Settings Saved',
        description: 'Your payment gateway configurations are active and synced across all devices.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Could not save payment gateway settings to database.',
      });
    }
  };

  const handleTestRazorpay = async () => {
    setIsTestingRazorpay(true);
    setRazorpayTestResult(null);

    const result = await paymentService.testConnection({
      gateway: 'razorpay',
      key_id: config.razorpay.key_id,
      key_secret: config.razorpay.key_secret,
      environment: config.razorpay.environment,
    });

    setIsTestingRazorpay(false);
    setRazorpayTestResult(result);

    if (result.success) {
      addToast({
        type: 'success',
        title: 'Razorpay Connected',
        description: result.message,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Razorpay Connection Failed',
        description: result.message,
      });
    }
  };

  const handleTestCashfree = async () => {
    setIsTestingCashfree(true);
    setCashfreeTestResult(null);

    const result = await paymentService.testConnection({
      gateway: 'cashfree',
      app_id: config.cashfree.app_id,
      secret_key: config.cashfree.secret_key,
      environment: config.cashfree.environment,
    });

    setIsTestingCashfree(false);
    setCashfreeTestResult(result);

    if (result.success) {
      addToast({
        type: 'success',
        title: 'Cashfree Connected',
        description: result.message,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Cashfree Connection Failed',
        description: result.message,
      });
    }
  };

  const copyWebhookUrl = () => {
    const currentOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'https://tanoah.pages.dev';
    const webhookUrl = `${config.razorpay.site_url || currentOrigin}/api/payments/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      description: 'Webhook endpoint URL copied.',
    });
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#888888]">
        Loading payment gateway integrations...
      </div>
    );
  }

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://tanoah.pages.dev';
  const siteUrl = config.razorpay.site_url || currentOrigin;

  return (
    <div className="space-y-8 font-poppins text-xs pb-16">
      {/* Top Banner & Active Gateway Selector */}
      <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#3F3F8F] bg-[#EEEEF8] px-2 py-0.5 rounded">
              BANK-GRADE SECURITY
            </span>
            <span className="text-[10px] text-green-700 bg-green-50 font-semibold px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Zero Secret Exposure
            </span>
          </div>
          <h2 className="text-xl font-bold text-black mt-2 font-wondra tracking-wide">
            PAYMENT GATEWAYS
          </h2>
          <p className="text-neutral-500 text-xs mt-0.5 max-w-xl">
            Integrate Razorpay and Cashfree to accept UPI, Credit/Debit cards, Net Banking, and
            Wallets. Secret keys remain strictly on the serverless edge and are never exposed to
            client browsers.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            className="bg-[#3F3F8F] hover:bg-[#323275] text-white px-5 py-2.5 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {/* Gateway Switcher Card */}
      <div className="bg-[#FAF9F6] p-5 rounded-[4px] border border-[#E7E7E7]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-black text-xs block">
              Customer Checkout Gateway Selection
            </span>
            <span className="text-[11px] text-neutral-500">
              Select which payment gateway is offered to shoppers on the checkout page.
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded border border-[#E7E7E7]">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, active_gateway: 'razorpay' }))}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                config.active_gateway === 'razorpay'
                  ? 'bg-[#3F3F8F] text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Razorpay Only
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, active_gateway: 'cashfree' }))}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                config.active_gateway === 'cashfree'
                  ? 'bg-[#3F3F8F] text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Cashfree Only
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, active_gateway: 'both' }))}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                config.active_gateway === 'both'
                  ? 'bg-[#3F3F8F] text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Both (Customer Choice)
            </button>
          </div>
        </div>
      </div>

      {/* Gateway Sub-Navigation Tabs */}
      <div className="flex border-b border-[#E7E7E7] gap-8">
        <button
          type="button"
          onClick={() => setActiveSubTab('razorpay')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-2 relative ${
            activeSubTab === 'razorpay'
              ? 'text-[#3F3F8F] border-b-2 border-[#3F3F8F]'
              : 'text-neutral-500 hover:text-black'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#0C2340]" />
          <span>Razorpay</span>
          {config.razorpay.enabled ? (
            <span className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.2 rounded">
              {config.razorpay.environment === 'live' ? 'LIVE' : 'TEST'}
            </span>
          ) : (
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.2 rounded">
              OFF
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cashfree')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-2 relative ${
            activeSubTab === 'cashfree'
              ? 'text-[#3F3F8F] border-b-2 border-[#3F3F8F]'
              : 'text-neutral-500 hover:text-black'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#3F3F8F]" />
          <span>Cashfree Payments</span>
          {config.cashfree.enabled ? (
            <span className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.2 rounded">
              {config.cashfree.environment === 'production' ? 'LIVE' : 'SANDBOX'}
            </span>
          ) : (
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.2 rounded">
              OFF
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cod')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-2 relative ${
            activeSubTab === 'cod'
              ? 'text-[#3F3F8F] border-b-2 border-[#3F3F8F]'
              : 'text-neutral-500 hover:text-black'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Cash on Delivery (COD)</span>
          {config.cod.enabled && (
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
              ₹{config.cod.extra_fee} FEE
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. RAZORPAY CONFIGURATION TAB                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'razorpay' && (
        <div className="space-y-6">
          {/* Master Enable & Environment Card */}
          <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-semibold text-black text-sm">Enable Razorpay Payment Gateway</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  Allow customers to pay via Razorpay (UPI, Google Pay, PhonePe, Cards, NetBanking).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.razorpay.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F3F8F]"></div>
              </label>
            </div>

            {/* Environment Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-medium text-black block">Gateway Environment</span>
                <span className="text-[11px] text-neutral-500">
                  Switch to <strong>Live Mode</strong> once you are ready to accept real money from
                  customers.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, environment: 'test' },
                    }))
                  }
                  className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                    config.razorpay.environment === 'test'
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-white border-[#E7E7E7] text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  Test Mode (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, environment: 'live' },
                    }))
                  }
                  className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                    config.razorpay.environment === 'live'
                      ? 'bg-green-50 border-green-400 text-green-900'
                      : 'bg-white border-[#E7E7E7] text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  Live Mode (Production)
                </button>
              </div>
            </div>
          </div>

          {/* Account Information Card (Matches User's Reference Image) */}
          <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-black text-sm">Account information</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Enter your API credentials from Razorpay Merchant Dashboard.
                </p>
              </div>
              <a
                href="https://dashboard.razorpay.com/#/app/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#3F3F8F] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Get Razorpay Keys</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-6 space-y-5">
              {/* Key Id */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Key Id <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.razorpay.key_id}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, key_id: e.target.value },
                    }))
                  }
                  placeholder={
                    config.razorpay.environment === 'live'
                      ? 'rzp_live_xxxxxxxxxxxxxxxx'
                      : 'rzp_test_xxxxxxxxxxxxxxxx'
                  }
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs font-mono focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Starts with <code className="text-neutral-600">rzp_live_</code> in Live Mode, or{' '}
                  <code className="text-neutral-600">rzp_test_</code> in Test Mode.
                </span>
              </div>

              {/* Key Secret */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-700">
                    Key Secret <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Kept Secure on Serverless Edge
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showRazorpaySecret ? 'text' : 'password'}
                    value={config.razorpay.key_secret}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        razorpay: { ...prev.razorpay, key_secret: e.target.value },
                      }))
                    }
                    placeholder="Enter your Razorpay Key Secret"
                    className="w-full px-3.5 py-2.5 pr-10 border border-[#D5D5D5] rounded-[4px] text-xs font-mono focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    title={showRazorpaySecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showRazorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Site URL */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Site URL
                </label>
                <input
                  type="text"
                  value={config.razorpay.site_url || siteUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, site_url: e.target.value },
                    }))
                  }
                  placeholder="https://tanoah.pages.dev"
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  The domain registered with Razorpay for webhook verification and callback redirects.
                </span>
              </div>

              {/* Webhook Secret (Optional) */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Webhook Secret (Optional)
                </label>
                <input
                  type="password"
                  value={config.razorpay.webhook_secret || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, webhook_secret: e.target.value },
                    }))
                  }
                  placeholder="Paste webhook secret from Razorpay Dashboard"
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs font-mono focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                />
              </div>

              {/* Test Connection Button & Status Output */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleTestRazorpay}
                    isLoading={isTestingRazorpay}
                    className="bg-neutral-900 hover:bg-black text-white px-4 py-2 text-xs flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Test Connection</span>
                  </Button>

                  {razorpayTestResult && (
                    <div
                      className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 border ${
                        razorpayTestResult.success
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {razorpayTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-medium">{razorpayTestResult.message}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  className="bg-[#3F3F8F] hover:bg-[#323275] text-white px-5 py-2 text-xs flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Razorpay Settings</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Webhook Configuration Helper Box */}
          <div className="bg-[#FAF9F6] p-5 rounded-[4px] border border-[#E7E7E7] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-black text-xs flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#3F3F8F]" /> Razorpay Webhook Endpoint
              </span>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="text-[11px] text-[#3F3F8F] font-semibold hover:underline flex items-center gap-1"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-white p-2.5 rounded border border-[#E7E7E7] font-mono text-[11px] text-neutral-800 select-all">
              {siteUrl}/api/payments/webhook
            </div>
            <p className="text-[11px] text-neutral-500">
              In your Razorpay Dashboard &rarr; Settings &rarr; Webhooks, add this URL and subscribe to{' '}
              <code className="text-neutral-700 font-bold">order.paid</code> and{' '}
              <code className="text-neutral-700 font-bold">payment.captured</code>.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CASHFREE CONFIGURATION TAB                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'cashfree' && (
        <div className="space-y-6">
          {/* Master Enable & Environment Card */}
          <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-semibold text-black text-sm">Enable Cashfree Payment Gateway</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  Accept customer payments via Cashfree Payment Gateway (Cards, UPI, NetBanking, PayLater).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.cashfree.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F3F8F]"></div>
              </label>
            </div>

            {/* Environment Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-medium text-black block">Cashfree Environment</span>
                <span className="text-[11px] text-neutral-500">
                  Switch from Sandbox testing to <strong>Production</strong> for live settlements.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, environment: 'sandbox' },
                    }))
                  }
                  className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                    config.cashfree.environment === 'sandbox'
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-white border-[#E7E7E7] text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  Sandbox (Test)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, environment: 'production' },
                    }))
                  }
                  className={`px-3 py-1.5 rounded border text-xs font-semibold ${
                    config.cashfree.environment === 'production'
                      ? 'bg-green-50 border-green-400 text-green-900'
                      : 'bg-white border-[#E7E7E7] text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  Production (Live)
                </button>
              </div>
            </div>
          </div>

          {/* Account Information Card for Cashfree */}
          <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-black text-sm">Account information</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Enter your Cashfree Merchant credentials.
                </p>
              </div>
              <a
                href="https://merchant.cashfree.com/merchants/login"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#3F3F8F] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Get Cashfree Keys</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-6 space-y-5">
              {/* App ID / Client ID */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  App ID (Client ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.cashfree.app_id}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, app_id: e.target.value },
                    }))
                  }
                  placeholder="Enter your Cashfree App ID / Client ID"
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs font-mono focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                />
              </div>

              {/* Secret Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-700">
                    Secret Key <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Kept Secure on Serverless Edge
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showCashfreeSecret ? 'text' : 'password'}
                    value={config.cashfree.secret_key}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        cashfree: { ...prev.cashfree, secret_key: e.target.value },
                      }))
                    }
                    placeholder="Enter your Cashfree Secret Key"
                    className="w-full px-3.5 py-2.5 pr-10 border border-[#D5D5D5] rounded-[4px] text-xs font-mono focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCashfreeSecret(!showCashfreeSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    title={showCashfreeSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showCashfreeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Site URL */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Site URL
                </label>
                <input
                  type="text"
                  value={config.cashfree.site_url || siteUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cashfree: { ...prev.cashfree, site_url: e.target.value },
                    }))
                  }
                  placeholder="https://tanoah.pages.dev"
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none focus:ring-1 focus:ring-[#3F3F8F] transition-all bg-white"
                />
              </div>

              {/* Test Connection Button & Status Output */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleTestCashfree}
                    isLoading={isTestingCashfree}
                    className="bg-neutral-900 hover:bg-black text-white px-4 py-2 text-xs flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Test Connection</span>
                  </Button>

                  {cashfreeTestResult && (
                    <div
                      className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 border ${
                        cashfreeTestResult.success
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {cashfreeTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-medium">{cashfreeTestResult.message}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  className="bg-[#3F3F8F] hover:bg-[#323275] text-white px-5 py-2 text-xs flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Cashfree Settings</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CASH ON DELIVERY (COD) TAB                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'cod' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[4px] border border-[#E7E7E7] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-semibold text-black text-sm">Cash on Delivery (COD)</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  Allow customers to pay cash when their order arrives at doorstep.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.cod.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cod: { ...prev.cod, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F3F8F]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  COD Handling Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.cod.extra_fee}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cod: { ...prev.cod, extra_fee: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Additional fee charged to cover courier COD handling risks.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Maximum Order Value for COD (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.cod.max_order_amount || 50000}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cod: { ...prev.cod, max_order_amount: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-[#D5D5D5] rounded-[4px] text-xs focus:border-[#3F3F8F] focus:outline-none"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Orders above this value must be prepaid online to avoid cancellation losses.
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                className="bg-[#3F3F8F] hover:bg-[#323275] text-white px-5 py-2 text-xs flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save COD Settings</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
