# Course Booking Platform

Admin sets teaching availability. Students register, browse published courses,
pick one, and book a time slot from a calendar.

Built to the standard stack: Next.js App Router, React 19, TypeScript strict,
server-first (RSC + server actions, no REST/tRPC layer), Prisma 6 on Neon
Postgres, hand-rolled auth with bcryptjs + jose, zod on every action input,
hand-written CSS with the KUFPEC blue tokens.

---

## Versions

| Package | Your realestate app | Here | Why |
|---|---|---|---|
| `prisma` / `@prisma/client` | `^6.19.3` | `^6.19.3` | Matched as requested. 6.19.3 is the top of the v6 line. |
| `react` / `react-dom` | `^19.2.0` | `^19.2.8` | Same 19.2 line. Floor raised because React2Shell affected RSC in 19.0.0–19.2.0 and is patched in 19.2.1+. Your caret already resolved here; this makes it explicit. |
| `next` | `15.5.21` | `15.5.23` | Stayed on the Next 15 line your stack file specifies, at the newest patch. |

Worth a decision from you later, not now:

- **Prisma 7.9.1** is current. It drops the Rust query engine for a TypeScript
  runtime (faster queries, ~90% smaller bundles) but is ESM-only and requires
  driver adapters (`@prisma/adapter-pg`), a `prisma.config.ts`, and an explicit
  generator `output` path. That is a real migration, not a version bump. v6 is
  a sound place to start and keeps this app consistent with realestate-inspect.
- **Next 16.3.1** is current; 15.x is in Maintenance LTS (critical fixes only)
  until October 2027. Both apps move together whenever you decide to.

Re-run the version check before your next build — that is what the stack file's
pinning rule is for.

---

## Setup

```bash
npm install
cp .env.example .env      # then fill it in
npm run setup             # prisma generate && db push && seed
npm run dev
```

`npm install` runs `prisma generate`, which downloads the query engine from
`binaries.prisma.sh`. If you are behind a restrictive proxy, allow that host.

### Environment

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection. Used at runtime. |
| `DIRECT_URL` | Neon **non-pooled**. Used by `prisma db push` / migrations. |
| `JWT_SECRET` | Min 32 chars. Generate it yourself: `openssl rand -base64 48`. The app throws on boot if it is missing or short. |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Seeds your admin account. Min 10 chars. |
| `NEXT_PUBLIC_APP_TIMEZONE` | Optional, defaults to `Asia/Kuwait`. |

The seed is idempotent and never resets an existing password. If the email
already exists as a student it is promoted to ADMIN; otherwise it is created.

### Deploy

Vercel. Build script is
`prisma generate && prisma db push && tsx prisma/seed.ts && next build`.
Set every variable above in the Vercel project, including `ADMIN_PASSWORD`, or
the seed skips admin creation and you will not be able to sign in.

---

## How it fits together

```
User ──┬── ADMIN   → /admin, /admin/courses, /admin/availability, /admin/bookings
       └── STUDENT → /courses, /courses/[id], /bookings

Course ──< AvailabilitySlot >── Booking ──> User
```

**AvailabilitySlot** is *your* time, not the course's. A slot with
`courseId = null` is offered for every published course; a slot with a
`courseId` is reserved for that one course. Either way, once someone books it,
it is gone for every course — you cannot teach two sessions at once. `capacity`
is seats per slot: 1 for one-to-one, higher for group sessions.

**Booking** carries a sequential human reference (`BK-000001`) from the
`Counter` table.

---

## Security

You asked for the APIs to be locked down. There is no REST layer here — server
actions *are* the API surface, and they are reachable by anyone who can craft a
POST, so each one defends itself rather than trusting the page that rendered it.

**Authentication**
- bcryptjs at cost 12. Failed logins for a non-existent email still run a
  bcrypt comparison against a dummy hash, so response timing does not reveal
  which accounts exist.
- JWT in an `httpOnly`, `sameSite=strict`, `secure`-in-production cookie,
  carrying **only** the user id. Role and `isActive` are read fresh from the
  database on every request, so deactivating someone takes effect immediately
  rather than whenever their week-old token expires.
- `JWT_SECRET` is validated at first use and throws if absent or under 32 chars.

**Authorization**
- `middleware.ts` verifies the signature at the edge to bounce anonymous
  traffic cheaply. It is deliberately **not** the security boundary — it never
  reads roles. Every page calls `requireUser()`/`requireAdmin()` and every
  action calls `requireUserAction()`/`requireAdminAction()` itself.
- Registration hard-codes `role: 'STUDENT'`. It never reads a role from the
  form, so `role=ADMIN` in a crafted POST does nothing. ADMIN exists only via
  the seed.
- Students can cancel only their own bookings — ownership is checked against
  the session, not against anything in the request.
- Unpublished courses 404 for students even with a guessed id, and cannot be
  booked even if the id is posted directly.

**Input**
- zod validates every action input, with length caps on every string so a
  crafted request cannot push megabytes into the database.
- Rate limiting on login (10 per 15 min per IP, plus a per-account bucket so
  rotating IPs cannot grind one account) and registration (5 per hour per IP).

**Data integrity**
- Booking runs inside a **Serializable** transaction. A plain
  count-then-insert would let two students racing for the last seat both read
  `taken < capacity` and both succeed. Serialization failures (`P2034`) and
  unique violations (`P2002`) are caught and surfaced as "that slot just filled
  up".
- `@@unique([slotId, userId])` stops one student holding a slot twice; a
  previously cancelled booking is reinstated rather than duplicated.
- Slots in the past cannot be booked; overlapping slots cannot be created;
  courses and slots with confirmed bookings cannot be deleted.
- Every mutation writes an `AuditLog` row, and audit failures never break the
  user's action.
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`) set in `next.config.ts`; `poweredByHeader` off.

### Two things to watch

1. **Rate limiting is per-instance memory.** On Vercel that means per-lambda —
   it blunts a burst but is not a global limit. `lib/rate-limit.ts` has a
   deliberately small interface so it can move onto Upstash Redis without any
   other file changing.
2. **Interactive transactions through Neon's pooler.** The booking transaction
   runs against `DATABASE_URL`. Neon's pooled endpoint is PgBouncer; if you see
   transaction errors under load, append `?pgbouncer=true` to the pooled URL, or
   point the runtime client at `DIRECT_URL`.

---

## Verified so far

`npm install` and `tsc --noEmit` were run against this tree. Typechecking was
completed with a stubbed Prisma client because the sandbox could not reach
`binaries.prisma.sh`; the app layer compiles clean, and the remaining errors
were all missing-generated-client artifacts that resolve once you run
`prisma generate` locally. **`npm run build` has not been run against a real
database** — do that first, since `db push` and the seed run as part of it.

## Next steps, roughly in order

1. Email confirmations on booking and cancellation (Resend).
2. Meeting links per booking (Zoom/Meet) — a nullable field on `AvailabilitySlot`.
3. Recurring availability, so you set "Sun–Thu 6–8pm" once instead of per day.
4. A cancellation cutoff (e.g. no cancelling within 24h).
5. Payments (Stripe), with `Booking.status` gaining `PENDING_PAYMENT`.
6. Per-user timezones — currently everything renders in `APP_TIMEZONE`.
