# TrustLens Development Roadmap

## Phase 1: Core Foundation (Current Milestone)
- [x] Full-stack monorepo setup (React + Express + TypeScript + Prisma)
- [x] Secure authentication engine (Bcrypt + JWT + HTTP-only cookies)
- [x] Prisma PostgreSQL schema (User + VerificationHistory models)
- [x] React client with Tailwind design system and route protections
- [x] Comprehensive test suites and environment inspection

---

## Phase 2: Text & URL Verification Engine
- [ ] Text Claim Extraction: NLP entity identification and claim parsing
- [ ] URL & Article Scraper: Canonical body parsing, author extraction, domain reputation
- [ ] Automated Evidence Search: Integration with fact-checking registries and search providers

---

## Phase 3: Visual & Media Forensics
- [ ] Image Analysis: Perceptual hashing, reverse image search, EXIF metadata forensics
- [ ] Video & Reels Pipeline: Frame extraction, deepfake facial artifact detection, audio transcription

---

## Phase 4: Contradiction Inference & Uncertainty Calibration
- [ ] Contradiction Analysis: NLI cross-source stance detection (entailment vs contradiction)
- [ ] Evidence Provenance Graph: Lineage and citation tracing
- [ ] Bayesian Uncertainty Calibration: Trust score indexing (0-100) and confidence margins
