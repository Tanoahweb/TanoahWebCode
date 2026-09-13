import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

interface AdminGuardProps {
  children?: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, isAdmin, isLoading, signOut } = useAuthStore();
  const { addToast } = useUIStore();
  const location = useLocation();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 30-Minute Idle Inactivity Auto-Lock
  useEffect(() => {
    if (!user || !isAdmin) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(async () => {
        addToast({
          type: 'info',
          title: 'Session Locked',
          description: 'You have been logged out after 30 minutes of inactivity for security.',
        });
        await signOut();
      }, IDLE_TIMEOUT_MS);
    };

    // User interaction events that signify active session
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Initial timer setup
    resetIdleTimer();

    // Throttled activity listener
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          resetIdleTimer();
        }, 1000); // throttle to at most once per second
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, isAdmin, signOut, addToast]);

  // 1. Verification Loading State
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F8F8FA] text-black select-none">
        <div className="flex flex-col items-center">
          <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-9 w-auto object-contain animate-pulse mb-4" />
          <div className="w-28 h-[2px] bg-[#EEEEF8] rounded-full overflow-hidden relative mb-3">
            <div
              className="absolute top-0 bottom-0 bg-[#3F3F8F] rounded-full"
              style={{
                width: '50%',
                animation: 'adminAuthLoading 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
              }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#888888] font-semibold">
            Authenticating Admin Access...
          </span>
        </div>
        <style>{`
          @keyframes adminAuthLoading {
            0% { left: -50%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // 2. Reject unauthenticated or non-admin users
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname + location.search }} replace />;
  }

  // 3. Render protected admin routes
  return children ? <>{children}</> : <Outlet />;
};
