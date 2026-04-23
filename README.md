# Network Mikro

Manual social task verification platform. Admins create campaigns with paid tasks, users publish on their own social accounts and submit proof, reviewers verify, and earnings settle in weekly payout batches.

Built with **Next.js 15 (App Router)**, **TypeScript (strict)**, **Tailwind + shadcn-style UI**, **Prisma**, **Neon Postgres**, **Zod**, and a custom **JWT + bcrypt** auth layer. File uploads go through an S3-compatible abstraction.

## Core flow

```
TASK → ASSIGNMENT → SUBMISSION → REVIEW → EARNING → PAYOUT
```

Every approval/rejection/payout runs in a Prisma transaction and writes an `AuditLog` row. Trust score changes go through a single service (`services/trust-score.ts`) that clamps and logs every delta.

## Roles

`SUPER_ADMIN > ADMIN > REVIEWER > BRAND > USER` — see `src/lib/rbac.ts`.

- Middleware (`src/middleware.ts`) gates auth.
- Every server action re-verifies the session and role via `assertRole()` / `requireRole()` (defense in depth).

## Project structure

```
src/
├─ app/
│  ├─ (public)/          landing, auth, legal
│  ├─ (user)/dashboard/  user area
│  ├─ (admin)/admin/     admin area (REVIEWER+)
│  └─ api/               logout + uploads
├─ components/
│  ├─ ui/        primitives (button, input, table, …)
│  ├─ common/    page-header, empty-state, pagination, status badges
│  ├─ dashboard/ shell, nav, user-menu
│  └─ forms/     feature forms (client components)
├─ lib/          env, db, auth, rbac, storage, validators, format, utils
├─ services/     business rules (review, payout, earning, trust, notifications, audit)
└─ middleware.ts
prisma/
├─ schema.prisma
└─ seed.ts
```

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

| Variable              | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `DATABASE_URL`        | Neon Postgres connection string (`?sslmode=require`) |
| `AUTH_SECRET`         | `openssl rand -base64 48` — at least 32 chars        |
| `AUTH_COOKIE_NAME`    | Session cookie name (default `nm_session`)           |
| `AUTH_SESSION_DAYS`   | Session lifetime in days (default `7`)               |
| `NEXT_PUBLIC_APP_URL` | Public app URL                                       |
| `S3_*`                | S3-compatible storage (AWS S3 / R2 / MinIO)          |

### 3. Database

```bash
# generate client + run migrations
npm run db:generate
npm run db:migrate:dev

# seed demo users, campaign, and a sample task
npm run db:seed
```

Seed accounts:

| Email                       | Password       | Role        |
| --------------------------- | -------------- | ----------- |
| super@networkmikro.local    | SuperAdmin123! | SUPER_ADMIN |
| admin@networkmikro.local    | Admin1234!     | ADMIN       |
| reviewer@networkmikro.local | Reviewer1234!  | REVIEWER    |
| user1@networkmikro.local    | User1234!      | USER        |
| user2@networkmikro.local    | User1234!      | USER        |

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Workflows implemented

- **Register** — creates user, default trust score 50, welcome notification, audit log.
- **Add social account** — per-platform unique username check, status badges, editable.
- **Create campaign** — admin-only. Supports status lifecycle, assets with captions/hashtags/links.
- **Create task** — admin-only. Reward, requirements (screenshot, post URL), min followers/trust, account type allow-list, submission window, assignment caps, start/end.
- **Claim task** — transactional. Enforces status, daily/weekly limits, trust minimum, calculates deadline, audits.
- **Submit proof** — screenshot uploaded to S3 (validated), assignment flips to `SUBMITTED`, submission `PENDING`.
- **Review** — queue with filters (status, platform, user, score, flagged). Approve / Reject / Revision in a single transaction that:
  - updates submission + assignment
  - creates earning
  - updates user aggregates
  - applies trust delta (+ streak bonus every 5th approval)
  - creates notification
  - writes audit row
- **Payouts** — create batch from a period, group pending earnings by user into items, mark items/batch paid. Cancel restores earnings to `PENDING`.
- **Audit log** — every privileged state change (user/role/status/role/earning/payout/setting) is recorded.
- **Reports** — approval rate, top earners, low-trust users, campaign mix, status mix, date filter.

## Trust score (services/trust-score.ts)

| Event                                | Delta |
| ------------------------------------ | ----: |
| Submission approved                  |    +2 |
| Submission on time (during approval) |    +1 |
| 5-streak bonus                       |    +5 |
| Revision requested                   |    −2 |
| Claim not submitted (expired)        |    −3 |
| Submission rejected                  |    −5 |
| Flagged as fake                      |   −15 |

Score is clamped to `[0, 100]`. Every change writes a `TrustScoreLog` row with before/after.

## Storage

`src/lib/storage.ts` wraps `@aws-sdk/client-s3`. Accepts JPEG/PNG/WebP up to 8 MB. File keys are namespaced (`submissions/…`, `campaigns/…`, `avatars/…`) with date partitions, owner id, and random suffix. Swap endpoints to target AWS S3, Cloudflare R2, or MinIO by editing env vars.

## Security

- Passwords hashed with bcrypt (12 rounds).
- JWT (HS256, `jose`) signed with `AUTH_SECRET`.
- Session cookie: `httpOnly`, `SameSite=Lax`, `Secure` in production.
- Zod validation on every action input.
- No `any`. TypeScript strict + `noUncheckedIndexedAccess`.
- Middleware denies unauthenticated access outside whitelisted public routes.
- Admin-area guard checks role both in middleware AND in `requireAdminArea()` on every server component.
- Role changes require the actor to outrank the target.
- Uploads validate MIME + size server-side. Paths are deterministic and include the owner id.
- Security headers set in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).

## Extension points

- **CSV export**: each list page already accepts `page` / `q` / filter params via query string; wire a `GET /export` handler that reuses the same `where` to stream CSV.
- **Soft delete**: `User.deletedAt` is already on the schema. To apply to campaigns/tasks/submissions, add `deletedAt DateTime?` + filter in queries.
- **Email notifications**: `services/notification.ts` is the single choke-point; attach a transactional email provider there.
- **Expiration cron**: `expireOverdueAssignments()` in `services/task-assignment.ts` is ready to be scheduled (e.g., Railway cron) to penalize no-shows.

## Railway deployment

1. **Create a Railway project** and provision (or connect) a Neon Postgres database. Set `DATABASE_URL` in Railway to the **pooler** connection string from Neon (ends with `?sslmode=require`).
2. **Add env vars** in the Railway service:
   - `DATABASE_URL`
   - `AUTH_SECRET` (generate with `openssl rand -base64 48`)
   - `NEXT_PUBLIC_APP_URL` (your Railway-assigned URL)
   - `S3_*` variables for your chosen storage provider
3. **Build command** (already set in `package.json`):
   ```
   npm run build
   ```
   This runs `prisma generate` first, then `next build`.
4. **Start command**:
   ```
   npm run start
   ```
5. **Migrations**: run `npm run db:migrate` on deploy (Railway deploy hook or a one-off job). Use `npm run db:push` only for the very first schema sync on a fresh database.
6. **Port**: Next.js honors `$PORT` — no configuration needed.
7. **Persistent storage**: S3-compatible provider required; Railway volumes are not used for uploads.

## Scripts

| Script                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Start Next.js dev server                   |
| `npm run build`          | Prisma generate + Next.js production build |
| `npm run start`          | Run the production server                  |
| `npm run typecheck`      | `tsc --noEmit`                             |
| `npm run lint`           | ESLint (Next.js config)                    |
| `npm run db:generate`    | Prisma generate                            |
| `npm run db:push`        | Push schema (fresh DBs only)               |
| `npm run db:migrate:dev` | Create + apply dev migration               |
| `npm run db:migrate`     | Apply pending migrations (prod)            |
| `npm run db:seed`        | Seed demo data                             |
