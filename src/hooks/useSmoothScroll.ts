import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initSmoothScroll, destroySmoothScroll, getLenis } from '../animations/smoothScroll';
import { ScrollTrigger } from '../animations/gsap';

export const useSmoothScroll = () => {
  const location = useLocation();

  useEffect(() => {
    // Admin panel uses native browser scrolling for nested layouts
    if (location.pathname.startsWith('/admin')) {
      destroySmoothScroll();
      return;
    }

    const lenis = initSmoothScroll();

    // Scroll to top instantly on route change
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true });

    // Refresh ScrollTrigger calculations after DOM settle
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(timer);
      destroySmoothScroll();
    };
  }, [location.pathname]);

  return { lenis: getLenis() };
};
