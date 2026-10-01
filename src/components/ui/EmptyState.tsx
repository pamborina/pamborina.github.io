import React from 'react';
import { PackageOpen, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  titleAr?: string;
  descriptionAr?: string;
  icon?: React.ReactNode;
  actionTextAr?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  titleAr = 'لا توجد عناصر حالياً',
  descriptionAr = 'لم نجد أي أصناف تطابق اختيارك. يمكنك استكشاف أصنافنا الشرقية والغربية الفاخرة.',
  icon,
  actionTextAr,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-6 bg-[#140E0A]/80 border border-[#2A1E15] rounded-3xl max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#201710] border border-[#3A2A1E] flex items-center justify-center text-[#D4AF37] mb-4 gold-glow-sm">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-xl font-bold text-[#F7F3E8] mb-2">{titleAr}</h3>
      <p className="text-sm text-[#C8BFB0] mb-6 leading-relaxed">{descriptionAr}</p>
      {actionTextAr && onAction && (
        <Button variant="gold" onClick={onAction} rightIcon={<Sparkles className="w-4 h-4" />}>
          {actionTextAr}
        </Button>
      )}
    </div>
  );
};
