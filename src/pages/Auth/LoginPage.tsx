import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { validateEmail } from '../../utils/validation';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isForgotSubmitted, setIsForgotSubmitted] = useState(false);
  const [accountNotFoundError, setAccountNotFoundError] = useState<string | null>(null);

  // Direct OTP & Password reset states
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { addToast } = useUIStore();
  const { user, isLoading: authLoading, initialize } = useAuthStore();

  const getDestination = () => {
    const rawFrom = (location.state as any)?.from || searchParams.get('from') || '';
    const openReview = (location.state as any)?.openReview || searchParams.get('action') === 'write_review';

    if (!rawFrom) {
      return openReview ? '/?action=write_review' : '/account';
    }

    if (openReview && !rawFrom.includes('action=write_review')) {
      const separator = rawFrom.includes('?') ? '&' : '?';
      return `${rawFrom}${separator}action=write_review`;
    }

    return rawFrom;
  };

  // Prevent back-button trap: If already authenticated, redirect away immediately
  useEffect(() => {
    if (!authLoading && user) {
      const destination = getDestination();
      navigate(destination, { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      addToast({
        type: 'error',
        title: 'Invalid Email Address',
        description: emailValidation.error || 'Please enter a valid email address.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValidation.normalized,
        password,
      });

      if (error) {
        addToast({ type: 'error', title: 'Login Failed', description: error.message || 'Invalid email or password.' });
      } else {
        await initialize();
        const currentIsAdmin = useAuthStore.getState().isAdmin;
        if (currentIsAdmin) {
          addToast({ type: 'success', title: 'Admin Access Verified', description: 'Redirecting to Store Management OS...' });
          navigate('/admin', { replace: true });
        } else {
          addToast({ type: 'success', title: 'Welcome Back', description: 'Logged into your Tanoah account.' });
          const destination = getDestination();
          navigate(destination, { replace: true });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Authentication Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const destination = getDestination();
      const redirectUrl = `${window.location.origin}${destination.startsWith('/') ? destination : `/${destination}`}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        addToast({
          type: 'error',
          title: 'Google Sign-In Failed',
          description: error.message || 'Unable to connect to Google. Please try again.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Google Sign-In Error',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountNotFoundError(null);

    const emailValidation = validateEmail(forgotEmail);
    if (!emailValidation.isValid) {
      addToast({
        type: 'error',
        title: 'Invalid Email Address',
        description: emailValidation.error || 'Please enter a valid email address.',
      });
      return;
    }
    const cleanEmail = emailValidation.normalized;

    if (resendCooldown > 0) {
      addToast({
        type: 'info',
        title: 'Please Wait',
        description: `You can request another verification code in ${resendCooldown} seconds.`,
      });
      return;
    }

    setIsForgotLoading(true);

    try {
      // 1. Verify that customer account exists in auth.users
      const { data: userExists, error: checkError } = await supabase.rpc('check_user_exists', {
        email_to_check: cleanEmail,
      });

      if (checkError) {
        console.warn('check_user_exists warning:', checkError);
      }

      if (!userExists) {
        setAccountNotFoundError(
          'No customer account was found with this email address. Please check your spelling or register a new account.'
        );
        addToast({
          type: 'error',
          title: 'Account Not Found',
          description: 'No registered customer account exists with this email address.',
        });
        setIsForgotLoading(false);
        return;
      }

      // 2. Dispatch reset token to registered customer
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const isRateLimit = error.message?.toLowerCase().includes('rate limit') || (error as any).status === 429;
        if (isRateLimit) {
          setResendCooldown(60);
          addToast({
            type: 'error',
            title: 'Security Cooldown Active',
            description: 'Supabase email rate limit reached. Please wait 60 seconds before trying again.',
          });
        } else {
          addToast({ type: 'error', title: 'Reset Request Failed', description: error.message });
        }
      } else {
        setIsForgotSubmitted(true);
        setResendCooldown(60);
        addToast({
          type: 'success',
          title: 'Verification Code Dispatched',
          description: `Verification details have been sent to ${cleanEmail}.`,
        });
      }
    } catch (err: any) {
      const isRateLimit = err.message?.toLowerCase().includes('rate limit') || err.status === 429;
      if (isRateLimit) {
        setResendCooldown(60);
        addToast({
          type: 'error',
          title: 'Security Cooldown Active',
          description: 'Supabase email rate limit reached. Please wait 60 seconds before trying again.',
        });
      } else {
        addToast({ type: 'error', title: 'Error', description: err.message || 'Could not send reset instructions.' });
      }
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!otpCode || otpCode.trim().length < 6) {
      addToast({ type: 'error', title: 'Invalid Code', description: 'Please enter the 6-digit code received in your email.' });
      return;
    }

    if (newPassword.length < 6) {
      addToast({ type: 'error', title: 'Password Too Short', description: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      addToast({ type: 'error', title: 'Passwords Mismatch', description: 'New passwords do not match.' });
      return;
    }

    setIsResettingPassword(true);

    try {
      // 1. Verify OTP with Supabase recovery token
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: otpCode.trim(),
        type: 'recovery',
      });

      if (error) {
        addToast({
          type: 'error',
          title: 'Verification Failed',
          description: error.message || 'The verification code is incorrect or has expired.',
        });
        setIsResettingPassword(false);
        return;
      }

      // 2. Update user's password with new credentials
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        addToast({ type: 'error', title: 'Password Update Failed', description: updateError.message });
        setIsResettingPassword(false);
        return;
      }

      await initialize();
      addToast({
        type: 'success',
        title: 'Password Reset Successful',
        description: 'Welcome to your Tanoah account! You are now logged in.',
      });
      navigate('/account');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset Error', description: err.message || 'Could not reset password.' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 text-left">
        <div className="text-center space-y-1">
          <Link to="/" className="inline-block mb-4">
            <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-9 w-auto mx-auto" />
          </Link>
          <h1 className="font-wondra text-2xl text-black">
            {isForgotPassword ? 'RESET YOUR PASSWORD' : 'SIGN IN TO YOUR ACCOUNT'}
          </h1>
          <p className="text-xs text-[#666666]">
            {isForgotPassword
              ? isForgotSubmitted
                ? 'Enter the 6-digit code sent to your email to set a new password.'
                : "Enter your account email and we'll send you instructions to reset your password."
              : 'Access your orders, bespoke wishlist and saved addresses.'}
          </p>
        </div>

        {isForgotPassword ? (
          isForgotSubmitted ? (
            <div className="space-y-5">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verification Code Dispatched</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed pl-6">
                  We sent a 6-digit code to <strong className="text-emerald-950 font-semibold">{forgotEmail}</strong>. You can enter the code below or click the link in your email.
                </p>
              </div>

              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    6-Digit Verification Code *
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] font-mono text-center tracking-widest text-base focus:outline-none focus:border-[#3F3F8F]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                    />
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                    />
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  isLoading={isResettingPassword}
                  icon={<ArrowRight className="w-4 h-4" />}
                  className="w-full py-3.5 font-semibold text-xs mt-2"
                >
                  VERIFY & RESET PASSWORD
                </Button>

                <div className="flex items-center justify-between pt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isForgotLoading || resendCooldown > 0}
                    className={`font-medium transition-colors ${
                      resendCooldown > 0 ? 'text-neutral-400 cursor-not-allowed' : 'text-[#3F3F8F] hover:underline'
                    }`}
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotSubmitted(false);
                      setOtpCode('');
                    }}
                    className="text-neutral-500 hover:text-black font-medium"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              {accountNotFoundError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 space-y-1">
                  <p className="font-semibold">{accountNotFoundError}</p>
                  <Link to="/register" className="text-red-900 font-bold underline block mt-1">
                    Click here to create an account &rarr;
                  </Link>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    required
                    type="email"
                    placeholder="you@domain.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (accountNotFoundError) setAccountNotFoundError(null);
                    }}
                    className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isForgotLoading}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full py-3.5 font-semibold text-xs mt-2"
              >
                SEND VERIFICATION CODE
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setAccountNotFoundError(null);
                }}
                className="w-full py-2.5 text-xs text-neutral-600 hover:text-black font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </form>
          )
        ) : (
          <div className="space-y-4">
            {/* Google OAuth Quick Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-3 px-4 bg-white hover:bg-[#F9F9FB] active:bg-[#F2F2F6] text-neutral-800 border border-[#D5D5DC] rounded-[4px] font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-xs hover:border-[#A5A5BA] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E7E7E7]" />
              <span className="text-[10px] uppercase tracking-wider text-[#888888] font-medium">Or continue with email</span>
              <div className="flex-1 h-px bg-[#E7E7E7]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Email Address *
              </label>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-black uppercase">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setIsForgotPassword(true);
                    setIsForgotSubmitted(false);
                  }}
                  className="text-[11px] text-[#3F3F8F] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full py-3.5 font-semibold text-xs mt-2"
            >
              SIGN IN
            </Button>
          </form>
        </div>
      )}

        <div className="pt-4 border-t border-[#E7E7E7] text-center text-xs text-[#666666]">
          Don't have an account yet?{' '}
          <Link
            to={`/register${location.search}`}
            state={location.state}
            className="text-[#3F3F8F] font-semibold hover:underline"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};
