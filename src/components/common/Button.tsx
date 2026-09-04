import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'right',
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-poppins font-medium transition-all duration-200 uppercase tracking-wider text-xs select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'px-4 py-2 text-[11px] rounded-[4px] gap-1.5',
    md: 'px-6 py-3 text-xs rounded-[4px] gap-2',
    lg: 'px-8 py-4 text-xs md:text-sm rounded-[6px] gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#3F3F8F] text-white hover:bg-[#343476] active:bg-[#2A2A5E] shadow-sm',
    secondary: 'bg-white text-[#3F3F8F] border border-[#3F3F8F] hover:bg-[#3F3F8F] hover:text-white',
    outline: 'bg-transparent text-black border border-[#E7E7E7] hover:border-black hover:bg-black hover:text-white',
    ghost: 'bg-transparent text-black hover:text-[#3F3F8F] hover:bg-[#EEEEF8]',
    dark: 'bg-black text-white hover:bg-[#1A1A1A]',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
      {!isLoading && icon && iconPosition === 'left' && <span className="inline-flex">{icon}</span>}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && <span className="inline-flex">{icon}</span>}
    </button>
  );
};
