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
  MultimodalVerificationResult,
  UnifiedVerificationResult,
} from '@trustlens/shared';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { UnifiedResultView } from '../components/verification/common';
import { api } from '../services/api';

export const HistoryPage: React.FC = () => {

  const [historyItems, setHistoryItems] = useState<VerificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TEXT' | 'URL' | 'IMAGE' | 'VIDEO' | 'MULTIMODAL'>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<UnifiedVerificationResult | null>(null);
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
          <button
            onClick={() => setTypeFilter('MULTIMODAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'MULTIMODAL' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Multimodal
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
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-400">
                Record ID: {selectedVerification.verificationId} • {new Date(selectedVerification.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedVerification(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <UnifiedResultView
              result={selectedVerification}
              onReset={() => setSelectedVerification(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
