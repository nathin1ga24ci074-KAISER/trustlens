# TrustLens Development Roadmap

## Phase 1: Core Foundation (Complete)
- [x] Full-stack monorepo setup (React + Express + TypeScript + Prisma)
- [x] Secure authentication engine (Bcrypt + JWT + HTTP-only cookies)
- [x] Prisma PostgreSQL schema (User + VerificationHistory models)
- [x] React client with Tailwind design system and route protections
- [x] Comprehensive test suites and environment inspection

---

## Phase 2: AI Provider Foundation (Complete)
- [x] Multi-provider abstraction (`AIProvider`, `AIService`)
- [x] Primary Google Gemini integration (`@google/generative-ai` with configurable models)
- [x] Secondary / Fast Groq integration (`groq-sdk` with configurable models)
- [x] Normalized response structure with token usage and latency
- [x] Resilient, error-aware fallback strategy (rate limits, timeouts, provider failures)

---

## Phase 3: Text Claim Verification Engine (Complete)
- [x] Natural language factual claim extraction and entity resolution
- [x] Search query generation for independent evidence lookup
- [x] Google Search Grounding integration for real-time web citations
- [x] Evidence stance classification (SUPPORTS / CONTRADICTS / NEUTRAL)
- [x] Contradiction and conflict analysis across independent sources
- [x] Deterministic trust scoring algorithm (0-100) with epistemic uncertainty penalties
- [x] Per-user verification history audit trail with strict data isolation

---

## Phase 4: Evidence-Based URL Verification Engine (Complete)
- [x] Strict SSRF protection (loopback, private subnets, cloud metadata, link-local, DNS validation, redirect hop re-validation)
- [x] Safe HTTP/HTTPS streaming fetch (10s timeout, 5MB cap, max 5 redirects, HTML-only enforcement)
- [x] Readability-style content extraction (cheerio boilerplate stripping, semantic article container discovery)
- [x] Structured page metadata extraction (OpenGraph, Twitter cards, author, publisher, canonical URL)
- [x] Multi-claim extraction prioritizing central empirical claims (max 4 claims with PRIMARY / SUPPORTING / MINOR weights)
- [x] Independent web evidence retrieval reusing the Stage 3 evidence pipeline
- [x] Circular evidence exclusion rule: the verified URL's domain is explicitly blocked from being evidence for itself
- [x] Headline vs. body framing mismatch and clickbait severity analysis
- [x] Internal article paragraph self-consistency and contradiction detection
- [x] Deterministic URL trust scoring with primary claim veto rule (contradicted primary claim prevents LEGIT verdict)
- [x] Full responsive UI (`UrlVerifier` component, tabs, expandable claim drawers, headline gauge, history filters)

---

## Phase 5: Visual Forensics & Image Verification (Next Milestone)
- [ ] Digital image upload and metadata extraction (EXIF, camera, timestamp, GPS)
- [ ] Perceptual hashing (pHash) and visual similarity search
- [ ] Reverse image search & independent web provenance tracing
- [ ] AI image manipulation & synthetic media (deepfake/diffusion) artifact detection

---

## Phase 6: Video & Social Media Reels Verification (Future Milestone)
- [ ] Video URL / file ingestion with frame sampling
- [ ] Audio extraction and speech-to-text transcription
- [ ] Keyframe reverse visual search and timeline consistency checks
- [ ] Deepfake facial artifact and synthetic audio detection
- [ ] Multi-claim temporal alignment and overall trust assessment
