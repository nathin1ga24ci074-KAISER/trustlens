import React from 'react';
import {
  GitCommit,
  CheckCircle2,
  Globe,
  ArrowRight,
  ShieldCheck,
  Search,
  Scale,
  FileCheck,
} from 'lucide-react';

export interface ProvenanceViewProps {
  provenance?: Array<{
    source: string;
    domain: string;
    relationship?: string;
  }>;
  inputType?: string;
}

export const ProvenanceView: React.FC<ProvenanceViewProps> = ({
  provenance = [],
  inputType = 'VERIFICATION',
}) => {
  // Deduplicate domains
  const uniqueDomains = Array.from(new Set(provenance.map((p) => p.domain).filter(Boolean)));

  const pipelineSteps = [
    { label: 'Input Submission', sub: inputType, icon: <FileCheck className="w-3.5 h-3.5 text-indigo-400" /> },
    { label: 'Claim Extraction', sub: 'Empirical isolation', icon: <Search className="w-3.5 h-3.5 text-blue-400" /> },
    { label: 'Independent Search', sub: 'Multi-query grounding', icon: <Globe className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: 'Stance & Contradiction', sub: 'Semantic cross-check', icon: <Scale className="w-3.5 h-3.5 text-amber-400" /> },
    { label: 'Deterministic Score', sub: 'Veto rule enforcement', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Verification Provenance & Audit Trail</span>
        </h4>
        <p className="text-xs text-slate-400">
          Deterministic execution sequence from raw user inputs to final explainable verdict.
        </p>
      </div>

      {/* Visual Pipeline Step Chain */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[540px] gap-2">
          {pipelineSteps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="text-[11px] font-bold text-slate-200 whitespace-nowrap">
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {step.sub}
                </span>
              </div>
              {idx < pipelineSteps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 mb-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Referenced Domains Pill Cloud */}
      {uniqueDomains.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Referenced Independent Domains ({uniqueDomains.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {uniqueDomains.map((domain, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
              >
                <Globe className="w-3 h-3 text-slate-500" />
                <span>{domain}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed provenance list if available */}
      {provenance.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Corroborating Origin Records ({provenance.length})
          </span>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {provenance.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]"
              >
                <span className="font-medium text-slate-300 truncate max-w-[280px]">
                  {item.source}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-slate-500 text-[10px]">{item.domain}</span>
                  {item.relationship && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                      {item.relationship}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
