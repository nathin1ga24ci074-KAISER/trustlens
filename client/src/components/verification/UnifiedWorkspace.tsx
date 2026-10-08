import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Layers,
  FileText,
  Globe,
  Image as ImageIcon,
  Video,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  Activity,
  ShieldCheck,
  RotateCcw,
  Film,
} from 'lucide-react';
import {
  MultimodalVerificationResult,
  DemoReelItem,
} from '@trustlens/shared';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';
import { UnifiedResultView } from './common';
import { TextVerifier } from './TextVerifier';
import { UrlVerifier } from './UrlVerifier';
import { ImageVerifier } from './ImageVerifier';
import { VideoVerifier } from './VideoVerifier';

type WorkspaceMode = 'MULTIMODAL' | 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO';

const MULTIMODAL_STEPS = [
  'Securing inputs & validating cryptographic magic signatures',
  'Executing modality-specific extractions (Text, Webpage, Vision, Audio)',
  'Fusing empirical claims & eliminating cross-modal duplication',
  'Grounding assertions with independent authoritative web evidence',
  'Auditing cross-modal spatio-temporal consistency & alignment',
  'Checking contradictions & enforcing Primary Claim Veto Rule',
  'Computing deterministic trust score & calibrated verdict',
];

export const UnifiedWorkspace: React.FC = () => {
  const [mode, setMode] = useState<WorkspaceMode>('MULTIMODAL');

  // Multimodal form state
  const [claimText, setClaimText] = useState('');
  const [claimUrl, setClaimUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [demoReels, setDemoReels] = useState<DemoReelItem[]>([]);
  const [videoSourceType, setVideoSourceType] = useState<'NONE' | 'UPLOAD' | 'DEMO'>('NONE');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [multimodalResult, setMultimodalResult] = useState<MultimodalVerificationResult | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch demo reels on mount
  useEffect(() => {
    api.getDemoReels()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDemoReels(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load demo reels for multimodal selector:', err);
      });
  }, []);

  // Step ticker during execution
  useEffect(() => {
    let interval: any;
    if (loading) {
      setActiveStepIndex(0);
      interval = setInterval(() => {
        setActiveStepIndex((prev) => (prev < MULTIMODAL_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const handleImageSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds 10MB limit.');
      return;
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleClearImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleVideoSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setError('Video exceeds 50MB limit.');
      return;
    }
    setVideoFile(file);
    setSelectedDemoId('');
    setVideoSourceType('UPLOAD');
    setError(null);
  };

  const handleClearVideo = () => {
    setVideoFile(null);
    setSelectedDemoId('');
    setVideoSourceType('NONE');
  };

  const handleDemoSelect = (demoId: string) => {
    setSelectedDemoId(demoId);
    setVideoFile(null);
    setVideoSourceType('DEMO');
  };

  const handleMultimodalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasText = claimText.trim().length > 3;
    const hasUrl = claimUrl.trim().length > 5;
    const hasImage = Boolean(imageFile);
    const hasVideo = Boolean(videoFile || selectedDemoId);

    if (!hasText && !hasUrl && !hasImage && !hasVideo) {
      setError('Please provide at least one input (Text claim, URL, Image, or Video/Demo Reel) to verify.');
      return;
    }

    setLoading(true);
    setMultimodalResult(null);

    try {
      const formData = new FormData();
      if (hasText) formData.append('text', claimText.trim());
      if (hasUrl) formData.append('url', claimUrl.trim());
      if (imageFile) formData.append('image', imageFile);
      if (videoFile) formData.append('video', videoFile);
      if (selectedDemoId) formData.append('demoId', selectedDemoId);

      const res = await api.verifyMultimodal(formData);
      if (res.success && res.data) {
        setMultimodalResult(res.data);
      } else {
        throw new Error('Verification completed without result data.');
      }
    } catch (err: any) {
      console.error('Multimodal verification failed:', err);
      setError(err.message || 'Multimodal verification pipeline failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMultimodal = () => {
    handleClearImage();
    handleClearVideo();
    setClaimText('');
    setClaimUrl('');
    setMultimodalResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Workspace Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg">
        <div role="tablist" aria-label="Verification Mode Selection" className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'MULTIMODAL'}
            onClick={() => setMode('MULTIMODAL')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'MULTIMODAL'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Unified Multimodal</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 uppercase font-mono font-bold">
              All-in-One
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'TEXT'}
            onClick={() => setMode('TEXT')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'TEXT'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Text Claim</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'URL'}
            onClick={() => setMode('URL')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'URL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Webpage URL</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'IMAGE'}
            onClick={() => setMode('IMAGE')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'IMAGE'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Image Forensics</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'VIDEO'}
            onClick={() => setMode('VIDEO')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'VIDEO'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>Video Reels</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Evidence Engine: Online</span>
        </div>
      </div>

      {/* Render Single-Modality Verifiers when dedicated tab is active */}
      {mode === 'TEXT' && <TextVerifier />}
      {mode === 'URL' && <UrlVerifier />}
      {mode === 'IMAGE' && <ImageVerifier />}
      {mode === 'VIDEO' && <VideoVerifier />}

      {/* Render Multimodal Workspace when MULTIMODAL mode is active */}
      {mode === 'MULTIMODAL' && (
        <div className="space-y-6">
          {/* If Result exists, display UnifiedResultView */}
          {multimodalResult ? (
            <UnifiedResultView
              result={multimodalResult}
              onReset={handleResetMultimodal}
            />
          ) : (
            <Card className="p-6 bg-slate-950/80 border-slate-800 shadow-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>Multimodal Hypothesis Ingestion</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Submit text claims, URLs, images, and videos together. TrustLens treats user submissions as hypotheses, cross-checking all assertions against independent web evidence.
                </p>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleMultimodalSubmit} className="space-y-5">
                {/* 1. Text Claim Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Claim or Context Narrative (Optional / Recommended)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={claimText}
                    onChange={(e) => setClaimText(e.target.value)}
                    disabled={loading}
                    placeholder="e.g. Breaking: Scientists announce net energy gain in nuclear fusion experiment at Lawrence Livermore National Laboratory..."
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* 2. URL Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Reference Webpage URL (Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={claimUrl}
                    onChange={(e) => setClaimUrl(e.target.value)}
                    disabled={loading}
                    placeholder="https://example.com/news-story"
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* 3. Image and Video Ingestion Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Image Ingestion Box */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Image Input</span>
                      </span>
                      {imageFile && (
                        <button
                          type="button"
                          onClick={handleClearImage}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    {imagePreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-40">
                        <img
                          src={imagePreviewUrl}
                          alt="Selected preview"
                          className="max-h-40 w-auto object-contain"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                          {imageFile?.name} ({(imageFile!.size / (1024 * 1024)).toFixed(2)} MB)
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="p-5 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                        <div className="text-xs text-slate-300 font-medium">Click to select image</div>
                        <div className="text-[10px] text-slate-500">JPG, PNG, WEBP up to 10MB</div>
                      </div>
                    )}
                  </div>

                  {/* Video Ingestion Box */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-amber-400" />
                        <span>Video / Demo Reel</span>
                      </span>
                      {videoSourceType !== 'NONE' && (
                        <button
                          type="button"
                          onClick={handleClearVideo}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                    />

                    {videoFile ? (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <Video className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate text-white font-medium">{videoFile.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ) : selectedDemoId ? (
                      <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-200 font-semibold">
                            Demo Reel: {demoReels.find((d) => d.id === selectedDemoId)?.title || selectedDemoId}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400">Selected</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div
                          onClick={() => videoInputRef.current?.click()}
                          className="p-3 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-center cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                          <div className="text-xs text-slate-300 font-medium">Upload video file (MP4, WEBM)</div>
                        </div>

                        {demoReels.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">Or Reel:</span>
                            <select
                              value={selectedDemoId}
                              onChange={(e) => handleDemoSelect(e.target.value)}
                              className="w-full text-[11px] bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- Choose bundled demo reel --</option>
                              {demoReels.map((reel) => (
                                <option key={reel.id} value={reel.id}>
                                  {reel.title} ({reel.category})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                    disabled={loading}
                    className="w-full py-3 text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-xl"
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                  >
                    {loading
                      ? 'Executing Multimodal Verification Pipeline...'
                      : 'Execute Unified Multimodal Verification'}
                  </Button>
                </div>
              </form>

              {/* Progress Stepper during Multimodal Verification */}
              {loading && (
                <div className="p-4 rounded-xl bg-slate-900 border border-indigo-900/60 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                      Multimodal Evidence Pipeline Active
                    </span>
                    <span className="text-indigo-400 font-mono text-[11px]">
                      Phase {activeStepIndex + 1} of {MULTIMODAL_STEPS.length}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {MULTIMODAL_STEPS.map((step, idx) => {
                      const isDone = idx < activeStepIndex;
                      const isCurrent = idx === activeStepIndex;
                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            isDone
                              ? 'text-emerald-400'
                              : isCurrent
                              ? 'text-indigo-300 font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isCurrent ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
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
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
