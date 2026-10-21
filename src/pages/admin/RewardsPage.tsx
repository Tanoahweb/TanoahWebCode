import React, { useState, useEffect } from 'react';
import {
  Gift,
  Coins,
  Sparkles,
  Settings as SettingsIcon,
  Users,
  FileText,
  Layers,
  Search,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Download,
  Filter,
  X,
  Check,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { rewardsService } from '../../services/rewardsService';
import { api } from '../../services/api';
import {
  RewardSettings,
  CustomerRewardWallet,
  RewardTransaction,
  ProductCategoryRewardRate,
} from '../../types/rewards';
import { Category } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { useAuthStore } from '../../store/useAuthStore';

type ActiveTab = 'overview' | 'wallets' | 'settings' | 'categories' | 'ledger';

export const RewardsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<RewardSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<RewardSettings>>({});

  // Overview / Analytics Metrics
  const [metrics, setMetrics] = useState({
    totalIssued: 0,
    totalRedeemed: 0,
    totalRedeemedValue: 0,
    activeLiabilityPoints: 0,
    pendingReturnPoints: 0,
    totalExpiredPoints: 0,
    totalWalletsCount: 0,
  });

  // Customer Wallets State
  const [wallets, setWallets] = useState<CustomerRewardWallet[]>([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const [walletSearch, setWalletSearch] = useState('');
  const [walletPage, setWalletPage] = useState(1);
  const [isSearchingWallets, setIsSearchingWallets] = useState(false);

  // Manual Adjustment Modal State
  const [selectedWalletForAdjustment, setSelectedWalletForAdjustment] = useState<CustomerRewardWallet | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [adjustmentPoints, setAdjustmentPoints] = useState<string>('');
  const [adjustmentReasonCategory, setAdjustmentReasonCategory] = useState<string>('Customer Service Appeasement');
  const [adjustmentCustomNote, setAdjustmentCustomNote] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Category Rates State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryRates, setCategoryRates] = useState<ProductCategoryRewardRate[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryRate, setNewCategoryRate] = useState<number>(10);
  const [isSavingCategoryRate, setIsSavingCategoryRate] = useState(false);

  // Master Ledger State
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerFilterType, setLedgerFilterType] = useState<string>('all');
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [fetchedSettings, fetchedMetrics, fetchedWallets, fetchedCats, fetchedRates, fetchedLedger] =
        await Promise.all([
          rewardsService.getSettings(),
          rewardsService.getRewardsMetrics(),
          rewardsService.getAllWallets('', 1, 20),
          api.getCategories(false),
          rewardsService.getCategoryRewardRates(),
          rewardsService.getMasterLedger(1, 25, 'all'),
        ]);

      setSettings(fetchedSettings);
      setSettingsForm(fetchedSettings);
      setMetrics(fetchedMetrics);
      setWallets(fetchedWallets.wallets);
      setWalletTotal(fetchedWallets.total);
      setCategories(fetchedCats || []);
      setCategoryRates(fetchedRates || []);
      setTransactions(fetchedLedger.transactions);
      setLedgerTotal(fetchedLedger.total);
    } catch (err) {
      console.error('[RewardsPage] Failed to load data:', err);
      addToast({
        type: 'error',
        title: 'Loading Error',
        description: 'Could not load reward data. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reconcile Background Settlement
  const handleTriggerReconcile = async () => {
    setIsReconciling(true);
    try {
      const [settleRes, expireRes] = await Promise.all([
        rewardsService.settlePendingRewards(),
        rewardsService.expirePastDuePoints(),
      ]);

      addToast({
        type: 'success',
        title: 'Settlement Reconciliation Completed',
        description: `Successfully unlocked pending eligible orders and expired past-due batches.`,
      });

      // Refresh metrics & wallets
      const [freshMetrics, freshWallets, freshLedger] = await Promise.all([
        rewardsService.getRewardsMetrics(),
        rewardsService.getAllWallets(walletSearch, walletPage, 20),
        rewardsService.getMasterLedger(ledgerPage, 25, ledgerFilterType),
      ]);
      setMetrics(freshMetrics);
      setWallets(freshWallets.wallets);
      setWalletTotal(freshWallets.total);
      setTransactions(freshLedger.transactions);
      setLedgerTotal(freshLedger.total);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Reconciliation Failed',
        description: err.message || 'Could not complete background settlement.',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Search Wallets
  const handleSearchWallets = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingWallets(true);
    try {
      const res = await rewardsService.getAllWallets(walletSearch, 1, 20);
      setWallets(res.wallets);
      setWalletTotal(res.total);
      setWalletPage(1);
    } catch (err) {
      console.warn('Wallet search failed:', err);
    } finally {
      setIsSearchingWallets(false);
    }
  };

  const handleWalletPageChange = async (newPage: number) => {
    setWalletPage(newPage);
    setIsSearchingWallets(true);
    try {
      const res = await rewardsService.getAllWallets(walletSearch, newPage, 20);
      setWallets(res.wallets);
      setWalletTotal(res.total);
    } catch (err) {
      console.warn('Wallet page load failed:', err);
    } finally {
      setIsSearchingWallets(false);
    }
  };

  // Submit Manual Adjustment
  const handleOpenAdjustmentModal = (wallet: CustomerRewardWallet) => {
    setSelectedWalletForAdjustment(wallet);
    setAdjustmentType('credit');
    setAdjustmentPoints('');
    setAdjustmentReasonCategory('Customer Service Appeasement');
    setAdjustmentCustomNote('');
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForAdjustment) return;

    const numPoints = parseInt(adjustmentPoints, 10);
    if (isNaN(numPoints) || numPoints <= 0) {
      addToast({
        type: 'error',
        title: 'Invalid Points',
        description: 'Please enter a valid positive number of points.',
      });
      return;
    }

    if (adjustmentType === 'debit' && numPoints > selectedWalletForAdjustment.balance_points) {
      addToast({
        type: 'error',
        title: 'Excessive Debit',
        description: `Customer only has ${selectedWalletForAdjustment.balance_points} available points. Cannot debit more than balance.`,
      });
      return;
    }

    const fullReason = `${adjustmentReasonCategory}${adjustmentCustomNote.trim() ? `: ${adjustmentCustomNote.trim()}` : ''}`;
    const signedPoints = adjustmentType === 'credit' ? numPoints : -numPoints;

    setIsSubmittingAdjustment(true);
    try {
      const res = await rewardsService.adminAdjustPoints(
        selectedWalletForAdjustment.user_id,
        signedPoints,
        fullReason,
        user?.id
      );

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Points Adjusted Successfully',
          description: `${adjustmentType === 'credit' ? 'Credited' : 'Debited'} ${numPoints} points for ${selectedWalletForAdjustment.customer_email}.`,
        });

        setSelectedWalletForAdjustment(null);

        // Refresh wallets, metrics & ledger
        const [freshWallets, freshMetrics, freshLedger] = await Promise.all([
          rewardsService.getAllWallets(walletSearch, walletPage, 20),
          rewardsService.getRewardsMetrics(),
          rewardsService.getMasterLedger(ledgerPage, 25, ledgerFilterType),
        ]);
        setWallets(freshWallets.wallets);
        setWalletTotal(freshWallets.total);
        setMetrics(freshMetrics);
        setTransactions(freshLedger.transactions);
        setLedgerTotal(freshLedger.total);
      } else {
        addToast({
          type: 'error',
          title: 'Adjustment Failed',
          description: res.message || 'Could not adjust points.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Adjustment Error',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await rewardsService.updateSettings(settingsForm, user?.id);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        description: 'Customer Rewards Wallet rules have been successfully updated.',
      });
      const fresh = await rewardsService.getSettings();
      setSettings(fresh);
      setSettingsForm(fresh);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not save reward settings.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Save Category Rate
  const handleSaveCategoryRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      addToast({
        type: 'error',
        title: 'Select Category',
        description: 'Please select a catalog category to set a custom rate.',
      });
      return;
    }

    setIsSavingCategoryRate(true);
    try {
      await rewardsService.saveCategoryRewardRate({
        entity_type: 'category',
        entity_id: selectedCategoryId,
        reward_percentage: Number(newCategoryRate),
        is_active: true,
      });

      addToast({
        type: 'success',
        title: 'Category Rate Saved',
        description: `Set reward rate to ${newCategoryRate}% for selected category.`,
      });

      const freshRates = await rewardsService.getCategoryRewardRates();
      setCategoryRates(freshRates);
      setSelectedCategoryId('');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error Saving Category Rate',
        description: err.message || 'Could not save category reward rate.',
      });
    } finally {
      setIsSavingCategoryRate(false);
    }
  };

  // Filter Ledger
  const handleFilterLedger = async (filter: string) => {
    setLedgerFilterType(filter);
    setLedgerPage(1);
    setIsLedgerLoading(true);
    try {
      const res = await rewardsService.getMasterLedger(1, 25, filter);
      setTransactions(res.transactions);
      setLedgerTotal(res.total);
    } catch (err) {
      console.warn('Filter ledger failed:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleLedgerPageChange = async (newPage: number) => {
    setLedgerPage(newPage);
    setIsLedgerLoading(true);
    try {
      const res = await rewardsService.getMasterLedger(newPage, 25, ledgerFilterType);
      setTransactions(res.transactions);
      setLedgerTotal(res.total);
    } catch (err) {
      console.warn('Ledger page change failed:', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // Export Ledger to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      addToast({ type: 'info', title: 'Empty Ledger', description: 'No transactions to export.' });
      return;
    }

    const headers = ['ID', 'Date', 'User ID', 'Type', 'Status', 'Points Delta', 'Balance After', 'Reference ID', 'Description'];
    const rows = transactions.map((t) => [
      t.id,
      t.created_at,
      t.user_id,
      t.type,
      t.status,
      t.points,
      t.balance_after,
      t.reference_id || '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tanoah_rewards_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPagesWallets = Math.ceil(walletTotal / 20) || 1;
  const totalPagesLedger = Math.ceil(ledgerTotal / 25) || 1;

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E7E7] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded bg-amber-100 text-amber-900 inline-flex">
                <Gift className="w-5 h-5 text-amber-700" />
              </span>
              <h1 className="font-wondra text-2xl sm:text-3xl text-black tracking-wide">
                REWARDS & LOYALTY POINTS OS
              </h1>
            </div>
            <p className="text-xs text-[#666666]">
              1 Point = ₹1 Reward Value • FIFO Expiry Tracking • Automatic 24h Post-Delivery Return Window Unlocking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />}
              isLoading={isReconciling}
              onClick={handleTriggerReconcile}
              className="text-xs border-[#3F3F8F] text-[#3F3F8F] hover:bg-[#3F3F8F] hover:text-white"
            >
              RECONCILE SETTLEMENTS
            </Button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-[#E7E7E7] overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Program Overview', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'wallets', label: `Customer Wallets (${walletTotal})`, icon: <Users className="w-4 h-4" /> },
            { id: 'settings', label: 'Rules & Limits', icon: <SettingsIcon className="w-4 h-4" /> },
            { id: 'categories', label: 'Category Rates', icon: <Layers className="w-4 h-4" /> },
            { id: 'ledger', label: 'Master Audit Ledger', icon: <FileText className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#3F3F8F] text-[#3F3F8F] bg-[#3F3F8F]/5'
                  : 'border-transparent text-[#666666] hover:text-black hover:border-neutral-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Total Points Issued
                </span>
                <div className="font-mono text-2xl font-bold text-black flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {metrics.totalIssued.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Lifetime points granted via purchases & welcome bonuses
                </p>
              </div>

              <div className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Total Redeemed (Discounts Given)
                </span>
                <div className="font-mono text-2xl font-bold text-emerald-700 flex items-center gap-1.5">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  {metrics.totalRedeemed.toLocaleString('en-IN')} pts
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  ₹{metrics.totalRedeemedValue.toLocaleString('en-IN')} in customer order savings
                </p>
              </div>

              <div className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Active Wallet Liability
                </span>
                <div className="font-mono text-2xl font-bold text-[#3F3F8F] flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-[#3F3F8F]" />
                  {metrics.activeLiabilityPoints.toLocaleString('en-IN')} pts
                </div>
                <p className="text-[11px] text-neutral-400">
                  ₹{metrics.activeLiabilityPoints.toLocaleString('en-IN')} unspent points across {metrics.totalWalletsCount} customer wallets
                </p>
              </div>

              <div className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Pending Return Window
                </span>
                <div className="font-mono text-2xl font-bold text-amber-600 flex items-center gap-1.5">
                  <Clock className="w-5 h-5 text-amber-500" />
                  {metrics.pendingReturnPoints.toLocaleString('en-IN')} pts
                </div>
                <p className="text-[11px] text-neutral-400">
                  Locked until 24h transit damage claim window expires
                </p>
              </div>
            </div>

            {/* Architecture & Flow Infographic */}
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
                <h3 className="font-semibold text-xs text-black uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#3F3F8F]" />
                  <span>Strict 24-Hour Return Window & Points Lifecycle Guarantee</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  Zero Return Discrepancy by Design
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-1">
                <div className="p-3.5 rounded bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                  <div className="font-mono text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[10px]">1</span>
                    Order Placed
                  </div>
                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    Customer earns {settings?.purchase_reward_percentage || 10}% points on eligible cart items. Points enter the ledger in a <strong>pending</strong> state.
                  </p>
                </div>

                <div className="p-3.5 rounded bg-amber-50/60 border border-amber-200/70 space-y-1.5">
                  <div className="font-mono text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px]">2</span>
                    Parcel Delivered
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Admin or India Post marks parcel as <strong>DELIVERED</strong>. Timestamp is locked into <code className="font-mono text-[10px]">orders.delivered_at</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded bg-purple-50/60 border border-purple-200/70 space-y-1.5">
                  <div className="font-mono text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[10px]">3</span>
                    24h Policy Window
                  </div>
                  <p className="text-purple-800 text-[11px] leading-relaxed">
                    Per Tanoah policy, returns for transit damage are strictly restricted to 24 hours. Points remain locked while claims are possible.
                  </p>
                </div>

                <div className="p-3.5 rounded bg-emerald-50/60 border border-emerald-200/70 space-y-1.5">
                  <div className="font-mono text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px]">4</span>
                    Full Credit (Unlocking)
                  </div>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    Once 24 hours expire with no return claims, points automatically credit to the customer's usable wallet with a 12-month FIFO expiry timer.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] space-y-3">
                <h4 className="font-semibold text-xs text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  Active Program Rules Summary
                </h4>
                <div className="divide-y divide-[#F0F0F0] text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Program Status</span>
                    <span className="font-bold text-emerald-700">Active & Enabled</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Point Conversion Rate</span>
                    <span className="font-mono font-semibold">1 Point = ₹{settings?.point_to_inr_ratio || 1.0}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Standard Purchase Earn Rate</span>
                    <span className="font-mono font-semibold">{settings?.purchase_reward_percentage || 10}%</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Welcome Bonus (First Login)</span>
                    <span className="font-mono font-semibold">+{settings?.welcome_bonus_points || 100} Points</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">First Purchase Bonus</span>
                    <span className="font-mono font-semibold">+{settings?.first_purchase_bonus_points || 150} Points</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Redemption Per Order</span>
                    <span className="font-mono font-semibold">
                      Min {settings?.min_redeem_points || 100} • Max {settings?.max_redeem_points || 500} pts (Max {settings?.max_order_percentage || 20}% of subtotal)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] space-y-3">
                <h4 className="font-semibold text-xs text-black uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#3F3F8F]" />
                  FIFO Expiry & Liability Guard
                </h4>
                <div className="divide-y divide-[#F0F0F0] text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Points Validity Duration</span>
                    <span className="font-mono font-semibold">{settings?.point_expiry_months || 12} Months</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Deduction Method</span>
                    <span className="font-bold text-neutral-800">FIFO (Earliest expiring deducted first)</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Customer Pre-Expiry Warnings</span>
                    <span className="font-mono font-semibold">30 Days & 7 Days prior</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Past-Due Expired Points</span>
                    <span className="font-mono font-semibold text-neutral-500">{metrics.totalExpiredPoints} Points</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-neutral-500">Reversal on Order Cancellation</span>
                    <span className="font-bold text-emerald-700">Automatic Stored Procedure Rollback</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CUSTOMER WALLETS & ADJUSTMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'wallets' && (
          <div className="space-y-4">
            {/* Search Header */}
            <div className="p-4 bg-white border border-[#E7E7E7] rounded-[6px] flex flex-col sm:flex-row justify-between items-center gap-3">
              <form onSubmit={handleSearchWallets} className="flex-1 flex gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by customer name, email, or phone..."
                    value={walletSearch}
                    onChange={(e) => setWalletSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSearchingWallets}
                  className="px-4 text-xs font-semibold uppercase"
                >
                  SEARCH
                </Button>
                {walletSearch && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWalletSearch('');
                      rewardsService.getAllWallets('', 1, 20).then((res) => {
                        setWallets(res.wallets);
                        setWalletTotal(res.total);
                        setWalletPage(1);
                      });
                    }}
                    className="text-xs"
                  >
                    CLEAR
                  </Button>
                )}
              </form>

              <div className="text-[11px] text-neutral-500 shrink-0 font-medium">
                Showing {wallets.length} of {walletTotal} Wallets
              </div>
            </div>

            {/* Wallets Table */}
            <div className="bg-white border border-[#E7E7E7] rounded-[6px] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] uppercase font-semibold text-[#666666]">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4 text-right">Available Balance</th>
                      <th className="py-3 px-4 text-right">Pending Points</th>
                      <th className="py-3 px-4 text-right">Lifetime Earned</th>
                      <th className="py-3 px-4 text-right">Lifetime Spent</th>
                      <th className="py-3 px-4 text-center">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {wallets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400">
                          No customer rewards wallets found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      wallets.map((w) => (
                        <tr key={w.id} className="hover:bg-[#FAF9FE] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-black">{w.customer_name || 'Anonymous Customer'}</div>
                            <div className="text-[11px] text-[#666666] font-mono">{w.customer_email}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span className="font-bold text-black text-sm">{w.balance_points} pts</span>
                            <div className="text-[10px] text-emerald-700 font-sans">
                              ₹{Math.round(w.balance_points * (settings?.point_to_inr_ratio || 1))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {w.pending_points > 0 ? (
                              <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                                +{w.pending_points} pts
                              </span>
                            ) : (
                              <span className="text-neutral-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-neutral-700">
                            {w.lifetime_earned_points}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-neutral-700">
                            {w.lifetime_redeemed_points}
                          </td>
                          <td className="py-3 px-4 text-center text-[11px] text-neutral-500">
                            {new Date(w.updated_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustmentModal(w)}
                              className="px-3 py-1.5 bg-[#FAF9FE] border border-[#3F3F8F]/30 hover:bg-[#3F3F8F] hover:text-white text-[#3F3F8F] font-semibold text-[11px] rounded tracking-wide transition-colors cursor-pointer"
                            >
                              ADJUST POINTS
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPagesWallets > 1 && (
                <div className="p-3 bg-[#F8F8F8] border-t border-[#E7E7E7] flex justify-between items-center text-xs">
                  <span className="text-neutral-500 text-[11px]">
                    Page {walletPage} of {totalPagesWallets}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={walletPage <= 1}
                      onClick={() => handleWalletPageChange(walletPage - 1)}
                      className="px-3 py-1 bg-white border border-[#E7E7E7] rounded hover:bg-neutral-100 disabled:opacity-40 text-xs font-semibold cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={walletPage >= totalPagesWallets}
                      onClick={() => handleWalletPageChange(walletPage + 1)}
                      className="px-3 py-1 bg-white border border-[#E7E7E7] rounded hover:bg-neutral-100 disabled:opacity-40 text-xs font-semibold cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REWARD RULES & SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4">
                <div>
                  <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                    Core Rewards Configuration
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Global currency ratio, earn percentages, and expiration timers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase text-neutral-700 cursor-pointer">
                    Program Enabled
                  </label>
                  <input
                    type="checkbox"
                    checked={settingsForm.is_enabled ?? true}
                    onChange={(e) => setSettingsForm({ ...settingsForm, is_enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#3F3F8F] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    1 Point = ₹ Value (Ratio) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={settingsForm.point_to_inr_ratio ?? 1.0}
                    onChange={(e) => setSettingsForm({ ...settingsForm, point_to_inr_ratio: parseFloat(e.target.value) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Default is 1.0 (1 Point = ₹1 discount value)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Default Purchase Earn Rate (%) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={settingsForm.purchase_reward_percentage ?? 10}
                    onChange={(e) => setSettingsForm({ ...settingsForm, purchase_reward_percentage: parseFloat(e.target.value) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Customers earn this percentage of their order subtotal in points (e.g. 10%)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Point Expiry Window (Months) *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="60"
                    value={settingsForm.point_expiry_months ?? 12}
                    onChange={(e) => setSettingsForm({ ...settingsForm, point_expiry_months: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Months before a credited FIFO batch expires (Default 12)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Min Points to Redeem *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={settingsForm.min_redeem_points ?? 100}
                    onChange={(e) => setSettingsForm({ ...settingsForm, min_redeem_points: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Minimum points a customer must hold to unlock checkout redemption (Default 100)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Max Points Redeemable Per Order *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={settingsForm.max_redeem_points ?? 500}
                    onChange={(e) => setSettingsForm({ ...settingsForm, max_redeem_points: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Maximum absolute points allowed per checkout order (Default 500)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Max Order Subtotal Discount Cap (%) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={settingsForm.max_order_percentage ?? 20}
                    onChange={(e) => setSettingsForm({ ...settingsForm, max_order_percentage: parseFloat(e.target.value) })}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Points discount cannot exceed this percentage of the order subtotal (Default 20%)
                  </p>
                </div>
              </div>
            </div>

            {/* Bonus Activities Configuration */}
            <div className="p-6 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-6">
              <div className="border-b border-[#F0F0F0] pb-3">
                <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                  Automated Customer Bonus Triggers
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Incentivize registrations and repeat conversions with automated bonus credits.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded border border-neutral-200 bg-[#FAF9FE] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 uppercase">First Login / Registration Bonus</span>
                    <input
                      type="checkbox"
                      checked={settingsForm.welcome_bonus_enabled ?? true}
                      onChange={(e) => setSettingsForm({ ...settingsForm, welcome_bonus_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#3F3F8F] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Bonus Points Credited:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settingsForm.welcome_bonus_points ?? 100}
                      onChange={(e) => setSettingsForm({ ...settingsForm, welcome_bonus_points: parseInt(e.target.value, 10) })}
                      className="w-full p-2 bg-white border border-[#E7E7E7] rounded font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-snug">
                    Instantly credited to the customer's wallet upon their very first sign up or login.
                  </p>
                </div>

                <div className="p-4 rounded border border-neutral-200 bg-[#FAF9FE] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 uppercase">First Order Bonus</span>
                    <input
                      type="checkbox"
                      checked={settingsForm.first_purchase_bonus_enabled ?? true}
                      onChange={(e) => setSettingsForm({ ...settingsForm, first_purchase_bonus_enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#3F3F8F] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                      Bonus Points Credited:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settingsForm.first_purchase_bonus_points ?? 150}
                      onChange={(e) => setSettingsForm({ ...settingsForm, first_purchase_bonus_points: parseInt(e.target.value, 10) })}
                      className="w-full p-2 bg-white border border-[#E7E7E7] rounded font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-snug">
                    Awarded alongside regular order points when customer successfully completes their maiden order.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSavingSettings}
                className="px-6 font-semibold uppercase tracking-wider text-xs"
              >
                SAVE REWARD RULES
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CATEGORY RATES */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Add Category Override Form */}
            <form
              onSubmit={handleSaveCategoryRate}
              className="p-5 bg-white border border-[#E7E7E7] rounded-[6px] shadow-2xs space-y-4 text-xs"
            >
              <div className="border-b border-[#F0F0F0] pb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#3F3F8F]" />
                <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                  Set Custom Category Reward Rate
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Select Catalog Category *
                  </label>
                  <select
                    required
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] bg-white focus:outline-none focus:border-[#3F3F8F]"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1">
                    Reward Percentage (%) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={newCategoryRate}
                    onChange={(e) => setNewCategoryRate(parseFloat(e.target.value))}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSavingCategoryRate}
                    className="w-full text-xs font-semibold uppercase"
                  >
                    SAVE CATEGORY OVERRIDE
                  </Button>
                </div>
              </div>
            </form>

            {/* Category Overrides Table */}
            <div className="bg-white border border-[#E7E7E7] rounded-[6px] overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] uppercase font-semibold text-[#666666]">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4 text-center">Reward Rate (%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {categoryRates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-400">
                        No category overrides configured. All categories currently use the storewide default rate ({settings?.purchase_reward_percentage || 10}%).
                      </td>
                    </tr>
                  ) : (
                    categoryRates.map((r) => {
                      const matchedCat = categories.find((c) => c.id === r.entity_id);
                      return (
                        <tr key={r.id} className="hover:bg-[#FAF9FE]">
                          <td className="py-3 px-4 font-semibold text-black">
                            {matchedCat?.name || r.entity_id}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#3F3F8F]">
                            {r.reward_percentage}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-500 font-mono text-[11px]">
                            {new Date(r.updated_at).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MASTER AUDIT LEDGER */}
        {/* ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-white border border-[#E7E7E7] rounded-[6px] flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase text-neutral-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Type:
                </span>
                {[
                  { id: 'all', label: 'All Transactions' },
                  { id: 'earned_purchase', label: 'Purchases' },
                  { id: 'redeemed_checkout', label: 'Redemptions' },
                  { id: 'welcome_bonus', label: 'Welcome Bonus' },
                  { id: 'admin_credit', label: 'Admin Credit' },
                  { id: 'admin_debit', label: 'Admin Debit' },
                  { id: 'expired', label: 'Expired' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFilterLedger(f.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                      ledgerFilterType === f.id
                        ? 'bg-[#3F3F8F] text-white'
                        : 'bg-[#F4F4F4] text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-neutral-500 font-medium">
                  {ledgerTotal} Total Records
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportCSV}
                  className="text-xs"
                >
                  EXPORT CSV
                </Button>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="bg-white border border-[#E7E7E7] rounded-[6px] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] uppercase font-semibold text-[#666666]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Transaction Type</th>
                      <th className="py-3 px-4">Order / Reference</th>
                      <th className="py-3 px-4 text-right">Points Delta</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                      <th className="py-3 px-4">Description / Audit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {isLedgerLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          Loading ledger...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          No transactions found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => {
                        const isCredit = tx.points > 0;
                        return (
                          <tr key={tx.id} className="hover:bg-[#FAF9FE] transition-colors">
                            <td className="py-3 px-4 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  tx.type === 'earned_purchase'
                                    ? 'bg-amber-100 text-amber-900'
                                    : tx.type === 'redeemed_checkout'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : tx.type === 'welcome_bonus'
                                    ? 'bg-blue-100 text-blue-900'
                                    : tx.type.startsWith('admin')
                                    ? 'bg-purple-100 text-purple-900'
                                    : 'bg-neutral-100 text-neutral-800'
                                }`}
                              >
                                {tx.type.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-[#3F3F8F] font-semibold">
                              {tx.reference_id || '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                              <span className={isCredit ? 'text-emerald-700' : 'text-amber-800'}>
                                {isCredit ? `+${tx.points}` : `${tx.points}`} pts
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-neutral-800">
                              {tx.balance_after} pts
                            </td>
                            <td className="py-3 px-4 text-[#555555] max-w-md truncate" title={tx.description}>
                              {tx.description}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPagesLedger > 1 && (
                <div className="p-3 bg-[#F8F8F8] border-t border-[#E7E7E7] flex justify-between items-center text-xs">
                  <span className="text-neutral-500 text-[11px]">
                    Page {ledgerPage} of {totalPagesLedger}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={ledgerPage <= 1}
                      onClick={() => handleLedgerPageChange(ledgerPage - 1)}
                      className="px-3 py-1 bg-white border border-[#E7E7E7] rounded hover:bg-neutral-100 disabled:opacity-40 text-xs font-semibold cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={ledgerPage >= totalPagesLedger}
                      onClick={() => handleLedgerPageChange(ledgerPage + 1)}
                      className="px-3 py-1 bg-white border border-[#E7E7E7] rounded hover:bg-neutral-100 disabled:opacity-40 text-xs font-semibold cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MANUAL ADJUSTMENT MODAL */}
        {/* ========================================================================= */}
        {selectedWalletForAdjustment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[6px] max-w-md w-full border border-[#E7E7E7] shadow-xl overflow-hidden text-xs">
              <div className="p-5 border-b border-[#E7E7E7] flex justify-between items-center bg-[#FBFBFB]">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#3F3F8F]" />
                  <h3 className="font-semibold text-sm text-black uppercase tracking-wider">
                    Adjust Customer Points
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWalletForAdjustment(null)}
                  className="text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdjustment} className="p-6 space-y-4">
                {/* Target Customer Info */}
                <div className="p-3 rounded bg-neutral-50 border border-neutral-200/80 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                    Target Customer
                  </span>
                  <div className="font-bold text-neutral-900">
                    {selectedWalletForAdjustment.customer_name || 'Anonymous Customer'}
                  </div>
                  <div className="font-mono text-neutral-600 text-[11px]">
                    {selectedWalletForAdjustment.customer_email}
                  </div>
                  <div className="text-[11px] text-[#3F3F8F] font-semibold pt-1">
                    Current Usable Balance: {selectedWalletForAdjustment.balance_points} pts (₹{selectedWalletForAdjustment.balance_points})
                  </div>
                </div>

                {/* Adjustment Direction Toggle */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Adjustment Direction *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('credit')}
                      className={`py-2 px-3 rounded border font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        adjustmentType === 'credit'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      CREDIT POINTS (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('debit')}
                      className={`py-2 px-3 rounded border font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        adjustmentType === 'debit'
                          ? 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      DEBIT POINTS (-)
                    </button>
                  </div>
                </div>

                {/* Points Amount Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Points Amount *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="E.g. 100"
                    value={adjustmentPoints}
                    onChange={(e) => setAdjustmentPoints(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded font-mono text-sm focus:outline-none focus:border-[#3F3F8F]"
                  />
                  {adjustmentPoints && (
                    <p className="text-[11px] text-neutral-500 mt-1">
                      New balance will be:{' '}
                      <strong className="text-neutral-900 font-mono">
                        {adjustmentType === 'credit'
                          ? selectedWalletForAdjustment.balance_points + (parseInt(adjustmentPoints, 10) || 0)
                          : Math.max(0, selectedWalletForAdjustment.balance_points - (parseInt(adjustmentPoints, 10) || 0))}{' '}
                        points
                      </strong>
                    </p>
                  )}
                </div>

                {/* Reason Category */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Reason Category *
                  </label>
                  <select
                    value={adjustmentReasonCategory}
                    onChange={(e) => setAdjustmentReasonCategory(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded bg-white focus:outline-none focus:border-[#3F3F8F]"
                  >
                    <option value="Customer Service Appeasement">Customer Service Appeasement</option>
                    <option value="VIP Goodwill Gesture">VIP Goodwill Gesture</option>
                    <option value="Dispute Resolution">Dispute Resolution</option>
                    <option value="Order Issue Compensation">Order Issue Compensation</option>
                    <option value="System Balance Correction">System Balance Correction</option>
                    <option value="Other / Special Campaign">Other / Special Campaign</option>
                  </select>
                </div>

                {/* Custom Note */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-neutral-700 mb-1.5">
                    Internal Audit Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter specific notes or ticket reference for ledger history..."
                    value={adjustmentCustomNote}
                    onChange={(e) => setAdjustmentCustomNote(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded focus:outline-none focus:border-[#3F3F8F]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWalletForAdjustment(null)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingAdjustment}
                    className="font-semibold uppercase tracking-wider"
                  >
                    CONFIRM ADJUSTMENT
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
