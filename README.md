# TrustLens

> Multimodal Misinformation and Trust-Assessment Platform

TrustLens is an empirical verification platform engineered to evaluate the credibility of assertions across text statements, web URLs, digital images, and video feeds. It synthesizes independent web evidence, contradiction analysis, provenance tracing, and uncertainty-aware scoring to produce transparent, explainable verdicts.

---

## Current Capabilities (Stage 1)

In this foundational phase, the platform architecture, security protocols, persistence models, and presentation layers have been established:

- **Project Foundation**: Full-stack TypeScript architecture linking a React client, Express API server, and shared monorepo contracts.
- **Authentication Foundation**: Secure authentication pipeline featuring 12-round `bcrypt` password hashing, JSON Web Tokens (JWT), and HTTP-only cookie transport.
- **AI Provider Foundation**: Decoupled multi-provider abstraction (`AIProvider`, `AIService`) integrating Google Gemini (Primary) and Groq (Fast / Secondary) with automated error-aware fallback, usage normalization, and zero frontend API key leakage.
- **User Database Foundation**: Prisma ORM with PostgreSQL schemas for `User` and `VerificationHistory` with relational integrity, cascading deletions, and indexes.
- **Protected Routes**: Client-side route guards enforcing authentication state before granting access to application workspaces (`/dashboard`, `/history`).
- **Resilient Fallback**: Graceful local development fallback mechanism to allow complete local verification when a PostgreSQL daemon is not actively running.

---

## Planned Capabilities (Future Stages)

The following analytical engines are architecturally prepared and scheduled for upcoming development milestones:

- **Text Verification**: Natural language claim extraction, entity resolution, and assertion parsing.
- **URL Verification**: Canonical web article parsing, publisher domain reputation metrics, and author provenance.
- **Image Verification**: Perceptual hashing, reverse visual lookup, clone-move detection, and EXIF metadata forensics.
- **Video & Reels Verification**: Temporal keyframe extraction, audio transcription, and deepfake artifact detection.
- **Independent Evidence Retrieval**: Real-time multi-provider search across authoritative sources and fact-check registries.
- **Contradiction Analysis**: Natural language inference (NLI) detecting conflicting claims and divergent narratives.
- **Evidence Provenance**: Cryptographic asset lineage tracing, publisher origin verification, and citation graphs.
- **Uncertainty-Aware Scoring**: Mathematical calibration of trust scores (0–100) alongside explicit epistemic uncertainty metrics (0–1).
- **Multimodal Reasoning**: Cross-modal fusion synthesizing text, image, and audio evidence into coherent explanations.
- **Verification History**: Persistent user audit trail storing all analyzed assertions, evidence graphs, and verdict outcomes.

*(Note: These capabilities are in active design and will be introduced in Stages 2 through 4.)*

---

## Prerequisites

Before running TrustLens locally, ensure the following are installed:

- **Node.js**: v18.0.0 or later (v20+ or v24+ recommended)
- **npm**: v9.0.0 or later
- **Git**: v2.30.0 or later
- **PostgreSQL**: (Optional for Stage 1/1.5 evaluation; required for persistent production database deployment)

---

## Installation

Clone the repository and install all workspace dependencies from the project root:

```bash
# Clone the repository
git clone <repository-url>
cd newest_trustlens

# Install all workspace dependencies
npm install
```

---

## Environment Variables

Copy the provided `.env.example` file to create your environment configuration:

```bash
cp .env.example server/.env
```

### Environment Configuration Reference (`server/.env`):

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express backend server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/trustlens?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | `trustlens_default_development_jwt_secret_change_in_production_32char` | Cryptographic key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiration duration |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin for CORS |
| `COOKIE_SECURE` | `false` | Enable only when running over HTTPS |
| `AI_PRIMARY_PROVIDER` | `gemini` | Primary AI provider (`gemini` or `groq`) |
| `AI_FALLBACK_PROVIDER` | `groq` | Secondary fallback provider (`groq`, `gemini`, or `none`) |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (kept on backend) |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Default Gemini model |
| `GROQ_API_KEY` | `""` | Groq API key (kept on backend) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Default Groq model |

---

## Database Setup

TrustLens uses Prisma ORM with PostgreSQL.

1. **Start PostgreSQL**: Ensure your PostgreSQL instance is running on port 5432 (or update `DATABASE_URL` accordingly).
2. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```
3. **Run Schema Migrations**:
   ```bash
   npm --workspace=server run prisma:push
   # or
   npm run prisma:migrate
   ```

*Note: For evaluation on machines without an active PostgreSQL daemon, TrustLens automatically detects the database connection and runs with an in-memory repository fallback for testing.*

---

## Development Commands

All scripts can be executed from the root workspace:

```bash
# Start backend API server in watch mode (Port 5000)
npm run dev:server

# Start frontend Vite development server (Port 5173)
npm run dev:client

# Type-check all packages (shared, server, client)
npm run typecheck

# Build all packages for production
npm run build
```

---

## Project Structure

```
trustlens/
├── client/                     # Frontend (React 18, Vite, Tailwind CSS, React Router)
│   ├── src/
│   │   ├── components/         # Reusable UI (Button, Input, Card, Badge, Alert, Layout)
│   │   ├── context/            # AuthContext (session state, user rehydration)
│   │   ├── pages/              # LandingPage, LoginPage, RegisterPage, DashboardPage, HistoryPage
│   │   ├── services/           # Api client (fetch with credentials & Bearer fallback)
│   │   └── App.tsx             # Route definitions and navigation tree
├── server/                     # Backend API (Node.js, Express, TypeScript, Prisma)
│   ├── prisma/
│   │   └── schema.prisma       # PostgreSQL schema (User, VerificationHistory models)
│   └── src/
│       ├── config/             # Environment & Prisma client initialization
│       ├── controllers/        # AuthController (register, login, logout, me)
│       ├── middleware/         # Auth, validation (Zod), and error handlers
│       ├── modules/            # Future subsystem namespaces (text, url, image, video, scoring)
│       ├── routes/             # REST endpoints (/api/auth/*, /api/health)
│       ├── services/           # AuthService, UserService
│       ├── utils/              # Bcrypt password hashing & JWT utilities
│       └── server.ts           # HTTP server bootstrap
├── shared/                     # Shared TypeScript interfaces across client and server
├── docs/                       # Architecture, Database, Authentication & Roadmap specifications
├── .gitignore                  # Git exclusion rules
├── .env.example                # Root environment configuration template
└── package.json                # Workspaces root configuration
```

---

## Authentication Architecture

```
[Client] ---> POST /api/auth/register ---> [Zod Validator] ---> [Bcrypt Hash (12 rounds)] ---> [PostgreSQL / Prisma]
         <--- HTTP-Only Cookie + JSON  <--- [JWT Signed]   <--- User Record Created

[Client] ---> POST /api/auth/login    ---> [Zod Validator] ---> [Bcrypt Compare]          ---> [Verified]
         <--- HTTP-Only Cookie + JSON  <--- [JWT Signed]

[Client] ---> GET  /api/auth/me       ---> [requireAuth]   ---> [JWT Verify]              ---> User Object (Password omitted)
[Client] ---> POST /api/auth/logout   ---> [Cookie Cleared]
```

---

## License

MIT © TrustLens Platform Contributors
