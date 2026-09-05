import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initSmoothScroll, destroySmoothScroll, getLenis } from '../animations/smoothScroll';
import { ScrollTrigger } from '../animations/gsap';

// In-memory cache for synchronous, instantaneous position lookup
const scrollPositions = new Map<string, number>();

// Global flag to mute scroll tracking during restoration
let isRestoring = false;

// Flag to track whether the current navigation was triggered by browser Back/Forward (POP)
let isPopNavigation = false;
let lastPopTimestamp = 0;

if (typeof window !== 'undefined') {
  // Disable native browser auto-scroll jump so our pre-paint layout effect has full control
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  // Listen to popstate (fires exclusively on Back/Forward / history navigation)
  window.addEventListener('popstate', () => {
    isPopNavigation = true;
    lastPopTimestamp = performance.now();
  });

  // Pre-capture scroll position immediately on any user click (Link, Button, Card, etc.)
  window.addEventListener(
    'click',
    () => {
      if (!isRestoring) {
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

const getSavedScroll = (loc: { pathname: string; search?: string }): number => {
  const pathKey = `path_${loc.pathname}${loc.search || ''}`;

  if (scrollPositions.has(pathKey) && scrollPositions.get(pathKey)! > 0) {
    return scrollPositions.get(pathKey)!;
  }

  try {
    const fromSession = sessionStorage.getItem(`tanoah_scroll_${pathKey}`);
    if (fromSession !== null) {
      const parsed = parseInt(fromSession, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}

  return 0;
};

export const useSmoothScroll = () => {
  const location = useLocation();
  const currentLocationRef = useRef(location);

  // 1. Continuous scroll position tracker during active user scrolling
  useEffect(() => {
    currentLocationRef.current = location;

    const handleScroll = () => {
      if (isRestoring) return;
      const y = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
      const pathKey = `path_${currentLocationRef.current.pathname}${currentLocationRef.current.search || ''}`;
      scrollPositions.set(pathKey, y);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Save on tab switch / window unload
    const handleUnload = () => {
      if (!isRestoring) {
        const y = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
        const pathKey = `path_${currentLocationRef.current.pathname}${currentLocationRef.current.search || ''}`;
        try {
          sessionStorage.setItem(`tanoah_scroll_${pathKey}`, String(y));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      // NOTE: Do NOT read window.scrollY here, because during unmount the DOM is collapsed!
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [location.pathname, location.search]);

  // 2. Pre-paint scroll restoration via useLayoutEffect (ZERO JUMP!)
  useLayoutEffect(() => {
    // Admin panel uses native browser scrolling for nested layouts
    if (location.pathname.startsWith('/admin')) {
      destroySmoothScroll();
      return;
    }

    const lenis = initSmoothScroll();

    // Check if this navigation was caused by back / forward
    const isPop = isPopNavigation || performance.now() - lastPopTimestamp < 500;
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

        // Apply scroll synchronously BEFORE the browser paints the first frame (NO JUMP!)
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
        lenis?.resize();
        lenis?.scrollTo(targetY, { immediate: true, force: true });

        // Maintain position for the next few animation frames as DOM components hydrate
        let frameCount = 0;
        let isCancelled = false;

        const onUserInteraction = () => {
          isCancelled = true;
          isRestoring = false;
          window.removeEventListener('wheel', onUserInteraction);
          window.removeEventListener('touchstart', onUserInteraction);
          window.removeEventListener('keydown', onUserInteraction);
        };

        window.addEventListener('wheel', onUserInteraction, { passive: true, once: true });
        window.addEventListener('touchstart', onUserInteraction, { passive: true, once: true });
        window.addEventListener('keydown', onUserInteraction, { passive: true, once: true });

        const keepPinned = () => {
          if (isCancelled) return;

          window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
          lenis?.resize();
          lenis?.scrollTo(targetY, { immediate: true, force: true });

          frameCount++;
          if (frameCount < 12) {
            requestAnimationFrame(keepPinned);
          } else {
            ScrollTrigger.refresh();
            window.removeEventListener('wheel', onUserInteraction);
            window.removeEventListener('touchstart', onUserInteraction);
            window.removeEventListener('keydown', onUserInteraction);
            setTimeout(() => {
              isRestoring = false;
            }, 50);
          }
        };

        requestAnimationFrame(keepPinned);
      } else {
        // Target is top (0)
        isRestoring = true;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        lenis?.resize();
        lenis?.scrollTo(0, { immediate: true, force: true });
        setTimeout(() => {
          ScrollTrigger.refresh();
          isRestoring = false;
        }, 50);
      }
    } else {
      // Forward navigation (PUSH) to a new page -> start at top BEFORE paint
      isRestoring = true;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      lenis?.resize();
      lenis?.scrollTo(0, { immediate: true, force: true });

      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
        isRestoring = false;
      }, 50);

      return () => {
        clearTimeout(timer);
        isRestoring = false;
      };
    }
  }, [location.pathname, location.search]);

  return { lenis: getLenis() };
};
