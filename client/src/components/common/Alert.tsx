import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const styles = {
    error: {
      container: 'bg-rose-950/40 border-rose-800/60 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      titleColor: 'text-rose-300',
    },
    success: {
      container: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      titleColor: 'text-emerald-300',
    },
    warning: {
      container: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      titleColor: 'text-amber-300',
    },
    info: {
      container: 'bg-sky-950/40 border-sky-800/60 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      titleColor: 'text-sky-300',
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm backdrop-blur-sm ${styles.container} ${className}`}
      role="alert"
    >
      <div className="mt-0.5">{styles.icon}</div>
      <div className="flex-1 space-y-0.5">
        {title && <h5 className={`font-semibold ${styles.titleColor}`}>{title}</h5>}
        <div className="text-slate-300 leading-relaxed text-xs">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded -mr-1 -mt-1"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
