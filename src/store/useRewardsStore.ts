import { create } from 'zustand';
import {
  RewardSettings,
  CustomerRewardWallet,
  RewardPointBatch,
  RewardTransaction,
  CheckoutPointsEvaluation,
} from '../types/rewards';
import { rewardsService } from '../services/rewardsService';

interface RewardsState {
  wallet: CustomerRewardWallet | null;
  batches: RewardPointBatch[];
  transactions: RewardTransaction[];
  settings: RewardSettings | null;
  pointsToRedeem: number;
  isLoading: boolean;
  isReconciling: boolean;

  loadSettings: () => Promise<RewardSettings>;
  loadWallet: (userId: string, email?: string, name?: string) => Promise<CustomerRewardWallet | null>;
  loadBatches: (userId: string) => Promise<RewardPointBatch[]>;
  loadTransactions: (userId: string) => Promise<RewardTransaction[]>;
  reconcileAndFetch: (userId: string, email?: string, name?: string) => Promise<void>;
  setPointsToRedeem: (points: number) => void;
  awardWelcomeBonus: (userId: string, email: string, name?: string) => Promise<{ success: boolean; points?: number; message?: string }>;
  evaluateRedemption: (subtotal: number) => CheckoutPointsEvaluation;
  reset: () => void;
}

export const useRewardsStore = create<RewardsState>((set, get) => ({
  wallet: null,
  batches: [],
  transactions: [],
  settings: null,
  pointsToRedeem: 0,
  isLoading: false,
  isReconciling: false,

  loadSettings: async () => {
    try {
      const settings = await rewardsService.getSettings();
      set({ settings });
      return settings;
    } catch (err) {
      console.warn('[useRewardsStore] loadSettings error:', err);
      return get().settings!;
    }
  },

  loadWallet: async (userId, email, name) => {
    if (!userId) {
      set({ wallet: null });
      return null;
    }
    set({ isLoading: true });
    try {
      const wallet = await rewardsService.getWallet(userId, email, name);
      set({ wallet, isLoading: false });
      return wallet;
    } catch (err) {
      set({ isLoading: false });
      return null;
    }
  },

  loadBatches: async (userId) => {
    if (!userId) {
      set({ batches: [] });
      return [];
    }
    try {
      const batches = await rewardsService.getBatches(userId);
      set({ batches });
      return batches;
    } catch {
      return [];
    }
  },

  loadTransactions: async (userId) => {
    if (!userId) {
      set({ transactions: [] });
      return [];
    }
    try {
      const transactions = await rewardsService.getTransactions(userId);
      set({ transactions });
      return transactions;
    } catch {
      return [];
    }
  },

  /**
   * Dual-engine client reconciliation: runs settlement and expiry checks, then refreshes wallet, batches, and ledger
   */
  reconcileAndFetch: async (userId, email, name) => {
    if (!userId) return;
    set({ isReconciling: true });
    try {
      // 1. Run stored procedures to settle pending rewards whose return window closed, and expire past-due points
      await rewardsService.reconcileCustomerRewards(userId);

      // 2. Fetch fresh data in parallel
      const [settings, wallet, batches, transactions] = await Promise.all([
        get().settings ? Promise.resolve(get().settings!) : rewardsService.getSettings(),
        rewardsService.getWallet(userId, email, name),
        rewardsService.getBatches(userId),
        rewardsService.getTransactions(userId),
      ]);

      set({
        settings,
        wallet,
        batches,
        transactions,
        isReconciling: false,
      });
    } catch (err) {
      console.warn('[useRewardsStore] reconcileAndFetch error:', err);
      set({ isReconciling: false });
    }
  },

  setPointsToRedeem: (points: number) => {
    set({ pointsToRedeem: Math.max(0, Math.floor(points)) });
  },

  awardWelcomeBonus: async (userId, email, name) => {
    if (!userId || !email) return { success: false, message: 'Missing user' };
    const res = await rewardsService.awardWelcomeBonus(userId, email, name);
    if (res.success) {
      await get().reconcileAndFetch(userId, email, name);
    }
    return res;
  },

  evaluateRedemption: (subtotal: number) => {
    const { wallet, settings, pointsToRedeem } = get();
    if (!settings) {
      return {
        isEligible: false,
        balancePoints: wallet?.balance_points || 0,
        minRedeemPoints: 100,
        maxRedeemPoints: 500,
        maxAllowedForOrder: 0,
        pointsToRedeem: 0,
        pointsDiscountValue: 0,
      };
    }
    return rewardsService.evaluateCheckoutRedemption(wallet, settings, subtotal, pointsToRedeem);
  },

  reset: () => {
    set({
      wallet: null,
      batches: [],
      transactions: [],
      pointsToRedeem: 0,
      isLoading: false,
      isReconciling: false,
    });
  },
}));
