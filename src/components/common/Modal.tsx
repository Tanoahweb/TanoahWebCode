import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLenis } from '../../animations/smoothScroll';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  className,
}) => {
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

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        data-lenis-prevent="true"
        className={twMerge(
          clsx(
            'relative bg-white w-full rounded-[6px] shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in',
            maxWidthStyles[maxWidth],
            className
          )
        )}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E7E7E7] shrink-0 bg-white">
          {title ? (
            <h3 className="font-wondra text-xl text-black">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-black hover:text-[#3F3F8F] hover:bg-[#F8F8F8] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with smooth independent scrolling */}
        <div
          data-lenis-prevent="true"
          className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain focus:outline-none"
          tabIndex={-1}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
