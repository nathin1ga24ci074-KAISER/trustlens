import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Globe,
  Image,
  Video,
  Sparkles,
  History,
  CheckCircle2,
  Terminal,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { UnifiedWorkspace } from '../components/verification/UnifiedWorkspace';
import { AIDiagnosticsCard } from '../components/ai/AIDiagnosticsCard';
import { api } from '../services/api';
import { VerificationHistoryItem } from '@trustlens/shared';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [recentItems, setRecentItems] = useState<VerificationHistoryItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    setLoadingRecent(true);
    api.getHistory()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRecentItems(res.data.slice(0, 5));
        }
      })
      .catch((err) => {
        console.warn('Failed to load recent verifications:', err);
      })
      .finally(() => {
        setLoadingRecent(false);
      });
  }, []);

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Stage 7 Unified Platform
              </span>
              <Badge variant="brand">Multimodal Active</Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              TRUSTLENS: Verify anything. Understand why.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Cross-modal misinformation & trust-assessment engine. Verify text claims, webpage URLs, images, and videos against independent authoritative web evidence with explainable reasoning.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Diagnostics
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <Link to="/history">
              <Button variant="outline" size="md" leftIcon={<History className="w-4 h-4" />}>
                Audit Trail
              </Button>
            </Link>
          </div>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
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

      {/* PRIMARY UNIFIED WORKSPACE */}
      <section className="transition-all duration-300">
        <UnifiedWorkspace />
      </section>

      {/* Recent Activity Bar & Verification Modalities Architecture */}
      <div className="pt-6 border-t border-slate-900 space-y-6">
        {/* Recent Verifications Card */}
        {recentItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <span>Recent Audits</span>
              </h3>
              <Link
                to="/history"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                <span>View Full History</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentItems.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  to="/history"
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all block group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {item.type}
                    </span>
                    <Badge
                      variant={
                        item.verdict === 'LEGIT'
                          ? 'success'
                          : item.verdict === 'FAKE'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {item.verdict || 'INCONCLUSIVE'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-200 truncate font-medium group-hover:text-indigo-300 transition-colors">
                    {item.extractedClaim || item.originalInput}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono mt-2">
                    Score: {item.trustScore ?? 'N/A'}/100 • {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Verification Architecture Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Multi-Modal Verification Engine Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Shared reasoning infrastructure powering independent claim verification
              </p>
            </div>
            <Badge variant="neutral" size="sm">5 Modality Pipelines</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="border-indigo-900/60 bg-indigo-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <Badge variant="success" size="sm">Stage 7 Active</Badge>
              </div>
              <h3 className="text-xs font-bold text-white">Multimodal Fusion</h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                Joint cross-modal reasoning, claim deduplication, and internal consistency.
              </p>
            </Card>

            <Card className="border-sky-900/60 bg-sky-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <FileText className="w-4 h-4 text-sky-400" />
                <Badge variant="success" size="sm">Stage 3 Active</Badge>
              </div>
              <h3 className="text-xs font-bold text-white">Text Claims</h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                Live Google Search grounding, independent citations, and contradiction analysis.
              </p>
            </Card>

            <Card className="border-cyan-900/60 bg-cyan-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Globe className="w-4 h-4 text-cyan-400" />
                <Badge variant="success" size="sm">Stage 4 Active</Badge>
              </div>
              <h3 className="text-xs font-bold text-white">Webpage URLs</h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                Safe fetch, SSRF protection, multi-claim verification, and headline analysis.
              </p>
            </Card>

            <Card className="border-teal-900/60 bg-teal-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Image className="w-4 h-4 text-teal-400" />
                <Badge variant="success" size="sm">Stage 5 Active</Badge>
              </div>
              <h3 className="text-xs font-bold text-white">Image Forensics</h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                Multimodal vision, OCR extraction, empirical claim grounding, and context forensics.
              </p>
            </Card>

            <Card className="border-amber-900/60 bg-amber-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Video className="w-4 h-4 text-amber-400" />
                <Badge variant="success" size="sm">Stage 6 Active</Badge>
              </div>
              <h3 className="text-xs font-bold text-white">Video Reels</h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                Temporal keyframe extraction, audio transcription, and synthetic artifact analysis.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
