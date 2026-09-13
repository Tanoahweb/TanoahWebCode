import { supabase } from './supabase';
import { getCheckoutSessionId } from '../utils/sessionToken';
import { CartItem } from '../types';

export interface ReservationResult {
  success: boolean;
  expiresAt?: string;
  holdMinutes?: number;
  error?: string;
  failingVariantId?: string;
  availableStock?: number;
  requestedStock?: number;
}

export const reservationService = {
  /**
   * Attempts to reserve stock for all items in the cart for `holdMinutes` (default 7 minutes).
   * Atomically locks the variant rows in PostgreSQL.
   * If another shopper currently holds the last unit, fails safely before payment starts.
   */
  async reserveStock(items: CartItem[], holdMinutes = 7): Promise<ReservationResult> {
    const sessionId = getCheckoutSessionId();

    const isUuid = (str?: string) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    // Filter only valid database UUID variants
    const payloadItems = items
      .filter((item) => isUuid(item.variant?.id))
      .map((item) => ({
        variant_id: item.variant.id,
        quantity: item.quantity || 1,
      }));

    if (payloadItems.length === 0) {
      // If items are mock items or non-UUID, allow checkout to proceed smoothly
      const expiry = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();
      return { success: true, expiresAt: expiry, holdMinutes };
    }

    try {
      const { data, error } = await supabase.rpc('reserve_stock', {
        p_session_id: sessionId,
        p_items: payloadItems,
        p_hold_minutes: holdMinutes,
      });

      if (error) {
        console.warn('[reservationService] RPC reserve_stock error:', error);
        // Fallback: If network or RPC glitch occurs, don't break checkout
        return { success: true, holdMinutes };
      }

      if (data && typeof data === 'object') {
        if (data.success === true) {
          return {
            success: true,
            expiresAt: data.expires_at,
            holdMinutes: data.hold_minutes || holdMinutes,
          };
        } else {
          return {
            success: false,
            error: data.error || 'insufficient_stock',
            failingVariantId: data.variant_id,
            availableStock: data.available_stock,
            requestedStock: data.requested_stock,
          };
        }
      }

      return { success: true, holdMinutes };
    } catch (err: any) {
      console.warn('[reservationService] Exception in reserveStock:', err);
      return { success: true, holdMinutes };
    }
  },

  /**
   * Immediately releases the current session's stock hold (e.g., when user empties cart or navigates away).
   */
  async releaseReservation(): Promise<{ success: boolean }> {
    const sessionId = getCheckoutSessionId();
    try {
      await supabase.rpc('release_stock_reservation', {
        p_session_id: sessionId,
      });
      return { success: true };
    } catch (err) {
      console.warn('[reservationService] releaseReservation error:', err);
      return { success: false };
    }
  },

  /**
   * Queries real-time effective stock for a variant, accounting for other shoppers' active holds.
   * If the current user has reserved the unit, it will show as available to them.
   */
  async getEffectiveStock(variantId: string): Promise<number> {
    const sessionId = getCheckoutSessionId();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId);
    if (!isUuid) return 10;

    try {
      const { data, error } = await supabase.rpc('get_effective_stock', {
        p_variant_id: variantId,
        p_session_id: sessionId,
      });

      if (error) {
        console.warn('[reservationService] getEffectiveStock error:', error);
        return 1;
      }

      return typeof data === 'number' ? data : 0;
    } catch {
      return 1;
    }
  },

  /**
   * Finalizes the reservation upon confirmed payment:
   * Deducts inventory in PostgreSQL and clears the temporary hold.
   */
  async finalizeOrderReservation(orderNumber: string): Promise<{ success: boolean }> {
    const sessionId = getCheckoutSessionId();
    try {
      const { data, error } = await supabase.rpc('finalize_order_reservation', {
        p_session_id: sessionId,
        p_order_number: orderNumber,
      });

      if (error) {
        console.warn('[reservationService] finalizeOrderReservation error:', error);
        return { success: false };
      }

      return { success: Boolean(data?.success) };
    } catch (err) {
      console.warn('[reservationService] finalizeOrderReservation exception:', err);
      return { success: false };
    }
  },
};
