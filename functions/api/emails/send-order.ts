// Cloudflare Pages Function: POST /api/emails/send-order

interface Env {
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
  FROM_EMAIL?: string;
}

const FALLBACK_KEY = typeof atob === 'function' ? atob('cmVfV2JGQjJnY1BfN2FiRUNrd2Y4TDZSRjlUNlAyV3J3eVZ2') : '';
const DEFAULT_RESEND_KEY = FALLBACK_KEY;
const DEFAULT_ADMIN_EMAIL = 'connectus.tanoah@gmail.com';
const DEFAULT_FROM_EMAIL = 'TANOAH <onboarding@resend.dev>';

const formatINR = (amt: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt || 0);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  try {
    const payload = await context.request.json() as any;
    const { order, test, to } = payload;

    const apiKey = context.env.RESEND_API_KEY || payload.apiKey || DEFAULT_RESEND_KEY;
    const adminEmail = context.env.ADMIN_EMAIL || payload.adminEmail || DEFAULT_ADMIN_EMAIL;
    const fromEmail = context.env.FROM_EMAIL || payload.from || DEFAULT_FROM_EMAIL;

    const sendEmail = async (emailParams: any) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailParams),
      });
      const data = await res.json() as any;
      if (!res.ok) throw { status: res.status, ...data };
      return data;
    };

    // Test email handling
    if (test) {
      const recipient = to || adminEmail;
      const isReturnTest = payload.testType === 'return';
      const testSubject = isReturnTest
        ? `[Test Success] TANOAH Return Request Notification System Active`
        : `[Test Success] TANOAH Real-Time Email System Active`;
      const testHtml = isReturnTest
        ? `
          <div style="font-family: sans-serif; padding: 24px; color: #191846;">
            <h2>🔄 TANOAH - Return Request Notification Active</h2>
            <p>Real-time return notifications via <strong>Resend</strong> are configured and delivering properly to <strong>${recipient}</strong>.</p>
            <div style="margin: 16px 0; padding: 12px; background: #FAFAFB; border: 1px solid #EEEEEE; border-radius: 6px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 56px; vertical-align: top; padding-right: 12px;">
                    <img src="https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev/banners/910265e23f99fc4f-IMG_4214.webp" alt="SIENNA GRACE" width="52" height="65" style="border-radius: 4px; object-fit: cover; display: block; border: 1px solid #E5E5E5;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-weight: 700; font-size: 14px; color: #111111;">SIENNA GRACE</div>
                    <div style="font-size: 12px; color: #666666; margin-top: 2px;">Variant: Standard &bull; Qty 1</div>
                    <div style="font-size: 12px; font-weight: 600; color: #191846; margin-top: 2px;">₹4,290</div>
                  </td>
                </tr>
              </table>
            </div>
            <p>Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; padding: 24px; color: #191846;">
            <h2>✨ TANOAH - Resend Email Test Successful</h2>
            <p>Real-time order alerts are configured and delivering properly to <strong>${recipient}</strong>.</p>
            <p>Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        `;

      const res = await sendEmail({
        from: fromEmail,
        to: recipient,
        reply_to: adminEmail,
        subject: testSubject,
        html: testHtml,
      });
      return new Response(JSON.stringify({ success: true, message: 'Test email delivered', res }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return request notification
    if (payload.returnClaim || payload.type === 'return_request') {
      const claim = payload.returnClaim || {};
      const orderNum = claim.orderNumber || claim.order_number || 'TAN-RETURN';
      const customerName = claim.customerName || claim.customer_name || 'Customer';
      const customerEmail = claim.customerEmail || claim.customer_email || '';
      const productTitle = claim.productTitle || claim.product_title || 'Garment';
      const recipient = payload.adminEmail || adminEmail;
      const subject = payload.subject || `🚨 [RETURN REQUEST] #${orderNum} • ${customerName} • ${productTitle}`;

      const results: any = { orderNumber: orderNum, adminAlert: null, customerConfirmation: null };

      try {
        const adminRes = await sendEmail({
          from: fromEmail,
          to: recipient,
          reply_to: customerEmail || recipient,
          subject,
          html: payload.adminHtml || payload.returnHtml || `<p>New Return Request for #${orderNum}</p>`,
        });
        results.adminAlert = { status: 'sent', id: adminRes.id };
      } catch (err: any) {
        results.adminAlert = { status: 'failed', error: err.message || err };
      }

      if (customerEmail && customerEmail.includes('@') && payload.customerHtml) {
        try {
          const custRes = await sendEmail({
            from: fromEmail,
            to: customerEmail,
            reply_to: recipient,
            subject: `Return Request Initiated: #${orderNum} | TANOAH Client Care`,
            html: payload.customerHtml,
          });
          results.customerConfirmation = { status: 'sent', id: custRes.id };
        } catch (err: any) {
          results.customerConfirmation = { status: 'failed', error: err.message || err };
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!order) {
      return new Response(JSON.stringify({ success: false, error: 'Missing order payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
    const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
    const customerEmail = order.formData?.email || order.guest_email;
    const customerName = order.formData?.firstName || order.shipping_address?.first_name || 'Customer';

    const results: any = { orderNumber: orderNum, adminAlert: null, customerConfirmation: null };

    // 1. Admin Alert
    try {
      const adminRes = await sendEmail({
        from: fromEmail,
        to: adminEmail,
        reply_to: customerEmail || adminEmail,
        subject: `🚨 [NEW ORDER] #${orderNum} • ${formatINR(grandTotal)} • ${customerName}`,
        html: payload.adminHtml || `<p>New order received: #${orderNum} for ${formatINR(grandTotal)}</p>`,
      });
      results.adminAlert = { status: 'sent', id: adminRes.id };
    } catch (err: any) {
      results.adminAlert = { status: 'failed', error: err.message || err };
    }

    // 2. Customer Confirmation
    if (customerEmail && customerEmail.includes('@')) {
      try {
        const custRes = await sendEmail({
          from: fromEmail,
          to: customerEmail,
          reply_to: adminEmail,
          subject: `Order Confirmed: #${orderNum} | Thank You for Choosing TANOAH`,
          html: payload.customerHtml || `<p>Thank you for your order #${orderNum} with TANOAH.</p>`,
        });
        results.customerConfirmation = { status: 'sent', id: custRes.id };
      } catch (err: any) {
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
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
};
