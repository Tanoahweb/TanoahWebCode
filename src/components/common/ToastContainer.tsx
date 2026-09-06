import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        const containerClasses = isSuccess
          ? 'bg-[#15803D] border-[#166534] text-white shadow-2xl shadow-green-950/40'
          : isError
          ? 'bg-[#B91C1C] border-[#991B1B] text-white shadow-2xl shadow-red-950/40'
          : 'bg-[#3F3F8F] border-[#313174] text-white shadow-2xl shadow-indigo-950/40';

        const iconColor = isSuccess ? 'text-emerald-200' : isError ? 'text-rose-200' : 'text-indigo-200';
        const descColor = isSuccess ? 'text-emerald-50' : isError ? 'text-rose-50' : 'text-indigo-100';
        const closeBtnColor = isSuccess
          ? 'text-emerald-200 hover:text-white'
          : isError
          ? 'text-rose-200 hover:text-white'
          : 'text-indigo-200 hover:text-white';

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 border p-4 rounded-[8px] transition-all duration-300 text-left font-poppins ${containerClasses}`}
          >
            {isSuccess && <CheckCircle2 className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />}
            {isError && <AlertCircle className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />}
            {!isSuccess && !isError && <Info className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />}

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider leading-tight text-white">
                {toast.title}
              </h4>
              {toast.description && (
                <p className={`text-xs mt-1 leading-snug font-normal ${descColor}`}>
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className={`p-1 rounded transition-colors ${closeBtnColor}`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
