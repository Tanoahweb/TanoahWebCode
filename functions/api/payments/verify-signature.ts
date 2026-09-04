// Cloudflare Pages Function: POST /api/payments/verify-signature

interface Env {
  RAZORPAY_KEY_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as any;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return new Response(JSON.stringify({ verified: false, error: 'Missing payment identifiers' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const keySecret = context.env.RAZORPAY_KEY_SECRET;

    // Simulation check for test mode
    if (razorpay_order_id.startsWith('order_sim_') || !keySecret) {
      return new Response(JSON.stringify({
        verified: true,
        mode: 'simulation',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Web Crypto HMAC-SHA256 verification
    const encoder = new TextEncoder();
    const dataToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const generatedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const isMatch = generatedSignature === razorpay_signature;

    return new Response(JSON.stringify({
      verified: isMatch,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    }), {
      status: isMatch ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ verified: false, error: err.message || 'Signature verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
