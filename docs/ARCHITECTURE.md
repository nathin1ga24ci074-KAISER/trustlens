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
│   │   │   └── verification/   # Verification UIs (TextVerifier, UrlVerifier)
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
│       ├── middleware/         # Security, validation, and session auth middleware
│       ├── routes/             # REST endpoint routing definitions
│       ├── services/
│       │   ├── ai/             # AI Provider abstraction (Gemini, Groq, AIService)
│       │   ├── text/           # Text claim extraction & verification service
│       │   ├── evidence/       # Grounded web evidence retrieval service
│       │   ├── contradiction/  # Stance classification & contradiction detection
│       │   ├── scoring/        # Deterministic claim trust scoring
│       │   └── verification/
│       │       ├── url/        # Stage 4 URL verification engine
│       │       │   ├── url-safety.service.ts       # SSRF protections & DNS validation
│       │       │   ├── url-fetch.service.ts        # Streaming fetch, size & redirect limits
│       │       │   ├── url-metadata-extractor.ts   # Cheerio OG/metadata parser
│       │       │   ├── url-content-extractor.ts    # Article container & boilerplate filter
│       │       │   ├── url-claim-extractor.ts      # Multi-claim prioritization & weighting
│       │       │   ├── headline-analyzer.ts        # Headline vs body framing analysis
│       │       │   ├── self-consistency-analyzer.ts# Internal narrative conflict detector
│       │       │   ├── url-scoring.service.ts      # Deterministic weighted URL scoring
│       │       │   └── url-verification.service.ts # Full pipeline orchestrator
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
- `GET /api/verify/history`: Retrieve the authenticated user's verification history (filterable by `TEXT` or `URL`).
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
