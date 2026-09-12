import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  /** Minimum duration in milliseconds to display preloader for smooth UX */
  minDuration?: number;
  /** Callback when preloader finishes fading out */
  onComplete?: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({
  minDuration = 600,
  onComplete,
}) => {
  const [isFading, setIsFading] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    // 1. Immediately remove static HTML preloader from index.html if still present
    const staticLoader = document.getElementById('app-preloader');
    if (staticLoader) {
      staticLoader.classList.add('preloader-hidden');
      setTimeout(() => {
        try {
          staticLoader.remove();
        } catch {}
      }, 500);
    }

    // 2. Control React-level preloader dismissal
    const minTimer = setTimeout(() => {
      setIsFading(true);
      const removeTimer = setTimeout(() => {
        setIsRemoved(true);
        if (onComplete) onComplete();
      }, 500); // matches 500ms CSS fade-out transition
      return () => clearTimeout(removeTimer);
    }, minDuration);

    return () => clearTimeout(minTimer);
  }, [minDuration, onComplete]);

  if (isRemoved) return null;

  return (
    <div
      id="tanoah-react-preloader"
      role="status"
      aria-label="Loading Tanoah"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white select-none transition-all duration-500 ease-out ${
        isFading ? 'opacity-0 pointer-events-none scale-[1.02]' : 'opacity-100'
      }`}
      style={{ willChange: 'opacity, transform' }}
    >
      <div className="flex flex-col items-center justify-center">
        {/* Brand Logo with Gentle Breathing Animation */}
        <div className="relative mb-5 flex items-center justify-center">
          <img
            src="/Assets/brand/logo-blue.png"
            alt="TANOAH"
            className="h-10 sm:h-11 w-auto object-contain animate-pulse"
            style={{
              animationDuration: '2s',
              animationTimingFunction: 'ease-in-out',
            }}
          />
        </div>

        {/* Minimal Luxury Progress Bar */}
        <div className="w-28 sm:w-32 h-[2px] bg-[#EEEEF8] rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 bg-[#3F3F8F] rounded-full"
            style={{
              width: '45%',
              animation: 'tanoahPreloaderProgress 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite',
            }}
          />
        </div>

        {/* Subtle Brand Tagline */}
        <span className="text-[9px] uppercase tracking-[0.28em] text-[#888888] font-medium mt-3.5 select-none">
          Loading...
        </span>
      </div>

      <style>{`
        @keyframes tanoahPreloaderProgress {
          0% {
            left: -45%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
};
