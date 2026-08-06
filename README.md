# TPRM — Third-Party Risk Management

A Next.js application by SwiftSane for managing third-party vendor risk. Provides SSO-only authentication via Google and Microsoft Entra ID.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19
- **Auth:** NextAuth v5 (Auth.js)
- **Language:** TypeScript

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_MICROSOFT_ENTRA_ID` | Azure app (client) ID |
| `AUTH_MICROSOFT_ENTRA_SECRET` | Azure client secret |
| `AUTH_MICROSOFT_ENTRA_TENANT_ID` | Azure tenant ID (omit for multi-tenant) |

**Google:** Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

**Microsoft:** Register an app at [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps). Set the redirect URI to `http://localhost:3000/api/auth/callback/microsoft-entra-id` (and your production URL).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  api/auth/[...nextauth]/   # NextAuth route handler
  login/                    # Login page (SSO buttons)
  page.tsx                  # Root redirect (/ -> /login or /dashboard)
  layout.tsx                # Root layout
auth.ts                     # NextAuth config (providers, pages)
middleware.ts               # Route protection — all routes except /login require auth
```

## Authentication

- Login is SSO-only (Google or Microsoft). No passwords are stored.
- `middleware.ts` protects all routes except `/api`, `/_next/static`, `/_next/image`, `/favicon.ico`, and `/login`.
- Authenticated users are redirected to `/dashboard`; unauthenticated users to `/login`.
- Access is admin-provisioned. New users should contact their administrator or [hello@swiftsane.com](mailto:hello@swiftsane.com).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
