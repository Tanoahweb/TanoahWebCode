// Cloudflare Pages Function: GET /api/orders/[id]/invoice

export const onRequestGet: PagesFunction = async (context) => {
  const orderId = context.params.id as string;

  if (!orderId) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const invoiceNumber = `INV-${orderId.replace(/^TAN-/, '')}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const url = new URL(context.request.url);
  const wantsHtml = url.searchParams.get('format') === 'html' || context.request.headers.get('accept')?.includes('text/html');

  const seller = {
    company_name: 'TANOAH',
    brand: 'TANOAH',
    address: 'Rappal, Pudukkad P O, Thrissur, Kerala 680301, India',
    gstin: '32ESJPD7012L1ZU',
    state: 'Kerala',
    state_code: '32',
    pan: 'ESJPD7012L',
    contact: 'connectus.tanoah@gmail.com | +91 87141 41849',
  };

  const taxSummary = {
    tax_rate: '5% GST Included',
    cgst_rate: '2.5%',
    sgst_rate: '2.5%',
    igst_rate: '5.0%',
    reverse_charge: 'No',
  };

  if (wantsHtml) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: #FAFAFA; color: #111; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #E5E5E5; border-radius: 8px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    .btn-print { background: #191846; color: #fff; padding: 8px 20px; border-radius: 4px; text-decoration: none; font-weight: 600; cursor: pointer; border: none; font-size: 13px; }
    @media print { .no-print { display: none; } body { padding: 0; background: #fff; } .invoice-card { border: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
      <span style="font-weight: 700; color: #191846;">TANOAH &bull; OFFICIAL TAX INVOICE</span>
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
    <table width="100%" style="margin-bottom: 24px; border-bottom: 2px solid #191846; padding-bottom: 16px;">
      <tr>
        <td>
          <h1 style="margin: 0; font-size: 24px; color: #191846; letter-spacing: 2px;">T A N O A H</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #555;">
            ${seller.address}<br>
            <strong>GSTIN:</strong> ${seller.gstin} &bull; <strong>PAN:</strong> ${seller.pan}<br>
            <strong>Email:</strong> ${seller.contact}
          </p>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div style="font-size: 20px; font-weight: 800; color: #191846;">TAX INVOICE</div>
          <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">Invoice: ${invoiceNumber}</div>
          <div style="font-size: 12px; color: #666;">Order: #${orderId}</div>
          <div style="font-size: 12px; color: #666;">Date: ${invoiceDate}</div>
        </td>
      </tr>
    </table>
    <div style="background: #F8F8FA; border: 1px solid #EEE; border-radius: 6px; padding: 16px; font-size: 12px; color: #444; margin-bottom: 24px;">
      <p style="margin: 0 0 6px 0;"><strong>Place of Supply:</strong> Kerala (32) &bull; <strong>Reverse Charge:</strong> No</p>
      <p style="margin: 0;"><strong>Courier Partner:</strong> India Post Speed Post (Insured Consignment)</p>
    </div>
    <div style="font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px;">
      This is a digitally generated Tax Invoice issued in accordance with Section 31 of the CGST Act, 2017.<br>
      No physical signature is required.
    </div>
  </div>
</body>
</html>`;
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(JSON.stringify({
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    order_number: orderId,
    seller,
    tax_summary: taxSummary,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
