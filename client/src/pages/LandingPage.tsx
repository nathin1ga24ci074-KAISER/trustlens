import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  SearchCheck,
  FileCheck2,
  CheckCircle2,
  Network,
  Activity,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Cpu,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .checkHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-8">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-200">Stage 1 Foundation Active</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-mono text-[11px]">
                API: {apiOnline === null ? 'Checking...' : apiOnline ? 'Connected' : 'Offline'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
              Empirical Trust &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                Multimodal Verification
              </span>
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-2xl font-normal">
              TrustLens is an enterprise-grade platform engineered to verify assertions across text, URLs, images, and videos. Built on independent web evidence, contradiction analysis, provenance tracing, and uncertainty-aware scoring.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Enter Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Create Account
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="secondary" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-sky-400 mb-2">
              Verification Engine Architecture
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rigorous, Transparent Evidence Synthesis
            </h3>
            <p className="mt-3 text-slate-400 text-sm">
              Engineered from the ground up to eliminate single-point bias and hallucination through multi-source consensus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-sky-950 border border-sky-800/80 flex items-center justify-center text-sky-400 mb-5">
                <SearchCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Multimodal Analysis</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Structured decomposition of claims spanning text statements, live URLs, digital images, and high-framerate videos.
              </p>
              <Badge variant="brand">Stage 2 Roadmap</Badge>
            </Card>

            <Card className="hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mb-5">
                <Network className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Contradiction & Stance</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Cross-examination of independent evidence corpora with natural language inference to flag factual discrepancies and conflicting accounts.
              </p>
              <Badge variant="success">Stage 3 Roadmap</Badge>
            </Card>

            <Card className="hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-amber-950 border border-amber-800/80 flex items-center justify-center text-amber-400 mb-5">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Uncertainty Scoring</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Bayesian confidence bounds that explicitly distinguish verifiable truth, disputed nuance, and epistemic uncertainty.
              </p>
              <Badge variant="warning">Stage 4 Roadmap</Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* System Foundation Specs */}
      <section className="py-16 bg-slate-900/30 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <Badge variant="brand" className="mb-3">Stage 1 Completed</Badge>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Production-Ready Foundation Active
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  The infrastructure layer provides hardened JWT authentication, Argon/Bcrypt password hashing, Prisma PostgreSQL schema models, and protected client routing.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>State-of-the-art token & session management (HTTP-only cookies + Bearer auth)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Relational database models for Users and Verification History</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Clean modular separation of concerns with full TypeScript validation</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Lock className="w-5 h-5 text-sky-400 mb-2" />
                  <div className="font-semibold text-white text-sm">Security First</div>
                  <div className="text-xs text-slate-400 mt-1">12-round bcrypt hashing, XSS & CSRF protection</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Database className="w-5 h-5 text-emerald-400 mb-2" />
                  <div className="font-semibold text-white text-sm">Prisma ORM</div>
                  <div className="text-xs text-slate-400 mt-1">PostgreSQL schema with indexes & cascades</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Layers className="w-5 h-5 text-purple-400 mb-2" />
                  <div className="font-semibold text-white text-sm">Type Safety</div>
                  <div className="text-xs text-slate-400 mt-1">Shared monorepo contracts across client & server</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <Cpu className="w-5 h-5 text-amber-400 mb-2" />
                  <div className="font-semibold text-white text-sm">Modular Engine</div>
                  <div className="text-xs text-slate-400 mt-1">Isolated architecture stubs ready for AI integration</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
