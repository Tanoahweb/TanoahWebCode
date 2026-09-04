import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const DEFAULT_ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'connectus.tanoah@gmail.com';
const DEFAULT_FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'TANOAH <onboarding@resend.dev>';

async function sendResend(params: { from: string; to: string | string[]; reply_to?: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { order, adminHtml, customerHtml, test, to } = payload;
    const adminEmail = payload.adminEmail || DEFAULT_ADMIN_EMAIL;
    const fromEmail = payload.from || DEFAULT_FROM_EMAIL;

    // 1. Test Email
    if (test) {
      const recipient = to || adminEmail;
      const res = await sendResend({
        from: fromEmail,
        to: recipient,
        reply_to: adminEmail,
        subject: `[Test Success] TANOAH Real-Time Email System Active`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; background: #F8F8FA; color: #191846;">
            <div style="max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; padding: 28px; border: 1px solid #E5E5E5;">
              <h2 style="margin-top: 0; color: #191846;">✨ TANOAH - Real-Time Alert Active</h2>
              <p>Your automatic order alert system via <strong>Resend</strong> is functioning properly.</p>
              <p><strong>Recipient:</strong> ${recipient}</p>
              <p><strong>Status:</strong> Connected &bull; Ready for live checkout orders</p>
              <p style="font-size: 12px; color: #888888; margin-top: 24px;">Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
          </div>
        `,
      });
      return new Response(JSON.stringify({ success: true, message: 'Test email sent', id: res.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!order) {
      return new Response(JSON.stringify({ success: false, error: 'Order payload required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
    const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
    const customerEmail = order.formData?.email || order.guest_email;
    const customerName = order.formData?.firstName || order.shipping_address?.first_name || 'Customer';

    const results: any = { orderNumber: orderNum, adminAlert: null, customerConfirmation: null };

    // 2. Send Admin Order Alert
    try {
      const aHtml = adminHtml || `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>New Order #${orderNum}</h2>
          <p>Amount: ₹${grandTotal}</p>
          <p>Customer: ${customerName} (${customerEmail})</p>
        </div>
      `;
      const adminRes = await sendResend({
        from: fromEmail,
        to: adminEmail,
        reply_to: customerEmail || adminEmail,
        subject: `🚨 [NEW ORDER] #${orderNum} • ₹${Number(grandTotal).toLocaleString('en-IN')} • ${customerName}`,
        html: aHtml,
      });
      results.adminAlert = { status: 'sent', id: adminRes.id };
    } catch (err: any) {
      console.error('[send-order-email] Admin alert failed:', err);
      results.adminAlert = { status: 'failed', error: err.message || err };
    }

    // 3. Send Customer Order Confirmation (if customer email provided)
    if (customerEmail && customerEmail.includes('@')) {
      try {
        const cHtml = customerHtml || `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Order #${orderNum} Confirmed</h2>
            <p>Thank you for shopping with TANOAH.</p>
          </div>
        `;
        const custRes = await sendResend({
          from: fromEmail,
          to: customerEmail,
          reply_to: adminEmail,
          subject: `Order Confirmed: #${orderNum} | Thank You for Choosing TANOAH`,
          html: cHtml,
        });
        results.customerConfirmation = { status: 'sent', id: custRes.id };
      } catch (err: any) {
        console.warn('[send-order-email] Customer confirmation notice:', err);
        if (err.statusCode === 403 || err.message?.includes('verify a domain')) {
          results.customerConfirmation = {
            status: 'domain_verification_required',
            message: 'Customer email requires custom domain verification at resend.com/domains',
          };
        } else {
          results.customerConfirmation = { status: 'failed', error: err.message || err };
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
