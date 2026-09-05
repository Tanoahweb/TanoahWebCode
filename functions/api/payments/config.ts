// Cloudflare Pages Function: GET /api/payments/config
// Returns sanitized public gateway settings for customer checkout
// CRITICAL: Secret keys are NEVER exposed by this endpoint

interface Env {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  RAZORPAY_KEY_ID?: string;
}

const SUPABASE_URL = 'https://udbwhvszzocltandpgoy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYndodnN6em9jbHRhbmRwZ295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTk4MjUsImV4cCI6MjEwMzkzNTgyNX0.3MwB_CqrelAkQZv1pYG-4c059dqMAK8g036QAkprK-E';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const sbUrl = context.env.VITE_SUPABASE_URL || SUPABASE_URL;
    const sbKey = context.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

    let dbConfig: any = null;
    try {
      const res = await fetch(`${sbUrl}/rest/v1/store_settings?select=payment_gateways_config,cod_enabled,cod_fee&limit=1`, {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
        },
      });
      if (res.ok) {
        const rows = (await res.json()) as any[];
        dbConfig = rows?.[0]?.payment_gateways_config;
      }
    } catch (e) {
      console.warn('Could not fetch payment config from Supabase:', e);
    }

    const rzp = dbConfig?.razorpay;
    const cf = dbConfig?.cashfree;
    const cod = dbConfig?.cod;

    // Strict sanitization: Only return public IDs, enabled states, and environments
    const sanitized = {
      active_gateway: dbConfig?.active_gateway || 'both',
      razorpay: {
        enabled: rzp?.enabled !== false,
        environment: rzp?.environment || 'test',
        key_id: rzp?.key_id || context.env.RAZORPAY_KEY_ID || 'rzp_test_simulated_key',
      },
      cashfree: {
        enabled: !!cf?.enabled && !!cf?.app_id,
        environment: cf?.environment || 'sandbox',
        app_id: cf?.app_id || '',
        api_version: cf?.api_version || '2023-08-01',
      },
      cod: {
        enabled: cod?.enabled !== false,
        extra_fee: Number(cod?.extra_fee ?? 99),
        min_order_amount: Number(cod?.min_order_amount ?? 0),
        max_order_amount: Number(cod?.max_order_amount ?? 50000),
      },
    };

    return new Response(JSON.stringify(sanitized), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        active_gateway: 'both',
        razorpay: { enabled: true, environment: 'test', key_id: 'rzp_test_simulated_key' },
        cashfree: { enabled: false, environment: 'sandbox', app_id: '', api_version: '2023-08-01' },
        cod: { enabled: true, extra_fee: 99 },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
};
