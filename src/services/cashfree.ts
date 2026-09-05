// Client-Side Cashfree Payment Gateway Service (SDK v3)

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export interface CashfreeOptions {
  paymentSessionId: string;
  orderId: string;
  environment?: 'sandbox' | 'production';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  amount?: number;
  onSuccess: (paymentResult: {
    order_id: string;
    payment_id?: string;
  }) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

// Dynamically load Cashfree SDK v3
export const loadCashfreeScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Cashfree) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Initialize and launch Cashfree modal checkout
export const openCashfreePayment = async (options: CashfreeOptions): Promise<void> => {
  // If simulated mode (credentials not entered or test simulated session)
  if (options.paymentSessionId.startsWith('session_sim_') || options.orderId.startsWith('cf_sim_')) {
    const confirmPayment = window.confirm(
      `[TANOAH CASHFREE PAYMENTS]\n\nAuthorize Payment of ₹${(options.amount || 0).toLocaleString(
        'en-IN'
      )} via Cashfree?\n\n(Test mode active: Click OK to authorize, Cancel to decline)`
    );

    if (confirmPayment) {
      options.onSuccess({
        order_id: options.orderId,
        payment_id: `cf_pay_sim_${Date.now()}`,
      });
    } else {
      if (options.onDismiss) options.onDismiss();
    }
    return;
  }

  const isLoaded = await loadCashfreeScript();
  if (!isLoaded || !window.Cashfree) {
    throw new Error('Cashfree Payment SDK failed to load. Please check your network connection.');
  }

  const cashfree = window.Cashfree({
    mode: options.environment === 'production' ? 'production' : 'sandbox',
  });

  const checkoutOptions = {
    paymentSessionId: options.paymentSessionId,
    redirectTarget: '_modal', // Opens sleek modal right on page
  };

  try {
    const result = await cashfree.checkout(checkoutOptions);

    if (result.error) {
      console.warn('Cashfree payment error or dismissed:', result.error);
      if (options.onFailure) options.onFailure(result.error);
      if (options.onDismiss) options.onDismiss();
      return;
    }

    if (result.paymentDetails) {
      options.onSuccess({
        order_id: options.orderId,
        payment_id: result.paymentDetails.paymentMessage || options.orderId,
      });
    } else if (result.redirect) {
      // If modal completed with redirect
      options.onSuccess({
        order_id: options.orderId,
      });
    }
  } catch (err: any) {
    console.error('Cashfree checkout modal exception:', err);
    if (options.onFailure) options.onFailure(err);
    if (options.onDismiss) options.onDismiss();
  }
};
