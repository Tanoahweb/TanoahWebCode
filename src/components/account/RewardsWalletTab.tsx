import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { useRewardsStore } from '../../store/useRewardsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatPrice } from '../../utils/formatters';
import { RewardTransaction } from '../../types/rewards';

export const RewardsWalletTab: React.FC = () => {
  const { user, profile } = useAuthStore();
  const {
    wallet,
    batches,
    transactions,
    settings,
    isLoading,
    isReconciling,
    reconcileAndFetch,
  } = useRewardsStore();

  const [filterType, setFilterType] = useState<'all' | 'earned' | 'redeemed' | 'expired'>('all');

  useEffect(() => {
    if (user?.id) {
      reconcileAndFetch(user.id, user.email, profile?.full_name);
    }
  }, [user, profile]);

  const handleRefresh = () => {
    if (user?.id) {
      reconcileAndFetch(user.id, user.email, profile?.full_name);
    }
  };

  // Find points expiring within 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const expiringBatches = batches.filter((b) => {
    if (b.is_expired || b.remaining_points <= 0) return false;
    const expDate = new Date(b.expires_at);
    return expDate > now && expDate <= thirtyDaysFromNow;
  });
  const totalExpiringSoon = expiringBatches.reduce((sum, b) => sum + b.remaining_points, 0);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'earned') {
      return tx.points > 0 && tx.status !== 'pending' && tx.status !== 'cancelled';
    }
    if (filterType === 'redeemed') {
      return tx.type === 'redeemed_checkout' || tx.type === 'admin_debit';
    }
    if (filterType === 'expired') {
      return tx.type === 'expired';
    }
    return true;
  });

  const getTransactionBadge = (tx: RewardTransaction) => {
    switch (tx.type) {
      case 'welcome_bonus':
        return { label: 'Welcome Bonus', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'first_purchase_bonus':
        return { label: 'First Order Bonus', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'earned_purchase':
        return tx.status === 'pending'
          ? { label: 'Pending (Return Window)', bg: 'bg-amber-50 text-amber-800 border-amber-200' }
          : { label: 'Purchase Reward', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'redeemed_checkout':
        return { label: 'Redeemed', bg: 'bg-neutral-100 text-neutral-800 border-neutral-300' };
      case 'expired':
        return { label: 'Expired', bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'reversed_cancellation':
        return { label: 'Refund Restored', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'admin_credit':
        return { label: 'Admin Privilege', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'admin_debit':
        return { label: 'Admin Adjustment', bg: 'bg-neutral-100 text-neutral-700 border-neutral-300' };
      default:
        return { label: tx.type, bg: 'bg-neutral-50 text-neutral-700 border-neutral-200' };
    }
  };

  const balancePoints = wallet?.balance_points ?? 0;
  const pendingPoints = wallet?.pending_points ?? 0;
  const lifetimeEarned = wallet?.lifetime_earned_points ?? 0;

  return (
    <div className="space-y-8 font-poppins text-xs text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
              TANOAH PRIVILEGE
            </span>
            <span className="inline-flex items-center gap-1 bg-[#EEEEF8] text-[#3F3F8F] text-[9px] font-bold px-2 py-0.5 rounded uppercase">
              <Sparkles className="w-3 h-3" />
              1 Point = ₹1
            </span>
          </div>
          <h2 className="font-wondra text-2xl sm:text-3xl text-black mt-1">
            REWARDS WALLET & LOYALTY
          </h2>
          <p className="text-[#666666] text-xs mt-0.5">
            Earn 10% back on luxury apparel purchases. Points unlock automatically after the 24-hour return window closes.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isReconciling || isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E7E7E7] hover:border-black rounded-[4px] text-[11px] font-semibold uppercase text-black bg-white transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
          title="Refresh reward balances"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin text-[#3F3F8F]' : ''}`} />
          <span>{isReconciling ? 'Reconciling...' : 'Refresh Wallet'}</span>
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Usable Balance */}
        <div className="bg-gradient-to-br from-[#3F3F8F] to-[#2B2B6F] text-white p-5 rounded-[4px] shadow-sm relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10">
            <Gift className="w-24 h-24" />
          </div>
          <span className="text-[10px] text-white/80 uppercase tracking-wider block mb-1 font-semibold">
            AVAILABLE BALANCE
          </span>
          <div className="text-3xl font-bold font-mono tracking-tight">{balancePoints}</div>
          <div className="text-[11px] text-white/90 mt-1 font-medium flex items-center gap-1">
            <span>Worth {formatPrice(balancePoints)} Reward Value</span>
          </div>
          <p className="text-[10px] text-white/70 mt-3 pt-2 border-t border-white/10">
            Usable directly at checkout
          </p>
        </div>

        {/* Card 2: Pending Points (24h return window) */}
        <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
            PENDING POINTS
          </span>
          <div className="text-3xl font-bold text-amber-700 font-mono tracking-tight">{pendingPoints}</div>
          <div className="text-[11px] text-amber-800 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Worth {formatPrice(pendingPoints)}</span>
          </div>
          <p className="text-[10px] text-[#888888] mt-3 pt-2 border-t border-[#E7E7E7]">
            Unlocks 24h post-delivery (Return window closed)
          </p>
        </div>

        {/* Card 3: Expiring Soon Warning */}
        <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
            EXPIRING WITHIN 30 DAYS
          </span>
          <div className={`text-3xl font-bold font-mono tracking-tight ${totalExpiringSoon > 0 ? 'text-red-600' : 'text-black'}`}>
            {totalExpiringSoon}
          </div>
          <div className="text-[11px] text-[#888888] mt-1 flex items-center gap-1">
            {totalExpiringSoon > 0 ? (
              <span className="text-red-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Action recommended
              </span>
            ) : (
              <span>All active points in safe term</span>
            )}
          </div>
          <p className="text-[10px] text-[#888888] mt-3 pt-2 border-t border-[#E7E7E7]">
            12-month expiry term per batch
          </p>
        </div>

        {/* Card 4: Lifetime Earned */}
        <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] text-[#888888] uppercase tracking-wider block mb-1">
            LIFETIME PRIVILEGE
          </span>
          <div className="text-3xl font-bold text-black font-mono tracking-tight">{lifetimeEarned}</div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Total Points Earned</span>
          </div>
          <p className="text-[10px] text-[#888888] mt-3 pt-2 border-t border-[#E7E7E7]">
            Redeemed: {wallet?.lifetime_redeemed_points || 0} pts
          </p>
        </div>
      </div>

      {/* Approaching Expiration Alert Banner */}
      {totalExpiringSoon > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-[4px] flex items-start gap-3 text-amber-950">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-xs">Points Approaching Expiration</h4>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              You have <strong>{totalExpiringSoon} Points ({formatPrice(totalExpiringSoon)})</strong> expiring within the next 30 days. Points are automatically redeemed on a First-In, First-Out basis. Redeem them on your next order before expiration.
            </p>
            <div className="pt-1">
              <Link to="/collections/all" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3F3F8F] hover:underline">
                Shop Now to Use Points &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* How Rewards Work Explainer Card */}
      <div className="bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-wondra text-lg text-black">HOW THE REWARDS PROGRAM WORKS</h3>
          <span className="text-[11px] font-medium text-[#666666]">Transparent, automatic & protected</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px] text-[#555555]">
          <div className="bg-white p-3.5 rounded border border-[#E7E7E7] space-y-1">
            <div className="w-6 h-6 rounded bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center font-bold text-xs">1</div>
            <h5 className="font-semibold text-black">Shop & Earn</h5>
            <p className="text-[10px] leading-relaxed text-[#666666]">
              Earn 10% reward points on every completed purchase. 1 Point equals ₹1 reward value.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded border border-[#E7E7E7] space-y-1">
            <div className="w-6 h-6 rounded bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center font-bold text-xs">2</div>
            <h5 className="font-semibold text-black">Delivery & 24h Window</h5>
            <p className="text-[10px] leading-relaxed text-[#666666]">
              Points remain pending for 24 hours post-delivery while our strict transit-damage return window is open.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded border border-[#E7E7E7] space-y-1">
            <div className="w-6 h-6 rounded bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center font-bold text-xs">3</div>
            <h5 className="font-semibold text-black">Automatic Credit</h5>
            <p className="text-[10px] leading-relaxed text-[#666666]">
              Once the 24-hour return window closes, points move automatically to your usable wallet balance.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded border border-[#E7E7E7] space-y-1">
            <div className="w-6 h-6 rounded bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center font-bold text-xs">4</div>
            <h5 className="font-semibold text-black">Redeem at Checkout</h5>
            <p className="text-[10px] leading-relaxed text-[#666666]">
              Use points directly at checkout (up to {settings?.max_order_percentage || 20}% of order subtotal, min {settings?.min_redeem_points || 100} pts).
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h3 className="font-wondra text-xl text-black">TRANSACTION HISTORY</h3>
            <p className="text-[#666666] text-[11px]">Audit log of your earnings, redemptions, and expirations.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded border border-[#E7E7E7]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-[2px] text-[11px] font-semibold uppercase transition-colors ${
                filterType === 'all' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('earned')}
              className={`px-3 py-1 rounded-[2px] text-[11px] font-semibold uppercase transition-colors ${
                filterType === 'earned' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
              }`}
            >
              Earned
            </button>
            <button
              onClick={() => setFilterType('redeemed')}
              className={`px-3 py-1 rounded-[2px] text-[11px] font-semibold uppercase transition-colors ${
                filterType === 'redeemed' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
              }`}
            >
              Redeemed
            </button>
            <button
              onClick={() => setFilterType('expired')}
              className={`px-3 py-1 rounded-[2px] text-[11px] font-semibold uppercase transition-colors ${
                filterType === 'expired' ? 'bg-[#3F3F8F] text-white' : 'text-[#666666] hover:text-black'
              }`}
            >
              Expired
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        {isLoading ? (
          <div className="py-12 text-center text-[#888888]">Loading reward history...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-2">
            <Gift className="w-8 h-8 text-[#888888] mx-auto opacity-40" />
            <h4 className="font-semibold text-black">No transactions found</h4>
            <p className="text-xs text-[#666666]">
              {filterType === 'all'
                ? 'Your rewards ledger is currently fresh. Start earning by completing your first order.'
                : `No transactions matching "${filterType}".`}
            </p>
          </div>
        ) : (
          <div className="border border-[#E7E7E7] rounded-[4px] overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[10px] text-[#666666] uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Activity & Type</th>
                    <th className="py-3 px-4">Order Reference</th>
                    <th className="py-3 px-4 text-right">Points</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {filteredTransactions.map((tx) => {
                    const badge = getTransactionBadge(tx);
                    const isCredit = tx.points > 0 && tx.status !== 'cancelled';
                    const isPending = tx.status === 'pending';

                    return (
                      <tr key={tx.id} className="hover:bg-[#FBFBFB] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#666666] whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="font-medium text-black">{tx.description}</div>
                            <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded border uppercase ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#444444]">
                          {tx.reference_id ? (
                            <span className="font-semibold">{tx.reference_id}</span>
                          ) : (
                            <span className="text-[#888888]">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {isPending ? (
                            <span className="text-amber-700">+{tx.points} pts (Pending)</span>
                          ) : isCredit ? (
                            <span className="text-emerald-700">+{tx.points} pts</span>
                          ) : (
                            <span className="text-neutral-800">{tx.points} pts</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-neutral-600 font-semibold whitespace-nowrap">
                          {isPending ? 'Pending' : `${tx.balance_after} pts`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
