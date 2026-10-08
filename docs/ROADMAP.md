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

## Phase 5: Evidence-Based Image Verification (Complete)
- [x] Multi-format upload & memory-buffer security (JPEG, PNG, WEBP, 10MB limit)
- [x] Magic byte sniffing & disguised executable defense (rejects EXE, ELF, scripts with spoofed extensions)
- [x] Image decompression bomb & dimension defenses (10,000px dimension and 40MP pixel limits)
- [x] Path traversal sanitization on uploaded filenames
- [x] EXIF & image metadata extraction with strict GPS coordinate privacy shielding (hasLocationData coarse flag, zero lat/long storage)
- [x] Multimodal visual understanding via Gemini API with strict separation between OBSERVED facts and INFERRED speculation
- [x] Embedded OCR text extraction for memes, screenshots, signage, and documents
- [x] Factual claim formulation tagged by source (`IMAGE_VISUAL`, `IMAGE_TEXT`, `USER_CONTEXT`) and priority (`PRIMARY`, `SUPPORTING`, `MINOR`)
- [x] Independent web evidence retrieval reusing Stage 3 Google Search Grounding engine
- [x] Image authenticity vs. context recycling evaluation (detecting real images recycled in false locations, dates, or events)
- [x] Deterministic image trust scoring with Primary Claim Veto Rule, context mismatch penalties, and manipulation deductions
- [x] Reactive client UI (`ImageVerifier.tsx`, drag-and-drop file upload, preview, 9-step verification stepper, OCR drawer, evidence citations, safe metadata inspector)
- [x] Transparent limitation disclosure ("Direct reverse-image matching was not available; verified via claims and context")
- [x] Per-user verification history audit persistence for `IMAGE` type

---

## Phase 6: Video & Social Media Reels Verification (Next Milestone)
- [ ] Video URL / file ingestion with frame sampling
- [ ] Audio extraction and speech-to-text transcription
- [ ] Keyframe reverse visual search and timeline consistency checks
- [ ] Deepfake facial artifact and synthetic audio detection
- [ ] Multi-claim temporal alignment and overall trust assessment

