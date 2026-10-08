import React, { useState, useEffect, useRef } from 'react';
import {
  Video as VideoIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  FileText,
  Sparkles,
  ExternalLink,
  Eye,
  Layers,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  VideoVerificationResult,
  DemoReelItem,
  PrimaryVerdict,
} from '@trustlens/shared';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { api } from '../../services/api';

const VERIFICATION_STEPS = [
  'Validating video format & binary safety',
  'Keyframe sampling & timeline deduplication',
  'Audio stream extraction & speech transcription',
  'Gemini multimodal visual & OCR analysis',
  'Multi-source empirical claim formulation',
  'Grounded independent web evidence retrieval',
  'Temporal alignment & context recycling audit',
  'Deterministic trust scoring & veto check',
];

export const VideoVerifier: React.FC = () => {
  // Mode: Demo Reels vs Upload
  const [mode, setMode] = useState<'DEMO' | 'UPLOAD'>('DEMO');

  // Demo Reels Feed State
  const [demoReels, setDemoReels] = useState<DemoReelItem[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [loadingReels, setLoadingReels] = useState(true);

  // Video Player State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userContext, setUserContext] = useState('');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Verification Pipeline State
  const [verifying, setVerifying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoVerificationResult | null>(null);

  // Accordion & Drawer Toggles
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<number>(0);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Load Demo Reels on mount
  useEffect(() => {
    loadDemoReels();
  }, []);

  // Update file preview when custom video is uploaded
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, [selectedFile]);

  // Handle video element play/pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const loadDemoReels = async () => {
    setLoadingReels(true);
    try {
      const res = await api.getDemoReels();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setDemoReels(res.data);
      }
    } catch (err: any) {
      console.warn('Could not fetch demo reels from server, using local fallbacks:', err.message);
    } finally {
      setLoadingReels(false);
    }
  };

  const handlePrevReel = () => {
    if (demoReels.length === 0) return;
    const nextIdx = (currentReelIndex - 1 + demoReels.length) % demoReels.length;
    setCurrentReelIndex(nextIdx);
    setResult(null);
    setError(null);
    setIsPlaying(false);
  };

  const handleNextReel = () => {
    if (demoReels.length === 0) return;
    const nextIdx = (currentReelIndex + 1) % demoReels.length;
    setCurrentReelIndex(nextIdx);
    setResult(null);
    setError(null);
    setIsPlaying(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  // Run the real verification pipeline
  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    setResult(null);
    setActiveStepIndex(0);

    // Step progress interval simulator for real verification feedback
    const stepInterval = setInterval(() => {
      setActiveStepIndex((prev) => (prev < VERIFICATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const formData = new FormData();

      if (mode === 'DEMO') {
        const reel = demoReels[currentReelIndex];
        if (!reel) throw new Error('No demo reel selected');
        formData.append('demoId', reel.id);
        if (reel.claimedContext) {
          formData.append('context', reel.claimedContext);
        }
      } else {
        if (!selectedFile) {
          throw new Error('Please select a video file to upload.');
        }
        formData.append('video', selectedFile);
        if (userContext.trim()) {
          formData.append('context', userContext.trim());
        }
      }

      const res = await api.verifyVideo(formData);
      if (res.success && res.data) {
        setResult(res.data);
        setActiveStepIndex(VERIFICATION_STEPS.length - 1);
        if (res.data.claims.length > 0) {
          setExpandedClaimId(res.data.claims[0].claimId);
        }
      } else {
        throw new Error(res.message || 'Verification could not be completed.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during video verification.');
    } finally {
      clearInterval(stepInterval);
      setVerifying(false);
    }
  };

  const currentReel = demoReels[currentReelIndex];

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-amber-400" />
            Video & Social Reel Verification
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Keyframe sampling, audio transcription, temporal consistency, and independent web evidence grounding.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => {
              setMode('DEMO');
              setResult(null);
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              mode === 'DEMO'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Local Demo Reels ({demoReels.length})
          </button>
          <button
            onClick={() => {
              setMode('UPLOAD');
              setResult(null);
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              mode === 'UPLOAD'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upload Custom Video
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Verification Error">
          {error}
        </Alert>
      )}

      {/* Main Grid: Reel Player on Left, Analysis Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: REELS PLAYER / UPLOAD CONTAINER (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 bg-slate-950/80 border-slate-800 flex flex-col items-center">
            {mode === 'DEMO' ? (
              <div className="w-full flex flex-col items-center">
                {/* Reel Navigator Bar */}
                <div className="w-full flex items-center justify-between gap-2 mb-3 text-xs">
                  <button
                    onClick={handlePrevReel}
                    disabled={verifying}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Reel {currentReelIndex + 1} of {demoReels.length}
                  </span>
                  <button
                    onClick={handleNextReel}
                    disabled={verifying}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Vertical Reel Player Container */}
                <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border-2 border-slate-800 shadow-2xl flex items-center justify-center group">
                  {currentReel ? (
                    <video
                      ref={videoRef}
                      src={currentReel.videoUrl}
                      loop
                      playsInline
                      muted={isMuted}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">Loading video feed...</div>
                  )}

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none flex flex-col justify-between p-4">
                    {/* Top Bar: Category badge */}
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" size="sm">
                        {currentReel?.category || 'Reel'}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white pointer-events-auto hover:bg-black/90 transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Middle Play Button */}
                    <div className="self-center pointer-events-auto">
                      <button
                        onClick={togglePlay}
                        className="p-4 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white transition-transform hover:scale-110 cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>
                    </div>

                    {/* Bottom Metadata & Claimed Context */}
                    <div className="space-y-1.5 text-left pointer-events-auto">
                      <h3 className="text-sm font-bold text-white line-clamp-2">
                        {currentReel?.title}
                      </h3>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {currentReel?.description}
                      </p>
                      {currentReel?.claimedContext && (
                        <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-900/60 text-[11px] text-amber-200">
                          <span className="font-semibold text-amber-300">Claimed context:</span>{' '}
                          {currentReel.claimedContext}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reel Selector Carousel Pills */}
                <div className="w-full mt-3 overflow-x-auto flex gap-1.5 pb-1">
                  {demoReels.map((reel, idx) => (
                    <button
                      key={reel.id}
                      onClick={() => {
                        setCurrentReelIndex(idx);
                        setResult(null);
                        setError(null);
                        setIsPlaying(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                        idx === currentReelIndex
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {reel.category}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Custom Video Upload Mode */
              <div className="w-full space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-amber-500/60 bg-amber-950/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      {filePreviewUrl ? (
                        <div className="max-w-[240px] aspect-[9/16] mx-auto rounded-lg overflow-hidden bg-black">
                          <video
                            src={filePreviewUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <VideoIcon className="w-10 h-10 text-amber-400 mx-auto" />
                      )}
                      <div className="text-xs text-white font-medium truncate">{selectedFile.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-semibold text-white">Click or drag video to verify</div>
                      <div className="text-[11px] text-slate-400">MP4, WebM, or MOV up to 50MB</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Claimed Context / Hypothesis (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="e.g. This video was filmed in Madrid during October 2026 showing wildfire response."
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Treated as a verification hypothesis to check against independent web facts.
                  </p>
                </div>
              </div>
            )}

            {/* Verification Trigger Button */}
            <div className="w-full mt-4">
              <Button
                variant="primary"
                onClick={handleVerify}
                isLoading={verifying}
                disabled={verifying || (mode === 'UPLOAD' && !selectedFile)}
                className="w-full py-2.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {verifying
                  ? 'Verifying Reel via Multi-Stage Pipeline...'
                  : mode === 'DEMO'
                  ? `Verify "${currentReel?.title || 'Selected Reel'}"`
                  : 'Verify Uploaded Video'}
              </Button>
            </div>
          </Card>

          {/* Stepper Progress Card during verification */}
          {verifying && (
            <Card className="p-4 bg-slate-900/90 border-amber-900/50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                  Evidence Pipeline Active
                </span>
                <span className="text-amber-400 font-mono text-[11px]">
                  Step {activeStepIndex + 1} of {VERIFICATION_STEPS.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {VERIFICATION_STEPS.map((step, idx) => {
                  const isDone = idx < activeStepIndex;
                  const isCurrent = idx === activeStepIndex;
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        isDone
                          ? 'text-emerald-400'
                          : isCurrent
                          ? 'text-amber-300 font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <span className="truncate">{step}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: ANALYSIS & VERDICT REPORT (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !verifying && (
            <Card className="p-8 text-center bg-slate-950/60 border-slate-800/80">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-900/60 flex items-center justify-center text-amber-400 mx-auto mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Video Verification Ready
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-4">
                Select one of the 10 pre-loaded reels on the left or upload your own video to execute full multimodal frame sampling, speech transcription, and evidence-backed factual cross-checking.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Average verification runtime: 8–15 seconds
              </div>
            </Card>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Verdict Header Banner */}
              <Card
                className={`p-5 border-2 ${
                  result.overallVerdict === 'LEGIT'
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : result.overallVerdict === 'FAKE'
                    ? 'border-rose-500/80 bg-rose-950/20'
                    : 'border-amber-500/80 bg-amber-950/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Assessment Verdict
                      </span>
                      <Badge
                        variant={
                          result.overallVerdict === 'LEGIT'
                            ? 'success'
                            : result.overallVerdict === 'FAKE'
                            ? 'danger'
                            : 'warning'
                        }
                        size="md"
                      >
                        {result.overallVerdict}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        Confidence: {result.confidence}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed max-w-xl">
                      {result.summary}
                    </p>
                  </div>

                  {/* Trust Score Gauge */}
                  <div className="flex items-center gap-3 self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-center">
                      <div
                        className={`text-2xl font-black font-mono ${
                          result.trustScore >= 65
                            ? 'text-emerald-400'
                            : result.trustScore <= 35
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {result.trustScore}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Trust Score
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reasoning Explainer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-200">Algorithmic Rationale:</span> {result.reasoning}
                </div>
              </Card>

              {/* Context & Temporal Assessments Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Context Recycling Assessment */}
                <Card className="p-4 bg-slate-950 border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" /> Context Attribution
                    </span>
                    <Badge
                      variant={
                        result.contextAnalysis.verdict === 'CONSISTENT'
                          ? 'success'
                          : result.contextAnalysis.verdict === 'MISMATCH'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {result.contextAnalysis.verdict}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.contextAnalysis.explanation}
                  </p>
                </Card>

                {/* Temporal Consistency Assessment */}
                <Card className="p-4 bg-slate-950 border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" /> Temporal Timeline
                    </span>
                    <Badge
                      variant={
                        result.temporalAnalysis.verdict === 'TEMPORAL_CONSISTENT'
                          ? 'success'
                          : result.temporalAnalysis.verdict === 'TEMPORAL_INCONSISTENT'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {result.temporalAnalysis.verdict.replace('TEMPORAL_', '')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.temporalAnalysis.details}
                  </p>
                </Card>
              </div>

              {/* Sampled Keyframes Gallery */}
              {result.keyframes.length > 0 && (
                <Card className="p-4 bg-slate-950 border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-sky-400" /> Chronological Keyframes ({result.keyframes.length})
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Sampled at key progression intervals
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {result.keyframes.map((k, idx) => (
                      <div
                        key={k.frameIndex}
                        onClick={() => setSelectedKeyframeIndex(idx)}
                        className={`p-1 rounded-lg border cursor-pointer transition-all ${
                          selectedKeyframeIndex === idx
                            ? 'border-amber-500 bg-amber-950/20'
                            : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="aspect-video bg-black rounded overflow-hidden mb-1.5 relative">
                          {k.extractedImage ? (
                            <img
                              src={k.extractedImage}
                              alt={`Keyframe ${k.timestampSeconds}s`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                              Frame {idx}
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                            {k.timestampSeconds}s
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-300 font-medium truncate">
                          {k.selectionReason}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Active Keyframe Forensic Breakdown */}
                  {result.keyframes[selectedKeyframeIndex] && (
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Timestamp: {result.keyframes[selectedKeyframeIndex].timestampSeconds}s</span>
                        <span className="italic">{result.keyframes[selectedKeyframeIndex].selectionReason}</span>
                      </div>

                      {result.keyframes[selectedKeyframeIndex].observed.length > 0 && (
                        <div>
                          <span className="font-semibold text-emerald-400">Observed in Frame:</span>
                          <ul className="list-disc list-inside text-slate-300 text-[11px] mt-0.5 space-y-0.5">
                            {result.keyframes[selectedKeyframeIndex].observed.map((obs, i) => (
                              <li key={i}>{obs}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.keyframes[selectedKeyframeIndex].inferred.length > 0 && (
                        <div>
                          <span className="font-semibold text-amber-400">Inferred Context:</span>
                          <ul className="list-disc list-inside text-slate-400 text-[11px] mt-0.5 space-y-0.5">
                            {result.keyframes[selectedKeyframeIndex].inferred.map((inf, i) => (
                              <li key={i}>{inf}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.keyframes[selectedKeyframeIndex].ocrText &&
                        result.keyframes[selectedKeyframeIndex].ocrText!.length > 0 && (
                          <div>
                            <span className="font-semibold text-cyan-400">OCR Detected Text:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {result.keyframes[selectedKeyframeIndex].ocrText!.map((txt, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] text-cyan-300 font-mono"
                                >
                                  "{txt}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </Card>
              )}

              {/* Audio Transcript Viewer */}
              <Card className="p-4 bg-slate-950 border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" /> Spoken Dialogue Transcript
                  </h4>
                  <Badge
                    variant={result.transcript.transcriptAvailable ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {result.transcript.transcriptAvailable ? 'Transcribed' : 'Unavailable'}
                  </Badge>
                </div>

                {result.transcript.transcriptAvailable ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                      "{result.transcript.fullTranscript}"
                    </p>
                    {result.transcript.segments.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowFullTranscript(!showFullTranscript)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          {showFullTranscript ? 'Hide timestamped segments' : 'Show timestamped segments'}
                          {showFullTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {showFullTranscript && (
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {result.transcript.segments.map((s, i) => (
                              <div
                                key={i}
                                className="text-[11px] text-slate-300 flex items-start gap-2 p-1.5 rounded bg-slate-900/60"
                              >
                                <span className="font-mono text-amber-400 text-[10px] shrink-0">
                                  [{s.startTime}s - {s.endTime}s]
                                </span>
                                <span>{s.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {result.transcript.status}
                  </p>
                )}
              </Card>

              {/* Factual Claims & Independent Evidence Breakdown */}
              <Card className="p-4 bg-slate-950 border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" /> Extracted Claims & Independent Web Evidence ({result.claims.length})
                </h4>

                <div className="space-y-2">
                  {result.claims.map((claim) => {
                    const isExpanded = expandedClaimId === claim.claimId;
                    return (
                      <div
                        key={claim.claimId}
                        className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
                      >
                        <div
                          onClick={() => setExpandedClaimId(isExpanded ? null : claim.claimId)}
                          className="p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-850"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  claim.importance === 'PRIMARY'
                                    ? 'brand'
                                    : claim.importance === 'SUPPORTING'
                                    ? 'neutral'
                                    : 'neutral'
                                }
                                size="sm"
                              >
                                {claim.importance}
                              </Badge>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                Source: {claim.source.replace('VIDEO_', '')}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-white">{claim.claim}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                claim.verdict === 'LEGIT'
                                  ? 'success'
                                  : claim.verdict === 'FAKE'
                                  ? 'danger'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {claim.verdict} ({claim.trustScore})
                            </Badge>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Evidence Accordion Drawer */}
                        {isExpanded && (
                          <div className="p-3 pt-0 border-t border-slate-800 bg-slate-950/60 space-y-2 text-xs">
                            <div className="text-[11px] text-slate-400 mt-2">
                              Independent Citations: {claim.supportingEvidence.length} supporting, {claim.contradictingEvidence.length} contradicting.
                            </div>

                            {claim.supportingEvidence.map((e) => (
                              <div
                                key={e.id}
                                className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-200 text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">{e.domain}</span>
                                  <Badge variant="success" size="sm">SUPPORTS</Badge>
                                </div>
                                <p className="text-slate-300">{e.snippet}</p>
                                <a
                                  href={e.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  {e.url} <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            ))}

                            {claim.contradictingEvidence.map((e) => (
                              <div
                                key={e.id}
                                className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-rose-200 text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">{e.domain}</span>
                                  <Badge variant="danger" size="sm">CONTRADICTS</Badge>
                                </div>
                                <p className="text-slate-300">{e.snippet}</p>
                                <a
                                  href={e.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  {e.url} <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Forensic Limitations & Disclosure */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Forensic Disclosure:</div>
                {result.limitations.map((lim, i) => (
                  <p key={i} className="leading-relaxed">• {lim}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
