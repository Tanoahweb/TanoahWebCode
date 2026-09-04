import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';

export const ReturnsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialOrder = searchParams.get('order') || 'TAN-849201';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [returnType, setReturnType] = useState<'exchange' | 'return'>('exchange');
  const [reason, setReason] = useState('Wrong Size');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addToast } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.submitReturn({
        order_number: orderNumber.trim(),
        return_type: returnType,
        reason,
        customer_description: description,
      });

      setIsSubmitted(true);
      addToast({
        type: 'success',
        title: 'Request Logged',
        description: res.message || 'Our atelier concierge will verify and schedule your doorstep exchange pickup.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Error',
        description: err.message || 'Failed to submit request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center font-poppins">
        <div className="w-16 h-16 bg-[#EEEEF8] text-[#3F3F8F] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-wondra text-3xl text-black">REQUEST REGISTERED</h2>
        <p className="text-xs text-[#666666] mt-2 mb-6 max-w-sm mx-auto">
          Your return/exchange ticket for order <strong>{orderNumber}</strong> has been generated. You will receive an SMS when the courier pickup is scheduled.
        </p>
        <Button variant="primary" size="md" onClick={() => navigate('/account')}>
          RETURN TO ACCOUNT
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 text-left">
          <div className="pb-4 border-b border-[#E7E7E7]">
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
              CLIENT SERVICES
            </span>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black">
              REQUEST A RETURN OR SIZE EXCHANGE
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Order Number *
              </label>
              <input
                required
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Resolution Preference *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 border rounded-[4px] flex items-center gap-2 cursor-pointer ${
                  returnType === 'exchange' ? 'border-[#3F3F8F] bg-[#EEEEF8]/40' : 'border-[#E7E7E7]'
                }`}>
                  <input
                    type="radio"
                    name="returnType"
                    checked={returnType === 'exchange'}
                    onChange={() => setReturnType('exchange')}
                    className="accent-[#3F3F8F]"
                  />
                  <span className="font-semibold text-black">Exchange Size / Color</span>
                </label>

                <label className={`p-3 border rounded-[4px] flex items-center gap-2 cursor-pointer ${
                  returnType === 'return' ? 'border-[#3F3F8F] bg-[#EEEEF8]/40' : 'border-[#E7E7E7]'
                }`}>
                  <input
                    type="radio"
                    name="returnType"
                    checked={returnType === 'return'}
                    onChange={() => setReturnType('return')}
                    className="accent-[#3F3F8F]"
                  />
                  <span className="font-semibold text-black">Return & Full Refund</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white"
              >
                <option value="Wrong Size">Wrong Size / Fit Issue</option>
                <option value="Damaged">Damaged in Transit</option>
                <option value="Not as Described">Fabric Texture Not as Expected</option>
                <option value="Changed Mind">Changed Mind</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Additional Comments
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention which size you would like to swap for..."
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full py-3.5"
            >
              SUBMIT REQUEST
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
