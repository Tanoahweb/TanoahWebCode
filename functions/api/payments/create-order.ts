// Cloudflare Pages Function: POST /api/payments/create-order
// Secure server-side order generation for Razorpay and Cashfree

interface Env {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  CASHFREE_APP_ID?: string;
  CASHFREE_SECRET_KEY?: string;
}

const SUPABASE_URL = 'https://udbwhvszzocltandpgoy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYndodnN6em9jbHRhbmRwZ295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTk4MjUsImV4cCI6MjEwMzkzNTgyNX0.3MwB_CqrelAkQZv1pYG-4c059dqMAK8g036QAkprK-E';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as any;
    const {
      grand_total,
      currency = 'INR',
      receipt,
      gateway = 'razorpay',
      customer_name,
      customer_email,
      customer_phone,
    } = body;

    if (!grand_total || grand_total <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid order amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Read configured credentials from Supabase store_settings
    const sbUrl = context.env.VITE_SUPABASE_URL || SUPABASE_URL;
    const sbKey = context.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

    let dbConfig: any = null;
    try {
      const res = await fetch(`${sbUrl}/rest/v1/store_settings?select=payment_gateways_config&limit=1`, {
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
      console.warn('Could not read payment credentials from Supabase:', e);
    }

    // ----------------------------------------------------
    // 1. CASHFREE ORDER CREATION
    // ----------------------------------------------------
    if (gateway === 'cashfree') {
      const cfConfig = dbConfig?.cashfree;
      const appId = cfConfig?.app_id || context.env.CASHFREE_APP_ID;
      const secretKey = cfConfig?.secret_key || context.env.CASHFREE_SECRET_KEY;
      const environment = cfConfig?.environment || 'sandbox';
      const apiVersion = cfConfig?.api_version || '2023-08-01';

      if (appId && secretKey) {
        const isProd = environment === 'production' || appId.length > 30;
        const baseUrl = isProd ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

        const cleanPhone = (customer_phone || '').replace(/[^0-9]/g, '').slice(-10) || '9876543210';
        const cfOrderId = receipt || `TAN_${Date.now()}`;

        const cfRes = await fetch(`${baseUrl}/pg/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': apiVersion,
          },
          body: JSON.stringify({
            order_id: cfOrderId,
            order_amount: Number(grand_total),
            order_currency: currency,
            customer_details: {
              customer_id: `cust_${cleanPhone}`,
              customer_name: customer_name || 'TANOAH Customer',
              customer_email: customer_email || 'concierge@tanoah.com',
              customer_phone: cleanPhone,
            },
            order_meta: {
              return_url: `${cfConfig?.site_url || 'https://tanoah.pages.dev'}/order-confirmation?order_id={order_id}`,
              notify_url: `${cfConfig?.site_url || 'https://tanoah.pages.dev'}/api/payments/webhook`,
            },
          }),
        });

        const cfData = (await cfRes.json()) as any;
        if (!cfRes.ok) {
          return new Response(
            JSON.stringify({ error: 'Cashfree order creation failed', details: cfData }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            gateway: 'cashfree',
            order_id: cfData.order_id,
            payment_session_id: cfData.payment_session_id,
            environment: isProd ? 'production' : 'sandbox',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Simulated / Sandbox fallback
      const simulatedCfId = `cf_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return new Response(
        JSON.stringify({
          gateway: 'cashfree',
          order_id: simulatedCfId,
          payment_session_id: `session_sim_${Date.now()}`,
          environment: 'sandbox',
          mode: 'simulation',
          message: 'Cashfree test order created. Add App ID & Secret Key in Admin for live gateway.',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ----------------------------------------------------
    // 2. RAZORPAY ORDER CREATION (Default)
    // ----------------------------------------------------
    const rzpConfig = dbConfig?.razorpay;
    const keyId = rzpConfig?.key_id || context.env.RAZORPAY_KEY_ID;
    const keySecret = rzpConfig?.key_secret || context.env.RAZORPAY_KEY_SECRET;

    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(grand_total * 100);

    if (keyId && keySecret) {
      const basicAuth = btoa(`${keyId}:${keySecret}`);
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: receipt || `rec_${Date.now()}`,
          notes: {
            brand: 'TANOAH',
          },
        }),
      });

      const rzpData = (await rzpRes.json()) as any;
      if (!rzpRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Razorpay order creation failed', details: rzpData }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          gateway: 'razorpay',
          order_id: rzpData.id,
          amount: amountInPaise,
          currency,
          key_id: keyId,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sandbox / Simulation Mode when credentials are not yet entered
    const simulatedOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return new Response(
      JSON.stringify({
        gateway: 'razorpay',
        order_id: simulatedOrderId,
        amount: amountInPaise,
        currency,
        key_id: 'rzp_test_simulated_key',
        mode: 'simulation',
        message: 'Razorpay simulated order created. Add Key ID & Key Secret in Admin for production gateway.',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
