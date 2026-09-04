import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';

interface FreeShippingProgressBarProps {
  subtotal: number;
  threshold: number;
}

export const FreeShippingProgressBar: React.FC<FreeShippingProgressBarProps> = ({
  subtotal,
  threshold,
}) => {
  const remaining = Math.max(0, threshold - subtotal);
  const percentage = Math.min(100, Math.round((subtotal / threshold) * 100));
  const isUnlocked = remaining === 0;

  return (
    <div className="bg-[#EEEEF8] p-3.5 rounded-[4px] border border-[#D5D5ED]/50 font-poppins text-xs">
      <div className="flex items-center gap-2 mb-2 font-medium text-black">
        {isUnlocked ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            <span className="text-[#3F3F8F] font-semibold">You have unlocked FREE COMPLIMENTARY SHIPPING!</span>
          </>
        ) : (
          <>
            <Truck className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            <span>
              Add <strong className="text-[#3F3F8F]">{formatPrice(remaining)}</strong> more to unlock <strong className="text-[#3F3F8F]">FREE SHIPPING</strong>
            </span>
          </>
        )}
      </div>

      <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#D5D5ED]">
        <div
          className="bg-[#3F3F8F] h-full transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
