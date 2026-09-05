import Lenis from 'lenis';
import { gsap, ScrollTrigger, isReducedMotion } from './gsap';

let lenisInstance: Lenis | null = null;
let tickerCallback: ((time: number) => void) | null = null;

export const initSmoothScroll = (): Lenis | null => {
  if (typeof window === 'undefined') return null;
  if (isReducedMotion()) return null;

  if (lenisInstance) {
    return lenisInstance;
  }

  lenisInstance = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  // Synchronize Lenis with GSAP ScrollTrigger
  lenisInstance.on('scroll', () => {
    ScrollTrigger.update();
  });

  tickerCallback = (time: number) => {
    lenisInstance?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
};

export const getLenis = (): Lenis | null => lenisInstance;

export const destroySmoothScroll = () => {
  if (lenisInstance) {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback);
      tickerCallback = null;
    }
    lenisInstance.destroy();
    lenisInstance = null;
  }
};
