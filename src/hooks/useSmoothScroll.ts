import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initSmoothScroll, destroySmoothScroll, getLenis } from '../animations/smoothScroll';
import { ScrollTrigger } from '../animations/gsap';

// In-memory cache for synchronous, instantaneous position lookup
const scrollPositions = new Map<string, number>();

// Global flag to completely mute scroll listeners during programmatic restore or transition
let isRestoring = false;

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

  // Pre-capture scroll position immediately when user clicks any link/button that navigates
  window.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && !isRestoring) {
        const y = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
        const path = window.location.pathname + window.location.search;
        scrollPositions.set(`path_${path}`, y);
        try {
          sessionStorage.setItem(`tanoah_scroll_path_${path}`, String(y));
        } catch {}
      }
    },
    true
  );
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

  if (scrollPositions.has(primaryKey) && scrollPositions.get(primaryKey)! > 0) {
    return scrollPositions.get(primaryKey)!;
  }
  if (scrollPositions.has(fallbackKey) && scrollPositions.get(fallbackKey)! > 0) {
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
  } catch {}

  return 0;
};

const saveCurrentScroll = (loc: { key?: string; pathname: string; search?: string }) => {
  if (isRestoring) return;
  const y = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
  const primaryKey = getLocationKey(loc);
  const fallbackKey = `path_${loc.pathname}${loc.search || ''}`;

  scrollPositions.set(primaryKey, y);
  scrollPositions.set(fallbackKey, y);

  try {
    sessionStorage.setItem(`tanoah_scroll_${primaryKey}`, String(y));
    sessionStorage.setItem(`tanoah_scroll_${fallbackKey}`, String(y));
  } catch {}
};

export const useSmoothScroll = () => {
  const location = useLocation();
  const currentLocationRef = useRef(location);

  // 1. Continuous scroll position tracker
  useEffect(() => {
    currentLocationRef.current = location;

    const handleScroll = () => {
      // CRITICAL: Ignore scroll events during restoration to avoid overwriting with clamped values!
      if (isRestoring) return;

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
        isRestoring = true;

        // Temporarily pause Lenis raf ticker while page layout stabilizes
        lenis?.stop();

        let isCancelled = false;
        const startTime = performance.now();
        const maxDuration = 2500; // ms: give ample time for sections/images to expand
        let stableFrames = 0;
        let resizeObserver: ResizeObserver | null = null;

        const onUserInteraction = () => {
          if (isCancelled) return;
          isCancelled = true;
          cleanup();
          lenis?.start();
          isRestoring = false;
        };

        const cleanup = () => {
          window.removeEventListener('wheel', onUserInteraction);
          window.removeEventListener('touchstart', onUserInteraction);
          window.removeEventListener('keydown', onUserInteraction);
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }
        };

        window.addEventListener('wheel', onUserInteraction, { passive: true, once: true });
        window.addEventListener('touchstart', onUserInteraction, { passive: true, once: true });
        window.addEventListener('keydown', onUserInteraction, { passive: true, once: true });

        const performScroll = () => {
          if (isCancelled) return;

          lenis?.resize();
          window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
          lenis?.scrollTo(targetY, { immediate: true, force: true });

          const currentY = Math.round(window.scrollY || document.documentElement.scrollTop || 0);

          if (Math.abs(currentY - targetY) <= 6) {
            stableFrames++;
            if (stableFrames >= 5) {
              cleanup();
              lenis?.resize();
              lenis?.scrollTo(targetY, { immediate: true, force: true });
              lenis?.start();
              ScrollTrigger.refresh();
              setTimeout(() => {
                isRestoring = false;
              }, 100);
              return;
            }
          } else {
            stableFrames = 0;
          }

          if (performance.now() - startTime < maxDuration) {
            requestAnimationFrame(performScroll);
          } else {
            cleanup();
            lenis?.resize();
            lenis?.scrollTo(targetY, { immediate: true, force: true });
            lenis?.start();
            ScrollTrigger.refresh();
            setTimeout(() => {
              isRestoring = false;
            }, 100);
          }
        };

        // Observe DOM height changes as async images/sections mount
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            if (!isCancelled) {
              performScroll();
            }
          });
          resizeObserver.observe(document.body);
        }

        requestAnimationFrame(performScroll);
      } else {
        // Target is top (0)
        isRestoring = true;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        lenis?.scrollTo(0, { immediate: true, force: true });
        setTimeout(() => {
          ScrollTrigger.refresh();
          isRestoring = false;
        }, 100);
      }
    } else {
      // Forward navigation (PUSH) to a new page -> start at top
      isRestoring = true;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      lenis?.scrollTo(0, { immediate: true, force: true });

      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
        isRestoring = false;
      }, 150);

      return () => {
        clearTimeout(timer);
        isRestoring = false;
      };
    }
  }, [location.pathname, location.search, location.key]);

  return { lenis: getLenis() };
};
