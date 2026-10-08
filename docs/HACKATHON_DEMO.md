# TrustLens — Live Hackathon Demonstration Script & Presentation Guide

> **Target Duration:** 3–5 Minutes  
> **Audience:** Hackathon Judges, Technical Evaluators, and Fact-Checking Domain Experts  
> **Platform:** TrustLens Multimodal Misinformation & Trust-Assessment System  

---

## 1. Executive Summary & Core Pitch (30 Seconds)

> *"Every misinformation tool today makes the same fatal mistake: they ask an LLM, 'Is this claim true?' But LLMs are not truth oracles. They hallucinate, exhibit confirmation bias, have knowledge cutoffs, and cannot produce cryptographic or verifiable provenance.*
>
> *TrustLens reverses this paradigm. **The AI is not the source of truth.** TrustLens uses AI strictly as an analytical semantic parser over independently gathered, web-grounded evidence. Every score is deterministic, every citation is authentic, and every verdict is transparently explainable."*

---

## 2. Key Architectural Differentiators to Emphasize

1. **Evidence Integrity — Zero Hallucinated Citations:**
   TrustLens never synthesizes placeholder or fake citations. If web evidence is absent or quota-capped, TrustLens errs on the side of caution: it assigns an `INCONCLUSIVE` verdict with `LOW` confidence and explains the limitation.
2. **Circular Evidence Exclusion:**
   When verifying an article or URL (e.g. `nytimes.com`), TrustLens strips the verified domain and its syndicated wire copies from corroborating evidence so the claimant cannot verify itself.
3. **Context Recycling Detection:**
   Most viral misinformation does not involve deepfakes; it involves **genuine media attached to false events, dates, or locations** (e.g., a 2019 wildfire captioned as "Breaking 2026"). TrustLens separates **OBSERVED** visual facts from **INFERRED** user context.
4. **The Primary Claim Veto Rule:**
   Even if an article has 9 minor true statements, if its single **PRIMARY** empirical assertion is refuted, the entire content is vetoed from receiving a `LEGIT` verdict.
5. **Multi-Provider Resilience:**
   Primary Google Gemini with seamless fallback to Groq (`qwen/qwen3.8-27b`). If both encounter rate limits or network partitions, TrustLens gracefully degrades to deterministic heuristic analysis without crashing.

---

## 3. Minute-by-Minute Live Demo Flow

### Minute 0:00 – 1:00: Problem Statement & Live Text Claim Verification
- **Action:** Open the TrustLens Dashboard at `http://localhost:5173`.
- **Showcase:**
  1. Highlight the clean, responsive dark-mode UI with live system diagnostics (Database, Auth, AI Provider Health).
  2. Click **Text Claim** or navigate to the Unified Workspace.
  3. Enter a viral claim, for example:  
     `"Researchers at Lawrence Livermore National Laboratory achieved net energy gain in a nuclear fusion experiment yielding 3.15 megajoules."`
  4. Click **Verify Claim**.
- **What Judges See:**
  - Real-time stage stepper: Claim extraction → Query generation → Google Search Grounding → Stance classification → Contradiction audit → Trust scoring.
  - **Verdict:** `LEGIT` (Score: 80–90/100).
  - Expand **Independent Evidence Trail**: Show authentic web citations with direct quotes, publisher authority ratings, and stance badges (`SUPPORTS`).
  - Expand **Algorithmic Rationale**: Show the exact deterministic mathematical formula calculation.

---

### Minute 1:00 – 2:00: URL Verification & SSRF Defense
- **Action:** Switch to the **Webpage URL** tab.
- **Showcase:**
  1. Enter a public article URL (or test URL).
  2. Explain the **Security Boundary**: TrustLens inspects DNS resolution, blocks RFC 1918 private IPs, blocks AWS/cloud metadata (`169.254.169.254`), and re-evaluates security across every redirect hop.
  3. Click **Verify URL**.
- **What Judges See:**
  - Semantic content extraction (stripping cookie banners, sidebars, and ads).
  - **Multi-Claim Extraction:** Shows `PRIMARY`, `SUPPORTING`, and `MINOR` claims.
  - **Headline Distortion Check:** Explains if the headline is sensationalized relative to the article body.
  - **Internal Self-Consistency:** Validates that paragraph 1 does not contradict paragraph 5.
  - **Circular Evidence Block:** Notice the verified site itself is excluded from external evidence.

---

### Minute 2:00 – 3:00: Image Forensics & Context Recycling
- **Action:** Switch to the **Image Forensics** tab.
- **Showcase:**
  1. Upload an image (or drop a test file).
  2. Point out **Enterprise Hardening**:
     - In-memory processing (zero disk vulnerability).
     - Magic byte sniffing (instantly rejects disguised `.exe` or shell scripts disguised as `.jpg`).
     - EXIF metadata inspection with GPS coordinate privacy protection.
  3. Enter user context, e.g.:  
     *Claim: "NASA James Webb Space Telescope releases deepest infrared image of early universe."*
  4. Click **Verify Image**.
- **What Judges See:**
  - Visual claim extraction with strict tagging: **OBSERVED** (visual telescope pattern) vs. **INFERRED** (scientific date/mission).
  - **Authenticity vs. Context Mismatch Evaluation:** If someone pastes an image of Mars and claims it is the Sahara desert, TrustLens detects the mismatch and flags context recycling.

---

### Minute 3:00 – 4:00: Social Media Video Reels Verification
- **Action:** Switch to the **Video Reels** tab.
- **Showcase:**
  1. Open the interactive **Demo Reels Feed** on the right sidebar (10 pre-loaded reels).
  2. Select Reel #1: **Apollo 11 Lunar Landing Historical Footage** or Reel #2: **California Wildfire 2026 (Context Recycling)**.
  3. Click **Verify Video Reel**.
- **What Judges See:**
  - Vertical social-media player displaying keyframes.
  - Video stream probing: duration, resolution, audio track detection.
  - Keyframe extraction with perceptual hash deduplication.
  - Audio speech transcription with synchronized timestamps.
  - **Temporal Consistency Engine:** Checks whether chronological events align across the clip.
  - **Primary Claim Veto Rule:** Shows how recycled footage with false modern claims is correctly vetoed to `FAKE` even if the footage itself is historical.

> **Note on Reel Assets:** The 10 bundled demo reels are configured via `demo-reels.config.ts`. The modular configuration enables swapping in final evaluation videos in seconds by updating the configuration array and placing files in `/demo-videos/`.

---

### Minute 4:00 – 5:00: Unified Multimodal Fusion & Epistemic Uncertainty
- **Action:** Switch to the **Unified Multimodal Workspace** (`All-in-One`).
- **Showcase:**
  1. Demonstrate feeding text narrative + URL link + image + video reel **simultaneously**.
  2. Click **Run Unified Multimodal Verification**.
- **What Judges See:**
  - **Multimodal Claim Fusion:** Synthesizes claims across all inputs and deduplicates assertions that repeat across text and video dialogue.
  - **Cross-Modal Consistency Matrix:** Audits whether the image and video match the location and event stated in the text claim.
  - **Epistemic Uncertainty Awareness:** If independent web evidence is scarce, TrustLens does NOT guess; it delivers an `INCONCLUSIVE` verdict with explicit boundary caveats.
  - Click **Verification History** to show the immutable user audit log with multi-tenant data isolation.

---

## 4. Anticipated Judge Questions & Bulletproof Answers

### Q1: *"Why not just query GPT-4 or Gemini directly to ask if something is true?"*
**Answer:**
> "Language models are probabilistic text generators, not ground-truth databases. Asking an LLM directly leads to sycophancy, hallucinations, and unverified outputs. TrustLens uses AI strictly as a parser: to extract claims, generate targeted Google search queries, and evaluate stance against real web documents. The decision logic is deterministic code, not stochastic generation."

### Q2: *"What happens if Gemini or Groq hits rate limits or goes down?"*
**Answer:**
> "TrustLens has an enterprise fallback architecture. Calls to Gemini automatically fall back to Groq in under 15 seconds. If both APIs are quota-capped or offline, TrustLens falls back to deterministic heuristic extraction and live grounding without failing. Our test suite includes tests proving rate-limit fallback and graceful degradation."

### Q3: *"How do you prevent malicious uploads or SSRF attacks?"*
**Answer:**
> "All image processing happens in RAM with binary magic byte validation and decompression bomb caps (10,000px/40MP). Videos are size-capped at 50MB with strict `finally` cleanup guarantees. For URLs, our SSRF shield blocks private IPv4/IPv6, link-local, cloud metadata (`169.254.169.254`), and re-validates DNS at every redirect hop."

### Q4: *"Can a fake news site verify its own claim by citing itself?"*
**Answer:**
> "No. TrustLens implements Circular Evidence Exclusion. The target URL's domain and any subdomains are systematically stripped from external search evidence pools. Corroboration must come from independent, authoritative sources."

---

## 5. Quick Setup & Demonstration Checklist

- [x] Node.js 18+ and PostgreSQL running.
- [x] `.env` configured with `GEMINI_API_KEY` and `GROQ_API_KEY`.
- [x] Backend running on port 5000 (`npm run dev:server`).
- [x] Frontend running on port 5173 (`npm run dev:client`).
- [x] Full test suite verified (`npm test` — 84/84 passing).
- [x] Production build confirmed clean (`npm run build`).
- [x] Demo user registered or logged in on the web UI.
