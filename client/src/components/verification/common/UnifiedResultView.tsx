import React, { useState } from 'react';
import {
  FileText,
  Search,
  Scale,
  GitCommit,
  Layers,
  Copy,
  Check,
  Download,
  RotateCcw,
  Video,
  Image as ImageIcon,
  Globe,
} from 'lucide-react';
import { VerdictCard } from './VerdictCard';
import { ClaimsList } from './ClaimsList';
import { EvidenceTrail } from './EvidenceTrail';
import { ContradictionView } from './ContradictionView';
import { CrossModalConsistencyCard } from './CrossModalConsistencyCard';
import { ProvenanceView } from './ProvenanceView';
import { Button } from '../../common/Button';

export interface UnifiedResultViewProps {
  result: any;
  onReset?: () => void;
}

export const UnifiedResultView: React.FC<UnifiedResultViewProps> = ({
  result,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<'CLAIMS' | 'EVIDENCE' | 'CONTRADICTIONS' | 'PROVENANCE' | 'MODALITIES'>('CLAIMS');
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  // Normalize fields across single-modality and multimodal results
  const inputType =
    result.inputType ||
    (result.inputUrl || result.page ? 'URL' : result.transcript ? 'VIDEO' : result.image ? 'IMAGE' : 'TEXT');

  const verdict = result.overallVerdict || result.verdict || 'INCONCLUSIVE';
  const trustScore = result.trustScore ?? 50;
  const confidence = result.confidence || 'MEDIUM';
  const summary = result.summary || 'Verification completed.';
  const reasoning = result.reasoning || '';
  const limitations = result.limitations || [];

  // Normalize claims
  const claims =
    result.claims ||
    (result.claim
      ? [
          {
            claimId: result.verificationId,
            claim: result.claim,
            claimType: result.claimType,
            importance: 'PRIMARY',
            sources: ['TEXT'],
            verdict: result.verdict,
            trustScore: result.trustScore,
            supportingEvidence: result.supportingEvidence || [],
            contradictingEvidence: result.contradictingEvidence || [],
            neutralEvidence: result.neutralEvidence || [],
            searchQueries: result.searchQueries || [],
          },
        ]
      : []);

  // Normalize evidence
  const supportingEvidence =
    result.supportingEvidence ||
    (result.claims?.flatMap((c: any) => c.supportingEvidence || []) ?? []);
  const contradictingEvidence =
    result.contradictingEvidence ||
    (result.claims?.flatMap((c: any) => c.contradictingEvidence || []) ?? []);
  const neutralEvidence =
    result.neutralEvidence ||
    (result.claims?.flatMap((c: any) => c.neutralEvidence || []) ?? []);

  // Normalize contradictions
  const contradictions =
    result.contradictions ||
    (result.claims
      ? result.claims.map((c: any) => c.contradictions).filter((c: any) => c && c.hasContradiction)
      : []);

  // Normalize provenance
  const provenance =
    result.provenance ||
    (result.claims?.flatMap((c: any) => c.provenance || []) ?? []);

  const handleCopySummary = () => {
    const textToCopy = `TrustLens Verification Report
Verdict: ${verdict} | Trust Score: ${trustScore}/100 | Confidence: ${confidence}
Summary: ${summary}
Algorithmic Reasoning: ${reasoning}
Verified at: ${result.createdAt || new Date().toISOString()}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trustlens-verification-${result.verificationId || 'report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const hasModalitySpecifics =
    Boolean(result.modalityResults) ||
    Boolean(result.transcript) ||
    Boolean(result.keyframes) ||
    Boolean(result.visualAnalysis) ||
    Boolean(result.extractedText) ||
    Boolean(result.page);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Master Verdict Card */}
      <VerdictCard
        verdict={verdict}
        trustScore={trustScore}
        confidence={confidence}
        summary={summary}
        reasoning={reasoning}
        limitations={limitations}
        inputType={inputType}
        inputsProvided={result.inputsProvided}
      />

      {/* 2. Cross-Modal Consistency (if multimodal result) */}
      {result.crossModalConsistency && (
        <CrossModalConsistencyCard consistency={result.crossModalConsistency} />
      )}

      {/* 3. Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('CLAIMS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CLAIMS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Claims ({claims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EVIDENCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EVIDENCE'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>
              Evidence ({supportingEvidence.length + contradictingEvidence.length + neutralEvidence.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTRADICTIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CONTRADICTIONS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Contradictions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROVENANCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PROVENANCE'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Provenance Trail</span>
          </button>

          {hasModalitySpecifics && (
            <button
              type="button"
              onClick={() => setActiveTab('MODALITIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MODALITIES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modality Breakdowns</span>
            </button>
          )}
        </div>

        {/* Action utility buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="text-xs"
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            className="text-xs"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            JSON
          </Button>

          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs bg-slate-800 hover:bg-slate-700"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 4. Active Tab Panels */}
      <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-xl">
        {activeTab === 'CLAIMS' && <ClaimsList claims={claims} />}

        {activeTab === 'EVIDENCE' && (
          <EvidenceTrail
            supportingEvidence={supportingEvidence}
            contradictingEvidence={contradictingEvidence}
            neutralEvidence={neutralEvidence}
          />
        )}

        {activeTab === 'CONTRADICTIONS' && (
          <ContradictionView contradictions={contradictions} />
        )}

        {activeTab === 'PROVENANCE' && (
          <ProvenanceView provenance={provenance} inputType={inputType} />
        )}

        {activeTab === 'MODALITIES' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">Modality-Specific Ingestion Details</h4>
            
            {/* If Multimodal Modality Results */}
            {result.modalityResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.modalityResults.text && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-purple-300">
                      <FileText className="w-4 h-4" /> Text Sub-Pipeline
                    </div>
                    <p className="text-xs text-slate-300 font-mono">
                      Input: "{result.modalityResults.text.input}"
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Score: {result.modalityResults.text.trustScore}/100 | Verdict: {result.modalityResults.text.verdict}
                    </div>
                  </div>
                )}

                {result.modalityResults.url && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-300">
                      <Globe className="w-4 h-4" /> URL Sub-Pipeline
                    </div>
                    <p className="text-xs text-slate-300 truncate font-mono">
                      {result.modalityResults.url.finalUrl || result.modalityResults.url.inputUrl}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Score: {result.modalityResults.url.trustScore}/100 | Claims: {result.modalityResults.url.claims?.length || 0}
                    </div>
                  </div>
                )}

                {result.modalityResults.image && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-cyan-300">
                      <ImageIcon className="w-4 h-4" /> Image Sub-Pipeline
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Classification: {result.modalityResults.image.image?.imageClassification || 'Unknown'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Score: {result.modalityResults.image.trustScore}/100 | OCR Extracted: {result.modalityResults.image.extractedText?.length || 0} strings
                    </div>
                  </div>
                )}

                {result.modalityResults.video && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                      <Video className="w-4 h-4" /> Video Sub-Pipeline
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Duration: {result.modalityResults.video.videoMetadata?.durationSeconds || 0}s | Keyframes: {result.modalityResults.video.keyframes?.length || 0}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Score: {result.modalityResults.video.trustScore}/100 | Transcript Segments: {result.modalityResults.video.transcript?.segments?.length || 0}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video specifics */}
            {result.transcript && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-300">Speech-to-Text Transcript</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg font-mono">
                  {result.transcript.fullText || 'No speech detected in audio stream.'}
                </p>
              </div>
            )}

            {/* Image OCR specifics */}
            {result.extractedText && result.extractedText.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-teal-300">Optical Character Recognition (OCR)</span>
                <div className="space-y-1">
                  {result.extractedText.map((t: string, i: number) => (
                    <div key={i} className="text-xs text-slate-300 bg-slate-950 p-2 rounded font-mono">
                      "{t}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URL Page metadata */}
            {result.page && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-blue-300">Webpage Metadata</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>Title: {result.page.title}</div>
                  <div>Author: {result.page.author || 'Not specified'}</div>
                  <div>Domain: {result.page.domain}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
