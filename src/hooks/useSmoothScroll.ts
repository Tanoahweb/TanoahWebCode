import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initSmoothScroll, destroySmoothScroll, getLenis } from '../animations/smoothScroll';
import { ScrollTrigger } from '../animations/gsap';

// In-memory cache for synchronous, instantaneous position lookup
const scrollPositions = new Map<string, number>();

// Flag to track whether the current navigation was triggered by browser Back/Forward (POP)
let isPopNavigation = false;
let lastPopTimestamp = 0;

if (typeof window !== 'undefined') {
  // Instruct the browser to let our code manage scroll restoration
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  // Listen to popstate (fires exclusively on Back/Forward / history navigation)
  window.addEventListener('popstate', () => {
    isPopNavigation = true;
    lastPopTimestamp = performance.now();
  });
}

const getLocationKey = (loc: { key?: string; pathname: string; search?: string }) => {
  if (loc.key && loc.key !== 'default') {
    return `key_${loc.key}`;
  }
  return `path_${loc.pathname}${loc.search || ''}`;
};

const getSavedScroll = (loc: { key?: string; pathname: string; search?: string }): number => {
  const primaryKey = getLocationKey(loc);
  const fallbackKey = `path_${loc.pathname}${loc.search || ''}`;

  if (scrollPositions.has(primaryKey)) {
    return scrollPositions.get(primaryKey)!;
  }
  if (scrollPositions.has(fallbackKey)) {
    return scrollPositions.get(fallbackKey)!;
  }

  try {
    const fromSession =
      sessionStorage.getItem(`tanoah_scroll_${primaryKey}`) ||
      sessionStorage.getItem(`tanoah_scroll_${fallbackKey}`);
    if (fromSession !== null) {
      const parsed = parseInt(fromSession, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch {
    // sessionStorage might be restricted in some iframe / private browsing contexts
  }

  return 0;
};

const saveCurrentScroll = (loc: { key?: string; pathname: string; search?: string }) => {
  const y = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
  const primaryKey = getLocationKey(loc);
  const fallbackKey = `path_${loc.pathname}${loc.search || ''}`;

  scrollPositions.set(primaryKey, y);
  scrollPositions.set(fallbackKey, y);

  try {
    sessionStorage.setItem(`tanoah_scroll_${primaryKey}`, String(y));
    sessionStorage.setItem(`tanoah_scroll_${fallbackKey}`, String(y));
  } catch {
    // Ignore storage quota errors
  }
};

export const useSmoothScroll = () => {
  const location = useLocation();
  const currentLocationRef = useRef(location);

  // 1. Continuous scroll position tracker
  useEffect(() => {
    currentLocationRef.current = location;

    const handleScroll = () => {
      const y = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
      const primaryKey = getLocationKey(currentLocationRef.current);
      const fallbackKey = `path_${currentLocationRef.current.pathname}${currentLocationRef.current.search || ''}`;
      scrollPositions.set(primaryKey, y);
      scrollPositions.set(fallbackKey, y);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', () => saveCurrentScroll(currentLocationRef.current));

    return () => {
      saveCurrentScroll(currentLocationRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, location.search, location.key]);

  // 2. Navigation handling: Scroll to top on PUSH, restore on POP
  useEffect(() => {
    // Admin panel uses native browser scrolling for nested layouts
    if (location.pathname.startsWith('/admin')) {
      destroySmoothScroll();
      return;
    }

    const lenis = initSmoothScroll();

    // Check if this navigation was caused by back / forward
    const isPop = isPopNavigation || performance.now() - lastPopTimestamp < 400;
    isPopNavigation = false;

    // Handle hash links (e.g., #contact)
    if (location.hash) {
      const targetElement = document.querySelector(location.hash);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    if (isPop) {
      // Restore previous scroll position
      const targetY = getSavedScroll(location);

      if (targetY > 0) {
        // Immediate scroll
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
        lenis?.scrollTo(targetY, { immediate: true });

        // Active restoration loop to handle asynchronous layout shifts
        let isCancelled = false;
        const startTime = performance.now();
        const maxDuration = 1200; // ms
        let stableFrames = 0;

        const onUserInteraction = () => {
          isCancelled = true;
          cleanup();
        };

        const cleanup = () => {
          window.removeEventListener('wheel', onUserInteraction);
          window.removeEventListener('touchstart', onUserInteraction);
          window.removeEventListener('keydown', onUserInteraction);
        };

        window.addEventListener('wheel', onUserInteraction, { passive: true, once: true });
        window.addEventListener('touchstart', onUserInteraction, { passive: true, once: true });
        window.addEventListener('keydown', onUserInteraction, { passive: true, once: true });

        const checkAndRestore = () => {
          if (isCancelled) return;

          const docHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          );

          if (docHeight > window.innerHeight) {
            window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
            lenis?.scrollTo(targetY, { immediate: true });
          }

          const currentY = Math.round(window.scrollY || document.documentElement.scrollTop || 0);

          if (Math.abs(currentY - targetY) <= 3) {
            stableFrames++;
            if (stableFrames >= 3) {
              cleanup();
              ScrollTrigger.refresh();
              return;
            }
          } else {
            stableFrames = 0;
          }

          if (performance.now() - startTime < maxDuration) {
            requestAnimationFrame(checkAndRestore);
          } else {
            cleanup();
            ScrollTrigger.refresh();
          }
        };

        requestAnimationFrame(checkAndRestore);
      } else {
        // Target is 0
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        lenis?.scrollTo(0, { immediate: true });
        setTimeout(() => ScrollTrigger.refresh(), 100);
      }
    } else {
      // Forward navigation (PUSH) to a new page -> start at top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      lenis?.scrollTo(0, { immediate: true });

      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, location.key]);

  return { lenis: getLenis() };
};
