# TrustLens Architecture Specification

## 1. System Overview

TrustLens is a multimodal misinformation and trust-assessment platform engineered to verify assertions across text claims, web URLs, digital images, and video feeds.

### Core Architecture Principles
- **Separation of Concerns**: Strict boundaries between presentation (React/Vite), application logic (Express), shared contracts (TypeScript types), and persistence (Prisma PostgreSQL).
- **Modularity**: AI verification pipelines are architected as decoupled micro-modules (`modules/text`, `modules/url`, `modules/image`, `modules/video`, `modules/evidence`, `modules/provenance`, `modules/contradiction`, `modules/scoring`).
- **Defensive Security**: Zero trust authentication, strict schema parsing, secure cookie propagation, and parameterized queries.
- **Uncertainty-Aware Assessment**: Distinction between verifiable ground truth, disputed interpretations, and incomplete evidence.

---

## 2. Directory Layout

```
trustlens/
├── client/                     # Frontend Application (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Atomic UI components (Button, Input, Card, Badge, Alert)
│   │   │   ├── layout/         # Layout shells (Navbar, Footer, AppLayout)
│   │   │   └── auth/           # Route guards (ProtectedRoute)
│   │   ├── context/            # Global React contexts (AuthContext)
│   │   ├── pages/              # Routed views (Landing, Login, Register, Dashboard, History)
│   │   ├── services/           # HTTP API client layer
│   │   └── index.css           # Tailwind design tokens
│   ├── index.html
│   └── vite.config.ts
├── server/                     # Backend API & Engine (Node.js + Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma       # PostgreSQL schema & relation definitions
│   └── src/
│       ├── config/             # Environment & Prisma client instances
│       ├── controllers/        # Express route controllers
│       ├── middleware/         # Security, validation, and session auth middleware
│       ├── modules/            # Future multimodal verification subsystem namespaces
│       ├── routes/             # REST endpoint routing definitions
│       ├── services/           # Core domain logic & data access services
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
2. **Error Responses**: Uniform JSON structure `{ success: false, message: string, errors?: [] }`.
3. **Data Responses**: Standardized JSON structure `{ success: true, ...data }`.

---

## 4. AI Provider Abstraction & Reasoning Philosophy

### The "AI is Not the Truth Source" Rule
In TrustLens, Large Language Models (LLMs) are **never treated as ground-truth authorities**. Rather, they function strictly as semantic parsing and reasoning engines that evaluate empirical evidence retrieved independently from the open web.

```
USER INPUT
    ↓
CONTENT / CLAIM EXTRACTION (NLP / AI)
    ↓
INDEPENDENT WEB EVIDENCE (Search Registries, Fact Check APIs)
    ↓
SOURCE ANALYSIS & PROVENANCE TRACING
    ↓
SUPPORTING vs CONTRADICTING EVIDENCE SYNTHESIS
    ↓
AI REASONING (Gemini / Groq Multi-Evidence Synthesis)
    ↓
UNCERTAINTY ANALYSIS (Epistemic / Aleatoric Calibration)
    ↓
TRUST / RISK SCORE (0 - 100 Index)
    ↓
VERDICT: VERIFIED TRUE | MOSTLY TRUE | MISLEADING | FALSE | DISPUTED
    ↓
EXPLAINABLE VERDICT & AUDIT TRAIL
```

### Provider Architecture
```
APPLICATION / VERIFICATION MODULES
    ↓
AIService (Primary Provider Selection & Fallback Orchestration)
    ↓
AIProvider Abstraction Interface (Normalized Responses & Token Usage)
    ├── GeminiProvider (Primary: Google Gemini 1.5 Flash / Pro)
    └── GroqProvider (Secondary / Fast: Groq LLaMA 3.3 70B / 8B)
```

- **Primary Provider**: Google Gemini (`AI_PRIMARY_PROVIDER=gemini`)
- **Fallback Provider**: Groq (`AI_FALLBACK_PROVIDER=groq`)
- **Fallback Trigger Policy**: Only triggered on retryable failures (rate limits, timeouts, server 5xx, or missing credentials). Malformed requests do NOT trigger fallback.
- **Zero Frontend Exposure**: Browser never directly communicates with Gemini or Groq; keys are isolated in backend environment variables.
