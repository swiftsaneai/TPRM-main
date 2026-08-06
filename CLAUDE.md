# TPRM Frontend — Claude Code Reference

> **Self-update instruction**: Whenever you observe a new command, style, pattern, preference, or project fact that is not already documented here, append or update the relevant section immediately — do not wait for the user to ask. Keep this file current and authoritative.

---

## Project Overview

**Name**: TPRM (Third-Party Risk Management) Frontend  
**Package name**: `tprm`  
**Purpose**: A web application for managing vendor risk, onboarding vendors, running criticality assessments, and AI-assisted diligence via a Risk Copilot chatbot.

**Tech stack**:
- Next.js 15.3.1 (App Router, server + client components)
- React 19
- TypeScript 5
- NextAuth v5 (`next-auth@5`) — Google OAuth only (Microsoft Entra wired in env but not active)
- CSS Modules exclusively — **no Tailwind, no shadcn/ui**
- All icons are inline SVG — **no icon libraries**
- N8N (self-hosted on Azure) for all backend logic and data persistence

---

## Branch Strategy

```
master       ← admin-only; only merged via GitHub by the project admin
  └── dev    ← integration branch; all PRs target this branch
        └── feature/issue-N-short-name  ← individual feature branches
```

**All PRs must use `--base dev`** — never `--base master` unless the admin explicitly instructs it.

To see all features working together, check out `dev`:
```bash
git checkout dev
```

---

## N8N Webhook URLs

All backend calls go through N8N workflows hosted on Azure.

| Constant / Location | URL |
|---|---|
| `WEBHOOKS.ONBOARDING` (AppShell / OnboardVendorModal) | `…/webhook/vendor-onboarding` |
| `WEBHOOKS.VENDOR_LIST` (AppShell / OnboardVendorModal) | `…/webhook/vendor-list` |
| `WEBHOOKS.AI_CHAT` (AppShell copilot) | `…/webhook/onbaording-ai` |
| `WEBHOOK_VENDOR_LIST` (RiskAssessment) | `…/webhook/vendor-list` |
| `WEBHOOK_CRITICALITY` (RiskAssessment) | `…/webhook/crticality-Assesment` |
| `ASSESSMENT_WEBHOOK` (QuickAssessment) | `…/webhook-test/scan` |
| `HISTORY_WEBHOOK` (QuickAssessment) | `…/webhook/get-messages` |

Base host: `https://n8ntinycrows-djepemcqdub2bac7.centralindia-01.azurewebsites.net`

> Note: `crticality-Assesment` is a typo in the N8N workflow URL — do not correct it or the hook will break.

---

## Authentication

- Provider: **Google OAuth** via NextAuth v5
- `session.user.id` = `token.providerAccountId` (Google `sub`)
- `session.user.idToken` = Google JWT (used as auth token in N8N webhook calls)
- Config: `auth.ts` at project root
- Middleware: `middleware.ts` — protects all `/(authenticated)` routes
- Env vars: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

---

## App Structure

```
app/
├── (authenticated)/
│   ├── layout.tsx              — wraps all auth'd pages in <AppShell>
│   ├── AppShell.tsx            — sidebar nav, Risk Copilot chat sidebar, event listeners
│   ├── dashboard/page.tsx
│   ├── vendors/
│   │   ├── page.tsx            — vendor list (sortable, filterable table)
│   │   └── [id]/page.tsx       — vendor detail page (/vendors/:session_id)
│   ├── diligence/page.tsx      — Quick Vendor Assessment (issue #6)
│   └── risk/page.tsx           — Criticality Assessment (issue #7)
├── components/
│   ├── diligence/
│   │   └── QuickAssessment.tsx
│   ├── onboarding/
│   │   ├── OnboardVendorModal.tsx   — multi-step vendor onboarding modal (issue #8)
│   │   └── onboardVendorModal.module.css
│   ├── risk/
│   │   ├── RiskAssessment.tsx       — criticality scoring (issue #7)
│   │   └── riskAssessment.module.css
│   └── vendors/
│       ├── VendorList.tsx           — table with sort, filter, search; row click → /vendors/:id
│       ├── VendorDetailPage.tsx     — full-page vendor profile with tabs
│       ├── vendorList.module.css
│       └── vendorDetailPage.module.css
├── api/auth/[...nextauth]/      — NextAuth route handler
├── globals.css                  — design tokens (CSS custom properties)
├── layout.tsx                   — root layout (font loading)
└── login/page.tsx
```

---

## CSS Design Tokens

Defined in `app/globals.css` as CSS custom properties. Always use these — never hardcode colors.

```css
/* Text */
--ink:        #16171D;
--ink-soft:   #2A2C36;
--ink-muted:  #6B6E7A;
--ink-line:   #E5E5EA;
--ink-line-2: #D9D9DF;

/* Backgrounds */
--paper:      #FFFFFF;
--paper-warm: #FAFAF7;

/* Brand / semantic colors */
--crimson:      #B01A2D;
--crimson-tint: rgba(176, 26, 45, 0.06);
--crimson-soft: #FBE8EC;
--navy:         #004777;
--navy-tint:    rgba(0, 71, 119, 0.06);
--amber:        #B07A14;
--green:        #2E6F40;

/* Fonts */
--font-serif:  (loaded via next/font — Playfair Display or similar)
--font-ui:     'Poppins', sans-serif
--font-mono:   monospace stack
```

**Criticality tier colors** (used in RiskAssessment):
- Critical: `--crimson`
- High: `--amber`
- Medium: `--navy`
- Low: `--green`

---

## Key Architecture Patterns

### Server vs Client Components
- Route `page.tsx` files are **server components** — they fetch session with `auth()` and pass `user` down as a prop
- All interactive UI lives in `components/` as **client components** (`"use client"` at top)

### Cross-Component Communication (Custom DOM Events)
Used to communicate from deep inside a component up to `AppShell` without prop drilling or a state library:

| Event | Payload | Dispatched by | Handled by |
|---|---|---|---|
| `copilot:prefill` | `{ text: string }` | RiskAssessment "i" buttons, OnboardVendorModal "i" buttons, VendorDetailPage | AppShell — opens copilot and pre-fills input |
| `vendor:openOnboard` | _(none)_ | VendorList empty-state CTA | AppShell — opens OnboardVendorModal |
| `vendor:onboarded` | _(none)_ | OnboardVendorModal on completion | VendorList — re-fetches vendor list |

```ts
// Dispatch pattern
window.dispatchEvent(new CustomEvent("copilot:prefill", { detail: { text } }));
window.dispatchEvent(new CustomEvent("vendor:openOnboard"));
window.dispatchEvent(new CustomEvent("vendor:onboarded"));
```

### N8N Step State
The onboarding and assessment forms are **backend-driven**: each POST response contains a `current_step` field that tells the frontend which section to show next. The frontend's `STEP_ORDER` array must mirror the N8N workflow exactly.

### Criticality Scoring (RiskAssessment)
- 7 sections, 27 questions, max 148 pts
- Thresholds: Critical ≥ 89 | High ≥ 60 | Medium ≥ 35 | Low < 35
- Computed client-side via `computeCriticality(answers)`

---

## UI Conventions

- **Modals**: Centered Mac-style popup with backdrop, scale-in animation
- **Close button**: Red circle (`#FF5F57`), SVG "X" visible only on hover
- **Info buttons ("i")**: 18px circle, hover shows tooltip, click dispatches `copilot:prefill` event
- **Steppers**: Horizontal steppers for multi-step flows (onboarding, assessment)
- **Tooltips**: CSS-only via `.wrap:hover .popup` — never inline styles for hover states
- **No external icon libraries** — all icons are inline `<svg>` elements

---

## User Preferences

- **No Claude attribution** in commits or PR descriptions — write as the human developer
- **No `Co-Authored-By` tags** unless explicitly asked
- **CSS Modules only** — never introduce Tailwind, styled-components, or emotion
- **No shadcn/ui or Headless UI** — build all components from scratch
- **All PRs target `dev`** — use `--base dev` in every `gh pr create`
- **Never close or delete a PR** — merging to `dev` must not close the PR; PRs stay open so the admin can review and merge to `master`
- **No comments explaining what code does** — only comment when the WHY is non-obvious
- **Terse responses** — no trailing summaries, no "I've completed the task" wrap-ups
- **No emoji** unless explicitly requested

---

## Git Workflow

```bash
# Start a new feature
git checkout dev
git pull origin dev
git checkout -b feature/issue-N-short-name

# Create PR (always target dev)
gh pr create --base dev --title "[TYPE] Description #N" --body "$(cat <<'EOF'
## What
...

## Why
...
EOF
)"
```

PR title format: `[INTEGRATION] Description #N` or `[FIX] Description #N` etc.

GitHub token for PRs (Jatin Singh / singhjatintinycrows): stored in user environment — use `gh` CLI which picks it up automatically.

---

## Completed Issues

| # | Title | Branch | PR |
|---|---|---|---|
| #6 | Connect Quick Vendor Assessment with TPRM | `feature/issue-6-quick-vendor-assessment` | merged to dev |
| #7 | Connect Backend for Criticality Assessment | `feature/issue-7-criticality-assessment` | merged to dev |
| #8 | Connect Backend for Vendor Onboarding | `feature/issue-8-vendor-onboarding` | merged to dev |
| #9 | Connect Risk Copilot with n8n | `feature/issue-9-risk-copilot-n8n` | merged to dev (backend-only fix) |
