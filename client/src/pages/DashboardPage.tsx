import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Globe,
  Image,
  Video,
  User,
  History,
  CheckCircle2,
  Lock,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TextVerifier } from '../components/verification/TextVerifier';
import { AIDiagnosticsCard } from '../components/ai/AIDiagnosticsCard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Verification Workspace
            </h1>
            <Badge variant="brand">Text Verification Active</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Authenticated session for <span className="text-slate-200 font-medium">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            Developer Diagnostics
            {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <Link to="/history">
            <Button variant="outline" size="sm" leftIcon={<History className="w-4 h-4" />}>
              Audit Trail
            </Button>
          </Link>
        </div>
      </div>

      {/* Developer Diagnostics Panel (Collapsible) */}
      {showDiagnostics && (
        <div className="animate-fade-in space-y-4">
          <AIDiagnosticsCard />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 font-mono">User ID</span>
              <span className="text-slate-300 font-mono text-[11px] truncate max-w-[140px]">{user?.id}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 font-mono">Session State</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 font-mono">ORM Persistence</span>
              <span className="text-sky-400 font-medium">Prisma PostgreSQL</span>
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY WORKSPACE: Evidence-Backed Text Verification */}
      <section>
        <TextVerifier />
      </section>

      {/* Upcoming Verification Modalities Architecture */}
      <div className="pt-6 border-t border-slate-900">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">
            Upcoming Verification Modalities
          </h2>
          <p className="text-xs text-slate-400">
            Modular engine architecture prepared for multimodal reasoning expansion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-sky-900/60 bg-sky-950/20">
            <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 mb-3">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Text Statements</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Live Google Search grounding, independent citations, and contradiction analysis.
            </p>
            <Badge variant="success" size="sm">Active (Phase 1.5)</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">URL & Web Article</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Canonical article text parsing, publisher trust scores, and domain lineage.
            </p>
            <Badge variant="neutral" size="sm">Stage 3 Pipeline</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Image className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Image Forensics</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Reverse search, perceptual matching, clone detection, and EXIF forensics.
            </p>
            <Badge variant="neutral" size="sm">Stage 3 Pipeline</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Video className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Video & Audio Reels</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Temporal keyframe extraction, audio transcription, and synthetic artifact analysis.
            </p>
            <Badge variant="neutral" size="sm">Stage 3 Pipeline</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
};
