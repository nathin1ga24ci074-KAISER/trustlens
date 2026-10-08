import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Globe,
  Image,
  Video,
  ShieldCheck,
  User,
  Clock,
  History,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Verification Workspace
            </h1>
            <Badge variant="success">Stage 1 Active</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Authenticated session for <span className="text-slate-200 font-medium">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/history">
            <Button variant="outline" size="sm" leftIcon={<History className="w-4 h-4" />}>
              View History
            </Button>
          </Link>
        </div>
      </div>

      {/* User Session Diagnostics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{user?.name}</h2>
              <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs border-t border-slate-800/80 pt-3">
            <div className="flex justify-between items-center text-slate-400">
              <span>Account ID</span>
              <span className="font-mono text-slate-300 text-[11px] truncate max-w-[140px]">
                {user?.id}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Member Since</span>
              <span className="text-slate-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Auth State</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            </div>
          </div>
        </Card>

        {/* Foundation Status */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Security & Foundation Verification</h2>
            </div>
            <Badge variant="brand">JWT + Bcrypt</Badge>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            This protected route demonstrates successful token-based authentication and secure session isolation. The underlying Prisma PostgreSQL schema is pre-configured with complete relational models for <code className="text-sky-300 font-mono">User</code> and <code className="text-sky-300 font-mono">VerificationHistory</code>.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Status</span>
              <span className="text-emerald-400 font-medium">Session Verified</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Database</span>
              <span className="text-sky-400 font-medium">Prisma PostgreSQL</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Engine Readiness</span>
              <span className="text-amber-400 font-medium">Stage 2 Prepared</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Planned Verification Modalities Architecture */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">
            Upcoming Verification Modalities
          </h2>
          <p className="text-xs text-slate-400">
            Architectural placeholders for subsequent platform implementation stages
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Text Statements</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Claim extraction, entity resolution, and automated fact check retrieval.
            </p>
            <Badge variant="neutral" size="sm">Stage 2 Pipeline</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">URL & Web Article</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Domain trust rating, canonical text extraction, and author provenance.
            </p>
            <Badge variant="neutral" size="sm">Stage 2 Pipeline</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Image className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Image Forensics</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Perceptual reverse match, clone detection, and synthetic artifact checks.
            </p>
            <Badge variant="neutral" size="sm">Stage 3 Pipeline</Badge>
          </Card>

          <Card className="border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Video className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Video & Audio Reels</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Keyframe extraction, temporal consistency, and deepfake voice analysis.
            </p>
            <Badge variant="neutral" size="sm">Stage 3 Pipeline</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
};
