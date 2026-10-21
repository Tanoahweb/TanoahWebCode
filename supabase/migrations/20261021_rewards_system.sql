-- =================================================================
-- TANOAH REWARDS WALLET & LOYALTY POINTS ENGINE
-- Migration: 20261021_rewards_system.sql
-- =================================================================

-- 1. Global Rewards Settings
CREATE TABLE IF NOT EXISTS public.reward_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  point_to_inr_ratio NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  purchase_reward_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  credit_delay_hours INTEGER NOT NULL DEFAULT 24,
  point_expiry_months INTEGER NOT NULL DEFAULT 12,
  min_redeem_points INTEGER NOT NULL DEFAULT 100,
  max_redeem_points INTEGER NOT NULL DEFAULT 500,
  max_order_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  welcome_bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  welcome_bonus_points INTEGER NOT NULL DEFAULT 100,
  first_purchase_bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  first_purchase_bonus_points INTEGER NOT NULL DEFAULT 150,
  expiry_warning_days INTEGER[] NOT NULL DEFAULT ARRAY[30, 7],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Seed default settings if empty
INSERT INTO public.reward_settings (
  is_enabled, point_to_inr_ratio, purchase_reward_percentage, 
  credit_delay_hours, point_expiry_months, min_redeem_points, 
  max_redeem_points, max_order_percentage, welcome_bonus_enabled, 
  welcome_bonus_points, first_purchase_bonus_enabled, first_purchase_bonus_points
) 
SELECT true, 1.00, 10.00, 24, 12, 100, 500, 20.00, true, 100, true, 150
WHERE NOT EXISTS (SELECT 1 FROM public.reward_settings);

-- 2. Customer Reward Wallets
CREATE TABLE IF NOT EXISTS public.customer_reward_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  balance_points INTEGER NOT NULL DEFAULT 0 CHECK (balance_points >= 0),
  pending_points INTEGER NOT NULL DEFAULT 0 CHECK (pending_points >= 0),
  lifetime_earned_points INTEGER NOT NULL DEFAULT 0,
  lifetime_redeemed_points INTEGER NOT NULL DEFAULT 0,
  lifetime_expired_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_reward_wallets_user ON public.customer_reward_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_reward_wallets_email ON public.customer_reward_wallets (customer_email);

-- 3. Reward Point Batches (FIFO Expiry Tracking)
CREATE TABLE IF NOT EXISTS public.reward_point_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.customer_reward_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_points INTEGER NOT NULL CHECK (original_points > 0),
  remaining_points INTEGER NOT NULL CHECK (remaining_points >= 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('purchase', 'welcome_bonus', 'first_purchase_bonus', 'admin_adjustment')),
  source_reference_id TEXT,
  credited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_expired BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reward_batches_fifo ON public.reward_point_batches (user_id, is_expired, expires_at ASC);

-- 4. Reward Transactions (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.customer_reward_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'earned_purchase', 'welcome_bonus', 'first_purchase_bonus', 
    'redeemed_checkout', 'expired', 'reversed_cancellation', 
    'reversed_return', 'admin_credit', 'admin_debit'
  )),
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('pending', 'credited', 'redeemed', 'expired', 'cancelled')),
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL,
  unlock_at TIMESTAMPTZ,
  batch_id UUID REFERENCES public.reward_point_batches(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reward_tx_user ON public.reward_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_tx_status_unlock ON public.reward_transactions (status, unlock_at);

-- 5. Product & Category Specific Reward Rates
CREATE TABLE IF NOT EXISTS public.product_category_reward_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category', 'product', 'collection')),
  entity_id UUID NOT NULL,
  reward_percentage NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- 6. Orders Table Extensions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'points_redeemed'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN points_redeemed INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'points_discount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN points_discount NUMERIC(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'reward_points_earned'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN reward_points_earned INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- 7. Enable RLS
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_point_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_reward_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Read Reward Settings" ON public.reward_settings;
DROP POLICY IF EXISTS "Public Read Category Reward Rates" ON public.product_category_reward_rates;
DROP POLICY IF EXISTS "Users Read Own Wallet" ON public.customer_reward_wallets;
DROP POLICY IF EXISTS "Users Read Own Batches" ON public.reward_point_batches;
DROP POLICY IF EXISTS "Users Read Own Transactions" ON public.reward_transactions;
DROP POLICY IF EXISTS "Admin Full Access Settings" ON public.reward_settings;
DROP POLICY IF EXISTS "Admin Full Access Wallets" ON public.customer_reward_wallets;
DROP POLICY IF EXISTS "Admin Full Access Batches" ON public.reward_point_batches;
DROP POLICY IF EXISTS "Admin Full Access Transactions" ON public.reward_transactions;
DROP POLICY IF EXISTS "Admin Full Access Rates" ON public.product_category_reward_rates;

-- Recreate policies
CREATE POLICY "Public Read Reward Settings" ON public.reward_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Category Reward Rates" ON public.product_category_reward_rates FOR SELECT USING (is_active = true);
CREATE POLICY "Users Read Own Wallet" ON public.customer_reward_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users Read Own Batches" ON public.reward_point_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users Read Own Transactions" ON public.reward_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin Full Access Settings" ON public.reward_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Access Wallets" ON public.customer_reward_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Access Batches" ON public.reward_point_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Access Transactions" ON public.reward_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Access Rates" ON public.product_category_reward_rates FOR ALL USING (true) WITH CHECK (true);

-- =================================================================
-- 8. STORED PROCEDURES
-- =================================================================

-- Procedure 1: First Login / Registration Welcome Bonus
CREATE OR REPLACE FUNCTION public.award_welcome_bonus(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings public.reward_settings%ROWTYPE;
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_batch_id UUID;
  v_bonus_points INTEGER;
  v_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_settings FROM public.reward_settings WHERE is_enabled = true LIMIT 1;
  IF NOT FOUND OR NOT v_settings.welcome_bonus_enabled THEN
    RETURN jsonb_build_object('success', false, 'message', 'Welcome bonus not active');
  END IF;

  v_bonus_points := v_settings.welcome_bonus_points;
  v_expiry := now() + (v_settings.point_expiry_months || ' months')::interval;

  -- Ensure wallet exists
  INSERT INTO public.customer_reward_wallets (user_id, customer_email, customer_name, balance_points, lifetime_earned_points)
  VALUES (p_user_id, p_email, p_name, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET 
    customer_email = EXCLUDED.customer_email,
    customer_name = COALESCE(NULLIF(EXCLUDED.customer_name, ''), customer_reward_wallets.customer_name);

  -- Check if already received welcome bonus
  IF EXISTS (
    SELECT 1 FROM public.reward_transactions 
    WHERE user_id = p_user_id AND type = 'welcome_bonus'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Welcome bonus already awarded');
  END IF;

  -- Lock wallet
  SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE user_id = p_user_id FOR UPDATE;

  -- Create FIFO batch
  INSERT INTO public.reward_point_batches (wallet_id, user_id, original_points, remaining_points, source_type, expires_at)
  VALUES (v_wallet.id, p_user_id, v_bonus_points, v_bonus_points, 'welcome_bonus', v_expiry)
  RETURNING id INTO v_batch_id;

  -- Update wallet
  UPDATE public.customer_reward_wallets
  SET 
    balance_points = balance_points + v_bonus_points,
    lifetime_earned_points = lifetime_earned_points + v_bonus_points,
    updated_at = now()
  WHERE id = v_wallet.id;

  -- Log transaction
  INSERT INTO public.reward_transactions (
    wallet_id, user_id, type, status, points, balance_after, 
    description, batch_id
  ) VALUES (
    v_wallet.id, p_user_id, 'welcome_bonus', 'credited', v_bonus_points, 
    v_wallet.balance_points + v_bonus_points, 'Welcome to Tanoah Gift Bonus', v_batch_id
  );

  RETURN jsonb_build_object('success', true, 'points', v_bonus_points, 'new_balance', v_wallet.balance_points + v_bonus_points);
END;
$$;

-- Procedure 2: Atomic FIFO Point Redemption at Checkout
CREATE OR REPLACE FUNCTION public.redeem_reward_points(
  p_user_id UUID,
  p_order_id TEXT,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_batch RECORD;
  v_points_needed INTEGER := p_points;
  v_deduct INTEGER;
BEGIN
  IF p_points <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Points must be positive');
  END IF;

  SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance_points < p_points THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points balance');
  END IF;

  -- Deduct from earliest-expiring active batches (FIFO)
  FOR v_batch IN 
    SELECT * FROM public.reward_point_batches 
    WHERE user_id = p_user_id AND remaining_points > 0 AND is_expired = false 
    ORDER BY expires_at ASC FOR UPDATE
  LOOP
    EXIT WHEN v_points_needed <= 0;

    v_deduct := LEAST(v_batch.remaining_points, v_points_needed);
    UPDATE public.reward_point_batches 
    SET remaining_points = remaining_points - v_deduct,
        is_expired = (remaining_points - v_deduct = 0 AND expires_at < now())
    WHERE id = v_batch.id;

    v_points_needed := v_points_needed - v_deduct;
  END LOOP;

  IF v_points_needed > 0 THEN
    RAISE EXCEPTION 'Active batch points mismatch';
  END IF;

  -- Update wallet
  UPDATE public.customer_reward_wallets
  SET 
    balance_points = balance_points - p_points,
    lifetime_redeemed_points = lifetime_redeemed_points + p_points,
    updated_at = now()
  WHERE id = v_wallet.id;

  -- Log transaction
  INSERT INTO public.reward_transactions (
    wallet_id, user_id, type, status, points, balance_after, 
    reference_id, description
  ) VALUES (
    v_wallet.id, p_user_id, 'redeemed_checkout', 'redeemed', -p_points, 
    v_wallet.balance_points - p_points, p_order_id, 'Redeemed on Order #' || p_order_id
  );

  RETURN jsonb_build_object('success', true, 'points_redeemed', p_points, 'new_balance', v_wallet.balance_points - p_points);
END;
$$;

-- Procedure 3: Rollback Redeemed Points (Checkout cancellation)
CREATE OR REPLACE FUNCTION public.rollback_redeemed_points(
  p_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx public.reward_transactions%ROWTYPE;
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_points INTEGER;
  v_settings public.reward_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_tx FROM public.reward_transactions 
  WHERE reference_id = p_order_id AND type = 'redeemed_checkout' AND status = 'redeemed' 
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No redemption found to rollback');
  END IF;

  v_points := ABS(v_tx.points);
  SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE id = v_tx.wallet_id FOR UPDATE;
  SELECT * INTO v_settings FROM public.reward_settings WHERE is_enabled = true LIMIT 1;

  -- Restore wallet
  UPDATE public.customer_reward_wallets
  SET 
    balance_points = balance_points + v_points,
    lifetime_redeemed_points = GREATEST(0, lifetime_redeemed_points - v_points),
    updated_at = now()
  WHERE id = v_wallet.id;

  -- Create restored batch with fresh standard expiry
  INSERT INTO public.reward_point_batches (
    wallet_id, user_id, original_points, remaining_points, source_type, source_reference_id, expires_at
  ) VALUES (
    v_wallet.id, v_wallet.user_id, v_points, v_points, 'admin_adjustment', p_order_id,
    now() + (COALESCE(v_settings.point_expiry_months, 12) || ' months')::interval
  );

  -- Log transaction
  INSERT INTO public.reward_transactions (
    wallet_id, user_id, type, status, points, balance_after, 
    reference_id, description
  ) VALUES (
    v_wallet.id, v_wallet.user_id, 'reversed_cancellation', 'credited', v_points, 
    v_wallet.balance_points + v_points, p_order_id, 'Restored from Cancelled Order #' || p_order_id
  );

  RETURN jsonb_build_object('success', true, 'points_restored', v_points, 'new_balance', v_wallet.balance_points + v_points);
END;
$$;

-- Procedure 4: Settle Pending Rewards (Order Delivered + 24h Return Window Closed)
CREATE OR REPLACE FUNCTION public.settle_pending_rewards(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings public.reward_settings%ROWTYPE;
  v_tx RECORD;
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_batch_id UUID;
  v_count INTEGER := 0;
  v_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_settings FROM public.reward_settings WHERE is_enabled = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rewards settings not active');
  END IF;

  v_expiry := now() + (v_settings.point_expiry_months || ' months')::interval;

  -- Find eligible pending transactions where order was delivered, 24h return window elapsed,
  -- and NO active return claim exists in public.returns
  FOR v_tx IN
    SELECT tx.*, o.id as order_uuid, o.order_number
    FROM public.reward_transactions tx
    JOIN public.orders o ON o.order_number = tx.reference_id OR o.id::text = tx.reference_id
    WHERE tx.type = 'earned_purchase' 
      AND tx.status = 'pending'
      AND tx.unlock_at <= now()
      AND o.status = 'delivered'
      AND (p_user_id IS NULL OR tx.user_id = p_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.returns r 
        WHERE r.order_id = o.id 
          AND r.status NOT IN ('rejected', 'cancelled')
      )
    FOR UPDATE OF tx
  LOOP
    -- Lock wallet
    SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE id = v_tx.wallet_id FOR UPDATE;

    -- Create active FIFO batch
    INSERT INTO public.reward_point_batches (
      wallet_id, user_id, original_points, remaining_points, source_type, source_reference_id, expires_at
    ) VALUES (
      v_wallet.id, v_wallet.user_id, v_tx.points, v_tx.points, 'purchase', v_tx.reference_id, v_expiry
    ) RETURNING id INTO v_batch_id;

    -- Update wallet: pending -> balance
    UPDATE public.customer_reward_wallets
    SET 
      balance_points = balance_points + v_tx.points,
      pending_points = GREATEST(0, pending_points - v_tx.points),
      lifetime_earned_points = lifetime_earned_points + v_tx.points,
      updated_at = now()
    WHERE id = v_wallet.id;

    -- Update transaction record
    UPDATE public.reward_transactions
    SET 
      status = 'credited',
      balance_after = v_wallet.balance_points + v_tx.points,
      batch_id = v_batch_id,
      description = 'Delivered Purchase Reward (Return Window Closed)'
    WHERE id = v_tx.id;

    v_count := v_count + 1;
  END LOOP;

  -- Cancel pending rewards for any orders that entered return or cancellation
  UPDATE public.reward_transactions tx
  SET status = 'cancelled',
      description = tx.description || ' (Cancelled: Order returned/cancelled within 24h)'
  FROM public.orders o
  WHERE (o.order_number = tx.reference_id OR o.id::text = tx.reference_id)
    AND tx.type = 'earned_purchase'
    AND tx.status = 'pending'
    AND (
      o.status IN ('cancelled', 'returned')
      OR EXISTS (
        SELECT 1 FROM public.returns r 
        WHERE r.order_id = o.id AND r.status NOT IN ('rejected', 'cancelled')
      )
    );

  RETURN jsonb_build_object('success', true, 'settled_count', v_count);
END;
$$;

-- Procedure 5: Expire Past-Due Points
CREATE OR REPLACE FUNCTION public.expire_past_due_points(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch RECORD;
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_expired_count INTEGER := 0;
BEGIN
  FOR v_batch IN
    SELECT * FROM public.reward_point_batches
    WHERE is_expired = false 
      AND expires_at <= now() 
      AND remaining_points > 0
      AND (p_user_id IS NULL OR user_id = p_user_id)
    FOR UPDATE
  LOOP
    SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE id = v_batch.wallet_id FOR UPDATE;

    -- Mark batch expired
    UPDATE public.reward_point_batches
    SET is_expired = true, remaining_points = 0
    WHERE id = v_batch.id;

    -- Deduct from wallet balance
    UPDATE public.customer_reward_wallets
    SET 
      balance_points = GREATEST(0, balance_points - v_batch.remaining_points),
      lifetime_expired_points = lifetime_expired_points + v_batch.remaining_points,
      updated_at = now()
    WHERE id = v_wallet.id;

    -- Log transaction
    INSERT INTO public.reward_transactions (
      wallet_id, user_id, type, status, points, balance_after,
      reference_id, description, batch_id
    ) VALUES (
      v_wallet.id, v_wallet.user_id, 'expired', 'expired', -v_batch.remaining_points,
      GREATEST(0, v_wallet.balance_points - v_batch.remaining_points),
      v_batch.id::text, 'Point Expiration (Term Elapsed)', v_batch.id
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_batches', v_expired_count);
END;
$$;

-- Procedure 6: Admin Manual Adjustment
CREATE OR REPLACE FUNCTION public.admin_adjust_customer_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_settings public.reward_settings%ROWTYPE;
  v_batch_id UUID;
  v_new_balance INTEGER;
  v_tx_type TEXT;
BEGIN
  IF p_points = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Adjustment points cannot be zero');
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Adjustment reason is required');
  END IF;

  SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer wallet not found');
  END IF;

  SELECT * INTO v_settings FROM public.reward_settings WHERE is_enabled = true LIMIT 1;

  IF p_points < 0 AND v_wallet.balance_points < ABS(p_points) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot debit more points than available balance');
  END IF;

  v_new_balance := v_wallet.balance_points + p_points;
  v_tx_type := CASE WHEN p_points > 0 THEN 'admin_credit' ELSE 'admin_debit' END;

  -- If credit, add a batch
  IF p_points > 0 THEN
    INSERT INTO public.reward_point_batches (
      wallet_id, user_id, original_points, remaining_points, source_type, expires_at
    ) VALUES (
      v_wallet.id, p_user_id, p_points, p_points, 'admin_adjustment',
      now() + (COALESCE(v_settings.point_expiry_months, 12) || ' months')::interval
    ) RETURNING id INTO v_batch_id;

    UPDATE public.customer_reward_wallets
    SET 
      balance_points = v_new_balance,
      lifetime_earned_points = lifetime_earned_points + p_points,
      updated_at = now()
    WHERE id = v_wallet.id;
  ELSE
    -- Debit: deduct using FIFO from active batches
    PERFORM public.redeem_reward_points(p_user_id, 'MANUAL_DEBIT', ABS(p_points));
    -- The procedure already handles ledger and wallet, but let's record the custom admin reason
    UPDATE public.reward_transactions
    SET description = 'Admin Adjustment: ' || p_reason, created_by = p_admin_id, type = 'admin_debit'
    WHERE id = (
      SELECT id FROM public.reward_transactions 
      WHERE user_id = p_user_id AND reference_id = 'MANUAL_DEBIT'
      ORDER BY created_at DESC LIMIT 1
    );

    RETURN jsonb_build_object('success', true, 'new_balance', v_wallet.balance_points + p_points);
  END IF;

  -- Log credit transaction
  INSERT INTO public.reward_transactions (
    wallet_id, user_id, type, status, points, balance_after,
    description, batch_id, created_by
  ) VALUES (
    v_wallet.id, p_user_id, v_tx_type, 'credited', p_points, v_new_balance,
    'Admin Adjustment: ' || p_reason, v_batch_id, p_admin_id
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
