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
import { UrlVerifier } from '../components/verification/UrlVerifier';
import { AIDiagnosticsCard } from '../components/ai/AIDiagnosticsCard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeTab, setActiveTab] = useState<'TEXT' | 'URL'>('TEXT');

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Verification Workspace
            </h1>
            <Badge variant="brand">Text & URL Engines Active</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Authenticated session for <span className="text-slate-200 font-medium">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* Mode Navigation Tabs */}
      <div className="flex items-center p-1.5 rounded-xl bg-slate-900 border border-slate-800 max-w-md">
        <button
          onClick={() => setActiveTab('TEXT')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'TEXT'
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Text Claim Verification
        </button>
        <button
          onClick={() => setActiveTab('URL')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'URL'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          URL Webpage Verification
        </button>
      </div>

      {/* PRIMARY WORKSPACE */}
      <section className="transition-all duration-300">
        {activeTab === 'TEXT' ? <TextVerifier /> : <UrlVerifier />}
      </section>

      {/* Upcoming Verification Modalities Architecture */}
      <div className="pt-6 border-t border-slate-900">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">
            Verification Engine Status
          </h2>
          <p className="text-xs text-slate-400">
            Multi-modal misinformation architecture status
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-sky-900/60 bg-sky-950/20">
            <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 mb-3">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Text Claims</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Live Google Search grounding, independent citations, and contradiction analysis.
            </p>
            <Badge variant="success" size="sm">Active (Stage 3)</Badge>
          </Card>

          <Card className="border-cyan-900/60 bg-cyan-950/20">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-3">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">URL & Web Article</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Safe fetch, SSRF protection, multi-claim verification, and headline analysis.
            </p>
            <Badge variant="success" size="sm">Active (Stage 4)</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Image className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Image Forensics</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Reverse search, perceptual matching, clone detection, and EXIF forensics.
            </p>
            <Badge variant="neutral" size="sm">Stage 5 Pipeline</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Video className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Video & Audio Reels</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Temporal keyframe extraction, audio transcription, and synthetic artifact analysis.
            </p>
            <Badge variant="neutral" size="sm">Stage 6 Pipeline</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
};
