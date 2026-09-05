import React, { useEffect } from 'react';
import { Printer, Download, X, ShieldCheck } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../common/Button';
import { getLenis } from '../../animations/smoothScroll';

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: string;
    date: string;
    items: any[];
    subtotal: number;
    discount?: number;
    shipping?: number;
    codFee?: number;
    grandTotal: number;
    formData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: string;
      apartment?: string;
      city: string;
      state: string;
      postalCode: string;
      paymentMethod: string;
    };
  };
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({ isOpen, onClose, order }) => {
  useEffect(() => {
    const lenis = getLenis();
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      lenis?.stop();
    } else {
      document.body.style.overflow = '';
      lenis?.start();
    }
    return () => {
      document.body.style.overflow = '';
      lenis?.start();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${order.orderNumber.replace(/^TAN-/, '')}`;
  const invoiceDate = new Date(order.date || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const taxRate = 0.12; // 12% GST
  const taxableValue = Math.round(order.subtotal / (1 + taxRate));
  const totalGst = order.subtotal - taxableValue;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

  return (
    <div
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        data-lenis-prevent="true"
        className="bg-white rounded-[4px] shadow-2xl max-w-2xl w-full my-8 border border-[#E7E7E7] font-poppins text-xs overflow-hidden"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E7E7E7] bg-[#F8F8F8] print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-wondra text-lg text-black">TAX INVOICE</span>
            <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] font-bold px-2 py-0.5 rounded">
              GST COMPLIANT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
              PRINT / PDF
            </Button>
            <button onClick={onClose} className="p-1 hover:text-[#3F3F8F] transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 space-y-6 text-black" id="printable-invoice">
          {/* Header & Seller Details */}
          <div className="flex justify-between items-start border-b border-[#E7E7E7] pb-6">
            <div>
              <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-8 w-auto mb-2" />
              <div className="text-[11px] font-semibold text-black uppercase tracking-wider">
                TANOAH PRIVATE LIMITED
              </div>
              <div className="text-[10px] text-[#666666] leading-relaxed mt-0.5">
                Suite 401, Heritage Tower, Ballard Estate, Fort<br />
                Mumbai 400001, Maharashtra, India<br />
                <strong>GSTIN:</strong> 27AAAAA0000A1Z5 | <strong>State Code:</strong> 27
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-wondra text-[#3F3F8F]">TAX INVOICE</div>
              <div className="text-[11px] font-semibold mt-1">Invoice: {invoiceNumber}</div>
              <div className="text-[10px] text-[#666666]">Order Ref: {order.orderNumber}</div>
              <div className="text-[10px] text-[#666666]">Date: {invoiceDate}</div>
              <div className="text-[10px] text-[#666666]">Payment: {order.formData.paymentMethod.toUpperCase()}</div>
            </div>
          </div>

          {/* Bill To & Ship To */}
          <div className="grid grid-cols-2 gap-6 border-b border-[#E7E7E7] pb-6">
            <div>
              <div className="text-[10px] font-semibold text-[#3F3F8F] uppercase tracking-wider mb-1">
                BILLED TO / BUYER
              </div>
              <div className="font-semibold">{order.formData.firstName} {order.formData.lastName}</div>
              <div className="text-[#666666] leading-relaxed">
                {order.formData.address}
                {order.formData.apartment ? `, ${order.formData.apartment}` : ''}<br />
                {order.formData.city}, {order.formData.state} - {order.formData.postalCode}<br />
                Phone: {order.formData.phone}<br />
                Email: {order.formData.email}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#3F3F8F] uppercase tracking-wider mb-1">
                DISPATCH / COURIER DETAILS
              </div>
              <div className="font-semibold">India Post Speed Post</div>
              <div className="text-[#666666] leading-relaxed">
                Courier: India Post (Speed Post)<br />
                Tracking: Insured Tracked Dispatch (indiapost.gov.in)<br />
                Place of Supply: {order.formData.state}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left">
              <thead className="border-b border-[#E7E7E7] bg-[#F8F8F8] text-[10px] uppercase font-semibold text-[#666666]">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">HSN</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {order.items.map((item: any, idx: number) => {
                  const price = item.variant?.sale_price ?? item.variant?.price ?? item.unit_price ?? 0;
                  return (
                    <tr key={idx}>
                      <td className="py-3 px-3">
                        <div className="font-semibold">{item.product?.title || item.product_title}</div>
                        <div className="text-[10px] text-[#666666]">
                          {item.variant?.color_name} / {item.variant?.size} • SKU: {item.variant?.sku || item.sku}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px]">61091000</td>
                      <td className="py-3 px-3 text-center font-medium">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatPrice(price)}</td>
                      <td className="py-3 px-3 text-right font-semibold font-mono">
                        {formatPrice(price * item.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculation Breakdown */}
          <div className="border-t border-[#E7E7E7] pt-4 flex justify-between items-start">
            <div className="w-1/2 space-y-1.5 text-[10px] text-[#666666]">
              <p><strong>Tax Summary (12% Included):</strong></p>
              <p>Taxable Value: {formatPrice(taxableValue)}</p>
              <p>CGST (6%): {formatPrice(cgst)} | SGST (6%): {formatPrice(sgst)}</p>
              <p className="mt-2 italic">This is an authorized computer-generated tax invoice and requires no physical signature.</p>
            </div>

            <div className="w-1/2 max-w-xs space-y-1.5 text-right">
              <div className="flex justify-between text-[#666666]">
                <span>Subtotal (Inclusive of GST)</span>
                <span className="font-medium text-black">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount && order.discount > 0 && (
                <div className="flex justify-between text-[#3F3F8F] font-semibold">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#666666]">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping || 0)}</span>
              </div>
              {order.codFee && order.codFee > 0 && (
                <div className="flex justify-between text-[#666666]">
                  <span>COD Handling Fee</span>
                  <span>{formatPrice(order.codFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-black border-t border-[#E7E7E7] pt-2">
                <span>Grand Total</span>
                <span className="text-[#3F3F8F]">{formatPrice(order.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
