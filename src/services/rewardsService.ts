import { supabase } from './supabase';
import {
  RewardSettings,
  CustomerRewardWallet,
  RewardPointBatch,
  RewardTransaction,
  ProductCategoryRewardRate,
  RewardCalculationResult,
  CheckoutPointsEvaluation,
} from '../types/rewards';
import { CartItem } from '../types';
import { computeProductPricing } from '../utils/formatters';

const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  id: 'default',
  is_enabled: true,
  point_to_inr_ratio: 1.0,
  purchase_reward_percentage: 10.0,
  credit_delay_hours: 24,
  point_expiry_months: 12,
  min_redeem_points: 100,
  max_redeem_points: 500,
  max_order_percentage: 20.0,
  welcome_bonus_enabled: true,
  welcome_bonus_points: 100,
  first_purchase_bonus_enabled: true,
  first_purchase_bonus_points: 150,
  expiry_warning_days: [30, 7],
  updated_at: new Date().toISOString(),
};

class RewardsService {
  private cachedSettings: RewardSettings | null = null;
  private settingsCacheTime = 0;
  private CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

  /**
   * Fetch global reward settings
   */
  async getSettings(): Promise<RewardSettings> {
    const now = Date.now();
    if (this.cachedSettings && now - this.settingsCacheTime < this.CACHE_TTL_MS) {
      return this.cachedSettings;
    }

    try {
      const { data, error } = await supabase
        .from('reward_settings')
        .select('*')
        .eq('is_enabled', true)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const loadedSettings: RewardSettings = {
          ...DEFAULT_REWARD_SETTINGS,
          ...data,
          point_to_inr_ratio: Number(data.point_to_inr_ratio ?? 1),
          purchase_reward_percentage: Number(data.purchase_reward_percentage ?? 10),
          max_order_percentage: Number(data.max_order_percentage ?? 20),
        };
        this.cachedSettings = loadedSettings;
        this.settingsCacheTime = now;
        return loadedSettings;
      }
    } catch (err) {
      console.warn('[RewardsService] Failed to load settings from Supabase, using defaults:', err);
    }

    return DEFAULT_REWARD_SETTINGS;
  }

  /**
   * Update global reward settings (Admin only)
   */
  async updateSettings(settings: Partial<RewardSettings>, adminId?: string): Promise<boolean> {
    try {
      const current = await this.getSettings();
      const payload: any = {
        ...settings,
        updated_at: new Date().toISOString(),
        updated_by: adminId || null,
      };

      if (current.id && current.id !== 'default') {
        const { error } = await supabase.from('reward_settings').update(payload).eq('id', current.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reward_settings').insert(payload);
        if (error) throw error;
      }

      this.cachedSettings = null; // Invalidate cache
      return true;
    } catch (err) {
      console.error('[RewardsService] Error updating reward settings:', err);
      throw err;
    }
  }

  /**
   * Get or initialize customer wallet
   */
  async getWallet(userId: string, email?: string, name?: string): Promise<CustomerRewardWallet | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('customer_reward_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as CustomerRewardWallet;
      }

      // If wallet does not exist and email is available, initialize one
      if (email) {
        const { data: created, error: createError } = await supabase
          .from('customer_reward_wallets')
          .insert({
            user_id: userId,
            customer_email: email,
            customer_name: name || '',
            balance_points: 0,
            pending_points: 0,
            lifetime_earned_points: 0,
            lifetime_redeemed_points: 0,
            lifetime_expired_points: 0,
          })
          .select()
          .single();

        if (!createError && created) {
          return created as CustomerRewardWallet;
        }
      }
    } catch (err) {
      console.warn('[RewardsService] Error fetching customer wallet:', err);
    }

    return null;
  }

  /**
   * Fetch active FIFO point batches for a user
   */
  async getBatches(userId: string): Promise<RewardPointBatch[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('reward_point_batches')
        .select('*')
        .eq('user_id', userId)
        .eq('is_expired', false)
        .gt('remaining_points', 0)
        .order('expires_at', { ascending: true });

      if (!error && data) {
        return data as RewardPointBatch[];
      }
    } catch (err) {
      console.warn('[RewardsService] Error fetching batches:', err);
    }

    return [];
  }

  /**
   * Fetch complete customer transaction ledger
   */
  async getTransactions(userId: string): Promise<RewardTransaction[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('reward_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as RewardTransaction[];
      }
    } catch (err) {
      console.warn('[RewardsService] Error fetching transactions:', err);
    }

    return [];
  }

  /**
   * Award first login / registration bonus
   */
  async awardWelcomeBonus(userId: string, email: string, name?: string): Promise<{ success: boolean; points?: number; message?: string }> {
    if (!userId || !email) return { success: false, message: 'Missing user credentials' };

    try {
      const { data, error } = await supabase.rpc('award_welcome_bonus', {
        p_user_id: userId,
        p_email: email,
        p_name: name || '',
      });

      if (error) throw error;
      return data as { success: boolean; points?: number; message?: string };
    } catch (err: any) {
      console.warn('[RewardsService] Welcome bonus RPC result:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Atomic FIFO redemption at checkout
   */
  async redeemPoints(userId: string, orderId: string, points: number): Promise<{ success: boolean; points_redeemed?: number; new_balance?: number; message?: string }> {
    if (!userId || !orderId || points <= 0) {
      return { success: false, message: 'Invalid redemption parameters' };
    }

    try {
      const { data, error } = await supabase.rpc('redeem_reward_points', {
        p_user_id: userId,
        p_order_id: orderId,
        p_points: points,
      });

      if (error) throw error;
      return data as any;
    } catch (err: any) {
      console.error('[RewardsService] Point redemption failed:', err);
      return { success: false, message: err.message || 'Redemption failed' };
    }
  }

  /**
   * Rollback redeemed points on cancelled order / payment failure
   */
  async rollbackRedemption(orderId: string): Promise<{ success: boolean; points_restored?: number; message?: string }> {
    if (!orderId) return { success: false, message: 'Invalid order ID' };

    try {
      const { data, error } = await supabase.rpc('rollback_redeemed_points', {
        p_order_id: orderId,
      });

      if (error) throw error;
      return data as any;
    } catch (err: any) {
      console.error('[RewardsService] Point rollback failed:', err);
      return { success: false, message: err.message || 'Rollback failed' };
    }
  }

  /**
   * Settle pending rewards (orders delivered + 24h return window closed)
   */
  async settlePendingRewards(userId?: string): Promise<{ success: boolean; settled_count?: number }> {
    try {
      const { data, error } = await supabase.rpc('settle_pending_rewards', {
        p_user_id: userId || null,
      });

      if (error) throw error;
      return data as any;
    } catch (err: any) {
      console.warn('[RewardsService] Settle pending rewards error:', err.message);
      return { success: false };
    }
  }

  /**
   * Expire past-due points batches
   */
  async expirePastDuePoints(userId?: string): Promise<{ success: boolean; expired_batches?: number }> {
    try {
      const { data, error } = await supabase.rpc('expire_past_due_points', {
        p_user_id: userId || null,
      });

      if (error) throw error;
      return data as any;
    } catch (err: any) {
      console.warn('[RewardsService] Expire points error:', err.message);
      return { success: false };
    }
  }

  /**
   * Full client-side or admin fallback reconciliation
   */
  async reconcileCustomerRewards(userId?: string): Promise<void> {
    try {
      await Promise.all([
        this.settlePendingRewards(userId),
        this.expirePastDuePoints(userId),
      ]);
    } catch (err) {
      console.warn('[RewardsService] Reconciliation background check failed:', err);
    }
  }

  /**
   * Admin manual adjustment
   */
  async adminAdjustPoints(
    userId: string,
    points: number,
    reason: string,
    adminId?: string
  ): Promise<{ success: boolean; new_balance?: number; message?: string }> {
    if (!userId || points === 0 || !reason?.trim()) {
      return { success: false, message: 'Invalid adjustment parameters' };
    }

    try {
      const { data, error } = await supabase.rpc('admin_adjust_customer_points', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason.trim(),
        p_admin_id: adminId || null,
      });

      if (error) throw error;
      return data as any;
    } catch (err: any) {
      console.error('[RewardsService] Manual adjustment error:', err);
      return { success: false, message: err.message || 'Adjustment failed' };
    }
  }

  /**
   * Fetch category-specific reward rates
   */
  async getCategoryRewardRates(): Promise<ProductCategoryRewardRate[]> {
    try {
      const { data, error } = await supabase
        .from('product_category_reward_rates')
        .select('*')
        .eq('is_active', true);

      if (!error && data) {
        return data as ProductCategoryRewardRate[];
      }
    } catch (err) {
      console.warn('[RewardsService] Error loading category reward rates:', err);
    }
    return [];
  }

  /**
   * Save or update category reward rate
   */
  async saveCategoryRewardRate(rate: Omit<ProductCategoryRewardRate, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await supabase.from('product_category_reward_rates').upsert(
        {
          entity_type: rate.entity_type,
          entity_id: rate.entity_id,
          reward_percentage: rate.reward_percentage,
          is_active: rate.is_active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'entity_type,entity_id' }
      );

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[RewardsService] Error saving category rate:', err);
      throw err;
    }
  }

  /**
   * Evaluate checkout points eligibility for an order
   */
  evaluateCheckoutRedemption(
    wallet: CustomerRewardWallet | null,
    settings: RewardSettings,
    subtotal: number,
    desiredPoints: number = 0
  ): CheckoutPointsEvaluation {
    if (!wallet || !settings.is_enabled || wallet.balance_points <= 0 || subtotal <= 0) {
      return {
        isEligible: false,
        balancePoints: wallet?.balance_points || 0,
        minRedeemPoints: settings.min_redeem_points,
        maxRedeemPoints: settings.max_redeem_points,
        maxAllowedForOrder: 0,
        pointsToRedeem: 0,
        pointsDiscountValue: 0,
        message: wallet ? (wallet.balance_points < settings.min_redeem_points ? `Minimum ${settings.min_redeem_points} points needed to redeem` : undefined) : 'Sign in to use points',
      };
    }

    // Maximum discount allowed based on order percentage (e.g. 20% of subtotal)
    const maxOrderPercentAmount = (subtotal * settings.max_order_percentage) / 100;
    const maxOrderPercentPoints = Math.floor(maxOrderPercentAmount / settings.point_to_inr_ratio);

    // Theoretical maximum points usable on this specific order
    const maxAllowedForOrder = Math.min(
      wallet.balance_points,
      settings.max_redeem_points,
      maxOrderPercentPoints
    );

    const isEligible = wallet.balance_points >= settings.min_redeem_points && maxAllowedForOrder >= settings.min_redeem_points;

    if (!isEligible) {
      return {
        isEligible: false,
        balancePoints: wallet.balance_points,
        minRedeemPoints: settings.min_redeem_points,
        maxRedeemPoints: settings.max_redeem_points,
        maxAllowedForOrder: 0,
        pointsToRedeem: 0,
        pointsDiscountValue: 0,
        message: wallet.balance_points < settings.min_redeem_points
          ? `You have ${wallet.balance_points} pts. Earn ${settings.min_redeem_points - wallet.balance_points} more to start redeeming (min ${settings.min_redeem_points} pts).`
          : `Order value too low for ${settings.min_redeem_points} points redemption (max ${settings.max_order_percentage}% of order).`,
      };
    }

    const clampedPoints = Math.max(0, Math.min(desiredPoints, maxAllowedForOrder));
    const pointsDiscountValue = clampedPoints * settings.point_to_inr_ratio;

    return {
      isEligible: true,
      balancePoints: wallet.balance_points,
      minRedeemPoints: settings.min_redeem_points,
      maxRedeemPoints: settings.max_redeem_points,
      maxAllowedForOrder,
      pointsToRedeem: clampedPoints,
      pointsDiscountValue,
    };
  }

  /**
   * Calculate potential points earned from a cart or product purchase
   */
  async calculateOrderPoints(items: CartItem[], subtotal: number): Promise<RewardCalculationResult> {
    const settings = await this.getSettings();
    if (!settings.is_enabled) {
      return {
        totalEstimatedPoints: 0,
        pointToInrRatio: 1,
        rewardPercentage: 0,
        isEligible: false,
        itemsBreakdown: [],
      };
    }

    const categoryRates = await this.getCategoryRewardRates();
    const rateMap = new Map<string, number>();
    categoryRates.forEach((r) => rateMap.set(r.entity_id, r.reward_percentage));

    let totalPoints = 0;
    const itemsBreakdown = items.map((item) => {
      const price = computeProductPricing(item.product, item.variant).currentPrice;
      const lineTotal = price * item.quantity;

      // Check category override, fallback to store-wide setting
      const categoryId = item.product.category_id || (item.product as any).category;
      let rate = settings.purchase_reward_percentage;
      if (categoryId && rateMap.has(categoryId)) {
        rate = rateMap.get(categoryId)!;
      }

      const pointsEarned = Math.round((lineTotal * rate) / 100);
      totalPoints += pointsEarned;

      return {
        productId: item.product.id,
        productTitle: item.product.title,
        unitPrice: price,
        quantity: item.quantity,
        rateUsed: rate,
        pointsEarned,
      };
    });

    return {
      totalEstimatedPoints: totalPoints,
      pointToInrRatio: settings.point_to_inr_ratio,
      rewardPercentage: settings.purchase_reward_percentage,
      isEligible: true,
      itemsBreakdown,
    };
  }

  /**
   * Query all customer wallets with pagination and search (Admin OS)
   */
  async getAllWallets(searchTerm = '', page = 1, limit = 20): Promise<{ wallets: CustomerRewardWallet[]; total: number }> {
    try {
      let query = supabase.from('customer_reward_wallets').select('*', { count: 'exact' });

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`customer_email.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, count, error } = await query.order('balance_points', { ascending: false }).range(from, to);

      if (!error && data) {
        return { wallets: data as CustomerRewardWallet[], total: count || 0 };
      }
    } catch (err) {
      console.warn('[RewardsService] Error loading all customer wallets:', err);
    }
    return { wallets: [], total: 0 };
  }

  /**
   * Query master transaction ledger with filters (Admin OS)
   */
  async getMasterLedger(page = 1, limit = 25, filterType?: string): Promise<{ transactions: RewardTransaction[]; total: number }> {
    try {
      let query = supabase.from('reward_transactions').select('*', { count: 'exact' });

      if (filterType && filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);

      if (!error && data) {
        return { transactions: data as RewardTransaction[], total: count || 0 };
      }
    } catch (err) {
      console.warn('[RewardsService] Error loading master ledger:', err);
    }
    return { transactions: [], total: 0 };
  }

  /**
   * Fetch aggregate platform metrics for Admin OS dashboard
   */
  async getRewardsMetrics(): Promise<{
    totalIssued: number;
    totalRedeemed: number;
    totalRedeemedValue: number;
    activeLiabilityPoints: number;
    pendingReturnPoints: number;
    totalExpiredPoints: number;
    totalWalletsCount: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('customer_reward_wallets')
        .select('balance_points, pending_points, lifetime_earned_points, lifetime_redeemed_points, lifetime_expired_points');

      if (!error && data) {
        let totalIssued = 0;
        let totalRedeemed = 0;
        let activeLiabilityPoints = 0;
        let pendingReturnPoints = 0;
        let totalExpiredPoints = 0;

        for (const w of data) {
          totalIssued += Number(w.lifetime_earned_points || 0);
          totalRedeemed += Number(w.lifetime_redeemed_points || 0);
          activeLiabilityPoints += Number(w.balance_points || 0);
          pendingReturnPoints += Number(w.pending_points || 0);
          totalExpiredPoints += Number(w.lifetime_expired_points || 0);
        }

        const settings = await this.getSettings();
        const totalRedeemedValue = Math.round(totalRedeemed * (settings.point_to_inr_ratio || 1));

        return {
          totalIssued,
          totalRedeemed,
          totalRedeemedValue,
          activeLiabilityPoints,
          pendingReturnPoints,
          totalExpiredPoints,
          totalWalletsCount: data.length,
        };
      }
    } catch (err) {
      console.warn('[RewardsService] Error loading rewards metrics:', err);
    }

    return {
      totalIssued: 0,
      totalRedeemed: 0,
      totalRedeemedValue: 0,
      activeLiabilityPoints: 0,
      pendingReturnPoints: 0,
      totalExpiredPoints: 0,
      totalWalletsCount: 0,
    };
  }
}

export const rewardsService = new RewardsService();
