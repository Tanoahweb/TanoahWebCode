import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  variant?: 'new' | 'sale' | 'best-seller' | 'trending' | 'low-stock' | 'out-of-stock' | 'exclusive';
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'new', label, className }) => {
  const defaultLabels = {
    new: 'NEW',
    sale: 'SALE',
    'best-seller': 'BEST SELLER',
    trending: 'TRENDING',
    'low-stock': 'LOW STOCK',
    'out-of-stock': 'OUT OF STOCK',
    exclusive: 'EXCLUSIVE',
  };

  const variantStyles = {
    new: 'bg-[#3F3F8F] text-white',
    sale: 'bg-[#000000] text-white',
    'best-seller': 'bg-[#15152F] text-white',
    trending: 'bg-[#EEEEF8] text-[#3F3F8F] font-semibold',
    'low-stock': 'bg-[#FFF3E0] text-[#E65100]',
    'out-of-stock': 'bg-[#FAFAFA] text-[#888888] border border-[#E7E7E7]',
    exclusive: 'bg-[#3F3F8F] text-white',
  };

  const displayText = label || defaultLabels[variant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-block px-2.5 py-1 text-[10px] font-poppins font-medium tracking-widest uppercase rounded-[2px]',
          variantStyles[variant],
          className
        )
      )}
    >
      {displayText}
    </span>
  );
};
