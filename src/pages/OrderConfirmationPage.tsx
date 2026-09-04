import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, ArrowRight, Truck } from 'lucide-react';
import { Button } from '../components/common/Button';
import { TaxInvoiceModal } from '../components/checkout/TaxInvoiceModal';
import { safeGetItem } from '../utils/safeStorage';

export const OrderConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || 'TAN-849201';
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3F3F8F', '#343476', '#EEEEF8', '#000000'],
    });
  }, []);

  const rawOrder = safeGetItem('tanoah_last_order');
  const orderData = rawOrder ? JSON.parse(rawOrder) : null;

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white p-8 sm:p-12 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 text-left">
          <div className="flex items-center gap-3 pb-6 border-b border-[#E7E7E7]">
            <div className="w-12 h-12 rounded-full bg-[#EEEEF8] text-[#3F3F8F] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#3F3F8F]">
                ORDER CONFIRMED & IN PRODUCTION
              </span>
              <h1 className="font-wondra text-2xl sm:text-3xl text-black">
                THANK YOU FOR SHOPPING AT TANOAH
              </h1>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center p-4 bg-[#F8F8F8] rounded-[4px] border border-[#E7E7E7]">
              <div>
                <span className="text-[#888888] block text-[10px] uppercase">Order Reference</span>
                <strong className="font-mono text-sm text-black">{orderNumber}</strong>
              </div>
              <div className="text-right">
                <span className="text-[#888888] block text-[10px] uppercase">Confirmation Sent To</span>
                <strong className="text-black">{orderData?.formData?.email || 'customer@tanoah.com'}</strong>
              </div>
            </div>

            <p className="text-[#666666] leading-relaxed">
              Your garments have been assigned to our packaging atelier. You will receive an SMS and email notification with courier tracking as soon as your parcel is dispatched.
            </p>

            {orderData?.formData && (
              <div className="p-4 border border-[#E7E7E7] rounded-[4px] space-y-1 bg-white">
                <h4 className="font-semibold text-black uppercase text-[11px] mb-2">
                  DELIVERY DESTINATION
                </h4>
                <p className="font-medium text-black">
                  {orderData.formData.firstName} {orderData.formData.lastName}
                </p>
                <p className="text-[#666666]">
                  {orderData.formData.address}, {orderData.formData.city}, {orderData.formData.state} - {orderData.formData.postalCode}
                </p>
                <p className="text-[#666666]">Phone: {orderData.formData.phone}</p>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Link to={`/tracking?order=${orderNumber}`} className="flex-1">
              <Button
                variant="primary"
                size="md"
                icon={<Truck className="w-4 h-4" />}
                className="w-full"
              >
                TRACK CONSIGNMENT
              </Button>
            </Link>

            {orderData && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsInvoiceOpen(true)}
                className="flex-1"
              >
                VIEW TAX INVOICE
              </Button>
            )}

            <Link to="/collections/all" className="flex-1">
              <Button
                variant="outline"
                size="md"
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full"
              >
                CONTINUE SHOPPING
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {orderData && (
        <TaxInvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          order={orderData}
        />
      )}
    </div>
  );
};
