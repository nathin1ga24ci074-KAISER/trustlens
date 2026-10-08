import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CrossModalConsistencyAnalysis } from '@trustlens/shared';
import { Badge } from '../../common/Badge';

export interface CrossModalConsistencyCardProps {
  consistency?: CrossModalConsistencyAnalysis | null;
}

export const CrossModalConsistencyCard: React.FC<CrossModalConsistencyCardProps> = ({
  consistency,
}) => {
  if (!consistency) return null;

  const isConsistent = consistency.verdict === 'CONSISTENT';
  const isInconsistent = consistency.verdict === 'INCONSISTENT';
  const isInconclusive = consistency.verdict === 'INCONCLUSIVE';

  const badgeVariant = isConsistent
    ? 'success'
    : isInconsistent
    ? 'danger'
    : 'warning';

  const cardBorder = isConsistent
    ? 'border-emerald-900/60 bg-emerald-950/15'
    : isInconsistent
    ? 'border-rose-900/60 bg-rose-950/15'
    : 'border-slate-800 bg-slate-900/40';

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'TEMPORAL_MISMATCH':
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case 'LOCATION_MISMATCH':
        return <MapPin className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  return (
    <div className={`p-5 rounded-2xl border ${cardBorder} space-y-3 shadow-md`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Cross-Modal Consistency Audit</h4>
            <p className="text-[11px] text-slate-400">
              Corroboration between submitted text, URL, image, and video modalities.
            </p>
          </div>
        </div>

        <Badge variant={badgeVariant} size="md" className="font-bold">
          {isConsistent && <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />}
          {isInconsistent && <XCircle className="w-3.5 h-3.5 mr-1 inline" />}
          {isInconclusive && <HelpCircle className="w-3.5 h-3.5 mr-1 inline" />}
          {consistency.verdict}
        </Badge>
      </div>

      <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
        {consistency.details}
      </p>

      {/* Specific Conflicts */}
      {consistency.conflicts && consistency.conflicts.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/70">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
            Detected Modal Collisions ({consistency.conflicts.length})
          </span>
          <div className="space-y-2">
            {consistency.conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/90 border border-rose-900/40 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    {getConflictTypeIcon(conflict.type)}
                    <span>{conflict.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={conflict.severity === 'SEVERE' ? 'danger' : 'warning'} size="sm">
                      {conflict.severity}
                    </Badge>
                    {conflict.modalitiesInvolved && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {conflict.modalitiesInvolved.join(' ↔ ')}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {conflict.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
