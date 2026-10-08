import React from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  ShieldAlert,
  Database,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const HistoryPage: React.FC = () => {
  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5 mr-1 inline" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white inline">
              Verification Audit Trail
            </h1>
            <Badge variant="brand">Database Model Ready</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Immutable log of verified statements, extracted claims, provenance records, and uncertainty scores
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Controls (Placeholder) */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search verified statements, claims, or URLs..."
            disabled
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 placeholder-slate-600 cursor-not-allowed opacity-60"
          />
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-1.5 cursor-not-allowed opacity-60"
          >
            <Filter className="w-3.5 h-3.5" /> Filter Modality
          </button>
          <button
            disabled
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-1.5 cursor-not-allowed opacity-60"
          >
            <Calendar className="w-3.5 h-3.5" /> Date Range
          </button>
        </div>
      </div>

      {/* Empty State / Schema Architecture Documentation */}
      <Card className="text-center py-12 px-6">
        <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
          <History className="w-7 h-7 text-sky-400" />
        </div>

        <h3 className="text-base font-semibold text-white mb-2">
          No Verification Records Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
          The <code className="text-sky-400 font-mono">VerificationHistory</code> Prisma relational model has been constructed with full indexes and foreign keys. Audit entries will be stored here as verifications are performed in Stage 2.
        </p>

        {/* Database Schema Architectural Preview */}
        <div className="max-w-xl mx-auto p-4 rounded-lg bg-slate-950 border border-slate-800 text-left">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2 mb-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              schema.prisma: VerificationHistory Model
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">PostgreSQL</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-300">id</span>
              <span className="text-slate-500">String @id @default(uuid())</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">userId</span>
              <span className="text-slate-500">String (Foreign Key -&gt; User)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">type</span>
              <span className="text-sky-300">VerificationType (TEXT, URL, IMAGE, VIDEO)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">verdict</span>
              <span className="text-emerald-300">VerificationVerdict (TRUE, FALSE, MISLEADING...)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">trustScore</span>
              <span className="text-amber-300">Float? (0.0 - 100.0)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">uncertaintyScore</span>
              <span className="text-purple-300">Float? (0.0 - 1.0)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">metadata</span>
              <span className="text-slate-500">Json? (Evidence graph & citations)</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link to="/dashboard">
            <Button variant="secondary" size="sm">
              Return to Workspace
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
