# TrustLens Architecture Specification

## 1. System Overview

TrustLens is a multimodal misinformation and trust-assessment platform engineered to verify assertions across text claims, web URLs, digital images, and video feeds.

### Core Architecture Principles
- **Separation of Concerns**: Strict boundaries between presentation (React/Vite), application logic (Express), shared contracts (TypeScript types), and persistence (Prisma PostgreSQL).
- **The "AI is Not the Truth Source" Rule**: Large language models do not serve as factual authorities. They are used exclusively for semantic extraction, entity resolution, stance categorization, and reasoning over independent external evidence.
- **The "URL is Not Self-Evidence" Rule**: When verifying a webpage URL, the page itself is the *claim source*. Its domain and URLs are strictly excluded from independent external supporting evidence.
- **Defense in Depth**: Zero-trust authentication, robust SSRF shields (private IPv4/IPv6, cloud metadata, DNS resolution rechecking, redirect loop controls), strict payload parsing, and parameterized queries.
- **Uncertainty-Aware Assessment**: Mathematical differentiation between corroborated facts, disputed claims, and inconclusive evidence.

---

## 2. Directory Layout

```
trustlens/
├── client/                     # Frontend Application (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Atomic UI components (Button, Input, Card, Badge, Alert)
│   │   │   ├── layout/         # Layout shells (Navbar, Footer, AppLayout)
│   │   │   ├── auth/           # Route guards (ProtectedRoute)
│   │   │   └── verification/   # Verification UIs (TextVerifier, UrlVerifier, ImageVerifier)
│   │   ├── context/            # Global React contexts (AuthContext)
│   │   ├── pages/              # Routed views (Landing, Login, Register, Dashboard, History)
│   │   ├── services/           # HTTP API client layer (api.ts)
│   │   └── index.css           # Tailwind design tokens
│   ├── index.html
│   └── vite.config.ts
├── server/                     # Backend API & Engine (Node.js + Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma       # PostgreSQL schema & relation definitions
│   └── src/
│       ├── config/             # Environment & Prisma client instances
│       ├── controllers/        # Express route controllers (Auth, Verification)
│       ├── middleware/         # Security, validation, upload (multer memory), and auth
│       ├── routes/             # REST endpoint routing definitions
│       ├── services/
│       │   ├── ai/             # AI Provider abstraction (Gemini, Groq, AIService with Multimodal)
│       │   ├── text/           # Text claim extraction & verification service
│       │   ├── evidence/       # Grounded web evidence retrieval service
│       │   ├── contradiction/  # Stance classification & contradiction detection
│       │   ├── scoring/        # Deterministic claim trust scoring
│       │   └── verification/
│       │       ├── url/        # Stage 4 URL verification engine
│       │       ├── image/      # Stage 5 Image verification engine
│       │       │   ├── image-security.service.ts   # Magic bytes, dimension limits, path sanitization
│       │       │   ├── image-metadata.service.ts   # EXIF parsing & GPS coordinate privacy shield
│       │       │   ├── image-analysis.service.ts   # Gemini multimodal vision (Observed vs Inferred, OCR)
│       │       │   ├── image-claim-extractor.ts    # Factual claim formulation & weighting
│       │       │   ├── image-context.service.ts    # Location/date/event context recycling detector
│       │       │   ├── image-scoring.service.ts    # Deterministic image scoring & veto rules
│       │       │   └── image-verification.service.ts # Full image verification coordinator
│       │       └── verification-history.service.ts # Per-user audit history persistence
│       ├── utils/              # Cryptographic hashing & JWT utilities
│       ├── app.ts              # Express application factory
│       └── server.ts           # Server bootstrap and lifecycle
├── shared/                     # Shared Monorepo Package
│   └── src/
│       └── types/              # Cross-stack TypeScript interfaces (User, Auth, Verification)
├── docs/                       # Architectural and technical documentation
├── .gitignore                  # Git exclusions (secrets, builds, node_modules)
├── .env.example                # Root environment variable documentation template
└── package.json                # Monorepo workspaces definition
```

---

## 3. Communication Contract

All communication between frontend and backend uses JSON-encoded payloads over HTTP REST endpoints prefixed by `/api`.

1. **Authentication Token**: Returned on successful login/registration via an HTTP-only cookie (`token`) and Bearer header.
2. **Error Responses**: Uniform JSON structure `{ success: false, message: string, errorCode?: string, errors?: [] }`.
3. **Data Responses**: Standardized JSON structure `{ success: true, data: ... }`.

### Verification Endpoints:
- `POST /api/verify/text`: Verify natural language text claims against independent web evidence.
- `POST /api/verify/url`: Verify public web articles, extract claims, detect clickbait framing, and synthesize external evidence.
- `POST /api/verify/image`: Verify digital images (multipart/form-data: image file + optional user context) with multimodal visual analysis, OCR, context recycling checks, and independent web evidence grounding.
- `GET /api/verify/history`: Retrieve the authenticated user's verification history (filterable by `TEXT`, `URL`, or `IMAGE`).
- `GET /api/verify/:id`: Retrieve complete verification report with strict user ownership guards.

---

## 4. AI Provider Abstraction & Reasoning Philosophy

### The "AI is Not the Truth Source" Rule
Large Language Models (LLMs) function strictly as semantic parsing and reasoning engines that evaluate empirical evidence retrieved independently from the open web:

```
USER CLAIM OR WEBPAGE
        ↓
CLAIM EXTRACTION & PRIORITIZATION (NLP / AI)
        ↓
SEARCH QUERY GENERATION
        ↓
INDEPENDENT WEB EVIDENCE (Google Search Grounding / Fact Checks)
        ↓
CIRCULAR EVIDENCE FILTERING (Verified URL domain excluded!)
        ↓
EVIDENCE STANCE CLASSIFICATION (SUPPORTS / CONTRADICTS / NEUTRAL)
        ↓
CONTRADICTION ANALYSIS & SEVERITY ASSESSMENT
        ↓
DETERMINISTIC TRUST SCORING & UNCERTAINTY PENALTY
        ↓
PRIMARY CLAIM VETO CHECK (A contradicted primary claim prevents LEGIT)
        ↓
VERDICT: LEGIT | INCONCLUSIVE | FAKE
        ↓
EXPLAINABLE AUDIT TRAIL PERSISTED TO USER HISTORY
```

### Provider Fallback Strategy
```
VERIFICATION SERVICES
        ↓
    AIService (Primary Provider Selection & Automatic Fallback)
        ↓
    AIProvider Abstraction Interface
        ├── GeminiProvider (Primary: Google Gemini)
        └── GroqProvider   (Secondary / Fast: Groq LLaMA / Qwen)
```
- **Primary Provider**: Google Gemini (`AI_PRIMARY_PROVIDER=gemini`)
- **Fallback Provider**: Groq (`AI_FALLBACK_PROVIDER=groq`)
- **Fallback Triggers**: Rate limits (429), timeouts (15s), provider 5xx outages, missing credentials.
- **Zero Frontend Exposure**: Browser never directly communicates with Gemini or Groq; keys are strictly kept on the backend.

---

## 5. URL Verification Architecture (Stage 4)

### 1. SSRF & Safety Protection Layer (`UrlSafetyService`)
- Rejects dangerous protocols (`ftp:`, `file:`, `javascript:`, `data:`). Only `http:` and `https:` are permitted.
- Rejects localhost and loopback interfaces (`127.0.0.0/8`, `0.0.0.0`).
- Rejects private IPv4 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Rejects cloud metadata addresses (`169.254.169.254`, `metadata.google.internal`, `100.100.100.200`).
- Rejects IPv6 loopback (`::1`), link-local (`fe80::/10`), unique local (`fc00::/7`).
- Resolves DNS hostnames and verifies resolved IP addresses to prevent DNS rebinding attacks.

### 2. Controlled Fetch Layer (`UrlFetchService`)
- 10-second request timeout via `AbortController`.
- Maximum response size capped at 5MB streaming download.
- Manual redirect loop handling with strict max 5 redirect hops.
- **SSRF revalidation at every redirect hop** before following `Location` headers.
- Enforces HTML Content-Type headers (`text/html`, `application/xhtml+xml`).

### 3. Readability & Content Extraction (`UrlContentExtractor`, `UrlMetadataExtractor`)
- Strips non-content boilerplate: `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, cookie notices, ads, comments.
- Locates semantic content containers (`<article>`, `<main>`, `[role="main"]`, `.article-body`).
- Preserves paragraph structure and calculates word counts.
- Flags empty or unreadable pages (`isEmpty: true` if under 50 characters or 10 words).
- Extracts OpenGraph, Twitter card, author, publisher, and publication timestamp metadata.

### 4. Claim Extraction & Prioritization (`UrlClaimExtractor`)
- Extracts up to 4 central empirical claims from the article.
- Assigns importance weights:
  - `PRIMARY` (Weight: 1.0): Central thesis or headline assertion.
  - `SUPPORTING` (Weight: 0.5): Key empirical corroboration in the body.
  - `MINOR` (Weight: 0.25): Contextual or auxiliary assertion.

### 5. Independent Evidence Grounding & Circular Source Exclusion
- Reuses the Stage 3 Evidence Engine:
  - Generates targeted search queries for each claim.
  - Retrieves independent web citations via grounded search.
  - **Excludes the verified webpage**: If an external citation originates from the same domain or path as the verified URL, it is removed to ensure the claim source cannot validate itself.
  - Classifies stances (`SUPPORTS`, `CONTRADICTS`, `NEUTRAL`).
  - Analyzes contradictions across external reporting.

### 6. Headline & Self-Consistency Cross-Analysis
- **Headline Framing Analysis (`HeadlineAnalyzer`)**: Detects clickbait, exaggeration, or distortion between the title and the article body. Penalties are applied to the trust score.
- **Internal Narrative Consistency (`SelfConsistencyAnalyzer`)**: Detects direct factual or chronological contradictions between different paragraphs within the article.

### 7. Deterministic URL Scoring Formula (`UrlScoringService`)
- **Weighted Claim Score**:
  $$\text{Base Score} = \frac{\sum (\text{Claim Score}_i \times \text{Weight}_i)}{\sum \text{Weight}_i}$$
- **Deductions**:
  - Headline Mismatch: $-15$ (High severity) / $-7$ (Medium severity)
  - Internal Inconsistency: $-15$ (High severity) / $-7$ (Medium severity)
- **Primary Claim Veto Rule**: If any `PRIMARY` claim is ruled `FAKE` (contradicted), the overall URL verdict **cannot be `LEGIT`**, even if minor claims are corroborated.
- **Verdict Scale**:
  - `LEGIT`: Final score $\ge 65$ with confirmed primary claims and no veto.
  - `FAKE`: Final score $\le 35$ or contradicted primary claims with low overall score.
  - `INCONCLUSIVE`: Mixed evidence, non-empirical assertions, or unverified claims.

---

## 6. Image Verification Architecture (Stage 5)

### 1. In-Memory Upload & Binary Security (`ImageSecurityService`)
- **Memory Buffer Ingestion**: Files are held in RAM via `multer.memoryStorage()`, preventing disk traversal, temporary file residue, and filesystem execution attacks.
- **Magic Byte Validation**: Direct inspection of file binary header signatures:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - WEBP: `RIFF....WEBP`
  - Executable headers (`MZ` DOS/PE, `\x7fELF`, script tags) disguised with `.jpg` or `.png` extensions are rejected with `400 Bad Request` (`IMAGE_INVALID_TYPE`).
- **Decompression Bomb Protection**: Reads image dimension headers before full processing. Maximum dimension allowed is 10,000px and maximum area is 40 megapixels, preventing zip bomb style memory exhaustion.
- **Path Traversal Shield**: Sanitizes `req.file.originalname` to strip directory paths (`../`, `..\`) and control characters.

### 2. Forensic Metadata & Privacy Shield (`ImageMetadataService`)
- **EXIF Extraction**: Parses camera model, lens metadata, software, exposure settings, and capture timestamp.
- **GPS Privacy Shield**: Coarsely flags `hasLocationData: boolean` when geolocation EXIF tags are detected. **Raw GPS coordinates (latitude, longitude, altitude) are strictly scrubbed** and never returned in API payloads or stored in the database.

### 3. Multimodal Visual Understanding & OCR (`ImageAnalysisService`)
- **Gemini Multimodal Integration**: Uploaded image buffer is converted to base64 inline data parts and evaluated by Gemini Vision models.
- **Separation of Observed vs. Inferred**: The vision prompt explicitly enforces strict demarcation between:
  - `OBSERVED`: Objective visual facts directly visible in the image frame.
  - `INFERRED`: Interpretations, hypotheses, and contextual deductions.
- **OCR Text Extraction**: Extracts textual banners, meme captions, watermarks, placards, headlines, and document text embedded within the image.
- **Scene Classification & Manipulation Signs**: Identifies scene category (`MEME_SCREENSHOT`, `NEWS_EDITORIAL`, `DOCUMENT`, `SOCIAL_MEDIA`, `PHOTO_SCENE`) and detects visual artifacts (shadow inconsistencies, cloning, splice boundaries, AI generation traits).

### 4. Claim Extraction & Prioritization (`ImageClaimExtractor`)
- Formulates up to 4 verifiable factual assertions tagged by origin:
  - `IMAGE_VISUAL`: Empirical claims describing visual phenomena depicted.
  - `IMAGE_TEXT`: Factual claims stated in OCR text found in the image.
  - `USER_CONTEXT`: Hypothesis assertions provided by the user alongside the upload.
- Prioritizes claims with deterministic weighting (`PRIMARY: 1.0`, `SUPPORTING: 0.5`, `MINOR: 0.25`).

### 5. Context Recycling Analysis (`ImageContextService`)
- **Image Authenticity vs. Context Recycling**: A photograph may be visually authentic (not AI-generated or edited) but weaponized with a false date, location, or event label.
- Compares user context and visual details against grounded web evidence to classify context fidelity:
  - `CONSISTENT`: Depicted event matches the stated context.
  - `MISMATCH`: The image is recycled from a different historical event, date, or geographical location.
  - `INCONCLUSIVE`: Insufficient web evidence to confirm or refute context assertions.

### 6. Deterministic Image Scoring Formula (`ImageScoringService`)
- **Weighted Claim Score**:
  $$\text{Base Score} = \frac{\sum (\text{Claim Score}_i \times \text{Weight}_i)}{\sum \text{Weight}_i}$$
- **Deductions**:
  - Context Mismatch: $-25$ deduction
  - Context Inconclusive with User Hypothesis: $-10$ deduction
  - Image Manipulation Severity: $-15$ (High / Likely manipulated), $-7$ (Medium / Suspicious)
- **Primary Claim Veto Rule**:
  - If any `PRIMARY` claim is ruled `FAKE`, the overall image verdict **cannot be `LEGIT`**.
  - If context recycling is detected (`MISMATCH`), the overall image verdict **cannot be `LEGIT`**.
- **Verdict Scale**:
  - `LEGIT`: Final score $\ge 65$, no primary claim veto, context consistent or neutral.
  - `FAKE`: Final score $\le 35$, or primary claim contradicted, or context mismatch with low score.
  - `INCONCLUSIVE`: Insufficient evidence or conflicting claims.

### 7. Transparent Limitations
TrustLens explicitly surfaces forensic boundaries:
> *"Direct reverse-image matching was not available; TrustLens verified the image's claims and context using independent web evidence."*

---

## 7. Video & Reel Verification Architecture (Stage 6)

### 1. Ingestion, Disk Temp Storage & Security (`VideoSecurityService`)
- **Disk Stream Processing**: Video uploads (up to 50MB, configurable via `VIDEO_MAX_SIZE_MB`) are streamed to secure local temp storage (`server/tmp/video-uploads/`) via `multer.diskStorage()`, avoiding 50MB memory buffer exhaustion in Node.js.
- **Binary Magic Byte Inspection**:
  - MP4 / QuickTime: ISO Base Media File header (`ftyp`, `moov`, `mdat`, `wide` atoms).
  - WebM: Matroska EBML signature (`1A 45 DF A3`).
  - MOV: QuickTime atoms.
  - Executable binaries disguised with `.mp4` extensions (`MZ` PE headers, `\x7fELF`, script tags `#!`, `<script>`) are rejected with `400 Bad Request` (`VIDEO_INVALID_TYPE`).
- **Sanitization & Guaranteed Cleanup**: Filenames are sanitized against path traversal (`..`, `/`, `\`). All temporary working video and extracted audio files are cleaned up synchronously in a `finally` block on both success and failure.

### 2. Stream Probing & Keyframe Sampling (`VideoProcessingService`)
- **FFmpeg Integration**: Probes duration, frame dimensions, framerate, video codecs (`h264`, `vp8`, `vp9`, `hevc`), and audio stream existence via `ffmpeg-static` with fallback to system PATH and internal container parsing.
- **Safety Limits**: Enforces `VIDEO_MAX_DURATION_SECONDS` (default 120s), `VIDEO_MAX_WIDTH` (3840px), and `VIDEO_MAX_HEIGHT` (2160px).
- **Keyframe Sampling**: Samples keyframes across the narrative arc (opening, early development, midpoint, late progression, conclusion) up to `VIDEO_MAX_FRAMES` (8 frames).
- **Perceptual / Content Hash Deduplication**: Computes MD5 content hashes on raw frame data to avoid redundant visual evaluation of static frames.

### 3. Audio Extraction & Speech Transcription (`VideoAudioService`)
- **Audio Extraction**: Extracts audio streams to 16kHz mono 16-bit PCM WAV tracks.
- **AI Speech Transcription**: Routes audio bytes to Gemini audio transcription (`inlineData` `audio/wav`), generating timestamped speech segments (`VideoTranscriptSegment[]`) and full narrative transcript.
- **Graceful Handling of Silent Video**: Audio-less videos are flagged with `hasAudio: false` and empty transcripts without failing or fabricating speech.

### 4. Multimodal Keyframe Analysis & OCR (`VideoAnalysisService`)
- **Multimodal Vision Analysis**: Selected keyframes are analyzed using Gemini Vision models.
- **Observed vs. Inferred Separation**: Strictly separates objective visual phenomena (`OBSERVED`) from speculative deductions (`INFERRED`).
- **On-Screen OCR Extraction**: Extracts news tickers, lower-third overlays, banners, subtitles, placards, and watermarks with associated timestamps.
- **Manipulation Signal Detection**: Detects editing anomalies, splice artifacts, unnatural speed alterations, and generative AI visual patterns.

### 5. Multi-Source Claim Extraction (`VideoClaimExtractor`)
- Formulates up to 5 empirical claims tagged by origin:
  - `VIDEO_AUDIO`: Spoken statements from transcript.
  - `VIDEO_VISUAL`: Empirical events and visual evidence depicted.
  - `VIDEO_TEXT`: On-screen text, tickers, and placards.
  - `USER_CONTEXT`: Hypothesis assertions supplied by the user.
- Tags claims by importance (`PRIMARY: 1.0`, `SUPPORTING: 0.5`, `MINOR: 0.25`).

### 6. Temporal Consistency Analysis (`VideoTemporalService`)
- Analyzes chronological and narrative alignment across spoken audio, on-screen text, visual frames, and external factual evidence.
- Detects narrative conflicts:
  - `LOCATION_CONFLICT`: Dialogue claims one location while landmarks or signs depict another.
  - `DATE_CONFLICT`: Spoken date contradicts visual evidence or independent reporting.
  - `SEQUENCE_DISORDER`: Cause-and-effect narrative contradicted by visual sequence.
  - `NARRATION_MISMATCH`: Spoken narration asserts events that do not occur visually.

### 7. Context Recycling Evaluation (`VideoContextService`)
- Evaluates whether authentic historical footage is weaponized with false dates, events, or locations (context recycling).
- Labels context as:
  - `CONSISTENT`: Video depicts the claimed event, date, and location.
  - `MISMATCH`: Genuine archival footage recycled with misleading context attribution.
  - `INCONCLUSIVE`: Insufficient web evidence to confirm or refute context assertions.

### 8. Deterministic Video Trust Scoring (`VideoScoringService`)
- **Base Score Calculation**:
  $$\text{Base Score} = \frac{\sum (\text{Claim Score}_i \times \text{Weight}_i)}{\sum \text{Weight}_i}$$
- **Deductions**:
  - Context Mismatch: $-25$ deduction
  - Context Inconclusive with User Hypothesis: $-10$ deduction
  - Temporal Inconsistency: $-15$ deduction
  - Manipulation Signals: $-15$ (High severity) / $-8$ (Medium severity)
  - Severe Contradictions: $-15$ deduction
- **Primary Claim Veto Rule**:
  - If any `PRIMARY` claim is contradicted (`FAKE`), the overall verdict **cannot be `LEGIT`**.
  - If context mismatch is detected (`MISMATCH`), the overall verdict **cannot be `LEGIT`**.
- **Verdict Scale**:
  - `LEGIT`: Final score $\ge 65$, no veto triggered, context consistent or neutral.
  - `FAKE`: Final score $\le 35$ or veto triggered with low score.
  - `INCONCLUSIVE`: Mixed evidence, unverified claims, or inconclusive context.

### 9. Curated Demo Reels Feed (`demoReelsService`)
- Provides 10 pre-provisioned demo reels covering science, history, context recycling, deepfakes, and financial fraud.
- Rapid testing in hackathon and evaluation environments without uploading large video files.

### 10. Transparent Video Verification Limitations
TrustLens clearly communicates analytical boundaries:
> *"Video verification evaluates factual claims, on-screen text, transcript fidelity, and contextual attribution against independent web evidence. It does not provide absolute cryptographic proof of raw camera sensor provenance or complete deepfake immunity."*


