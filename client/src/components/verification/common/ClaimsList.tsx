import React, { useState } from 'react';
import {
  FileText,
  Video,
  Image,
  Globe,
  User,
  Eye,
  Cpu,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Tag,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Badge } from '../../common/Badge';

export interface ClaimsListProps {
  claims: any[];
  title?: string;
  description?: string;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({
  claims,
  title = 'Extracted & Fused Claims',
  description = 'Empirical assertions extracted across all submitted modalities, verified against independent web evidence.',
}) => {
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  if (!claims || claims.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
        No empirical claims extracted for this verification.
      </div>
    );
  }

  const toggleExpand = (claimId: string) => {
    setExpandedClaimId(expandedClaimId === claimId ? null : claimId);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'TEXT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
            <FileText className="w-3 h-3" /> Text
          </span>
        );
      case 'URL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
            <Globe className="w-3 h-3" /> URL
          </span>
        );
      case 'IMAGE_VISUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
            <Image className="w-3 h-3" /> Image Visual
          </span>
        );
      case 'IMAGE_TEXT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950/80 text-teal-300 border border-teal-800/60">
            <FileText className="w-3 h-3" /> Image OCR
          </span>
        );
      case 'VIDEO_AUDIO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
            <Video className="w-3 h-3" /> Video Audio
          </span>
        );
      case 'VIDEO_VISUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950/80 text-orange-300 border border-orange-800/60">
            <Video className="w-3 h-3" /> Video Keyframe
          </span>
        );
      case 'VIDEO_TEXT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-800/60">
            <FileText className="w-3 h-3" /> Video OCR
          </span>
        );
      case 'USER_CONTEXT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-pink-950/80 text-pink-300 border border-pink-800/60">
            <User className="w-3 h-3" /> User Hypothesis
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {source}
          </span>
        );
    }
  };

  const getObservationBadge = (status?: string) => {
    if (status === 'OBSERVED') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
          <Eye className="w-2.5 h-2.5" /> OBSERVED
        </span>
      );
    }
    if (status === 'INFERRED') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
          <Cpu className="w-2.5 h-2.5" /> INFERRED
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({claims.length})
            </span>
          </h4>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {claims.map((claimObj, idx) => {
          const claimId = claimObj.claimId || claimObj.id || `claim-${idx}`;
          const isExpanded = expandedClaimId === claimId;
          const verdict = claimObj.verdict || 'INCONCLUSIVE';
          const score = claimObj.trustScore ?? 50;
          const importance = claimObj.importance || 'SUPPORTING';
          const sources: string[] = claimObj.sources || (claimObj.source ? [claimObj.source] : ['TEXT']);

          const verdictBadge =
            verdict === 'LEGIT'
              ? 'success'
              : verdict === 'FAKE'
              ? 'danger'
              : 'warning';

          const scoreColor =
            score >= 65
              ? 'text-emerald-400'
              : score <= 35
              ? 'text-rose-400'
              : 'text-amber-400';

          const supportingCount = claimObj.supportingEvidence?.length ?? 0;
          const contradictingCount = claimObj.contradictingEvidence?.length ?? 0;

          return (
            <div
              key={claimId}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? 'bg-slate-900/90 border-slate-700 shadow-lg'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <div
                onClick={() => toggleExpand(claimId)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
              >
                {/* Left: Claim statement & tags */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sources.map((s, i) => (
                      <React.Fragment key={i}>{getSourceBadge(s)}</React.Fragment>
                    ))}
                    {getObservationBadge(claimObj.observationalStatus)}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        importance === 'PRIMARY'
                          ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {importance}
                    </span>
                    {claimObj.claimType && (
                      <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono">
                        {claimObj.claimType}
                      </span>
                    )}
                  </div>

                  <p className="text-xs md:text-sm font-medium text-slate-100 leading-snug">
                    "{claimObj.claim}"
                  </p>
                </div>

                {/* Right: Verdict + Score + Expand Button */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div className="text-right">
                    <Badge variant={verdictBadge} size="sm" className="font-bold">
                      {verdict}
                    </Badge>
                    <div className={`text-xs font-mono font-bold mt-0.5 ${scoreColor}`}>
                      {score}/100
                    </div>
                  </div>

                  <div className="text-slate-400 hover:text-white p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Entities */}
                    {claimObj.entities && claimObj.entities.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-400" /> Named Entities
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {claimObj.entities.map((ent: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-800 rounded text-[11px] text-indigo-200 border border-slate-700"
                            >
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Context info */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400">Contextual Grounding</span>
                      <div className="flex flex-col gap-1 text-[11px] text-slate-300">
                        {claimObj.locationContext && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>Location: {claimObj.locationContext}</span>
                          </div>
                        )}
                        {claimObj.timeContext && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            <span>Time/Date: {claimObj.timeContext}</span>
                          </div>
                        )}
                        {!claimObj.locationContext && !claimObj.timeContext && (
                          <span className="text-slate-500 italic">No specific spatio-temporal constraint</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Tally */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60 text-[11px]">
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> {supportingCount} Supporting Sources
                    </span>
                    <span className="text-rose-400 flex items-center gap-1 font-semibold">
                      <XCircle className="w-3 h-3" /> {contradictingCount} Contradicting Sources
                    </span>
                  </div>

                  {/* Search queries used */}
                  {claimObj.searchQueries && claimObj.searchQueries.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Search className="w-3 h-3 text-slate-400" /> Verification Queries
                      </span>
                      <div className="space-y-0.5 font-mono text-[10px] text-slate-400">
                        {claimObj.searchQueries.map((q: string, i: number) => (
                          <div key={i} className="truncate">
                            • "{q}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
