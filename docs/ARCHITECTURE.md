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
