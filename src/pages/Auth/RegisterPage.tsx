import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Lock, Mail, User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { validateEmail, validatePhone } from '../../utils/validation';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { addToast } = useUIStore();
  const { user, isLoading: authLoading } = useAuthStore();

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

  // If already authenticated, redirect away immediately
  useEffect(() => {
    if (!authLoading && user) {
      const destination = getDestination();
      navigate(destination, { replace: true });
    }
  }, [user, authLoading]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      addToast({
        type: 'error',
        title: 'Invalid Email Address',
        description: emailValidation.error || 'Please enter a valid email address.',
      });
      return;
    }

    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.isValid) {
      addToast({
        type: 'error',
        title: 'Invalid Mobile Number',
        description: phoneValidation.error || 'Please enter a valid 10-digit mobile number.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailValidation.normalized,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: phoneValidation.normalized,
          },
        },
      });

      if (error) {
        addToast({ type: 'error', title: 'Sign Up Failed', description: error.message });
      } else {
        addToast({
          type: 'success',
          title: 'Account Created',
          description: 'Welcome to Tanoah. You can now sign in to your profile.',
        });
        navigate(`/login${location.search}`, { state: location.state, replace: true });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Registration Error', description: err.message });
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
          title: 'Google Sign-Up Failed',
          description: error.message || 'Unable to connect to Google. Please try again.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Google Sign-Up Error',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 text-left">
        <div className="text-center space-y-1">
          <Link to="/" className="inline-block mb-4">
            <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-9 w-auto mx-auto" />
          </Link>
          <h1 className="font-wondra text-2xl text-black">CREATE YOUR TANOAH ACCOUNT</h1>
          <p className="text-xs text-[#666666]">Unlock personalized styling, order tracking and members-only previews.</p>
        </div>

        {/* Google OAuth Quick Registration */}
        <div className="space-y-4">
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
            <span>Sign up with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E7E7E7]" />
            <span className="text-[10px] uppercase tracking-wider text-[#888888] font-medium">Or register with email</span>
            <div className="flex-1 h-px bg-[#E7E7E7]" />
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Full Name *
            </label>
            <div className="relative">
              <input
                required
                type="text"
                placeholder="Aditya Sharma"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Email Address *
            </label>
            <div className="relative">
              <input
                required
                type="email"
                placeholder="you@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Mobile Phone
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="+91 8714141849"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 pl-9 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
              />
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-black uppercase mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                required
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            CREATE ACCOUNT
          </Button>
        </form>

        <div className="pt-4 border-t border-[#E7E7E7] text-center text-xs text-[#666666]">
          Already have an account?{' '}
          <Link
            to={`/login${location.search}`}
            state={location.state}
            className="text-[#3F3F8F] font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
