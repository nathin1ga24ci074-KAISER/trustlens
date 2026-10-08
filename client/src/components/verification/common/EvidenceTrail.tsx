import React, { useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Globe,
  Building2,
  BookOpen,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { EvidenceItem } from '@trustlens/shared';
import { Badge } from '../../common/Badge';

export interface EvidenceTrailProps {
  supportingEvidence?: EvidenceItem[];
  contradictingEvidence?: EvidenceItem[];
  neutralEvidence?: EvidenceItem[];
}

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({
  supportingEvidence = [],
  contradictingEvidence = [],
  neutralEvidence = [],
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUPPORTING' | 'CONTRADICTING' | 'NEUTRAL'>('ALL');

  const totalSupporting = supportingEvidence.length;
  const totalContradicting = contradictingEvidence.length;
  const totalNeutral = neutralEvidence.length;
  const totalEvidence = totalSupporting + totalContradicting + totalNeutral;

  if (totalEvidence === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
        No independent web evidence retrieved for this assessment.
      </div>
    );
  }

  const getFilteredItems = (): EvidenceItem[] => {
    switch (activeTab) {
      case 'SUPPORTING':
        return supportingEvidence;
      case 'CONTRADICTING':
        return contradictingEvidence;
      case 'NEUTRAL':
        return neutralEvidence;
      case 'ALL':
      default:
        return [...contradictingEvidence, ...supportingEvidence, ...neutralEvidence];
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'NEWS':
        return <Building2 className="w-3 h-3 text-blue-400" />;
      case 'ACADEMIC':
        return <BookOpen className="w-3 h-3 text-purple-400" />;
      case 'OFFICIAL':
        return <ShieldCheck className="w-3 h-3 text-emerald-400" />;
      case 'GROUNDED_SEARCH':
        return <Search className="w-3 h-3 text-amber-400" />;
      default:
        return <Globe className="w-3 h-3 text-slate-400" />;
    }
  };

  const items = getFilteredItems();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Independent Evidence Trail</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({totalEvidence} sources)
            </span>
          </h4>
          <p className="text-xs text-slate-400">
            External, web-grounded sources gathered and evaluated independently of user input.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalEvidence})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CONTRADICTING')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'CONTRADICTING'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Refuting ({totalContradicting})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SUPPORTING')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'SUPPORTING'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Supporting ({totalSupporting})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('NEUTRAL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'NEUTRAL'
                ? 'bg-slate-800 text-slate-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Neutral ({totalNeutral})
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
          No evidence items in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isContradicting = item.stance === 'CONTRADICTS';
            const isSupporting = item.stance === 'SUPPORTS';

            const cardBorder = isContradicting
              ? 'border-rose-900/60 bg-rose-950/10 hover:border-rose-700/80'
              : isSupporting
              ? 'border-emerald-900/60 bg-emerald-950/10 hover:border-emerald-700/80'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700';

            const stanceBadgeVariant = isContradicting
              ? 'danger'
              : isSupporting
              ? 'success'
              : 'neutral';

            return (
              <div
                key={item.id || `evidence-${idx}`}
                className={`p-4 rounded-xl border transition-all ${cardBorder} space-y-2`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={stanceBadgeVariant} size="sm" className="font-bold">
                      {isContradicting && <XCircle className="w-3 h-3 mr-1 inline" />}
                      {isSupporting && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                      {item.stance}
                    </Badge>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {getSourceTypeIcon(item.sourceType)}
                      <span>{item.sourceType}</span>
                    </span>

                    <span className="text-[11px] font-semibold text-slate-300">
                      {item.publisher || item.domain}
                    </span>

                    <span className="text-[10px] font-mono text-slate-500">
                      {item.domain}
                    </span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 font-medium"
                  >
                    <span>Inspect Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h5 className="text-xs md:text-sm font-semibold text-white">
                  {item.title}
                </h5>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                  "{item.snippet}"
                </p>

                {item.stanceExplanation && (
                  <div className="text-[11px] text-slate-400 leading-normal flex items-start gap-1">
                    <span className="font-semibold text-slate-300">Stance Analysis:</span>
                    <span>{item.stanceExplanation}</span>
                  </div>
                )}

                {item.provenance && (
                  <div className="text-[10px] font-mono text-slate-500 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/50">
                    {item.provenance.searchQuery && (
                      <span>Query: "{item.provenance.searchQuery}"</span>
                    )}
                    {item.provenance.isDerivative && (
                      <span className="text-amber-400/80 font-sans font-bold">
                        [Derivative/Syndicated]
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
