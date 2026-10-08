import React from 'react';
import { ShieldCheck, Lock, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-auto text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-200">TrustLens Platform</span>
            <p className="text-slate-500 text-[11px]">Uncertainty-aware multimodal verification engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-slate-400">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            End-to-End Encrypted Sessions
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            Stage 1: Core Foundation
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()} TrustLens. Built with precision.
        </div>
      </div>
    </footer>
  );
};
