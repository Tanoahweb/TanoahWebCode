import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useUIStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
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
        navigate('/login');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Registration Error', description: err.message });
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
          <h1 className="font-wondra text-2xl text-black">CREATE YOUR TANOAH ACCOUNT</h1>
          <p className="text-xs text-[#666666]">Unlock personalized styling, order tracking and members-only previews.</p>
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
                placeholder="+91 98765 43210"
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
          <Link to="/login" className="text-[#3F3F8F] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
