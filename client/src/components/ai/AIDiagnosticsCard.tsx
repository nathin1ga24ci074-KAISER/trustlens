import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Send, CheckCircle2, AlertTriangle, Cpu, ArrowRightLeft } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { api } from '../../services/api';

interface AIStatusData {
  strategy: { primary: string; fallback: string };
  providers: Record<string, { configured: boolean; defaultModel: string }>;
}

export const AIDiagnosticsCard: React.FC = () => {
  const [status, setStatus] = useState<AIStatusData | null>(null);
  const [prompt, setPrompt] = useState('Verify the core principles of evidence synthesis and explain why single-source verification produces hallucinations.');
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await api.getAIStatus();
      if (data.success) {
        setStatus(data);
      }
    } catch (err: any) {
      console.warn('Could not load AI status:', err);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: { prompt: string; provider?: string } = {
        prompt: prompt.trim(),
      };
      if (selectedProvider !== 'auto') {
        payload.provider = selectedProvider;
      }

      const res = await api.testAI(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-sky-900/60 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">AI Provider Foundation Diagnostics</h2>
              <Badge variant="brand" size="sm">Development / Internal Only</Badge>
            </div>
            <p className="text-xs text-slate-400">
              Provider abstraction testing: Google Gemini & Groq dual-engine execution
            </p>
          </div>
        </div>

        {/* Live Provider Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
            <span className="font-mono text-slate-300">Gemini:</span>
            {status?.providers?.gemini?.configured ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Key Ready
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3" /> No Key
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
            <span className="font-mono text-slate-300">Groq:</span>
            {status?.providers?.groq?.configured ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Key Ready
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3" /> No Key
              </span>
            )}
          </div>

          {status?.strategy && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-950/40 border border-sky-800/40 text-sky-300 text-[11px] font-mono">
              <ArrowRightLeft className="w-3 h-3" />
              <span>{status.strategy.primary} → {status.strategy.fallback}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleRunTest} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Test Prompt
          </label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt to test inference..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 hover:border-slate-700"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Target:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="auto">Auto (Primary + Fallback)</option>
              <option value="gemini">Force Gemini (Google)</option>
              <option value="groq">Force Groq (Fast Inference)</option>
            </select>
          </div>

          <Button
            type="submit"
            size="sm"
            isLoading={loading}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Execute Diagnostic Inference
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4">
          <Alert type="error" onClose={() => setError(null)} title="AI Provider Notice">
            {error}
          </Alert>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="sm">{result.provider.toUpperCase()}</Badge>
              <span className="font-mono text-slate-300 text-[11px]">{result.model}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>Latency: <strong className="text-sky-300">{result.latencyMs}ms</strong></span>
              {result.usage && (
                <span>Tokens: <strong className="text-slate-200">{result.usage.inputTokens ?? '?'} in / {result.usage.outputTokens ?? '?'} out</strong></span>
              )}
            </div>
          </div>
          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
            {result.response}
          </p>
        </div>
      )}
    </Card>
  );
};
