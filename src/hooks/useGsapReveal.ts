import { useEffect, useRef } from 'react';
import { animateStaggerFadeUp, animateTextReveal, animateImageReveal } from '../animations/gsap';

export const useGsapReveal = (options?: {
  stagger?: number;
  duration?: number;
  y?: number;
  childSelector?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const anim = animateStaggerFadeUp(containerRef.current, options?.childSelector || '.stagger-item', {
      stagger: options?.stagger,
      duration: options?.duration,
      y: options?.y,
    });

    return () => {
      anim?.kill();
    };
  }, [options?.stagger, options?.duration, options?.y, options?.childSelector]);

  return containerRef;
};
