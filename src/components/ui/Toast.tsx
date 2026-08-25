import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  titleAr: string;
  descriptionAr?: string;
}

interface ToastContextType {
  showToast: (titleAr: string, descriptionAr?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((titleAr: string, descriptionAr?: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, titleAr, descriptionAr, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-50 flex flex-col gap-2.5 max-w-sm w-full dir-rtl pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-[#18110B]/95 border-[#D4AF37] text-[#FFF1C5] gold-glow-sm'
                : toast.type === 'error'
                ? 'bg-[#1A0A0A]/95 border-rose-500/80 text-rose-100'
                : toast.type === 'warning'
                ? 'bg-[#1A140A]/95 border-amber-500/80 text-amber-100'
                : 'bg-[#0A121A]/95 border-sky-500/80 text-sky-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <Sparkles className="w-5 h-5 text-[#D4AF37]" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
            </div>

            <div className="flex-1 space-y-0.5 text-right">
              <h4 className="text-xs sm:text-sm font-bold font-heading">{toast.titleAr}</h4>
              {toast.descriptionAr && (
                <p className="text-[11px] opacity-80 leading-relaxed">{toast.descriptionAr}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
