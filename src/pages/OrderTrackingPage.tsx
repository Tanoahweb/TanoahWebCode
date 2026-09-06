import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, CheckCircle2, Truck, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

const STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'Order received & confirmed by team' },
  { key: 'processing', label: 'Handcrafted / Prepared', desc: 'Garments inspected & packaged in luxury box' },
  { key: 'shipped', label: 'Dispatched via India Post', desc: 'Handed over to India Post (Speed Post / Parcel)' },
  { key: 'out', label: 'Out for Delivery', desc: 'India Post postman out for delivery to address' },
  { key: 'delivered', label: 'Delivered', desc: 'Signed & handed over to client' },
];

export const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialOrder = searchParams.get('order') || '';

  const [orderQuery, setOrderQuery] = useState(initialOrder);
  const [contactQuery, setContactQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(
    initialOrder
      ? {
          orderNumber: initialOrder,
          currentStep: 1,
          courier: 'India Post (Speed Post)',
          trackingId: '',
          estimatedDelivery: 'Within 2–4 Business Days',
        }
      : null
  );

  const handleCopyTracking = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;

    setIsLoading(true);
    const orderNum = orderQuery.trim().toUpperCase();

    try {
      const order = await api.getOrderByNumber(orderNum);
      if (order) {
        let step = 0;
        if (order.status === 'processing' || order.status === 'packed') step = 1;
        else if (order.status === 'shipped') step = 2;
        else if (order.status === 'out_for_delivery') step = 3;
        else if (order.status === 'delivered') step = 4;

        setTrackingResult({
          orderNumber: order.order_number || order.orderNumber || orderNum,
          currentStep: step,
          courier: order.courier_name || 'India Post (Speed Post)',
          trackingId: order.tracking_number || '',
          estimatedDelivery: 'Within 2–4 Business Days',
          grandTotal: order.grand_total,
          itemsCount: order.items?.length || 1,
        });
      } else {
        // Fallback tracking
        setTrackingResult({
          orderNumber: orderNum,
          currentStep: 1,
          courier: 'India Post (Speed Post)',
          trackingId: '',
          estimatedDelivery: 'Within 2–4 Business Days',
        });
      }
    } catch {
      setTrackingResult({
        orderNumber: orderNum,
        currentStep: 1,
        courier: 'India Post (Speed Post)',
        trackingId: '',
        estimatedDelivery: 'Within 2–4 Business Days',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-[11px] text-[#3F3F8F] font-semibold tracking-widest uppercase block mb-1">
            CONCIERGE TRACKING
          </span>
          <h1 className="font-wondra text-3xl sm:text-4xl text-black">
            TRACK YOUR CONSIGNMENT
          </h1>
          <p className="text-xs text-[#666666] mt-2 max-w-md mx-auto">
            Enter your order reference code to inspect live shipment milestones.
          </p>
        </div>

        {/* Tracking Search Form */}
        <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm mb-8">
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Order Number *
              </label>
              <input
                required
                type="text"
                placeholder="E.g., TAN-849201"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] uppercase font-mono"
              />
            </div>
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Email / Mobile (Optional)
              </label>
              <input
                type="text"
                placeholder="E.g., 8714141849"
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>
            <div className="sm:col-span-12 pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                icon={<Search className="w-4 h-4" />}
                className="w-full py-3"
              >
                LOCATE CONSIGNMENT
              </Button>
            </div>
          </form>
        </div>

        {/* Milestone Tracker */}
        {trackingResult && (
          <div className="bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-8 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E7E7E7] gap-2">
              <div>
                <span className="text-[10px] text-[#888888] uppercase tracking-wider">Tracking Order</span>
                <h3 className="font-mono text-lg font-bold text-black">{trackingResult.orderNumber}</h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-[#888888] uppercase tracking-wider">Carrier & Consignment</span>
                <p className="text-xs font-semibold text-[#3F3F8F]">
                  {trackingResult.courier} {trackingResult.trackingId ? `• ` : ''}
                  <span className="font-mono">{trackingResult.trackingId || '(Awaiting Consignment No.)'}</span>
                </p>
              </div>
            </div>

            <div className="relative pl-6 space-y-8 border-l-2 border-[#D5D5ED] ml-4">
              {STEPS.map((step, idx) => {
                const isPassed = idx <= trackingResult.currentStep;
                const isCurrent = idx === trackingResult.currentStep;

                return (
                  <div key={step.key} className="relative group">
                    <div
                      className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                        isPassed
                          ? 'bg-[#3F3F8F] text-white shadow-md'
                          : 'bg-white border-2 border-[#D5D5ED] text-[#888888]'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-semibold uppercase tracking-wider ${
                          isCurrent ? 'text-[#3F3F8F]' : isPassed ? 'text-black' : 'text-[#888888]'
                        }`}>
                          {step.label}
                        </h4>
                        {isCurrent && (
                          <span className="text-[9px] bg-[#EEEEF8] text-[#3F3F8F] px-2 py-0.5 rounded font-bold">
                            CURRENT STATUS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#666666] mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* India Post Official Tracking Portal Card */}
            <div className="bg-[#FAF9F6] p-5 sm:p-6 rounded-[4px] border border-[#3F3F8F]/25 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-[#3F3F8F] uppercase tracking-wider block mb-0.5">
                    Official India Post Tracking
                  </span>
                  <h4 className="font-semibold text-black text-sm">Track Directly on indiapost.gov.in</h4>
                </div>
                <a
                  href="https://www.indiapost.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3F3F8F] hover:bg-black text-white rounded-[4px] font-semibold text-xs tracking-wider transition-colors shadow-sm"
                >
                  <span>TRACK ON INDIAPOST.GOV.IN</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-[11px] text-[#666666] leading-relaxed">
                Tanoah deliveries are dispatched exclusively through India Post. You can track real-time transit scans directly on the India Post portal by copying your consignment number below and pasting it into the Track N Trace box.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#E7E7E7] rounded-[4px]">
                <div>
                  <span className="text-[10px] text-[#888888] uppercase block">India Post Consignment No.</span>
                  <span className={`font-mono text-sm ${trackingResult.trackingId ? 'font-bold text-black' : 'text-[#888888] italic'}`}>
                    {trackingResult.trackingId || 'Consignment number will appear here once dispatched'}
                  </span>
                </div>
                {trackingResult.trackingId ? (
                  <button
                    type="button"
                    onClick={() => handleCopyTracking(trackingResult.trackingId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E7E7E7] hover:border-black rounded-[4px] text-xs font-semibold text-black bg-[#FAFAFA] hover:bg-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Consignment Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#3F3F8F]" />
                        <span>Copy Consignment Number</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-[#888888] font-medium bg-[#EEEEF8] px-2.5 py-1 rounded-[2px]">
                    Pending Dispatch
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#EEEEF8] rounded-[4px] border border-[#3F3F8F]/20 flex items-center gap-3 text-xs">
              <Truck className="w-5 h-5 text-[#3F3F8F] shrink-0" />
              <div>
                <strong className="text-black block">Estimated Delivery: {trackingResult.estimatedDelivery}</strong>
                <span className="text-[#666666]">Insured India Post parcel with doorstep signature verification upon delivery.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
