// Cloudflare Pages Function: POST /api/emails/send-order

interface Env {
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
  FROM_EMAIL?: string;
}

const FALLBACK_KEY = typeof atob === 'function' ? atob('cmVfV2JGQjJnY1BfN2FiRUNrd2Y4TDZSRjlUNlAyV3J3eVZ2') : '';
const DEFAULT_RESEND_KEY = FALLBACK_KEY;
const DEFAULT_ADMIN_EMAIL = 'connectus.tanoah@gmail.com';
const DEFAULT_FROM_EMAIL = 'TANOAH <noreply@tanoah.com>';

const formatINR = (amt: number = 0): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt || 0);
};

const R2_PUBLIC_BASE = 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev';
const FALLBACK_PRODUCT_IMAGE = `${R2_PUBLIC_BASE}/assets/placeholder-product.png`;

function resolveEmailImageUrl(rawUrl?: any): string {
  if (!rawUrl) return FALLBACK_PRODUCT_IMAGE;

  let urlStr = '';
  if (typeof rawUrl === 'string') {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          urlStr = typeof parsed[0] === 'string' ? parsed[0] : (parsed[0]?.url || parsed[0]?.image_url || parsed[0]?.src || '');
        } else if (typeof parsed === 'object' && parsed !== null) {
          urlStr = parsed.url || parsed.image_url || parsed.src || '';
        } else {
          urlStr = trimmed;
        }
      } catch {
        urlStr = trimmed;
      }
    } else {
      urlStr = trimmed;
    }
  } else if (Array.isArray(rawUrl) && rawUrl.length > 0) {
    urlStr = typeof rawUrl[0] === 'string' ? rawUrl[0] : (rawUrl[0]?.url || rawUrl[0]?.image_url || rawUrl[0]?.src || '');
  } else if (typeof rawUrl === 'object' && rawUrl !== null) {
    urlStr = rawUrl.url || rawUrl.image_url || rawUrl.src || '';
  }

  const trimmed = (urlStr || '').trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.toLowerCase().endsWith('.svg') || trimmed.toLowerCase().includes('.svg')) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    const lower = trimmed.toLowerCase();
    if (lower.includes('placeholder-product')) return FALLBACK_PRODUCT_IMAGE;
    if (lower.includes('hero-landscape')) return `${R2_PUBLIC_BASE}/assets/hero-landscape.jpg`;
    if (lower.includes('hero-mobile')) return `${R2_PUBLIC_BASE}/assets/hero-mobile.jpg`;
    return `${R2_PUBLIC_BASE}${trimmed.replace(/^\/Assets\//i, '/assets/')}`;
  }

  return `${R2_PUBLIC_BASE}/assets/${trimmed}`;
}

const STATE_CODES: Record<string, string> = {
  'kerala': '32',
  'tamil nadu': '33',
  'karnataka': '29',
  'andhra pradesh': '37',
  'telangana': '36',
  'maharashtra': '27',
  'delhi': '07',
  'gujarat': '24',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'west bengal': '19',
  'punjab': '03',
  'haryana': '06',
  'madhya pradesh': '23',
  'bihar': '10',
  'odisha': '21',
  'assam': '18',
  'goa': '30',
  'chhattisgarh': '22',
  'jharkhand': '20',
  'uttarakhand': '05',
  'himachal pradesh': '02',
  'jammu and kashmir': '01',
  'puducherry': '34',
  'chandigarh': '04',
};

function getStateCode(stateName?: string): string {
  if (!stateName) return '32';
  const clean = stateName.toLowerCase().trim();
  if (STATE_CODES[clean]) return STATE_CODES[clean];
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (clean.includes(name) || name.includes(clean)) return code;
  }
  return '32';
}

function numberToWordsINR(amount: number = 0): string {
  const rounded = Math.round(amount);
  if (rounded <= 0) return 'Rupees Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertChunk = (num: number): string => {
    let str = '';
    if (num >= 100) {
      str += `${units[Math.floor(num / 100)]} Hundred `;
      num %= 100;
    }
    if (num >= 20) {
      str += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 0) {
      str += `${units[num]} `;
    }
    return str.trim();
  };

  const crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  const hundred = remainder;

  let words = '';
  if (crore > 0) words += `${convertChunk(crore)} Crore `;
  if (lakh > 0) words += `${convertChunk(lakh)} Lakh `;
  if (thousand > 0) words += `${convertChunk(thousand)} Thousand `;
  if (hundred > 0) words += `${convertChunk(hundred)} `;

  return `Rupees ${words.trim()} Only`;
}

const SELLER_DETAILS = {
  name: 'TANOAH',
  legalName: 'TANOAH',
  addressLine1: 'Rappal, Pudukkad P O',
  city: 'Thrissur',
  state: 'Kerala',
  postalCode: '680301',
  country: 'India',
  gstin: '32ESJPD7012L1ZU',
  pan: 'ESJPD7012L',
  stateCode: '32',
  email: 'connectus.tanoah@gmail.com',
  phone: '+91 87141 41849',
};

function generateGstTaxInvoiceHtml(order: any): string {
  const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
  const invoiceNum = `INV-${String(orderNum).replace(/^TAN-/, '')}`;
  const orderDate = order.date ? new Date(order.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) : new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const address = order.shipping_address || order.formData || {};
  const customerName = (
    (order.formData?.firstName ? `${order.formData.firstName} ${order.formData.lastName || ''}`.trim() : '') ||
    (order.shipping_address?.first_name ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ''}`.trim() : '') ||
    order.customer_name ||
    order.customerName ||
    'Valued Patron'
  );

  const customerEmail = order.formData?.email || order.guest_email || order.customer_email || 'N/A';
  const customerPhone = order.formData?.phone || order.guest_phone || order.customer_phone || 'N/A';
  const customerState = address.state || 'Kerala';
  const stateCode = getStateCode(customerState);
  const isIntraState = stateCode === '32';

  const items = order.items || [];
  const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? order.discount_total ?? 0;
  const shipping = order.shipping ?? order.shipping_total ?? 0;
  const paymentMethod = (order.payment_method || order.formData?.paymentMethod || 'Online').toUpperCase();
  const paymentRef = order.payment_gateway_ref || order.paymentGatewayRef || 'N/A';

  const taxRate = 0.05;
  const taxableSubtotal = Math.round(subtotal / (1 + taxRate));
  const totalGst = subtotal - taxableSubtotal;
  const cgst = isIntraState ? Math.round(totalGst / 2) : 0;
  const sgst = isIntraState ? (totalGst - cgst) : 0;
  const igst = isIntraState ? 0 : totalGst;

  const invoiceItemsRows = items.map((item: any, idx: number) => {
    const title = item.product_title || item.product?.title || 'Garment';
    const variant = item.variant_title || (item.variant ? `${item.variant.color_name || ''} / ${item.variant.size || ''}` : '');
    const sku = item.sku || item.variant?.sku || 'TAN-SKU';
    const qty = item.quantity || 1;
    const grossPrice = item.unit_price ?? item.variant?.sale_price ?? item.variant?.price ?? 0;
    const lineGross = item.line_total ?? (grossPrice * qty);
    const lineTaxable = Math.round(lineGross / (1 + taxRate));
    const lineTax = lineGross - lineTaxable;
    const hsn = '6204';

    return `
      <tr style="border-bottom: 1px solid #E5E5E5; font-size: 11px;">
        <td style="padding: 10px 8px; text-align: center; color: #555555;">${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 600; color: #111111;">${title}</div>
          ${variant ? `<div style="font-size: 10px; color: #666666; margin-top: 2px;">Spec: ${variant}</div>` : ''}
          <div style="font-size: 10px; color: #888888; margin-top: 1px;">SKU: ${sku}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-family: monospace; color: #444444;">${hsn}</td>
        <td style="padding: 10px 8px; text-align: center; color: #111111;">${qty}</td>
        <td style="padding: 10px 8px; text-align: right; color: #444444;">${formatINR(grossPrice)}</td>
        <td style="padding: 10px 8px; text-align: right; color: #444444;">${formatINR(lineTaxable)}</td>
        <td style="padding: 10px 8px; text-align: center; color: #555555;">${isIntraState ? '2.5% + 2.5%' : '5%'}</td>
        <td style="padding: 10px 8px; text-align: right; color: #444444;">${formatINR(lineTax)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: #111111;">${formatINR(lineGross)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; border: 1.5px solid #191846; border-radius: 6px; background-color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden;">
      <tr>
        <td style="background-color: #191846; padding: 18px 24px; border-bottom: 2px solid #D4AF37;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <div style="color: #D4AF37; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">
                  ORIGINAL FOR RECIPIENT &bull; GST COMPLIANT
                </div>
                <div style="color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; margin-top: 3px;">
                  TAX INVOICE
                </div>
              </td>
              <td style="text-align: right; color: #FFFFFF;">
                <div style="font-size: 13px; font-weight: 700;">Invoice No: ${invoiceNum}</div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 2px;">Date: ${orderDate}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 18px 24px; background-color: #FAFAFB; border-bottom: 1px solid #E5E5E5;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 16px; border-right: 1px solid #E5E5E5;">
                <div style="font-size: 10px; font-weight: 700; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                  SOLD BY / SELLER DETAILS
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #191846;">${SELLER_DETAILS.name}</div>
                <div style="font-size: 11px; color: #444444; line-height: 1.5; margin-top: 3px;">
                  ${SELLER_DETAILS.addressLine1}<br/>
                  ${SELLER_DETAILS.city}, ${SELLER_DETAILS.state} - ${SELLER_DETAILS.postalCode}<br/>
                  <strong>GSTIN:</strong> ${SELLER_DETAILS.gstin}<br/>
                  <strong>PAN:</strong> ${SELLER_DETAILS.pan} &bull; <strong>State Code:</strong> ${SELLER_DETAILS.stateCode}<br/>
                  <strong>Email:</strong> ${SELLER_DETAILS.email}<br/>
                  <strong>Phone:</strong> ${SELLER_DETAILS.phone}
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 16px;">
                <div style="font-size: 10px; font-weight: 700; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                  BILLED TO / BUYER DETAILS
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #111111;">${customerName}</div>
                <div style="font-size: 11px; color: #444444; line-height: 1.5; margin-top: 3px;">
                  ${address.address || ''}${address.apartment ? `, ${address.apartment}` : ''}<br/>
                  ${address.city || ''}, ${customerState} ${(address as any).postal_code || (address as any).postalCode || ''}<br/>
                  <strong>Phone:</strong> ${customerPhone}<br/>
                  <strong>Email:</strong> ${customerEmail}<br/>
                  <strong>Place of Supply:</strong> ${customerState} (Code: ${stateCode})<br/>
                  <strong>Reverse Charge:</strong> No
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 24px; background-color: #F0F0F4; border-bottom: 1px solid #E5E5E5; font-size: 11px; color: #444444;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td><strong>Order Ref:</strong> #${orderNum}</td>
              <td><strong>Payment:</strong> ${paymentMethod}</td>
              <td><strong>Gateway Ref:</strong> ${paymentRef}</td>
              <td style="text-align: right;"><strong>Courier:</strong> India Post Speed Post</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <thead>
              <tr style="background-color: #F8F8FA; border-bottom: 1.5px solid #DDDDDD; font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 8px 6px; text-align: center; width: 28px;">#</th>
                <th style="padding: 8px 8px; text-align: left;">Item Description</th>
                <th style="padding: 8px 6px; text-align: center; width: 45px;">HSN</th>
                <th style="padding: 8px 6px; text-align: center; width: 32px;">Qty</th>
                <th style="padding: 8px 8px; text-align: right; width: 55px;">Rate</th>
                <th style="padding: 8px 8px; text-align: right; width: 65px;">Taxable</th>
                <th style="padding: 8px 6px; text-align: center; width: 60px;">GST Rate</th>
                <th style="padding: 8px 8px; text-align: right; width: 55px;">Tax</th>
                <th style="padding: 8px 8px; text-align: right; width: 65px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceItemsRows}
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 24px; border-top: 1px solid #E5E5E5; background-color: #FAFAFB;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 50%; vertical-align: top; font-size: 11px; color: #555555; padding-right: 16px;">
                <div style="font-weight: 700; color: #191846; margin-bottom: 6px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
                  GST Tax Summary (5% Included)
                </div>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 11px; color: #555555;">
                  <tr>
                    <td style="padding: 2px 0;">Total Taxable Value:</td>
                    <td style="text-align: right; font-weight: 600; color: #222222;">${formatINR(taxableSubtotal)}</td>
                  </tr>
                  ${isIntraState ? `
                    <tr>
                      <td style="padding: 2px 0;">CGST (2.5%):</td>
                      <td style="text-align: right; font-weight: 600; color: #222222;">${formatINR(cgst)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 0;">SGST (2.5%):</td>
                      <td style="text-align: right; font-weight: 600; color: #222222;">${formatINR(sgst)}</td>
                    </tr>
                  ` : `
                    <tr>
                      <td style="padding: 2px 0;">IGST (5.0%):</td>
                      <td style="text-align: right; font-weight: 600; color: #222222;">${formatINR(igst)}</td>
                    </tr>
                  `}
                  <tr>
                    <td style="padding: 2px 0; border-top: 1px dashed #CCCCCC; font-weight: 600;">Total Tax Amount:</td>
                    <td style="text-align: right; font-weight: 700; color: #191846; border-top: 1px dashed #CCCCCC;">${formatINR(totalGst)}</td>
                  </tr>
                </table>
                <div style="margin-top: 12px; padding: 6px 8px; background-color: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 4px; font-size: 10px; color: #666666;">
                  <strong>Amount in Words:</strong><br/>
                  ${numberToWordsINR(grandTotal)}
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 16px; border-left: 1px solid #E5E5E5;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #555555;">
                  <tr>
                    <td style="padding: 3px 0;">Subtotal (Gross):</td>
                    <td style="text-align: right; font-weight: 600; color: #222222;">${formatINR(subtotal)}</td>
                  </tr>
                  ${discount > 0 ? `
                    <tr>
                      <td style="padding: 3px 0; color: #137333;">Coupon Discount:</td>
                      <td style="text-align: right; font-weight: 600; color: #137333;">-${formatINR(discount)}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 3px 0;">Shipping &amp; Handling:</td>
                    <td style="text-align: right; font-weight: 600; color: #222222;">${shipping === 0 ? 'FREE' : formatINR(shipping)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #191846; font-size: 15px;">
                    <td style="padding: 8px 0 0 0; font-weight: 700; color: #191846;">Invoice Total:</td>
                    <td style="padding: 8px 0 0 0; text-align: right; font-weight: 800; color: #191846;">${formatINR(grandTotal)}</td>
                  </tr>
                </table>
                <div style="margin-top: 16px; text-align: right;">
                  <a href="https://tanoah.com/order-confirmation?order=${orderNum}" style="background-color: #191846; color: #FFFFFF; font-size: 11px; font-weight: 700; text-decoration: none; padding: 8px 16px; border-radius: 4px; display: inline-block; letter-spacing: 0.5px;">
                    Print / Download Full PDF Invoice &rarr;
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 24px; background-color: #F8F8FA; border-top: 1px solid #E5E5E5; text-align: center; font-size: 10px; color: #888888; line-height: 1.4;">
          This is an authentic computer-generated Tax Invoice issued in accordance with Section 31 of the CGST Act, 2017.<br/>
          It is digitally authenticated and requires no physical signature &bull; Registered Office: Rappal, Pudukkad P O, Thrissur, Kerala 680301.
        </td>
      </tr>
    </table>
  `;
}

function generateAdminOrderAlertHtml(order: any): string {
  const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
  const address: any = order.shipping_address || order.formData || {};
  const customerName = (
    (order.formData?.firstName ? `${order.formData.firstName} ${order.formData.lastName || ''}`.trim() : '') ||
    (order.shipping_address?.first_name ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ''}`.trim() : '') ||
    order.customer_name ||
    order.customerName ||
    'Valued Patron'
  );
  const email = order.formData?.email || order.guest_email || order.customer_email || 'N/A';
  const phone = order.formData?.phone || order.guest_phone || order.customer_phone || 'N/A';
  const items = order.items || [];
  const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? order.discount_total ?? 0;
  const shipping = order.shipping ?? order.shipping_total ?? 0;
  const paymentMethod = (order.payment_method || order.formData?.paymentMethod || 'Online').toUpperCase();
  const paymentStatus = (order.payment_status || 'PAID').toUpperCase();
  const paymentRef = order.payment_gateway_ref || order.paymentGatewayRef || 'N/A';
  const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const itemsRows = items.map((item: any) => {
    const title = item.product_title || item.product?.title || 'Garment';
    const variant = item.variant_title || (item.variant ? `${item.variant.color_name || ''} / ${item.variant.size || ''}` : '');
    const sku = item.sku || item.variant?.sku || '-';
    const qty = item.quantity || 1;
    const price = item.unit_price ?? item.variant?.sale_price ?? item.variant?.price ?? 0;
    const lineTotal = item.line_total ?? (price * qty);
    const img = resolveEmailImageUrl(
      item.image_url ||
      item.variant?.color_image_url ||
      item.product?.images?.[0]?.image_url
    );

    return `
      <tr style="border-bottom: 1px solid #EEEEEE;">
        <td style="padding: 12px 8px; vertical-align: top; width: 64px;">
          <img src="${img}" alt="${title}" width="56" height="70" style="border-radius: 4px; object-fit: cover; display: block; border: 1px solid #E5E5E5; width: 56px; height: 70px;" />
        </td>
        <td style="padding: 12px 8px; vertical-align: top;">
          <div style="font-weight: 600; font-size: 13px; color: #111111; line-height: 1.3;">${title}</div>
          ${variant ? `<div style="font-size: 12px; color: #666666; margin-top: 3px;">Variant: <strong>${variant}</strong></div>` : ''}
          <div style="font-size: 11px; color: #888888; margin-top: 2px;">SKU: ${sku}</div>
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: center; font-size: 13px; color: #333333;">
          ${qty}
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: right; font-size: 13px; font-weight: 600; color: #111111;">
          ${formatINR(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>New Order Alert: ${orderNum}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F4F6; margin: 0; padding: 24px; color: #222222;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #191846; padding: 28px 32px; text-align: left; border-bottom: 3px solid #D4AF37;">
              <div style="color: #D4AF37; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                TANOAH &bull; ADMIN ORDER ALERT
              </div>
              <h1 style="color: #FFFFFF; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 0.5px;">
                🚨 New Order Received: ${orderNum}
              </h1>
              <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 6px;">
                Recorded &bull; ${orderDate}
              </div>
            </td>
          </tr>

          <!-- Key Financial Highlights Card -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; background-color: #FAFAFB; border-bottom: 1px solid #EEEEEE;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Amount</div>
                    <div style="font-size: 26px; font-weight: 800; color: #191846; margin-top: 4px;">${formatINR(grandTotal)}</div>
                  </td>
                  <td style="text-align: right;">
                    <span style="background-color: ${paymentStatus === 'PAID' ? '#E6F4EA' : '#FEF7E0'}; color: ${paymentStatus === 'PAID' ? '#137333' : '#B06000'}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: inline-block;">
                      ${paymentStatus} &bull; ${paymentMethod}
                    </span>
                    <div style="font-size: 11px; color: #888888; margin-top: 6px;">Gateway Ref: ${paymentRef}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer & Shipping Grid -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #EEEEEE;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: top; width: 50%; padding-right: 16px;">
                    <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px;">
                      Customer Contact
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #111111;">${customerName}</div>
                    <div style="font-size: 13px; color: #444444; margin-top: 3px;"><a href="mailto:${email}" style="color: #191846; text-decoration: none;">${email}</a></div>
                    <div style="font-size: 13px; color: #444444; margin-top: 3px;">${phone}</div>
                  </td>
                  <td style="vertical-align: top; width: 50%; padding-left: 16px; border-left: 1px solid #EEEEEE;">
                    <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px;">
                      Shipping Destination
                    </div>
                    <div style="font-size: 13px; color: #333333; line-height: 1.4;">
                      ${address.address || ''}<br/>
                      ${address.apartment ? `${address.apartment}<br/>` : ''}
                      ${address.city || ''}, ${address.state || ''} ${(address as any).postal_code || (address as any).postalCode || ''}<br/>
                      India
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 24px 32px 16px 32px;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px;">
                Ordered Items (${items.length})
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="border-bottom: 1.5px solid #DDDDDD; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th colspan="2" style="text-align: left; padding: 6px 8px;">Product</th>
                    <th style="text-align: center; padding: 6px 8px;">Qty</th>
                    <th style="text-align: right; padding: 6px 8px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table align="right" border="0" cellspacing="0" cellpadding="0" style="width: 260px; font-size: 13px; color: #555555; margin-top: 12px;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #222222;">${formatINR(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #137333;">Discount:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #137333;">-${formatINR(discount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">Shipping:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #222222;">${shipping === 0 ? 'FREE' : formatINR(shipping)}</td>
                </tr>
                <tr style="border-top: 2px solid #191846; font-size: 15px;">
                  <td style="padding: 10px 0 0 0; font-weight: 700; color: #191846;">Grand Total:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; font-weight: 800; color: #191846;">${formatINR(grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Official GST Tax Invoice Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              ${generateGstTaxInvoiceHtml(order)}
            </td>
          </tr>

          <!-- Footer with Action Button -->
          <tr>
            <td style="background-color: #FAFAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #EEEEEE;">
              <div style="font-size: 12px; color: #777777; margin-bottom: 12px;">
                Real-time operational dispatch from TANOAH.
              </div>
              <a href="https://tanoah.com/admin/orders" style="background-color: #191846; color: #FFFFFF; padding: 10px 24px; border-radius: 4px; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-block; letter-spacing: 0.5px;">
                View Order in Admin Dashboard &rarr;
              </a>
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;
}

function generateCustomerOrderConfirmationHtml(order: any): string {
  const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
  const address: any = order.shipping_address || order.formData || {};
  const customerName = (
    (order.formData?.firstName ? `${order.formData.firstName} ${order.formData.lastName || ''}`.trim() : '') ||
    (order.shipping_address?.first_name ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ''}`.trim() : '') ||
    order.customer_name ||
    order.customerName ||
    'Valued Patron'
  );
  const email = order.formData?.email || order.guest_email || order.customer_email || 'N/A';
  const phone = order.formData?.phone || order.guest_phone || order.customer_phone || 'N/A';
  const items = order.items || [];
  const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? order.discount_total ?? 0;
  const shipping = order.shipping ?? order.shipping_total ?? 0;
  const paymentMethod = (order.payment_method || order.formData?.paymentMethod || 'Online').toUpperCase();
  const paymentStatus = (order.payment_status || 'PAID').toUpperCase();
  const paymentRef = order.payment_gateway_ref || order.paymentGatewayRef || 'N/A';
  const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const itemsRows = items.map((item: any) => {
    const title = item.product_title || item.product?.title || 'Garment';
    const variant = item.variant_title || (item.variant ? `${item.variant.color_name || ''} / ${item.variant.size || ''}` : '');
    const sku = item.sku || item.variant?.sku || '-';
    const qty = item.quantity || 1;
    const price = item.unit_price ?? item.variant?.sale_price ?? item.variant?.price ?? 0;
    const lineTotal = item.line_total ?? (price * qty);
    const img = resolveEmailImageUrl(
      item.image_url ||
      item.variant?.color_image_url ||
      item.product?.images?.[0]?.image_url
    );

    return `
      <tr style="border-bottom: 1px solid #EEEEEE;">
        <td style="padding: 12px 8px; vertical-align: top; width: 64px;">
          <img src="${img}" alt="${title}" width="56" height="70" style="border-radius: 4px; object-fit: cover; display: block; border: 1px solid #E5E5E5; width: 56px; height: 70px;" />
        </td>
        <td style="padding: 12px 8px; vertical-align: top;">
          <div style="font-weight: 600; font-size: 13px; color: #111111; line-height: 1.3;">${title}</div>
          ${variant ? `<div style="font-size: 12px; color: #666666; margin-top: 3px;">Variant: <strong>${variant}</strong></div>` : ''}
          <div style="font-size: 11px; color: #888888; margin-top: 2px;">SKU: ${sku}</div>
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: center; font-size: 13px; color: #333333;">
          ${qty}
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: right; font-size: 13px; font-weight: 600; color: #111111;">
          ${formatINR(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Order Confirmed: ${orderNum}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F4F6; margin: 0; padding: 24px; color: #222222;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #191846; padding: 28px 32px; text-align: left; border-bottom: 3px solid #D4AF37;">
              <div style="color: #D4AF37; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                TANOAH &bull; ORDER CONFIRMATION
              </div>
              <h1 style="color: #FFFFFF; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 0.5px;">
                ✨ Order Confirmed: ${orderNum}
              </h1>
              <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 6px;">
                Order Placed &bull; ${orderDate}
              </div>
            </td>
          </tr>

          <!-- Key Financial Highlights Card -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; background-color: #FAFAFB; border-bottom: 1px solid #EEEEEE;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; color: #666666; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Amount</div>
                    <div style="font-size: 26px; font-weight: 800; color: #191846; margin-top: 4px;">${formatINR(grandTotal)}</div>
                  </td>
                  <td style="text-align: right;">
                    <span style="background-color: ${paymentStatus === 'PAID' ? '#E6F4EA' : '#FEF7E0'}; color: ${paymentStatus === 'PAID' ? '#137333' : '#B06000'}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: inline-block;">
                      ${paymentStatus} &bull; ${paymentMethod}
                    </span>
                    <div style="font-size: 11px; color: #888888; margin-top: 6px;">Gateway Ref: ${paymentRef}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer & Shipping Grid -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #EEEEEE;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: top; width: 50%; padding-right: 16px;">
                    <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px;">
                      Customer Contact
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #111111;">${customerName}</div>
                    <div style="font-size: 13px; color: #444444; margin-top: 3px;"><a href="mailto:${email}" style="color: #191846; text-decoration: none;">${email}</a></div>
                    <div style="font-size: 13px; color: #444444; margin-top: 3px;">${phone}</div>
                  </td>
                  <td style="vertical-align: top; width: 50%; padding-left: 16px; border-left: 1px solid #EEEEEE;">
                    <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px;">
                      Shipping Destination
                    </div>
                    <div style="font-size: 13px; color: #333333; line-height: 1.4;">
                      ${address.address || ''}<br/>
                      ${address.apartment ? `${address.apartment}<br/>` : ''}
                      ${address.city || ''}, ${address.state || ''} ${(address as any).postal_code || (address as any).postalCode || ''}<br/>
                      India
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 24px 32px 16px 32px;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px;">
                Ordered Items (${items.length})
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="border-bottom: 1.5px solid #DDDDDD; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th colspan="2" style="text-align: left; padding: 6px 8px;">Product</th>
                    <th style="text-align: center; padding: 6px 8px;">Qty</th>
                    <th style="text-align: right; padding: 6px 8px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table align="right" border="0" cellspacing="0" cellpadding="0" style="width: 260px; font-size: 13px; color: #555555; margin-top: 12px;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #222222;">${formatINR(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #137333;">Discount:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #137333;">-${formatINR(discount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">Shipping:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #222222;">${shipping === 0 ? 'FREE' : formatINR(shipping)}</td>
                </tr>
                <tr style="border-top: 2px solid #191846; font-size: 15px;">
                  <td style="padding: 10px 0 0 0; font-weight: 700; color: #191846;">Grand Total:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; font-weight: 800; color: #191846;">${formatINR(grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Official GST Tax Invoice Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              ${generateGstTaxInvoiceHtml(order)}
            </td>
          </tr>

          <!-- Footer with Action Button -->
          <tr>
            <td style="background-color: #FAFAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #EEEEEE;">
              <div style="font-size: 12px; color: #777777; margin-bottom: 12px;">
                Thank you for choosing TANOAH. For any inquiries, reply to this email or contact <a href="mailto:connectus.tanoah@gmail.com" style="color: #191846; text-decoration: underline;">connectus.tanoah@gmail.com</a>.
              </div>
              <a href="https://tanoah.com/order-confirmation?order=${orderNum}" style="background-color: #191846; color: #FFFFFF; padding: 10px 24px; border-radius: 4px; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-block; letter-spacing: 0.5px;">
                View Your Order / Track Status &rarr;
              </a>
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;
}

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
    const rawFrom = context.env.FROM_EMAIL || payload.from || DEFAULT_FROM_EMAIL;
    const fromEmail = (rawFrom && !rawFrom.includes('resend.dev')) ? rawFrom : 'TANOAH <noreply@tanoah.com>';

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
          if (err.statusCode === 403 || err.message?.includes('verify a domain') || err.message?.includes('testing emails')) {
            try {
              const fallbackRes = await sendEmail({
                from: fromEmail,
                to: recipient,
                reply_to: customerEmail,
                subject: `🚨 [CUSTOMER RETURN COPY - Deliver to: ${customerEmail}] Return Request: #${orderNum}`,
                html: `
                  <div style="font-family: sans-serif; background-color: #FEF7E0; border: 1px solid #F0E5BA; padding: 16px; margin-bottom: 20px; border-radius: 6px;">
                    <strong style="color: #B06000;">⚠️ RESEND CUSTOMER RETURN DISPATCH NOTICE:</strong><br/>
                    Resend domain <code>${fromEmail}</code> requires DNS domain verification to deliver directly to customer mailboxes.<br/>
                    Below is the customer return acknowledgment for <strong>${customerEmail}</strong> (${customerName}).
                  </div>
                  ${payload.customerHtml}
                `,
              });
              results.customerConfirmation = {
                status: 'forwarded_to_admin_domain_pending',
                id: fallbackRes.id,
                message: `Customer return confirmation forwarded to admin pending domain verification at resend.com/domains`,
              };
            } catch (fErr: any) {
              results.customerConfirmation = { status: 'domain_verification_required', error: fErr.message || fErr };
            }
          } else {
            results.customerConfirmation = { status: 'failed', error: err.message || err };
          }
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
    const customerEmail = order.formData?.email || order.guest_email || order.customer_email || order.customerEmail;
    const customerName = (
      (order.formData?.firstName ? `${order.formData.firstName} ${order.formData.lastName || ''}`.trim() : '') ||
      (order.shipping_address?.first_name ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ''}`.trim() : '') ||
      order.customer_name ||
      order.customerName ||
      'Customer'
    );

    const results: any = { orderNumber: orderNum, adminAlert: null, customerConfirmation: null };

    // 1. Admin Alert (using rich Screenshot 2 template)
    try {
      const adminRes = await sendEmail({
        from: fromEmail,
        to: adminEmail,
        reply_to: customerEmail || adminEmail,
        subject: `🚨 [NEW ORDER] #${orderNum} • ${formatINR(grandTotal)} • ${customerName}`,
        html: payload.adminHtml || generateAdminOrderAlertHtml(order),
      });
      results.adminAlert = { status: 'sent', id: adminRes.id };
    } catch (err: any) {
      results.adminAlert = { status: 'failed', error: err.message || err };
    }

    // 2. Customer Confirmation (using rich Screenshot 2 template)
    if (customerEmail && customerEmail.includes('@')) {
      const cHtml = payload.customerHtml || generateCustomerOrderConfirmationHtml(order);
      try {
        const custRes = await sendEmail({
          from: fromEmail,
          to: customerEmail,
          reply_to: adminEmail,
          subject: `Order Confirmed: #${orderNum} | Thank You for Choosing TANOAH`,
          html: cHtml,
        });
        results.customerConfirmation = { status: 'sent', id: custRes.id };
      } catch (err: any) {
        if (err.statusCode === 403 || err.message?.includes('verify a domain') || err.message?.includes('testing emails')) {
          try {
            const fallbackRes = await sendEmail({
              from: fromEmail,
              to: adminEmail,
              reply_to: customerEmail,
              subject: `🚨 [CUSTOMER DISPATCH COPY - Deliver to: ${customerEmail}] Order Confirmed: #${orderNum}`,
              html: `
                <div style="font-family: sans-serif; background-color: #FEF7E0; border: 1px solid #F0E5BA; padding: 16px; margin-bottom: 20px; border-radius: 6px;">
                  <strong style="color: #B06000;">⚠️ RESEND CUSTOMER DISPATCH NOTICE:</strong><br/>
                  Resend sender domain <code>${fromEmail}</code> requires DNS domain verification at <a href="https://resend.com/domains">resend.com/domains</a> to deliver directly to customer mailboxes.<br/>
                  Below is the exact customer confirmation &amp; official GST Tax Invoice generated for <strong>${customerEmail}</strong> (${customerName}).
                </div>
                ${cHtml}
              `,
            });
            results.customerConfirmation = {
              status: 'forwarded_to_admin_domain_pending',
              id: fallbackRes.id,
              message: `Customer confirmation delivered to ${adminEmail} pending domain verification at resend.com/domains`,
            };
          } catch (fErr: any) {
            results.customerConfirmation = { status: 'domain_verification_required', error: fErr.message || fErr };
          }
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
