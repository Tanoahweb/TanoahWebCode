// Cloudflare Pages Function: POST /api/payments/create-order

interface Env {
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as any;
    const { grand_total, currency = 'INR', receipt } = body;

    if (!grand_total || grand_total <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid order amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const keyId = context.env.RAZORPAY_KEY_ID;
    const keySecret = context.env.RAZORPAY_KEY_SECRET;

    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(grand_total * 100);

    // If live/sandbox Razorpay keys are configured in Cloudflare Environment:
    if (keyId && keySecret) {
      const basicAuth = btoa(`${keyId}:${keySecret}`);
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
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

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        return new Response(JSON.stringify({ error: 'Razorpay order creation failed', details: rzpData }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        order_id: (rzpData as any).id,
        amount: amountInPaise,
        currency,
        key_id: keyId,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sandbox / Simulation Mode when credentials are not yet entered
    const simulatedOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return new Response(JSON.stringify({
      order_id: simulatedOrderId,
      amount: amountInPaise,
      currency,
      key_id: 'rzp_test_simulated_key',
      mode: 'simulation',
      message: 'Razorpay simulated order created. Add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET for production gateway.',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
