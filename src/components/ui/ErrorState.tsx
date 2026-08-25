import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  titleAr?: string;
  descriptionAr?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  titleAr = 'عذراً، حدث خطأ أثناء التحميل',
  descriptionAr = 'تأكد من الاتصال بالإنترنت ثم أعد المحاولة للاستمتاع بأشهر حلويات بامبورينا.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-6 bg-rose-950/20 border border-rose-800/40 rounded-3xl max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-rose-900/30 border border-rose-700/50 flex items-center justify-center text-rose-400 mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-rose-200 mb-2">{titleAr}</h3>
      <p className="text-sm text-rose-300/80 mb-6 leading-relaxed">{descriptionAr}</p>
      {onRetry && (
        <Button variant="gold-outline" onClick={onRetry} rightIcon={<RefreshCw className="w-4 h-4" />}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};
