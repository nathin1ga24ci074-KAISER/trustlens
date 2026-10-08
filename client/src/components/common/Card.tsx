import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', header, footer }) => {
  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm ${className}`}>
      {header && <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">{header}</div>}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/40 text-sm text-slate-400">{footer}</div>}
    </div>
  );
};
