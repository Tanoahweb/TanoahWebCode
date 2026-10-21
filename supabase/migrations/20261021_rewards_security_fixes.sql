-- =================================================================
-- REWARDS SYSTEM SECURITY & INTEGRITY HARDENING MIGRATION
-- Date: 2026-10-21
-- Fixes:
--   1. RLS over-permissioning (USING true on wallets/batches/tx/settings)
--   2. Privilege escalation in admin_adjust_customer_points
--   3. Infinite points loop in rollback_redeemed_points
--   4. IDOR in redeem_reward_points
-- =================================================================

-- 1. Helper function: verify admin status from service_role, app_metadata, or public.admin_users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    -- Check if service_role (used by Supabase internal / Edge Functions / backend admin)
    (auth.jwt() ->> 'role') = 'service_role'
    -- Check JWT app_metadata for admin claim
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    -- Check public.admin_users table for active admin matching auth.uid() or email
    OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE (
        (auth.uid() IS NOT NULL AND au.user_id = auth.uid())
        OR (auth.jwt() ->> 'email' IS NOT NULL AND LOWER(au.email) = LOWER(auth.jwt() ->> 'email'))
      )
      AND au.is_active = true
    ),
    false
  );
$$;

-- 2. Explicitly ensure RLS is active on all reward tables
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_point_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_reward_rates ENABLE ROW LEVEL SECURITY;

-- 3. Alter policies to strict admin checks
ALTER POLICY "Admin Full Access Settings" ON public.reward_settings 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER POLICY "Admin Full Access Wallets" ON public.customer_reward_wallets 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER POLICY "Admin Full Access Batches" ON public.reward_point_batches 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER POLICY "Admin Full Access Transactions" ON public.reward_transactions 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER POLICY "Admin Full Access Rates" ON public.product_category_reward_rates 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Customers can insert their own initial wallet with 0 balance if it does not yet exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_reward_wallets' 
      AND policyname = 'Users Insert Own Initial Wallet'
  ) THEN
    CREATE POLICY "Users Insert Own Initial Wallet" ON public.customer_reward_wallets FOR INSERT 
      WITH CHECK (
        auth.uid() = user_id 
        AND balance_points = 0 
        AND pending_points = 0 
        AND lifetime_earned_points = 0
      );
  END IF;
END $$;

-- 4. Harden admin_adjust_customer_points against privilege escalation
CREATE OR REPLACE FUNCTION public.admin_adjust_customer_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_settings public.reward_settings%ROWTYPE;
  v_batch_id UUID;
  v_new_balance INTEGER;
  v_tx_type TEXT;
  v_actual_admin UUID;
BEGIN
  -- Strict Admin Authorization Check
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin privileges required');
  END IF;

  v_actual_admin := COALESCE(auth.uid(), p_admin_id);

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
    UPDATE public.reward_transactions
    SET description = 'Admin Adjustment: ' || p_reason, created_by = v_actual_admin, type = 'admin_debit'
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
    'Admin Adjustment: ' || p_reason, v_batch_id, v_actual_admin
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- 5. Fix IDOR in redeem_reward_points
CREATE OR REPLACE FUNCTION public.redeem_reward_points(
  p_user_id UUID,
  p_order_id TEXT,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_batch RECORD;
  v_points_needed INTEGER := p_points;
  v_deduct INTEGER;
BEGIN
  -- Prevent IDOR: caller must be user or admin
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Access Denied: You cannot redeem points from another customer account');
  END IF;

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

-- 6. Fix infinite loop in rollback_redeemed_points
CREATE OR REPLACE FUNCTION public.rollback_redeemed_points(
  p_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tx public.reward_transactions%ROWTYPE;
  v_wallet public.customer_reward_wallets%ROWTYPE;
  v_points INTEGER;
  v_settings public.reward_settings%ROWTYPE;
BEGIN
  -- 1. Find and lock active redemption transaction
  SELECT * INTO v_tx FROM public.reward_transactions 
  WHERE reference_id = p_order_id AND type = 'redeemed_checkout' AND status = 'redeemed' 
  FOR UPDATE LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active redemption found to rollback');
  END IF;

  -- 2. Authorization check: must be owner of redemption or admin
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_tx.user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Access Denied: You cannot rollback points for another customer');
  END IF;

  v_points := ABS(v_tx.points);
  SELECT * INTO v_wallet FROM public.customer_reward_wallets WHERE id = v_tx.wallet_id FOR UPDATE;
  SELECT * INTO v_settings FROM public.reward_settings WHERE is_enabled = true LIMIT 1;

  -- 3. CRITICAL FIX: Mark original transaction as cancelled so it cannot be rolled back again
  UPDATE public.reward_transactions
  SET status = 'cancelled', description = description || ' (Reversed/Restored)'
  WHERE id = v_tx.id;

  -- 4. Restore wallet balance
  UPDATE public.customer_reward_wallets
  SET 
    balance_points = balance_points + v_points,
    lifetime_redeemed_points = GREATEST(0, lifetime_redeemed_points - v_points),
    updated_at = now()
  WHERE id = v_wallet.id;

  -- 5. Restore point batch with fresh expiry
  INSERT INTO public.reward_point_batches (
    wallet_id, user_id, original_points, remaining_points, source_type, source_reference_id, expires_at
  ) VALUES (
    v_wallet.id, v_wallet.user_id, v_points, v_points, 'admin_adjustment', p_order_id,
    now() + (COALESCE(v_settings.point_expiry_months, 12) || ' months')::interval
  );

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
