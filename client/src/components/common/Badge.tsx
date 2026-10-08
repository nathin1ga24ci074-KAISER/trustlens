import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  const variantStyles = {
    brand: 'bg-sky-950/70 text-sky-300 border border-sky-800/60',
    success: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
    warning: 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
    danger: 'bg-rose-950/70 text-rose-300 border border-rose-800/60',
    neutral: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full tracking-wide select-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
