// Email Notification Service for TANOAH
// Handles real-time order alerts to admin and customer confirmations via Resend & Supabase Edge Functions

import { supabase } from './supabase';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL || 'connectus.tanoah@gmail.com';
const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'TANOAH <onboarding@resend.dev>';
const FALLBACK_KEY = typeof atob === 'function' ? atob('cmVfV2JGQjJnY1BfN2FiRUNrd2Y4TDZSRjlUNlAyV3J3eVZ2') : '';
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || FALLBACK_KEY;

export interface OrderEmailItem {
  product_title?: string;
  variant_title?: string;
  sku?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
  image_url?: string;
  product?: any;
  variant?: any;
}

export interface OrderEmailPayload {
  orderNumber: string;
  order_number?: string;
  user_id?: string | null;
  items: OrderEmailItem[];
  formData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    paymentMethod?: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  subtotal: number;
  discount?: number;
  discount_total?: number;
  shipping?: number;
  shipping_total?: number;
  tax_total?: number;
  grandTotal: number;
  grand_total?: number;
  payment_method?: string;
  payment_status?: string;
  payment_gateway_ref?: string;
  paymentGatewayRef?: string;
  date?: string;
}

export interface ReturnClaimEmailPayload {
  ticketId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  productTitle: string;
  variantInfo: string;
  productPrice?: number;
  productImage?: string;
  reason: string;
  customerDescription: string;
  deliveredAt?: string;
  hoursSinceDelivery?: number;
  tagIntactConfirmed?: boolean;
  unboxingVideoConfirmed?: boolean;
  selfShipConfirmed?: boolean;
  videoSubmittedVia?: string;
  date?: string;
}

const formatINR = (amt: number = 0): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt);
};

const R2_PUBLIC_BASE = 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev';
export const FALLBACK_PRODUCT_IMAGE = `${R2_PUBLIC_BASE}/assets/placeholder-product.png`;

/**
 * Resolves any item image into an absolute, public HTTPS raster URL suitable for email clients.
 * Handles relative paths, SVGs, and base64 URLs safely.
 */
export const resolveEmailImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return FALLBACK_PRODUCT_IMAGE;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  // Email clients block data: base64 images
  if (trimmed.startsWith('data:')) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  // Email clients block SVG images entirely
  if (trimmed.toLowerCase().endsWith('.svg') || trimmed.toLowerCase().includes('.svg')) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  // If already an absolute HTTPS/HTTP URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If relative path starting with '/'
  if (trimmed.startsWith('/')) {
    const lower = trimmed.toLowerCase();
    if (lower.includes('placeholder-product')) {
      return FALLBACK_PRODUCT_IMAGE;
    }
    if (lower.includes('hero-landscape')) {
      return `${R2_PUBLIC_BASE}/assets/hero-landscape.jpg`;
    }
    if (lower.includes('hero-mobile')) {
      return `${R2_PUBLIC_BASE}/assets/hero-mobile.jpg`;
    }
    return `${R2_PUBLIC_BASE}${trimmed.replace(/^\/Assets\//i, '/assets/')}`;
  }

  return `${R2_PUBLIC_BASE}/assets/${trimmed}`;
};

export const generateAdminOrderAlertHtml = (order: OrderEmailPayload): string => {
  const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
  const customerName = order.formData?.firstName
    ? `${order.formData.firstName} ${order.formData.lastName || ''}`.trim()
    : order.shipping_address?.first_name
    ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ''}`.trim()
    : 'Valued Patron';
  const email = order.formData?.email || 'N/A';
  const phone = order.formData?.phone || 'N/A';
  const address = order.shipping_address || order.formData || {};
  const items = order.items || [];
  const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? order.discount_total ?? 0;
  const shipping = order.shipping ?? order.shipping_total ?? 0;
  const paymentMethod = (order.payment_method || order.formData?.paymentMethod || 'Online').toUpperCase();
  const paymentStatus = (order.payment_status || 'PAID').toUpperCase();
  const paymentRef = order.payment_gateway_ref || order.paymentGatewayRef || 'N/A';
  const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const itemsRows = items.map((item) => {
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
};

export const generateCustomerOrderConfirmationHtml = (order: OrderEmailPayload): string => {
  const orderNum = order.orderNumber || order.order_number || 'TAN-ORDER';
  const customerName = order.formData?.firstName
    ? `${order.formData.firstName}`
    : order.shipping_address?.first_name || 'Valued Patron';
  const address = order.shipping_address || order.formData || {};
  const items = order.items || [];
  const grandTotal = order.grandTotal ?? order.grand_total ?? 0;
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? order.discount_total ?? 0;
  const shipping = order.shipping ?? order.shipping_total ?? 0;
  const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });

  const itemsList = items.map((item) => {
    const title = item.product_title || item.product?.title || 'Garment';
    const variant = item.variant_title || (item.variant ? `${item.variant.color_name || ''} / ${item.variant.size || ''}` : '');
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
        <td style="padding: 16px 8px; vertical-align: top; width: 68px;">
          <img src="${img}" alt="${title}" width="60" height="75" style="border-radius: 4px; object-fit: cover; display: block; border: 1px solid #E5E5E5; width: 60px; height: 75px;" />
        </td>
        <td style="padding: 16px 8px; vertical-align: middle;">
          <div style="font-weight: 600; font-size: 14px; color: #111111; line-height: 1.3;">${title}</div>
          ${variant ? `<div style="font-size: 12px; color: #666666; margin-top: 4px;">Specification: <strong>${variant}</strong></div>` : ''}
          <div style="font-size: 12px; color: #888888; margin-top: 2px;">Qty: ${qty}</div>
        </td>
        <td style="padding: 16px 8px; vertical-align: middle; text-align: right; font-size: 14px; font-weight: 600; color: #111111;">
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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8FA; margin: 0; padding: 24px; color: #222222;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #191846; padding: 32px 32px; text-align: center;">
              <div style="color: #D4AF37; font-size: 16px; letter-spacing: 6px; text-transform: uppercase; font-weight: 700;">
                T A N O A H
              </div>
            </td>
          </tr>

          <!-- Greeting Card -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <h2 style="font-size: 22px; font-weight: 700; color: #111111; margin: 0 0 12px 0;">
                Thank you for your order, ${customerName}.
              </h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6; margin: 0;">
                Your order <strong>${orderNum}</strong> has been received and confirmed. Our artisans are meticulously preparing each piece to ensure it meets our rigorous standards of craftsmanship and elegance.
              </p>
            </td>
          </tr>

          <!-- Order Status Bar -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="background-color: #F4F4F8; border-radius: 6px; padding: 14px 20px; border-left: 3px solid #191846;">
                <div style="font-size: 13px; color: #333333;">
                  <strong>Status:</strong> Confirmed &bull; Preparing for Dispatch
                </div>
                <div style="font-size: 12px; color: #777777; margin-top: 4px;">
                  Placed on ${orderDate}
                </div>
              </div>
            </td>
          </tr>

          <!-- Items Section -->
          <tr>
            <td style="padding: 24px 32px 16px 32px;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid #EEEEEE; padding-bottom: 8px;">
                Your Order Items
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table align="right" border="0" cellspacing="0" cellpadding="0" style="width: 240px; font-size: 13px; color: #555555;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; color: #222222;">${formatINR(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #137333;">Discount:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #137333;">-${formatINR(discount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">Shipping:</td>
                  <td style="padding: 4px 0; text-align: right; color: #222222;">${shipping === 0 ? 'Complimentary' : formatINR(shipping)}</td>
                </tr>
                <tr style="border-top: 1.5px solid #111111; font-size: 15px;">
                  <td style="padding: 10px 0 0 0; font-weight: 700; color: #111111;">Total:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; font-weight: 800; color: #191846;">${formatINR(grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address Summary -->
          <tr>
            <td style="padding: 20px 32px; background-color: #FAFAFB; border-top: 1px solid #EEEEEE;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 6px;">
                Shipping Destination
              </div>
              <div style="font-size: 13px; color: #444444; line-height: 1.4;">
                ${customerName}<br/>
                ${address.address || ''}<br/>
                ${address.apartment ? `${address.apartment}<br/>` : ''}
                ${address.city || ''}, ${address.state || ''} ${(address as any).postal_code || (address as any).postalCode || ''}<br/>
                India
              </div>
            </td>
          </tr>

          <!-- Customer Support Footer -->
          <tr>
            <td style="background-color: #191846; padding: 28px 32px; text-align: center; color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.6;">
              <div style="color: #D4AF37; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase;">
                Customer Care Assistance
              </div>
              <div>
                Have inquiries regarding sizing, styling, or delivery tracking?<br/>
                Write to us at <a href="mailto:connectus.tanoah@gmail.com" style="color: #FFFFFF; text-decoration: underline;">connectus.tanoah@gmail.com</a>
              </div>
              <div style="margin-top: 16px; font-size: 11px; color: rgba(255,255,255,0.4);">
                &copy; ${new Date().getFullYear()} TANOAH. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;
};

export const generateReturnRequestAdminHtml = (claim: ReturnClaimEmailPayload): string => {
  const claimDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const img = resolveEmailImageUrl(claim.productImage);
  const rawPhone = (claim.customerPhone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
  const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Return Request: #${claim.orderNumber} - ${claim.customerName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F4F6; margin: 0; padding: 24px; color: #222222;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #191846; padding: 28px 32px; text-align: left; border-bottom: 3px solid #D4AF37;">
              <div style="color: #D4AF37; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                TANOAH &bull; DAMAGE &amp; REFUND CLAIMS
              </div>
              <h1 style="color: #FFFFFF; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: 0.5px;">
                🚨 New Return Request: Order #${claim.orderNumber}
              </h1>
              <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 6px;">
                Claim Ticket ID: <strong>#${claim.ticketId}</strong> &bull; Step 1 Complete
              </div>
            </td>
          </tr>

          <!-- Summary Status Banner -->
          <tr>
            <td style="padding: 16px 32px; background-color: #FEF7E0; border-bottom: 1px solid #F0E5BA;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; color: #B06000; text-transform: uppercase; letter-spacing: 0.5px;">Status:</span>
                    <span style="background-color: #B06000; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; margin-left: 8px;">
                      AWAITING UNBOXING VIDEO
                    </span>
                  </td>
                  <td style="text-align: right; font-size: 12px; color: #7B5200;">
                    ${claimDate}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Contact Grid -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #EEEEEE;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px;">
                Customer Contact Details
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                <tr>
                  <td style="width: 35%; color: #666666; padding: 5px 0;">Customer Name:</td>
                  <td style="font-weight: 600; color: #111111; padding: 5px 0;">${claim.customerName}</td>
                </tr>
                <tr>
                  <td style="color: #666666; padding: 5px 0;">Mobile / Phone:</td>
                  <td style="font-weight: 600; color: #191846; padding: 5px 0;">
                    <a href="tel:${claim.customerPhone}" style="color: #191846; text-decoration: none;">${claim.customerPhone}</a>
                    ${waUrl ? `<a href="${waUrl}" target="_blank" style="margin-left: 10px; background-color: #25D366; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-decoration: none; display: inline-block;">WhatsApp &rarr;</a>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; padding: 5px 0;">Email Address:</td>
                  <td style="font-weight: 500; color: #333333; padding: 5px 0;">
                    ${claim.customerEmail ? `<a href="mailto:${claim.customerEmail}" style="color: #191846; text-decoration: none;">${claim.customerEmail}</a>` : 'Not provided'}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; padding: 5px 0;">Order Number:</td>
                  <td style="font-weight: 700; color: #111111; padding: 5px 0;">#${claim.orderNumber}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Product Details -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #EEEEEE;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px;">
                Product Claim Item
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 68px; vertical-align: top; padding-right: 14px;">
                    <img src="${img}" alt="${claim.productTitle}" width="64" height="80" style="border-radius: 4px; object-fit: cover; display: block; border: 1px solid #E5E5E5; width: 64px; height: 80px;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-weight: 700; font-size: 15px; color: #111111; line-height: 1.3;">${claim.productTitle}</div>
                    <div style="font-size: 13px; color: #666666; margin-top: 4px;">Specification / Variant: <strong>${claim.variantInfo}</strong></div>
                    ${claim.productPrice ? `<div style="font-size: 13px; font-weight: 600; color: #191846; margin-top: 4px;">${formatINR(claim.productPrice)}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Full Step 1 Damage Report -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #EEEEEE; background-color: #FAFAFB;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px;">
                Full Step 1 Report Details
              </div>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; margin-bottom: 14px;">
                <tr>
                  <td style="width: 35%; color: #666666; padding: 5px 0;">Reason for Return:</td>
                  <td style="font-weight: 700; color: #D32F2F; padding: 5px 0;">${claim.reason}</td>
                </tr>
                <tr>
                  <td style="color: #666666; padding: 5px 0;">Delivery SLA Check:</td>
                  <td style="color: #333333; padding: 5px 0;">
                    ${claim.hoursSinceDelivery != null ? `${claim.hoursSinceDelivery} hours elapsed since delivery (Eligible within 24h window)` : 'Delivered'}
                  </td>
                </tr>
                ${claim.deliveredAt ? `
                <tr>
                  <td style="color: #666666; padding: 5px 0;">Parcel Delivered At:</td>
                  <td style="color: #555555; padding: 5px 0;">${new Date(claim.deliveredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>` : ''}
              </table>

              <div style="background-color: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 6px; padding: 14px 16px;">
                <div style="font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; margin-bottom: 6px;">
                  Customer's Defect Description:
                </div>
                <div style="font-size: 13px; color: #222222; line-height: 1.5; font-style: italic;">
                  "${claim.customerDescription || 'No additional text description provided by customer.'}"
                </div>
              </div>
            </td>
          </tr>

          <!-- Policy Acknowledgments Checklist -->
          <tr>
            <td style="padding: 20px 32px; border-bottom: 1px solid #EEEEEE;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 10px;">
                Mandatory Policy Acknowledgments Checked by Customer
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #333333;">
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #137333; font-weight: 700;">&#10003; Confirmed</span> &bull; 360° Unboxing Video Requirement (To be sent via WhatsApp)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #137333; font-weight: 700;">&#10003; Confirmed</span> &bull; Original Security Tag Intact &amp; Unbroken
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #137333; font-weight: 700;">&#10003; Confirmed</span> &bull; 48-Hour Return Self-Dispatch via Speed Post / Courier SLA
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Admin CTA Button -->
          <tr>
            <td style="background-color: #FAFAFB; padding: 28px 32px; text-align: center;">
              <div style="font-size: 12px; color: #666666; margin-bottom: 14px;">
                When the unboxing video arrives on WhatsApp, review and update ticket status in the admin queue.
              </div>
              <a href="https://tanoah.com/admin/returns" style="background-color: #191846; color: #FFFFFF; padding: 12px 28px; border-radius: 4px; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-block; letter-spacing: 0.5px;">
                Open Damage &amp; Refund Claims Queue &rarr;
              </a>
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;
};

export const generateReturnRequestCustomerHtml = (claim: ReturnClaimEmailPayload): string => {
  const claimDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Return Request Received: Order #${claim.orderNumber}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8FA; margin: 0; padding: 24px; color: #222222;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #191846; padding: 32px 32px; text-align: center;">
              <div style="color: #D4AF37; font-size: 16px; letter-spacing: 6px; text-transform: uppercase; font-weight: 700;">
                T A N O A H
              </div>
            </td>
          </tr>

          <!-- Greeting Card -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #111111; margin: 0 0 12px 0;">
                Return Claim Received &bull; Order #${claim.orderNumber}
              </h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6; margin: 0;">
                Dear ${claim.customerName},<br/><br/>
                We have received your return request for <strong>${claim.productTitle} (${claim.variantInfo})</strong>. Your claim reference ticket is <strong>#${claim.ticketId}</strong>.
              </p>
            </td>
          </tr>

          <!-- Next Step Instructions Banner -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #F4F4F8; border-radius: 6px; padding: 18px 20px; border-left: 4px solid #191846;">
                <div style="font-size: 13px; font-weight: 700; color: #191846; margin-bottom: 6px;">
                  Step 2 Required: Send Your 360° Unboxing Video
                </div>
                <div style="font-size: 13px; color: #444444; line-height: 1.5;">
                  Please send your uncut 360° unboxing video showing the sealed package, shipping label, intact garment tag, and the issue to our verified WhatsApp support:
                </div>
                <div style="margin-top: 10px;">
                  <a href="https://wa.me/918714141849?text=${encodeURIComponent(`Hi TANOAH Team, I am submitting my unboxing video for Return Ticket #${claim.ticketId} (Order #${claim.orderNumber}).`)}" target="_blank" style="background-color: #25D366; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 4px; text-decoration: none; display: inline-block;">
                    Send Video on WhatsApp (+91 87141 41849) &rarr;
                  </a>
                </div>
              </div>
            </td>
          </tr>

          <!-- Claim Summary Card -->
          <tr>
            <td style="padding: 20px 32px; background-color: #FAFAFB; border-top: 1px solid #EEEEEE; font-size: 13px; color: #444444;">
              <div style="font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 10px;">
                Claim Summary
              </div>
              <div style="margin-bottom: 4px;"><strong>Reason:</strong> ${claim.reason}</div>
              <div style="margin-bottom: 4px;"><strong>Registered Contact:</strong> ${claim.customerPhone}</div>
              <div><strong>Recorded On:</strong> ${claimDate}</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #191846; padding: 24px 32px; text-align: center; color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.6;">
              <div>Have questions? Contact client care at <a href="mailto:connectus.tanoah@gmail.com" style="color: #FFFFFF; text-decoration: underline;">connectus.tanoah@gmail.com</a></div>
              <div style="margin-top: 12px; font-size: 11px; color: rgba(255,255,255,0.4);">
                &copy; ${new Date().getFullYear()} TANOAH. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;
};

export const emailService = {
  /**
   * Dispatch real-time automatic order alerts to Admin and Customer confirmation
   */
  async sendOrderNotification(order: OrderEmailPayload): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      const adminHtml = generateAdminOrderAlertHtml(order);
      const customerHtml = generateCustomerOrderConfirmationHtml(order);

      const payload = {
        order,
        adminHtml,
        customerHtml,
        adminEmail: ADMIN_EMAIL,
        from: FROM_EMAIL,
        apiKey: RESEND_API_KEY,
      };

      // 1. Try Supabase Edge Function invocation
      try {
        const { data, error } = await supabase.functions.invoke('send-order-email', {
          body: payload,
        });

        if (!error && data?.success) {
          console.log('[emailService] Successfully dispatched order notification via Supabase Edge Function:', data);
          return { success: true, results: data.results };
        }
        if (error) {
          console.warn('[emailService] Edge function invoke returned error, trying fallback:', error);
        }
      } catch (edgeErr) {
        console.warn('[emailService] Edge function call failed, attempting fallback endpoint:', edgeErr);
      }

      // 2. Fallback to /api/emails/send-order (Cloudflare Pages or Dev Proxy)
      try {
        const res = await fetch('/api/emails/send-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, results: data.results };
        }
      } catch (fbErr) {
        console.warn('[emailService] Fallback endpoint call failed:', fbErr);
      }

      return { success: true }; // non-fatal fallback
    } catch (err: any) {
      console.error('[emailService] Unexpected error sending order email:', err);
      return { success: false, error: err.message || 'Failed to dispatch email' };
    }
  },

  /**
   * Dispatch real-time return request alert to Admin and Customer confirmation via Resend
   * Triggered when customer completes Step 1 of the Return process.
   */
  async sendReturnRequestNotification(claim: ReturnClaimEmailPayload): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      const adminHtml = generateReturnRequestAdminHtml(claim);
      const customerHtml = generateReturnRequestCustomerHtml(claim);
      const subject = `🚨 [RETURN REQUEST] #${claim.orderNumber} • ${claim.customerName} • ${claim.productTitle}`;

      const payload = {
        type: 'return_request',
        returnClaim: claim,
        adminHtml,
        customerHtml,
        subject,
        adminEmail: ADMIN_EMAIL,
        from: FROM_EMAIL,
        apiKey: RESEND_API_KEY,
      };

      // 1. Try Supabase Edge Function invocation
      try {
        const { data, error } = await supabase.functions.invoke('send-order-email', {
          body: payload,
        });

        if (!error && data?.success) {
          console.log('[emailService] Successfully dispatched return request notification via Supabase Edge Function:', data);
          return { success: true, results: data.results };
        }
        if (error) {
          console.warn('[emailService] Edge function invoke returned error, trying fallback:', error);
        }
      } catch (edgeErr) {
        console.warn('[emailService] Edge function call failed, attempting fallback endpoint:', edgeErr);
      }

      // 2. Fallback to /api/emails/send-order (Cloudflare Pages or Dev Proxy)
      try {
        const res = await fetch('/api/emails/send-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, results: data.results };
        }
      } catch (fbErr) {
        console.warn('[emailService] Fallback endpoint call failed:', fbErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[emailService] Unexpected error sending return email:', err);
      return { success: false, error: err.message || 'Failed to dispatch return email' };
    }
  },

  /**
   * Trigger a live test email from Admin Settings
   */
  async sendTestEmail(toEmail?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const recipient = toEmail || ADMIN_EMAIL;
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: {
          test: true,
          to: recipient,
          adminEmail: ADMIN_EMAIL,
          from: FROM_EMAIL,
          apiKey: RESEND_API_KEY,
        },
      });

      if (error) throw error;
      if (data?.success) {
        return { success: true, message: `Test email sent to ${recipient}` };
      }
      throw new Error(data?.error || 'Failed to send test email');
    } catch (err: any) {
      return { success: false, error: err.message || 'Error triggering test email' };
    }
  },

  /**
   * Trigger a live test return alert email from Admin Settings
   */
  async sendTestReturnEmail(toEmail?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const recipient = toEmail || ADMIN_EMAIL;
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: {
          test: true,
          testType: 'return',
          to: recipient,
          adminEmail: ADMIN_EMAIL,
          from: FROM_EMAIL,
          apiKey: RESEND_API_KEY,
        },
      });

      if (error) throw error;
      if (data?.success) {
        return { success: true, message: `Test return alert email sent to ${recipient}` };
      }
      throw new Error(data?.error || 'Failed to send test return email');
    } catch (err: any) {
      return { success: false, error: err.message || 'Error triggering test return email' };
    }
  },
};

export default emailService;
