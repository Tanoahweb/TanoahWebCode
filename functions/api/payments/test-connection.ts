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

      // Determine target environment:
      // If appId explicitly starts with 'test' / 'TEST', it is sandbox.
      // Otherwise honor the environment selection ('production' vs 'sandbox').
      const isExplicitSandbox = environment === 'sandbox' || activeAppId.toLowerCase().startsWith('test');
      const targetEnv = isExplicitSandbox ? 'sandbox' : 'production';
      const targetBaseUrl = targetEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';

      // Robust probe function against Cashfree PG API
      const probeCashfree = async (baseUrl: string) => {
        try {
          // 1. Check payment methods eligibility (official Cashfree endpoint)
          const eligRes = await fetch(`${baseUrl}/pg/eligibility/payment_methods`, {
            method: 'POST',
            headers: {
              'x-client-id': activeAppId,
              'x-client-secret': activeSecretKey,
              'x-api-version': '2023-08-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ queries: { amount: 100 } }),
          });

          if (eligRes.ok) {
            return { verified: true, status: 200 };
          }

          const eligData = (await eligRes.json().catch(() => ({}))) as any;

          // If explicit auth error, credentials failed for this endpoint
          if (eligRes.status === 401 || eligData?.type === 'authentication_error') {
            return {
              verified: false,
              status: 401,
              error: eligData?.message || 'Authentication failed. Invalid App ID or Secret Key.',
            };
          }

          // 2. Secondary check: Query an order probe
          const probeId = `probe_check_${Date.now()}`;
          const orderRes = await fetch(`${baseUrl}/pg/orders/${probeId}`, {
            method: 'GET',
            headers: {
              'x-client-id': activeAppId,
              'x-client-secret': activeSecretKey,
              'x-api-version': '2023-08-01',
              'Content-Type': 'application/json',
            },
          });

          if (orderRes.ok) {
            return { verified: true, status: 200 };
          }

          const orderData = (await orderRes.json().catch(() => ({}))) as any;
          if (orderRes.status === 401 || orderData?.type === 'authentication_error') {
            return {
              verified: false,
              status: 401,
              error: orderData?.message || 'Authentication failed. Invalid App ID or Secret Key.',
            };
          }

          // In Cashfree PG API, a non-existent order probe returning 404 with order_not_found proves credentials were fully authenticated
          if (
            orderRes.status === 404 &&
            (orderData?.code === 'order_not_found' ||
              orderData?.message?.toLowerCase().includes('order') ||
              orderData?.type === 'invalid_request_error')
          ) {
            return { verified: true, status: 200 };
          }

          return {
            verified: false,
            status: orderRes.status,
            error: orderData?.message || eligData?.message || `Cashfree returned status code ${orderRes.status}`,
          };
        } catch (e: any) {
          return { verified: false, status: 500, error: e.message || 'Connection error' };
        }
      };

      const primaryCheck = await probeCashfree(targetBaseUrl);

      if (primaryCheck.verified) {
        return new Response(
          JSON.stringify({
            success: true,
            gateway: 'Cashfree',
            environment: targetEnv === 'production' ? 'Production / Live' : 'Sandbox / Test',
            message: `Connected successfully to Cashfree (${targetEnv === 'production' ? 'Production Mode' : 'Sandbox Mode'}). Ready to accept customer payments!`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if credentials belong to the other environment (Sandbox vs Live) to give actionable feedback
      const altEnv = targetEnv === 'production' ? 'sandbox' : 'production';
      const altBaseUrl = altEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
      const altCheck = await probeCashfree(altBaseUrl);

      if (altCheck.verified) {
        return new Response(
          JSON.stringify({
            success: false,
            gateway: 'Cashfree',
            message: `Authentication succeeded for Cashfree ${altEnv === 'production' ? 'Production (Live)' : 'Sandbox (Test)'}, but you currently have "${targetEnv === 'production' ? 'Production' : 'Sandbox'}" selected. Please switch the Environment toggle above to "${altEnv === 'production' ? 'Production (Live)' : 'Sandbox (Test)'}" and test again.`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const cleanErrorMsg =
        primaryCheck.status === 401
          ? 'Invalid Cashfree App ID or Secret Key for this environment. Please check your credentials from the Cashfree Merchant Dashboard.'
          : (primaryCheck.error || 'Cashfree connection failed');

      return new Response(
        JSON.stringify({
          success: false,
          gateway: 'Cashfree',
          message: cleanErrorMsg,
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
