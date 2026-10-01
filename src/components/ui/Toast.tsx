import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      <div className="fixed bottom-24 sm:bottom-6 left-1/2 sm:left-6 -translate-x-1/2 sm:translate-x-0 z-[100] flex flex-col gap-3 w-[92%] sm:w-auto sm:max-w-sm sm:min-w-[320px] pointer-events-none items-center sm:items-start dir-rtl">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl w-full ${
                toast.type === 'success'
                  ? 'bg-[#1A120B]/95 border-[#D4AF37]/80 text-[#FFF1C5] shadow-[0_10px_35px_rgba(0,0,0,0.8)] gold-glow-sm'
                  : toast.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/60 text-rose-100 shadow-[0_10px_35px_rgba(225,29,72,0.2)]'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-[0_10px_35px_rgba(217,119,6,0.2)]'
                  : 'bg-sky-950/95 border-sky-500/60 text-sky-100 shadow-[0_10px_35px_rgba(2,132,199,0.2)]'
              }`}
            >
              <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border ${
                toast.type === 'success' ? 'bg-[#2D1F14] border-[#3D2C1E] text-[#D4AF37]' :
                toast.type === 'error' ? 'bg-rose-900/30 border-rose-500/30 text-rose-400' :
                toast.type === 'warning' ? 'bg-amber-900/30 border-amber-500/30 text-amber-400' :
                'bg-sky-900/30 border-sky-500/30 text-sky-400'
              }`}>
                {toast.type === 'success' && <Sparkles className="w-5 h-5" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>

              <div className="flex-1 space-y-1 mt-0.5">
                <h4 className="text-sm font-black font-heading leading-tight">{toast.titleAr}</h4>
                {toast.descriptionAr && (
                  <p className="text-xs opacity-80 leading-relaxed font-medium">{toast.descriptionAr}</p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-current opacity-60 hover:opacity-100 hover:bg-white/10 transition-all p-1.5 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
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
