import { supabase } from './supabase';
import {
  PaymentGatewaysConfig,
  PublicPaymentConfig,
  TestConnectionPayload,
  TestConnectionResult,
  DEFAULT_PAYMENT_GATEWAYS_CONFIG,
} from '../types/paymentGateway';

export const paymentService = {
  // 1. Fetch public sanitized gateway options for customer checkout (No secrets)
  async getPublicPaymentConfig(): Promise<PublicPaymentConfig> {
    try {
      const res = await fetch('/api/payments/config');
      if (res.ok) {
        return (await res.json()) as PublicPaymentConfig;
      }
    } catch (e) {
      console.warn('Could not fetch /api/payments/config, checking Supabase directly:', e);
    }

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('payment_gateways_config, cod_enabled, cod_fee')
        .limit(1)
        .single();

      if (!error && data?.payment_gateways_config) {
        const cfg = data.payment_gateways_config as PaymentGatewaysConfig;
        return {
          active_gateway: cfg.active_gateway || 'both',
          razorpay: {
            enabled: cfg.razorpay?.enabled !== false,
            environment: cfg.razorpay?.environment || 'test',
            key_id: cfg.razorpay?.key_id || 'rzp_test_simulated_key',
          },
          cashfree: {
            enabled: !!cfg.cashfree?.enabled && !!cfg.cashfree?.app_id,
            environment: cfg.cashfree?.environment || 'sandbox',
            app_id: cfg.cashfree?.app_id || '',
            api_version: cfg.cashfree?.api_version || '2023-08-01',
          },
          cod: {
            enabled: cfg.cod?.enabled !== false,
            extra_fee: cfg.cod?.extra_fee ?? 99,
            min_order_amount: cfg.cod?.min_order_amount ?? 0,
            max_order_amount: cfg.cod?.max_order_amount ?? 50000,
          },
        };
      }
    } catch (err) {
      console.warn('Fallback public payment config:', err);
    }

    return {
      active_gateway: 'both',
      razorpay: { enabled: true, environment: 'test', key_id: 'rzp_test_simulated_key' },
      cashfree: { enabled: false, environment: 'sandbox', app_id: '', api_version: '2023-08-01' },
      cod: { enabled: true, extra_fee: 99 },
    };
  },

  // 2. Fetch complete configuration for Admin Panel
  async getAdminPaymentGatewaysConfig(): Promise<PaymentGatewaysConfig> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('payment_gateways_config')
        .limit(1)
        .single();

      if (!error && data?.payment_gateways_config && Object.keys(data.payment_gateways_config).length > 0) {
        return {
          ...DEFAULT_PAYMENT_GATEWAYS_CONFIG,
          ...data.payment_gateways_config,
          razorpay: {
            ...DEFAULT_PAYMENT_GATEWAYS_CONFIG.razorpay,
            ...(data.payment_gateways_config.razorpay || {}),
          },
          cashfree: {
            ...DEFAULT_PAYMENT_GATEWAYS_CONFIG.cashfree,
            ...(data.payment_gateways_config.cashfree || {}),
          },
          cod: {
            ...DEFAULT_PAYMENT_GATEWAYS_CONFIG.cod,
            ...(data.payment_gateways_config.cod || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to fetch payment gateways config from Supabase:', e);
    }
    return DEFAULT_PAYMENT_GATEWAYS_CONFIG;
  },

  // 3. Save configuration from Admin Panel directly to Supabase
  async saveAdminPaymentGatewaysConfig(config: PaymentGatewaysConfig): Promise<boolean> {
    try {
      const payload: PaymentGatewaysConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase.from('store_settings').select('id').limit(1).single();
      if (existing?.id) {
        const { error } = await supabase
          .from('store_settings')
          .update({
            payment_gateways_config: payload,
            cod_enabled: payload.cod.enabled,
            cod_fee: payload.cod.extra_fee,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Failed to update payment gateways config:', error);
          return false;
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tanoah_payment_config_updated', { detail: payload }));
      }
      return true;
    } catch (err) {
      console.error('Error saving payment gateways config:', err);
      return false;
    }
  },

  // 4. Test live credentials with Razorpay or Cashfree
  async testConnection(payload: TestConnectionPayload): Promise<TestConnectionResult> {
    try {
      const res = await fetch('/api/payments/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return (await res.json()) as TestConnectionResult;
      }

      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.message || `Server returned error status ${res.status}`,
      };
    } catch (e: any) {
      // Local fallback simulation if offline or dev server without Cloudflare Pages Functions
      if (payload.gateway === 'razorpay' && payload.key_id?.startsWith('rzp_')) {
        return {
          success: true,
          gateway: 'Razorpay',
          environment: payload.key_id.startsWith('rzp_live') ? 'Live / Production' : 'Test / Sandbox',
          message: 'Local format verification passed. Razorpay credentials look valid!',
        };
      }
      if (payload.gateway === 'cashfree' && (payload.app_id?.length || 0) > 8) {
        return {
          success: true,
          gateway: 'Cashfree',
          environment: payload.environment === 'production' ? 'Production' : 'Sandbox',
          message: 'Local format verification passed. Cashfree credentials look valid!',
        };
      }
      return {
        success: false,
        message: e.message || 'Could not reach connection test endpoint.',
      };
    }
  },

  // 5. Create Order via serverless edge
  async createPaymentOrder(params: {
    grand_total: number;
    currency?: string;
    receipt?: string;
    gateway?: 'razorpay' | 'cashfree';
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
  }): Promise<any> {
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.details?.error?.description || 'Payment order creation failed');
    }

    return await res.json();
  },

  // 6. Verify signature / payment status on serverless edge
  async verifyPayment(params: {
    gateway?: 'razorpay' | 'cashfree';
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    cashfree_order_id?: string;
  }): Promise<{ verified: boolean; error?: string; payment_id?: string }> {
    const res = await fetch('/api/payments/verify-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    return await res.json();
  },
};
