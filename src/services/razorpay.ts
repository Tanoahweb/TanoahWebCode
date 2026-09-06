// Client-Side Razorpay Payment Gateway Service

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayOptions {
  orderId: string;
  amount: number; // in paise
  currency?: string;
  keyId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (paymentResult: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
  }) => void;
  onDismiss?: () => void;
}

// Dynamically load Razorpay SDK
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Initialize and launch Razorpay checkout modal
export const openRazorpayPayment = async (options: RazorpayOptions): Promise<void> => {
  // If simulated order ID or simulated key:
  if (options.orderId.startsWith('order_sim_') || options.keyId === 'rzp_test_simulated_key') {
    const simulatedPaymentId = `pay_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const confirmPayment = window.confirm(
      `[TANOAH PAYMENT GATEWAY]\n\nAuthorize Payment of ₹${(options.amount / 100).toLocaleString('en-IN')} via Razorpay?\n\n(Test mode active: Click OK to authorize, Cancel to decline)`
    );

    if (confirmPayment) {
      options.onSuccess({
        razorpay_payment_id: simulatedPaymentId,
        razorpay_order_id: options.orderId,
        razorpay_signature: 'simulated_signature_verified',
      });
    } else {
      if (options.onDismiss) options.onDismiss();
    }
    return;
  }

  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay Checkout SDK failed to load. Please check your network.');
  }

  const rzpOptions = {
    key: options.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_simulated_key',
    amount: options.amount,
    currency: options.currency || 'INR',
    name: 'TANOAH',
    description: 'Tanoah Order Payment',
    image: '/Assets/brand/logo-blue.png',
    order_id: options.orderId,
    prefill: {
      name: options.customerName || '',
      email: options.customerEmail || '',
      contact: options.customerPhone || '',
    },
    theme: {
      color: '#3F3F8F',
      backdrop_color: 'rgba(0, 0, 0, 0.7)',
    },
    handler: (response: any) => {
      options.onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) options.onDismiss();
      },
    },
  };

  const rzp = new window.Razorpay(rzpOptions);
  rzp.open();
};
