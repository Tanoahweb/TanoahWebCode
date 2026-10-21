export interface RewardSettings {
  id: string;
  is_enabled: boolean;
  point_to_inr_ratio: number; // 1.0 (1 pt = ₹1)
  purchase_reward_percentage: number; // Default 10.0%
  credit_delay_hours: number; // Default 24 hours (strictly aligned with return window)
  point_expiry_months: number; // Default 12 months
  min_redeem_points: number; // Default 100
  max_redeem_points: number; // Default 500
  max_order_percentage: number; // Default 20.0%
  welcome_bonus_enabled: boolean; // Default true
  welcome_bonus_points: number; // Default 100
  first_purchase_bonus_enabled: boolean; // Default true
  first_purchase_bonus_points: number; // Default 150
  expiry_warning_days: number[]; // Default [30, 7]
  updated_at: string;
  updated_by?: string | null;
}

export interface CustomerRewardWallet {
  id: string;
  user_id: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  balance_points: number;
  pending_points: number;
  lifetime_earned_points: number;
  lifetime_redeemed_points: number;
  lifetime_expired_points: number;
  created_at: string;
  updated_at: string;
}

export type RewardSourceType = 'purchase' | 'welcome_bonus' | 'first_purchase_bonus' | 'admin_adjustment';

export interface RewardPointBatch {
  id: string;
  wallet_id: string;
  user_id: string;
  original_points: number;
  remaining_points: number;
  source_type: RewardSourceType;
  source_reference_id?: string | null;
  credited_at: string;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
}

export type RewardTransactionType =
  | 'earned_purchase'
  | 'welcome_bonus'
  | 'first_purchase_bonus'
  | 'redeemed_checkout'
  | 'expired'
  | 'reversed_cancellation'
  | 'reversed_return'
  | 'admin_credit'
  | 'admin_debit';

export type RewardTransactionStatus = 'pending' | 'credited' | 'redeemed' | 'expired' | 'cancelled';

export interface RewardTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: RewardTransactionType;
  status: RewardTransactionStatus;
  points: number;
  balance_after: number;
  reference_id?: string | null;
  description: string;
  unlock_at?: string | null;
  batch_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface ProductCategoryRewardRate {
  id: string;
  entity_type: 'category' | 'product' | 'collection';
  entity_id: string;
  reward_percentage: number;
  is_active: boolean;
  entity_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RewardCalculationResult {
  totalEstimatedPoints: number;
  pointToInrRatio: number;
  rewardPercentage: number;
  isEligible: boolean;
  itemsBreakdown: {
    productId: string;
    productTitle: string;
    unitPrice: number;
    quantity: number;
    rateUsed: number;
    pointsEarned: number;
  }[];
}

export interface CheckoutPointsEvaluation {
  isEligible: boolean;
  balancePoints: number;
  minRedeemPoints: number;
  maxRedeemPoints: number;
  maxAllowedForOrder: number;
  pointsToRedeem: number;
  pointsDiscountValue: number;
  message?: string;
}

export interface RewardAdjustmentPayload {
  userId: string;
  points: number;
  reason: string;
  adminId?: string;
}
