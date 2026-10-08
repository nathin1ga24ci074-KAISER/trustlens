# TrustLens

> Multimodal Misinformation and Trust-Assessment Platform

TrustLens is an empirical verification platform engineered to evaluate the credibility of assertions across text statements, web URLs, digital images, and video feeds. It synthesizes independent web evidence, contradiction analysis, provenance tracing, and uncertainty-aware scoring to produce transparent, explainable verdicts.

---

## Capabilities Overview

### Completed Stages:
- **Stage 1 — Platform Foundation**: Full-stack TypeScript architecture (React client, Express API server, Prisma ORM, PostgreSQL), secure authentication (12-round bcrypt, JWT, HTTP-only cookies), protected routes, and responsive Tailwind UI.
- **Stage 2 — AI Provider Foundation**: Decoupled multi-provider abstraction (`AIProvider`, `AIService`) integrating Google Gemini (Primary) and Groq (Fast / Secondary) with automated error-aware fallback, usage normalization, and zero frontend API key leakage.
- **Stage 3 — Evidence-Backed Text Verification (`POST /api/verify/text`)**: Natural language claim extraction, entity resolution, search query generation, Google Search Grounding for real-time web citations, stance classification (`SUPPORTS`, `CONTRADICTS`, `NEUTRAL`), contradiction severity analysis, deterministic trust scoring (0–100), and epistemic uncertainty penalties.
- **Stage 4 — Evidence-Backed URL Verification (`POST /api/verify/url`)**: Webpage verification pipeline featuring SSRF defense shields, streaming HTML fetch, readability-style container extraction, structured metadata parsing, multi-claim prioritization (`PRIMARY`, `SUPPORTING`, `MINOR`), independent web evidence synthesis, circular source exclusion (the verified page cannot confirm itself), headline clickbait distortion detection, internal narrative consistency checks, and deterministic URL trust scoring with primary claim veto rules.
- **Stage 5 — Evidence-Backed Image Verification (`POST /api/verify/image`)**: Digital image verification pipeline combining in-memory buffer validation, magic byte sniffing against disguised executables, decompression bomb protection (10,000px/40MP), EXIF parsing with GPS privacy shielding, multimodal visual analysis (Gemini API with strict separation of OBSERVED vs INFERRED facts), embedded OCR text extraction, claim source formulation (`IMAGE_VISUAL`, `IMAGE_TEXT`, `USER_CONTEXT`), image authenticity vs. context recycling evaluation (detecting genuine images placed in false contexts), deterministic scoring with primary claim and context veto rules, and complete reactive UI.

### Upcoming Milestones:
- **Stage 6 — Video & Social Media Reels Verification**: Video ingestion, keyframe sampling, audio transcription, timeline consistency checks, and multi-claim synthesis.
- **Stage 7 — Multimodal Unified Verification Platform**: Integrated intelligence combining text, URL, image, and video across a unified analysis interface.


---

## Verification Philosophy: AI is NOT the Truth Source

TrustLens never evaluates assertions by merely prompting an LLM to state whether something is true or false. Instead, models function strictly as semantic processing engines operating over independently gathered web evidence:

```
USER CLAIM OR WEBPAGE URL
            ↓
CLAIM EXTRACTION & PRIORITIZATION
            ↓
SEARCH QUERY GENERATION
            ↓
INDEPENDENT WEB EVIDENCE (Search Grounding & Authority Fact Checks)
            ↓
CIRCULAR CITATION EXCLUSION (Verified URL domain is blocked from self-confirming)
            ↓
EVIDENCE STANCE CLASSIFICATION (SUPPORTS / CONTRADICTS / NEUTRAL)
            ↓
CONTRADICTION ANALYSIS & SEVERITY ASSESSMENT
            ↓
HEADLINE FRAMING & ARTICLE SELF-CONSISTENCY CHECKS
            ↓
DETERMINISTIC TRUST SCORING & PRIMARY CLAIM VETO RULE
            ↓
VERDICT: LEGIT | INCONCLUSIVE | FAKE
            ↓
EXPLAINABLE AUDIT TRAIL PERSISTED TO USER AUDIT HISTORY
```

---

## URL Verification Pipeline (Stage 4)

1. **SSRF & Safety Layer**:
   - Rejects non-HTTP/HTTPS protocols (`ftp://`, `javascript:`, `file:`, `data:`).
   - Rejects private IPv4 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Rejects loopback (`127.0.0.0/8`, `0.0.0.0`, `::1`).
   - Rejects cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`, `100.100.100.200`).
   - Performs DNS hostname resolution checks to thwart DNS rebinding attacks.
   - Re-evaluates safety at **every redirect hop** before following `Location` headers.
2. **Controlled Streaming Fetch**:
   - 10-second timeout via `AbortController`.
   - Maximum 5MB streaming size cap.
   - Maximum 5 redirect hops.
   - Enforces HTML `Content-Type` validation (`text/html`, `application/xhtml+xml`).
3. **Readability & Content Extraction**:
   - Strips boilerplate: scripts, styles, navigation, footers, sidebars, cookie notices, and ads.
   - Identifies semantic containers (`<article>`, `<main>`, `.article-body`).
   - Parses OpenGraph and Twitter card metadata (title, publisher, author, date, canonical URL).
4. **Multi-Claim Prioritization**:
   - Identifies up to 4 central empirical assertions.
   - Assigns weights: `PRIMARY` (1.0), `SUPPORTING` (0.5), `MINOR` (0.25).
5. **Stage 3 Evidence Engine Reuse & Circular Source Filtering**:
   - Generates independent search queries for each claim.
   - Gathers external citations.
   - **Excludes the verified webpage itself** as external evidence.
   - Classifies stances and analyzes contradictions.
6. **Headline & Self-Consistency Analysis**:
   - Detects sensationalism, exaggeration, or clickbait between the headline and article body.
   - Checks internal paragraphs for factual or chronological conflicts.
7. **Deterministic Scoring & Veto Rule**:
   - Weighted average of claim trust scores.
   - Deductions for headline distortion ($-15$ or $-7$) and internal inconsistencies ($-15$ or $-7$).
   - **Primary Claim Veto Rule**: If any `PRIMARY` claim is ruled `FAKE`, the entire article is vetoed from receiving a `LEGIT` verdict.
8. **Audit Trail**:
   - Persisted to `VerificationHistory` with strict user ownership isolation.

---

## Image Verification Pipeline (Stage 5)

1. **In-Memory Upload & Binary Security**:
   - Memory storage via `multer.memoryStorage()` (no disk temporary files or execution risks).
   - Magic byte validation for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WEBP (`RIFF....WEBP`).
   - Disguised executables (DOS/PE `MZ`, ELF `\x7fELF`, script tags) are blocked regardless of extension.
   - Decompression bomb protection: max dimensions of 10,000px and max resolution of 40 megapixels.
   - Path traversal sanitization on original filenames.
2. **Forensic Metadata & Privacy Shield**:
   - Camera model, lens metadata, software, and capture timestamp extraction.
   - **GPS Privacy Shield**: Coarse `hasLocationData: boolean` flag detected from EXIF geolocation tags. **Raw GPS coordinates (lat/long/alt) are strictly scrubbed** to protect user privacy.
3. **Multimodal Visual Analysis & OCR**:
   - Gemini Vision multimodal integration via base64 inline data buffers.
   - Strict separation between `OBSERVED` objective visual facts and `INFERRED` contextual hypotheses.
   - Embedded OCR text extraction for memes, screenshots, placards, and documents.
   - Scene classification (`MEME_SCREENSHOT`, `NEWS_EDITORIAL`, `DOCUMENT`, `SOCIAL_MEDIA`, `PHOTO_SCENE`).
4. **Claim Prioritization & Source Tagging**:
   - Extracts up to 4 verifiable claims tagged by origin: `IMAGE_VISUAL`, `IMAGE_TEXT`, `USER_CONTEXT`.
   - Weighted by priority: `PRIMARY` (1.0), `SUPPORTING` (0.5), `MINOR` (0.25).
5. **Context Recycling Analysis**:
   - Evaluates whether authentic imagery has been repurposed with false dates, events, or locations.
   - Context consistency rating: `CONSISTENT`, `MISMATCH`, or `INCONCLUSIVE`.
6. **Deterministic Scoring & Veto Rules**:
   - Weighted average of claim trust scores.
   - Deductions for context mismatch ($-25$), uncorroborated user context ($-10$), and visual manipulation ($-15$ or $-7$).
   - **Primary Claim Veto Rule**: A contradicted `PRIMARY` claim or context `MISMATCH` strictly forbids a `LEGIT` verdict.
7. **Transparent Forensic Limitations**:
   - Explicitly notes when direct reverse-image indexing is unavailable, clarifying that claims and context were verified against independent web evidence.

---

## Prerequisites

Before running TrustLens locally, ensure the following are installed:

- **Node.js**: v18.0.0 or later (v20+ or v24+ recommended)
- **npm**: v9.0.0 or later
- **Git**: v2.30.0 or later
- **PostgreSQL**: (Optional for local testing; automatic in-memory fallback included for testing without a database)

---

## Installation

Clone the repository and install all workspace dependencies from the root directory:

```bash
# Clone the repository
git clone <repository-url>
cd newest_trustlens

# Install all workspace dependencies
npm install
```

---

## Environment Variables

Copy the provided `.env.example` file to create your server environment configuration:

```bash
cp .env.example server/.env
```

### Key Environment Variables (`server/.env`):

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express backend server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | `...` | Secret key for signing JWT tokens |
| `AI_PRIMARY_PROVIDER` | `gemini` | Primary AI provider (`gemini`) |
| `AI_FALLBACK_PROVIDER` | `groq` | Secondary fallback provider (`groq`) |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (never exposed to client) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Configurable Gemini model |
| `GROQ_API_KEY` | `""` | Groq API key (never exposed to client) |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | Configurable Groq model |

---

## Development & Testing Commands

All scripts can be executed from the root workspace:

```bash
# Start backend API server in watch mode (Port 5000)
npm run dev:server

# Start frontend Vite development server (Port 5173)
npm run dev:client

# Type-check all packages (shared, server, client)
npm run typecheck

# Run full test suite (54 comprehensive unit, security & integration tests)
npm test

# Build all packages for production
npm run build
```

---

## Project Structure

```
trustlens/
├── client/                     # Frontend (React 18, Vite, Tailwind CSS, Lucide icons)
│   ├── src/
│   │   ├── components/         # Reusable UI & Verifiers (TextVerifier, UrlVerifier, ImageVerifier)
│   │   ├── context/            # AuthContext (session state, user rehydration)
│   │   ├── pages/              # LandingPage, LoginPage, RegisterPage, DashboardPage, HistoryPage
│   │   └── services/           # API client layer with Bearer credentials
├── server/                     # Backend API (Node.js, Express, TypeScript, Prisma)
│   ├── prisma/
│   │   └── schema.prisma       # PostgreSQL schema (User, VerificationHistory)
│   └── src/
│       ├── middleware/         # Security, rate limiting, and multer upload middleware
│       ├── services/
│       │   ├── ai/             # Provider abstraction (Gemini with Multimodal, Groq)
│       │   ├── text/           # Text claim extraction & verification
│       │   ├── evidence/       # Grounded web evidence retrieval
│       │   ├── contradiction/  # Stance classification & contradiction detection
│       │   ├── scoring/        # Deterministic trust scoring
│       │   └── verification/
│       │       ├── url/        # Stage 4 URL verification subsystem
│       │       ├── image/      # Stage 5 Image verification subsystem
│       │       └── verification-history.service.ts # Audit history persistence
├── shared/                     # Shared TypeScript interfaces across client and server
├── docs/                       # Architecture, Database, Authentication & Roadmap specifications
├── test-suite.ts               # End-to-end verification and security test suite (54 tests)
├── package.json                # Monorepo workspaces root configuration
└── README.md
```

---

## License

MIT © TrustLens Platform Contributors
