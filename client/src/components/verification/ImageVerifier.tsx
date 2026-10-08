import React, { useState, useRef } from 'react';
import {
  ImageVerificationResult,
  ImageClaimVerificationResult,
} from '@trustlens/shared';
import { api } from '../../services/api';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Camera,
  FileText,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Info,
  X,
} from 'lucide-react';

const PIPELINE_STEPS = [
  'Securing image & verifying signatures',
  'Understanding visual content & entities',
  'Extracting visible text & OCR',
  'Formulating empirical claims',
  'Searching independent web evidence',
  'Assessing image context & attribution',
  'Checking contradictions & sources',
  'Calculating deterministic trust score',
  'Generating explainable verdict',
];

export const ImageVerifier: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userContext, setUserContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageVerificationResult | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setError(null);
    setResult(null);

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file exceeds the maximum allowed size of 10MB.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported file type. Please upload a JPEG, PNG, or WEBP image.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image file to verify.');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStep(0);
    setResult(null);

    // Stepper interval
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (userContext.trim()) {
        formData.append('context', userContext.trim());
      }

      const res = await api.verifyImage(formData);
      clearInterval(stepInterval);
      setCurrentStep(PIPELINE_STEPS.length - 1);
      setResult(res.data);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Image verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'LEGIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            LEGIT
          </span>
        );
      case 'FAKE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-4 h-4 text-rose-400" />
            FAKE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            INCONCLUSIVE
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 68) return 'text-emerald-400 border-emerald-500/30';
    if (score <= 35) return 'text-rose-400 border-rose-500/30';
    return 'text-amber-400 border-amber-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Upload & Context Form */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Evidence-Based Image Verification</h2>
            <p className="text-xs text-slate-400">
              Multimodal scene understanding, OCR text extraction, empirical claim formulation, and external search grounding.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {/* Dropzone */}
          {!previewUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-teal-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-900/60"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Click to upload or drag & drop image
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports JPEG, PNG, WEBP (Max 10 MB)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative border border-slate-700/80 rounded-xl p-4 bg-slate-950/60 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-48 max-w-xs object-contain rounded-lg border border-slate-800"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white break-all">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Size: {((selectedFile?.size || 0) / 1024).toFixed(1)} KB | Type: {selectedFile?.type}
                </p>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove Image
                </button>
              </div>
            </div>
          )}

          {/* Optional Context Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Context or Claim Hypothesis (Optional)
            </label>
            <input
              type="text"
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="e.g., 'Claimed to show flooding in Bengaluru in October 2026'"
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-teal-400 inline shrink-0" />
              User context is treated strictly as a verification hypothesis, never as external evidence.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Image Evidence...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Verify Image Credibility</span>
              </>
            )}
          </button>
        </form>

        {/* Verification Stepper */}
        {loading && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-teal-400 animate-pulse" />
              Multi-Stage Pipeline Execution
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PIPELINE_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                      isCurrent
                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                        : isDone
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <span className="truncate">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Verification Result Display */}
      {result && (
        <div className="space-y-6">
          {/* 1. Header Overview & Verdict */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Image Preview & Class */}
              <div className="flex flex-col items-center md:items-start gap-2">
                {result.image.previewUrl && (
                  <img
                    src={result.image.previewUrl}
                    alt="Analyzed subject"
                    className="max-h-44 object-contain rounded-lg border border-slate-800 shadow-md"
                  />
                )}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {result.image.fileType}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {result.image.width}×{result.image.height} px
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {result.image.imageClassification}
                  </span>
                </div>
              </div>

              {/* Verdict & Score */}
              <div className="md:col-span-2 flex flex-col justify-center space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                      Assessed Credibility Verdict
                    </span>
                    {getVerdictBadge(result.overallVerdict)}
                  </div>
                  <div className={`p-4 rounded-xl border text-center bg-slate-950/60 ${getScoreColor(result.trustScore)}`}>
                    <span className="text-2xl font-bold block">{result.trustScore}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      Trust Score / 100
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  {result.summary}
                </p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                  <span>Confidence: <strong className="text-slate-200">{result.confidence}</strong></span>
                  <span>Claims Verified: <strong className="text-slate-200">{result.claims.length}</strong></span>
                  <span>OCR Elements: <strong className="text-slate-200">{result.extractedText.length}</strong></span>
                  {result.searchStatus && (
                    <span>
                      Search Grounding:{' '}
                      <strong
                        className={
                          result.searchStatus === 'SUCCESS'
                            ? 'text-emerald-400'
                            : result.searchStatus === 'RATE_LIMITED'
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }
                      >
                        {result.searchStatus}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Visual Understanding & OCR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* What the Image Shows */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-400" />
                What the Image Shows
              </h3>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                {result.visualAnalysis.description}
              </p>

              {result.visualAnalysis.observations.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Observed Visual Facts:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {result.visualAnalysis.observations.map((obs, i) => (
                      <li key={i}>{obs}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.visualAnalysis.entities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
                  {result.visualAnalysis.entities.map((ent, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Context & Manipulation Forensic Signals */}
            <div className="space-y-6">
              {/* Context Consistency Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-400" />
                  Contextual Attribution Check
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      result.contextAssessment.verdict === 'CONSISTENT'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : result.contextAssessment.verdict === 'MISMATCH'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    Context: {result.contextAssessment.verdict}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {result.contextAssessment.explanation}
                </p>
              </div>

              {/* Manipulation Forensics Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-teal-400" />
                  Visual Manipulation Forensics
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      result.manipulationAnalysis.severity === 'NONE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : result.manipulationAnalysis.severity === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    Manipulation Severity: {result.manipulationAnalysis.severity}
                  </span>
                </div>
                {result.manipulationAnalysis.indicators.length > 0 ? (
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {result.manipulationAnalysis.indicators.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    No obvious lighting or compositing distortion artifacts were detected upon inspection.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. OCR Text Extracted (Collapsible) */}
          {result.extractedText.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
              <button
                type="button"
                onClick={() => setShowOcrText(!showOcrText)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-semibold text-white">
                    Visible Text Extracted (OCR) ({result.extractedText.length} items)
                  </span>
                </div>
                {showOcrText ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showOcrText && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  {result.extractedText.map((txt, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300"
                    >
                      {txt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Claims Verified & Grounded External Citations */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              Empirical Claims & Independent Evidence Grounding
            </h3>

            <div className="space-y-4">
              {result.claims.map((claim) => {
                const isExpanded = expandedClaim === claim.claimId;
                return (
                  <div
                    key={claim.claimId}
                    className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {claim.importance}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Source: {claim.source}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
                            {claim.claimType}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white">{claim.claim}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getVerdictBadge(claim.verdict)}
                        <span className="text-xs font-mono text-slate-300">
                          {claim.trustScore}/100
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedClaim(isExpanded ? null : claim.claimId)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Citations Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                        {/* Supporting Evidence */}
                        {claim.supportingEvidence.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-emerald-400 block mb-1.5">
                              ✓ Corroborating Independent Citations ({claim.supportingEvidence.length})
                            </span>
                            <div className="space-y-2">
                              {claim.supportingEvidence.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-emerald-300">
                                      {ev.publisher} ({ev.domain})
                                    </span>
                                    {ev.url && (
                                      <a
                                        href={ev.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:underline flex items-center gap-1"
                                      >
                                        Source <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-slate-300 mt-1">{ev.snippet}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contradicting Evidence */}
                        {claim.contradictingEvidence.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-rose-400 block mb-1.5">
                              ✗ Contradicting Evidence ({claim.contradictingEvidence.length})
                            </span>
                            <div className="space-y-2">
                              {claim.contradictingEvidence.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-rose-300">
                                      {ev.publisher} ({ev.domain})
                                    </span>
                                    {ev.url && (
                                      <a
                                        href={ev.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-rose-400 hover:underline flex items-center gap-1"
                                      >
                                        Source <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-slate-300 mt-1">{ev.snippet}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Neutral / Background Evidence */}
                        {claim.neutralEvidence && claim.neutralEvidence.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                              ℹ Background Event Context ({claim.neutralEvidence.length})
                            </span>
                            <div className="space-y-2">
                              {claim.neutralEvidence.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-300">
                                      {ev.publisher} ({ev.domain})
                                    </span>
                                    {ev.url && (
                                      <a
                                        href={ev.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-400 hover:underline flex items-center gap-1"
                                      >
                                        Source <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-slate-400 mt-1">{ev.snippet}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {claim.supportingEvidence.length === 0 && claim.contradictingEvidence.length === 0 && (
                          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-1">
                            <p>{claim.searchExplanation || 'No external citations met high-confidence threshold for this assertion.'}</p>
                            {claim.searchStatus === 'RATE_LIMITED' && (
                              <p className="text-[11px] text-amber-400/90">
                                Notice: Google search grounding was rate-limited or throttled by provider. TrustLens strictly refuses to fabricate citations.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Safe Metadata & Transparent Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metadata Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl text-xs space-y-2">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                Image File & EXIF Signals
              </h3>
              <p className="text-slate-300">
                Camera: <span className="text-white font-medium">{result.metadataAnalysis.signals.cameraMake || 'Unknown'} {result.metadataAnalysis.signals.cameraModel || ''}</span>
              </p>
              <p className="text-slate-300">
                Timestamp: <span className="text-white font-medium">{result.metadataAnalysis.signals.timestamp || 'Not encoded in header'}</span>
              </p>
              <p className="text-slate-300">
                Location Metadata: <span className="text-teal-400 font-medium">{result.metadataAnalysis.signals.hasLocationData ? 'Present (Coordinates shielded for privacy)' : 'None detected'}</span>
              </p>
            </div>

            {/* Limitations Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl text-xs space-y-2">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-400" />
                Analysis Scope & Limitations
              </h3>
              <ul className="text-slate-400 space-y-1 list-disc list-inside">
                {result.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
