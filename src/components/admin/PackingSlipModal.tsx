import React, { useEffect } from 'react';
import { Printer, X, MapPin, Building2 } from 'lucide-react';
import { Button } from '../common/Button';
import { DispatchFromAddressConfig } from '../../types';

interface PackingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderDate?: string;
  consignmentNo?: string;
  courierName?: string;
  toAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address: string;
    apartment?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  fromAddress?: DispatchFromAddressConfig;
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  orderDate,
  consignmentNo,
  courierName = 'India Post (Speed Post)',
  toAddress,
  fromAddress,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Fallback if fromAddress is not supplied
  const sender = fromAddress || {
    sender_name: 'TANOAH',
    address_line1: 'Rappal, Pudukkad P O',
    address_line2: '',
    city: 'Thrissur',
    state: 'Kerala',
    postal_code: '680301',
    contact_phone: '+91 8714141849',
    contact_email: 'connectus.tanoah@gmail.com',
    gstin: '32AAAAA0000A1Z5',
  };

  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-packing-slip, #printable-packing-slip * {
            visibility: visible !important;
          }
          #printable-packing-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: 2px solid #000 !important;
            background: #fff !important;
            box-shadow: none !important;
            z-index: 9999 !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-[4px] shadow-2xl max-w-xl w-full my-8 border border-[#E7E7E7] font-poppins text-xs overflow-hidden print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Top Header Actions (Hidden in Print) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E7E7E7] bg-[#F8F8F8] print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-wondra text-lg text-black">PACKING SLIP</span>
            <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-2 py-0.5 rounded uppercase">
              Shipping Label
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
              className="bg-[#3F3F8F] hover:bg-[#343476]"
            >
              PRINT PACKING SLIP
            </Button>
            <button
              onClick={onClose}
              className="p-1 hover:text-[#3F3F8F] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Packing Slip Body */}
        <div
          id="printable-packing-slip"
          className="p-8 space-y-6 text-black bg-white border border-[#E7E7E7] m-4 rounded-[2px] print:m-0 print:p-6 print:border-2 print:border-black"
        >
          {/* Label Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <div className="font-wondra text-2xl tracking-widest text-black uppercase">
                {sender.sender_name || 'TANOAH'}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#333333] mt-0.5">
                DISPATCH & PACKAGING SLIP
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-black">
                ORDER: {orderNumber}
              </div>
              <div className="text-[10px] text-[#555555]">Date: {formattedDate}</div>
              {consignmentNo ? (
                <div className="text-[11px] font-mono font-bold text-black mt-1 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300 inline-block">
                  TRACKING: {consignmentNo}
                </div>
              ) : (
                <div className="text-[10px] text-[#777777] font-mono mt-1">
                  CARRIER: {courierName}
                </div>
              )}
            </div>
          </div>

          {/* 1. DELIVER TO ADDRESS (CUSTOMER) */}
          <div className="p-4 bg-neutral-50/80 border-2 border-black rounded-[2px] space-y-1.5">
            <div className="flex items-center justify-between border-b border-neutral-300 pb-1.5 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-black">
                <MapPin className="w-3.5 h-3.5" />
                SHIP TO (DELIVERY ADDRESS):
              </span>
              <span className="text-[10px] font-mono font-bold uppercase bg-black text-white px-2 py-0.5 rounded">
                DESTINATION
              </span>
            </div>
            <div className="text-sm font-bold text-black uppercase">
              {toAddress.firstName} {toAddress.lastName}
            </div>
            <div className="text-xs leading-relaxed text-[#111111]">
              <p>{toAddress.address}</p>
              {toAddress.apartment && <p>{toAddress.apartment}</p>}
              <p className="font-semibold text-black mt-1">
                {toAddress.city}, {toAddress.state} -{' '}
                <span className="font-mono text-base font-bold underline decoration-2">
                  {toAddress.postalCode}
                </span>
              </p>
              <p className="text-[11px] text-[#333333]">Country: India</p>
            </div>
            <div className="pt-2 border-t border-dashed border-neutral-300 flex flex-wrap justify-between text-[11px] font-semibold text-black">
              <span>PHONE: {toAddress.phone}</span>
              {toAddress.email && (
                <span className="text-[#555555] font-normal">{toAddress.email}</span>
              )}
            </div>
          </div>

          {/* 2. DISPATCHED FROM ADDRESS (SENDER) */}
          <div className="p-4 bg-white border border-neutral-400 rounded-[2px] space-y-1.5">
            <div className="flex items-center justify-between border-b border-neutral-300 pb-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-neutral-800">
                <Building2 className="w-3.5 h-3.5" />
                DISPATCHED FROM (RETURN IF UNDELIVERED):
              </span>
              <span className="text-[9px] uppercase font-semibold text-neutral-600">
                SENDER / WAREHOUSE
              </span>
            </div>
            <div className="text-xs font-bold text-black uppercase">
              {sender.sender_name}
            </div>
            <div className="text-[11px] leading-relaxed text-[#333333]">
              <p>{sender.address_line1}</p>
              {sender.address_line2 && <p>{sender.address_line2}</p>}
              <p>
                {sender.city}, {sender.state} -{' '}
                <strong className="text-black font-mono">{sender.postal_code}</strong>
              </p>
            </div>
            <div className="pt-1 text-[10px] text-[#555555] flex flex-wrap justify-between gap-2">
              <span>Contact: {sender.contact_phone}</span>
              {sender.contact_email && <span>Email: {sender.contact_email}</span>}
              {sender.gstin && <span>GSTIN: {sender.gstin}</span>}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="border-t border-neutral-300 pt-3 flex justify-between items-center text-[9px] text-[#666666] uppercase">
            <span>Official E-Commerce Consignment · Handle with Care</span>
            <span className="font-mono">TANOAH PARCEL DISPATCH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
