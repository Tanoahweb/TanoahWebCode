import Lenis from 'lenis';
import { gsap, ScrollTrigger, isReducedMotion } from './gsap';

let lenisInstance: Lenis | null = null;
let tickerCallback: ((time: number) => void) | null = null;
let bodyResizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Manually forces Lenis and GSAP ScrollTrigger to recalculate
 * document boundaries when asynchronous content, catalogs, or images load.
 */
export const refreshSmoothScroll = () => {
  if (!lenisInstance) return;
  lenisInstance.resize();
  ScrollTrigger.refresh();
};

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
    touchMultiplier: 1.0,
  });

  // Synchronize Lenis with GSAP ScrollTrigger
  lenisInstance.on('scroll', () => {
    ScrollTrigger.update();
  });

  // RAF loop tied to GSAP ticker with stable lag smoothing
  tickerCallback = (time: number) => {
    lenisInstance?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  // Default lagSmoothing (500ms max, 33ms target) prevents sudden jumps during image decodes
  gsap.ticker.lagSmoothing(500, 33);

  // Automatic ResizeObserver on document.body:
  // When products, images, or dynamic sections load and expand document height,
  // Lenis automatically updates its max scroll limit so scrolling NEVER gets stuck.
  if (typeof ResizeObserver !== 'undefined' && document.body) {
    bodyResizeObserver = new ResizeObserver(() => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        if (lenisInstance) {
          lenisInstance.resize();
          ScrollTrigger.refresh();
        }
      }, 100);
    });
    bodyResizeObserver.observe(document.body);
  }

  return lenisInstance;
};

export const getLenis = (): Lenis | null => lenisInstance;

export const destroySmoothScroll = () => {
  if (bodyResizeObserver) {
    bodyResizeObserver.disconnect();
    bodyResizeObserver = null;
  }
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
  }
  if (lenisInstance) {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback);
      tickerCallback = null;
    }
    lenisInstance.destroy();
    lenisInstance = null;
  }
};
