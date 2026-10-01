import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`bg-[#201710] animate-pulse rounded-xl border border-[#2D2017]/60 ${className}`}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#18110B] rounded-2xl border border-[#2C1F16] overflow-hidden p-3 flex flex-col gap-3">
      <Skeleton className="w-full h-44 rounded-xl" />
      <div className="flex flex-col gap-2 p-1">
        <Skeleton className="w-2/3 h-5 rounded-md" />
        <Skeleton className="w-full h-3 rounded-md" />
        <Skeleton className="w-4/5 h-3 rounded-md" />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2C1F16]">
          <Skeleton className="w-20 h-6 rounded-md" />
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const CategorySkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-[#18110B] rounded-2xl border border-[#2C1F16] flex flex-col items-center gap-3">
      <Skeleton className="w-14 h-14 rounded-2xl" />
      <Skeleton className="w-20 h-4 rounded" />
      <Skeleton className="w-12 h-3 rounded" />
    </div>
  );
};

export const FormSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-[#18110B] rounded-3xl border border-[#2C1F16] space-y-4">
      <Skeleton className="w-32 h-6 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="w-full h-12 rounded-xl" />
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>
      <Skeleton className="w-full h-24 rounded-xl" />
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  );
};

export const OrderSummarySkeleton: React.FC = () => {
  return (
    <div className="p-5 bg-[#18110B] rounded-2xl border border-[#2C1F16] space-y-3">
      <div className="flex items-center justify-between border-b border-[#2C1F16] pb-3">
        <Skeleton className="w-28 h-5 rounded" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="w-32 h-4 rounded" />
          <Skeleton className="w-16 h-4 rounded" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 h-4 rounded" />
          <Skeleton className="w-12 h-4 rounded" />
        </div>
      </div>
      <div className="pt-3 border-t border-[#2C1F16] flex items-center justify-between">
        <Skeleton className="w-20 h-6 rounded" />
        <Skeleton className="w-24 h-7 rounded-md" />
      </div>
    </div>
  );
};
