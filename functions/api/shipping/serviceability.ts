// Cloudflare Pages Function: GET /api/shipping/serviceability?pincode=XXXXXX

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const pincode = url.searchParams.get('pincode')?.trim();

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return new Response(JSON.stringify({ serviceable: false, message: 'Please enter a valid 6-digit postal code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Major metro prefixes: 11 (Delhi), 40 (Mumbai), 56 (Bangalore), 60 (Chennai), 70 (Kolkata), 50 (Hyderabad)
  const prefix = pincode.substring(0, 2);
  const isMetro = ['11', '40', '56', '60', '70', '50'].includes(prefix);

  const estimatedDays = isMetro ? '2–3 Business Days' : '4–5 Business Days';
  const expressAvailable = true;
  const codAvailable = true;

  return new Response(JSON.stringify({
    serviceable: true,
    pincode,
    is_metro: isMetro,
    estimated_delivery: estimatedDays,
    express_delivery_available: expressAvailable,
    cod_available: codAvailable,
    courier: 'BlueDart Air Express',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
