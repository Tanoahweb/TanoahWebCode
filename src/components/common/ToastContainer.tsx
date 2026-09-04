import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 bg-white border border-[#E7E7E7] shadow-xl p-4 rounded-[6px] animate-fade-in text-left"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#3F3F8F] shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-black shrink-0 mt-0.5" />}

          <div className="flex-1">
            <h4 className="text-xs font-semibold text-black uppercase tracking-wider">{toast.title}</h4>
            {toast.description && <p className="text-xs text-[#666666] mt-0.5">{toast.description}</p>}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#999999] hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
