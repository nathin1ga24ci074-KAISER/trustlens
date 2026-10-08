import { EvidenceItem } from '@trustlens/shared';

export interface EvidenceSearchQuery {
  query: string;
  purpose?: 'GENERAL' | 'SUPPORT' | 'CONTRADICTION' | 'CONTEXT';
}

export interface GroundingMetadataInfo {
  webSearchQueries?: string[];
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
  groundingSupports?: Array<{
    groundingChunkIndices?: number[];
    segment?: {
      text?: string;
    };
  }>;
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

export interface EvidenceSearchResult {
  query: string;
  items: EvidenceItem[];
  rawMetadata?: GroundingMetadataInfo | null;
}

export interface EvidenceProvider {
  readonly name: string;
  isConfigured(): boolean;
  search(queries: string[], claimContext?: string): Promise<EvidenceSearchResult[]>;
}
