import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // 1. Check if user is already authenticated or if recovery session exists
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        }
      } catch (e) {
        console.warn('Error checking recovery session:', e);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // 2. Listen for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      addToast({
        type: 'error',
        title: 'Password Too Short',
        description: 'Password must contain at least 6 characters.',
      });
      return;
    }

    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords Mismatch',
        description: 'The confirmation password does not match.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        addToast({
          type: 'error',
          title: 'Update Failed',
          description: error.message,
        });
      } else {
        setIsSuccess(true);
        addToast({
          type: 'success',
          title: 'Password Updated',
          description: 'Your new password has been set. You can now access your account.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message || 'Could not update password. Please request a new link.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6 text-left">
        <div className="text-center space-y-1">
          <Link to="/" className="inline-block mb-4">
            <img src="/Assets/brand/logo-blue.png" alt="TANOAH" className="h-9 w-auto mx-auto" />
          </Link>
          <h1 className="font-wondra text-2xl text-black">SET NEW PASSWORD</h1>
          <p className="text-xs text-[#666666]">Choose a secure password for your Tanoah account.</p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-black">Password Changed Successfully!</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Your credentials have been securely updated. You can now sign in to your profile and continue shopping.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/account')}
              className="w-full py-3 text-xs uppercase font-semibold tracking-wider"
            >
              Go to My Account
            </Button>
          </div>
        ) : !hasSession && !isCheckingSession ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-black">Invalid or Expired Link</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                This password reset link is invalid or has already expired. Please request a new link from the login page.
              </p>
            </div>
            <Link to="/login" className="block pt-2">
              <Button variant="primary" size="md" className="w-full text-xs">
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              SAVE NEW PASSWORD
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-[#E7E7E7] text-center text-xs text-[#666666]">
          Remember your password?{' '}
          <Link to="/login" className="text-[#3F3F8F] font-semibold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};