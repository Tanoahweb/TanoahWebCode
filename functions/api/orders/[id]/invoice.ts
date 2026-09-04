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

  return new Response(JSON.stringify({
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    order_number: orderId,
    seller: {
      company_name: 'TANOAH PRIVATE LIMITED',
      brand: 'TANOAH',
      address: 'Suite 401, Heritage Tower, Ballard Estate, Fort, Mumbai 400001, Maharashtra',
      gstin: '27AAAAA0000A1Z5',
      state: 'Maharashtra',
      state_code: '27',
      pan: 'AAAAA0000A',
      contact: 'concierge@tanoah.com | +91 98765 43210',
    },
    tax_summary: {
      tax_rate: '12% GST',
      cgst_rate: '6%',
      sgst_rate: '6%',
      igst_rate: '12%',
      reverse_charge: 'No',
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
