// Cloudflare Pages Function: POST /api/payments/test-connection
// Secure server-side credential validator for Razorpay and Cashfree

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as any;
    const { gateway, key_id, key_secret, app_id, secret_key, environment } = body;

    // 1. Test Razorpay
    if (gateway === 'razorpay') {
      const activeKeyId = key_id?.trim();
      const activeKeySecret = key_secret?.trim();

      if (!activeKeyId || !activeKeySecret) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Both Key ID and Key Secret are required to test connection.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Live verification ping against Razorpay API
      const authHeader = btoa(`${activeKeyId}:${activeKeySecret}`);
      const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      });

      if (res.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            gateway: 'Razorpay',
            environment: activeKeyId.startsWith('rzp_live') ? 'Live / Production' : 'Test / Sandbox',
            message: `Connected successfully to Razorpay (${activeKeyId.startsWith('rzp_live') ? 'Live Mode' : 'Test Mode'}). Ready to accept payments!`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const errData = (await res.json().catch(() => ({}))) as any;
      const errorMsg =
        errData?.error?.description ||
        (res.status === 401
          ? 'Invalid Key ID or Key Secret. Please double check credentials from your Razorpay Dashboard.'
          : `Razorpay connection failed with status code ${res.status}`);

      return new Response(
        JSON.stringify({
          success: false,
          gateway: 'Razorpay',
          message: errorMsg,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Test Cashfree
    if (gateway === 'cashfree') {
      const activeAppId = app_id?.trim();
      const activeSecretKey = secret_key?.trim();

      if (!activeAppId || !activeSecretKey) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Both App ID and Secret Key are required to test Cashfree connection.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const isProd = environment === 'production' || activeAppId.length > 30;
      const baseUrl = isProd ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

      // Live verification ping against Cashfree API
      const res = await fetch(`${baseUrl}/pg/orders?limit=1`, {
        headers: {
          'x-client-id': activeAppId,
          'x-client-secret': activeSecretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            gateway: 'Cashfree',
            environment: isProd ? 'Production / Live' : 'Sandbox / Test',
            message: `Connected successfully to Cashfree (${isProd ? 'Production' : 'Sandbox'}). Ready to accept customer payments!`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      const errData = (await res.json().catch(() => ({}))) as any;
      const errorMsg =
        errData?.message ||
        (res.status === 401 || res.status === 403
          ? 'Invalid Cashfree App ID or Secret Key. Please check your credentials from Cashfree Merchant Dashboard.'
          : `Cashfree connection failed with status code ${res.status}`);

      return new Response(
        JSON.stringify({
          success: false,
          gateway: 'Cashfree',
          message: errorMsg,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: `Unsupported gateway: ${gateway}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal connection test failure' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
