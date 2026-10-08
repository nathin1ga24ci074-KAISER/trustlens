import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  ArrowLeft,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  X,
  FileText,
  Globe,
  Video,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  VerificationHistoryItem,
  TextVerificationResult,
  UrlVerificationResult,
  ImageVerificationResult,
  VideoVerificationResult,
} from '@trustlens/shared';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

export const HistoryPage: React.FC = () => {

  const [historyItems, setHistoryItems] = useState<VerificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<
    TextVerificationResult | UrlVerificationResult | ImageVerificationResult | VideoVerificationResult | null
  >(null);
  const [loadingDetail, setLoadingDetail] = useState(false);


  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getHistory();
      if (res.success && Array.isArray(res.data)) {
        setHistoryItems(res.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (item: VerificationHistoryItem) => {
    if (item.metadata && (item.metadata as any).verdict) {
      setSelectedVerification(item.metadata as unknown as TextVerificationResult | UrlVerificationResult);
      return;
    }

    setLoadingDetail(true);
    try {
      const res = await api.getVerification(item.id);
      if (res.success && res.data) {
        setSelectedVerification(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch full verification detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredItems = historyItems.filter((item) => {
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const text = (item.extractedClaim || item.originalInput || '').toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getVerdictBadge = (verdict?: string | null) => {
    switch (verdict) {
      case 'LEGIT':
        return <Badge variant="success">LEGIT</Badge>;
      case 'FAKE':
        return <Badge variant="danger">FAKE</Badge>;
      default:
        return <Badge variant="warning">INCONCLUSIVE</Badge>;
    }
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5 mr-1 inline" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white inline">
              Verification Audit Trail
            </h1>
            <Badge variant="brand">{historyItems.length} Records</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Immutable user audit trail of verified claims, source citations, and uncertainty records
          </p>
        </div>

        <Link to="/dashboard">
          <Button size="sm" leftIcon={<FileText className="w-4 h-4" />}>
            New Verification
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claims, URLs, entities, or keywords in your history..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('TEXT')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'TEXT' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Text Claims
          </button>
          <button
            onClick={() => setTypeFilter('URL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'URL' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Webpage URLs
          </button>
          <button
            onClick={() => setTypeFilter('IMAGE')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'IMAGE' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setTypeFilter('VIDEO')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'VIDEO' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Video Reels
          </button>
        </div>
      </div>


      {/* History Items List / Table */}
      {loading ? (
        <Card className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading verification audit logs...</p>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="text-center py-16">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">
            {searchQuery ? 'No matching verifications found' : 'No Verification Records Yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery
              ? 'Try modifying your search keywords.'
              : 'Execute your first evidence-backed claim verification from the dashboard.'}
          </p>
          <Link to="/dashboard">
            <Button size="sm">Go to Workspace</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenDetail(item)}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getVerdictBadge(item.verdict)}
                  <span className="text-[11px] font-mono text-slate-500">
                    {item.type} • {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white truncate">
                  "{item.extractedClaim || item.originalInput}"
                </h4>
                {item.explanation && (
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {item.explanation}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-mono text-slate-500">Trust Score</span>
                  <span className="text-sm font-bold text-white">
                    {item.trustScore ?? 50}
                    <span className="text-[10px] text-slate-500 font-normal"> / 100</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] uppercase font-mono text-slate-500">Confidence</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {item.confidenceScore && item.confidenceScore >= 0.8
                      ? 'HIGH'
                      : item.confidenceScore && item.confidenceScore >= 0.5
                      ? 'MEDIUM'
                      : 'LOW'}
                  </span>
                </div>

                <Button variant="ghost" size="sm">
                  View Detail
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Detail Modal */}
      {selectedVerification && (() => {
        const isVideo = 'inputType' in selectedVerification && (selectedVerification as any).inputType === 'VIDEO';
        const isImage = !isVideo && 'inputType' in selectedVerification && (selectedVerification as any).inputType === 'IMAGE';
        const isUrl = !isVideo && !isImage && 'inputUrl' in selectedVerification;
        const videoRes = isVideo ? (selectedVerification as VideoVerificationResult) : null;
        const imageRes = isImage ? (selectedVerification as ImageVerificationResult) : null;
        const urlRes = isUrl ? (selectedVerification as UrlVerificationResult) : null;
        const textRes = !isVideo && !isImage && !isUrl ? (selectedVerification as TextVerificationResult) : null;
        const verdict = videoRes ? videoRes.overallVerdict : imageRes ? imageRes.overallVerdict : urlRes ? urlRes.overallVerdict : textRes!.verdict;
        const heading = videoRes
          ? (videoRes.userContext || videoRes.summary)
          : imageRes
          ? (imageRes.userContext || imageRes.visualAnalysis.description)
          : urlRes
          ? urlRes.page.title
          : textRes!.claim;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getVerdictBadge(verdict)}
                    <Badge variant="neutral">{selectedVerification.confidence} CONFIDENCE</Badge>
                    <Badge variant={isVideo ? 'warning' : isImage ? 'brand' : isUrl ? 'brand' : 'neutral'}>
                      {isVideo ? 'VIDEO FORENSICS' : isImage ? 'IMAGE FORENSICS' : isUrl ? 'URL WEB PAGE' : 'TEXT CLAIM'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    "{heading}"
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Verified: {new Date(selectedVerification.createdAt).toLocaleString()}
                    {urlRes && ` • ${urlRes.page.domain}`}
                    {imageRes && ` • ${imageRes.image.fileType} (${imageRes.image.width}×${imageRes.image.height}px)`}
                    {videoRes && ` • ${videoRes.videoMetadata.format.toUpperCase()} (${videoRes.videoMetadata.durationSeconds}s, ${videoRes.videoMetadata.width}×${videoRes.videoMetadata.height}px)`}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedVerification(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>


              {/* Score & Summary */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-mono text-slate-400">Calibrated Trust Score</span>
                  <span className="text-2xl font-black text-white">{selectedVerification.trustScore} / 100</span>
                </div>
                <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                  {selectedVerification.summary}
                </p>
              </div>

              {/* Video Specific Sections */}
              {videoRes && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-slate-300 block">Context Attribution:</span>
                      <span className="text-slate-400">{videoRes.contextAnalysis.explanation}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-slate-300 block">Temporal Timeline:</span>
                      <span className="text-slate-400">{videoRes.temporalAnalysis.details}</span>
                    </div>
                  </div>

                  {videoRes.transcript.transcriptAvailable && (
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-xs font-semibold text-slate-300 block">Dialogue Transcript:</span>
                      <p className="text-xs text-slate-400 italic">"{videoRes.transcript.fullTranscript}"</p>
                    </div>
                  )}

                  {/* Claims List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Claims Verified ({videoRes.claims.length})
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {videoRes.claims.map((c, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">"{c.claim}"</span>
                            {getVerdictBadge(c.verdict)}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>Importance: <strong>{c.importance}</strong></span>
                            <span>Source: <strong>{c.source.replace('VIDEO_', '')}</strong></span>
                            <span>Score: <strong>{c.trustScore}</strong></span>
                            <span>Citations: {c.supportingEvidence.length + c.contradictingEvidence.length}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Image Specific Sections */}
              {imageRes && (

                <div className="space-y-4">
                  {imageRes.image.previewUrl && (
                    <div className="flex justify-center p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <img
                        src={imageRes.image.previewUrl}
                        alt="Verification thumbnail"
                        className="max-h-48 object-contain rounded-lg"
                      />
                    </div>
                  )}

                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-xs font-semibold text-slate-300 block">Visual Scene Analysis:</span>
                    <p className="text-xs text-slate-400">{imageRes.visualAnalysis.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-slate-300 block">Context Attribution:</span>
                      <span className="text-slate-400">{imageRes.contextAssessment.explanation}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-slate-300 block">Manipulation Forensics:</span>
                      <span className="text-slate-400">Severity: {imageRes.manipulationAnalysis.severity}</span>
                    </div>
                  </div>

                  {/* Claims List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Claims Verified ({imageRes.claims.length})
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {imageRes.claims.map((c, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">"{c.claim}"</span>
                            {getVerdictBadge(c.verdict)}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>Importance: <strong>{c.importance}</strong></span>
                            <span>Source: <strong>{c.source}</strong></span>
                            <span>Score: <strong>{c.trustScore}</strong></span>
                            <span>Citations: {c.supportingEvidence.length + c.contradictingEvidence.length}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* URL Specific Sections */}
              {urlRes && (
                <div className="space-y-4">
                  {/* Headline Analysis */}
                  {urlRes.headlineAnalysis && (
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Headline Framing:</span>
                        <span className="text-xs font-bold text-slate-400">Severity: {urlRes.headlineAnalysis.severity}</span>
                      </div>
                      <p className="text-xs text-slate-400">{urlRes.headlineAnalysis.explanation}</p>
                    </div>
                  )}

                  {/* Claims List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Claims Verified ({urlRes.claims.length})
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {urlRes.claims.map((c, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">"{c.claim}"</span>
                            {getVerdictBadge(c.verdict)}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>Importance: <strong>{c.importance}</strong></span>
                            <span>Score: <strong>{c.trustScore}</strong></span>
                            <span>Citations: {c.supportingEvidence.length + c.contradictingEvidence.length}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Text Specific Rationale & Citations */}
              {textRes && (
                <>
                  {textRes.reasoning && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Factual Rationale
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 whitespace-pre-wrap">
                        {textRes.reasoning}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Independent Citations ({textRes.supportingEvidence.length + textRes.contradictingEvidence.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {[...textRes.supportingEvidence, ...textRes.contradictingEvidence].map((e) => (
                        <div
                          key={e.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-1.5 truncate max-w-[400px]"
                          >
                            {e.title}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <span className="text-[11px] font-mono text-slate-500">{e.domain}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-800 text-right">
                <Button variant="secondary" size="sm" onClick={() => setSelectedVerification(null)}>
                  Close Record
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
