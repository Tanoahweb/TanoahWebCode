import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isLoading: authLoading, initialize } = useAuthStore();
  const { addToast } = useUIStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Brute force lockout states
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('tanoah_admin_failed_attempts') || '0', 10);
  });
  const [lockedUntil, setLockedUntil] = useState<number>(() => {
    return parseInt(localStorage.getItem('tanoah_admin_locked_until') || '0', 10);
  });
  const [remainingLockSeconds, setRemainingLockSeconds] = useState<number>(0);

  // If already authenticated with admin role, redirect to admin panel
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      const destination = (location.state as any)?.from || '/admin';
      navigate(destination, { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate, location]);

  // Lockout countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (lockedUntil > now) {
        setRemainingLockSeconds(Math.ceil((lockedUntil - now) / 1000));
      } else {
        setRemainingLockSeconds(0);
        if (lockedUntil > 0) {
          localStorage.removeItem('tanoah_admin_locked_until');
          localStorage.removeItem('tanoah_admin_failed_attempts');
          setLockedUntil(0);
          setFailedAttempts(0);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = remainingLockSeconds > 0;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLocked) {
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both administrative username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Direct Supabase Auth password verification
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error || !data.user) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem('tanoah_admin_failed_attempts', String(nextAttempts));

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_DURATION_MS;
          setLockedUntil(lockTime);
          localStorage.setItem('tanoah_admin_locked_until', String(lockTime));
          setErrorMessage(`Access locked due to ${MAX_FAILED_ATTEMPTS} consecutive failed attempts. Please wait 15 minutes.`);
          addToast({
            type: 'error',
            title: 'Security Lockout Activated',
            description: 'Too many failed login attempts. Gateway locked for 15 minutes.',
          });
        } else {
          const remaining = MAX_FAILED_ATTEMPTS - nextAttempts;
          setErrorMessage(`Invalid administrative credentials. (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining before temporary lockout)`);
        }
        return;
      }

      // Refresh store to check verified admin role
      await initialize();
      const currentIsAdmin = useAuthStore.getState().isAdmin;

      if (!currentIsAdmin) {
        // Authenticated as regular customer but not permitted as admin
        await supabase.auth.signOut();
        setErrorMessage('Access Denied: This account is not registered as an authorized store administrator.');
        addToast({
          type: 'error',
          title: 'Unauthorized Account',
          description: 'This user does not have administrative clearance.',
        });
        return;
      }

      // Successful login: reset failed counters
      localStorage.removeItem('tanoah_admin_failed_attempts');
      localStorage.removeItem('tanoah_admin_locked_until');
      setFailedAttempts(0);
      setLockedUntil(0);

      addToast({
        type: 'success',
        title: 'Authentication Verified',
        description: 'Welcome to Tanoah Store Management OS.',
      });

      const destination = (location.state as any)?.from || '/admin';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLockTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#0E0E1A] flex flex-col justify-between text-white font-poppins selection:bg-[#3F3F8F] selection:text-white">
      {/* Top Bar with Security Badge */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#0E0E1A]/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/Assets/brand/logo-white.png" alt="TANOAH" className="h-6 w-auto object-contain" />
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#D4AF37] px-2 py-0.5 rounded bg-white/5 border border-[#D4AF37]/30">
            Admin Gateway
          </span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">256-Bit TLS Vault Enforced</span>
        </div>
      </header>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[420px] bg-[#151526] border border-white/10 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Top Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#191846] border border-[#D4AF37]/30 text-[#D4AF37] mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Store Management OS</h1>
            <p className="text-xs text-neutral-400 mt-1.5">
              Authorized TANOAH personnel portal
            </p>
          </div>

          {/* Lockout Warning Banner */}
          {isLocked && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-100">Gateway Temporarily Locked</div>
                <div className="text-[11px] text-red-300/90 mt-0.5">
                  Too many failed login attempts. Next unlock in{' '}
                  <strong className="font-mono text-white text-xs">{formatLockTime(remainingLockSeconds)}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !isLocked && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {/* Email / Username */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Admin Username / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLocked || isSubmitting}
                  placeholder="connectus.tanoah@gmail.com"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0E0E1A] border border-white/10 rounded-lg text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked || isSubmitting}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0E0E1A] border border-white/10 rounded-lg text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLocked || isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-[#3F3F8F] hover:bg-[#4E4EA6] active:bg-[#34347A] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-[#3F3F8F]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : isLocked ? (
                <span>Locked ({formatLockTime(remainingLockSeconds)})</span>
              ) : (
                <>
                  <span>Sign In to Admin OS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 pt-5 border-t border-white/10 text-center">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Protected by Supabase Cryptographic Session Tokens. All administrative actions are logged with IP & timestamp.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Return Link */}
      <footer className="px-6 py-4 text-center border-t border-white/10 bg-[#0E0E1A]/80">
        <Link
          to="/"
          className="text-xs text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
        >
          &larr; Return to TANOAH Storefront
        </Link>
      </footer>
    </div>
  );
};
