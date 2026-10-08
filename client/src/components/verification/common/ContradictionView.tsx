import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  FileText,
  Split,
  Info,
} from 'lucide-react';
import { ContradictionAnalysisResult } from '@trustlens/shared';
import { Badge } from '../../common/Badge';

export interface ContradictionViewProps {
  contradictions?: ContradictionAnalysisResult | ContradictionAnalysisResult[];
}

export const ContradictionView: React.FC<ContradictionViewProps> = ({
  contradictions,
}) => {
  // Normalize into an array of ContradictionAnalysisResult
  const normalizedList: ContradictionAnalysisResult[] = Array.isArray(contradictions)
    ? contradictions
    : contradictions
    ? [contradictions]
    : [];

  const activeContradictions = normalizedList.filter(
    (c) => c && c.hasContradiction
  );

  const hasAnyContradiction = activeContradictions.length > 0;

  // Determine highest severity
  let maxSeverity: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE' = 'NONE';
  const severityRank: Record<string, number> = {
    NONE: 0,
    LOW: 1,
    MODERATE: 2,
    SEVERE: 3,
  };

  for (const c of activeContradictions) {
    if ((severityRank[c.severity] || 0) > (severityRank[maxSeverity] || 0)) {
      maxSeverity = c.severity as any;
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'SEVERE':
        return (
          <Badge variant="danger" size="md" className="font-bold">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 inline" /> SEVERE CONFLICT
          </Badge>
        );
      case 'MODERATE':
        return (
          <Badge variant="warning" size="md" className="font-bold">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" /> MODERATE CONFLICT
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="neutral" size="md" className="font-bold">
            LOW CONFLICT
          </Badge>
        );
      default:
        return (
          <Badge variant="success" size="md" className="font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> NO CONTRADICTION
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Contradiction & Conflict Audit</span>
            {hasAnyContradiction && (
              <span className="text-xs font-mono font-normal text-rose-400">
                ({activeContradictions.length} detected)
              </span>
            )}
          </h4>
          <p className="text-xs text-slate-400">
            Automated semantic contradiction analysis comparing claims against independent web evidence.
          </p>
        </div>

        <div>{getSeverityBadge(maxSeverity)}</div>
      </div>

      {!hasAnyContradiction ? (
        <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-center text-xs text-emerald-300/90 space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
          <div className="font-bold text-emerald-200">No Semantic Contradictions Detected</div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            The claims do not materially contradict verified facts, historical records, or reliable empirical reporting.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeContradictions.map((contra, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/15 space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Split className="w-4 h-4 text-rose-400" />
                    Conflict #{idx + 1}
                  </span>
                  <Badge variant="danger" size="sm">
                    {contra.severity} Severity
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-rose-100 font-medium leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-rose-900/40">
                {contra.details}
              </p>

              {/* Conflicting aspects */}
              {contra.conflictingAspects && contra.conflictingAspects.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Disputed Dimensions & Counter-Evidence
                  </span>
                  <div className="space-y-2">
                    {contra.conflictingAspects.map((aspect, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-rose-300 font-medium">
                            <span className="text-slate-400 font-normal">Claim Segment: </span>
                            "{aspect.claimSegment}"
                          </div>
                          {aspect.isContextualDisagreement && (
                            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                              Context Recycled
                            </span>
                          )}
                        </div>

                        {aspect.contradictingEvidenceTitle && (
                          <div className="text-[11px] text-slate-300 flex items-center gap-1">
                            <span className="text-slate-400">Counter-Source:</span>
                            <span className="font-semibold text-white">
                              {aspect.contradictingEvidenceTitle}
                            </span>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800">
                          {aspect.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual factors */}
              {contra.contextualFactors && contra.contextualFactors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Context Factors:</span>
                  {contra.contextualFactors.map((f, fIdx) => (
                    <span
                      key={fIdx}
                      className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
