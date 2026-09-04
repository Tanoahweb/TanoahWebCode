import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

// Helper to check for prefers-reduced-motion
export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Editorial Text Reveal Animation
export const animateTextReveal = (
  element: HTMLElement | null,
  options: { delay?: number; duration?: number; stagger?: number } = {}
) => {
  if (!element || isReducedMotion()) return;

  const { delay = 0.1, duration = 0.8, stagger = 0.05 } = options;
  const charsOrLines = element.querySelectorAll('.reveal-item');
  const targets = charsOrLines.length > 0 ? charsOrLines : element;

  return gsap.fromTo(
    targets,
    { y: '100%', opacity: 0 },
    {
      y: '0%',
      opacity: 1,
      duration,
      delay,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        once: true,
      },
    }
  );
};

// Section / Card Stagger Reveal Animation
export const animateStaggerFadeUp = (
  container: HTMLElement | null,
  childSelector: string = '.stagger-item',
  options: { stagger?: number; duration?: number; y?: number } = {}
) => {
  if (!container || isReducedMotion()) return;

  const { stagger = 0.08, duration = 0.7, y = 30 } = options;
  const items = container.querySelectorAll(childSelector);
  if (!items.length) return;

  return gsap.fromTo(
    items,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 85%',
        once: true,
      },
    }
  );
};

// Luxury Image Mask Reveal (Clip-path)
export const animateImageReveal = (
  imageContainer: HTMLElement | null,
  options: { duration?: number; delay?: number } = {}
) => {
  if (!imageContainer || isReducedMotion()) return;

  const { duration = 1.0, delay = 0 } = options;

  return gsap.fromTo(
    imageContainer,
    { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      scale: 1.0,
      duration,
      delay,
      ease: 'power3.inOut',
      scrollTrigger: {
        trigger: imageContainer,
        start: 'top 80%',
        once: true,
      },
    }
  );
};
