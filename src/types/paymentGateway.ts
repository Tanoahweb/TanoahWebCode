// Type Definitions for Payment Gateway Integrations (Razorpay & Cashfree)

export type GatewayEnvironment = 'test' | 'live' | 'sandbox' | 'production';

export interface RazorpaySettings {
  enabled: boolean;
  environment: 'test' | 'live';
  key_id: string;
  key_secret: string;
  webhook_secret?: string;
  site_url?: string;
  account_name?: string;
}

export interface CashfreeSettings {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  app_id: string;
  secret_key: string;
  api_version?: string;
  site_url?: string;
}

export interface CodSettings {
  enabled: boolean;
  extra_fee: number;
  min_order_amount?: number;
  max_order_amount?: number;
}

export interface PaymentGatewaysConfig {
  active_gateway: 'razorpay' | 'cashfree' | 'both';
  razorpay: RazorpaySettings;
  cashfree: CashfreeSettings;
  cod: CodSettings;
  updated_at?: string;
}

// Sanitized config sent to public storefront checkout (Zero secret keys exposed)
export interface PublicPaymentConfig {
  active_gateway: 'razorpay' | 'cashfree' | 'both';
  razorpay: {
    enabled: boolean;
    environment: 'test' | 'live';
    key_id: string;
  };
  cashfree: {
    enabled: boolean;
    environment: 'sandbox' | 'production';
    app_id: string;
    api_version?: string;
  };
  cod: CodSettings;
}

export interface TestConnectionPayload {
  gateway: 'razorpay' | 'cashfree';
  key_id?: string;
  key_secret?: string;
  app_id?: string;
  secret_key?: string;
  environment?: 'test' | 'live' | 'sandbox' | 'production';
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  account_name?: string;
  gateway?: string;
  environment?: string;
  details?: string;
}

export const DEFAULT_PAYMENT_GATEWAYS_CONFIG: PaymentGatewaysConfig = {
  active_gateway: 'both',
  razorpay: {
    enabled: true,
    environment: 'test',
    key_id: '',
    key_secret: '',
    webhook_secret: '',
    site_url: typeof window !== 'undefined' ? window.location.origin : 'https://tanoah.pages.dev',
  },
  cashfree: {
    enabled: false,
    environment: 'sandbox',
    app_id: '',
    secret_key: '',
    api_version: '2023-08-01',
    site_url: typeof window !== 'undefined' ? window.location.origin : 'https://tanoah.pages.dev',
  },
  cod: {
    enabled: true,
    extra_fee: 99,
    min_order_amount: 0,
    max_order_amount: 50000,
  },
};
