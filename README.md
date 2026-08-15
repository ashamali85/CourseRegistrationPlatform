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

## Deploy (no terminal needed)

Everything runs in Vercel's build. The build script is
`prisma generate && prisma db push && tsx prisma/seed.ts && next build`, which
creates the tables and your admin account automatically on first deploy.

**1 — Create a Neon database.** At neon.tech, create a project and copy both
connection strings. The pooled one has `-pooler` in the hostname; the direct one
does not.

**2 — Push this folder to a GitHub repo**, then import it in Vercel
(Add New → Project → Import).

**3 — Add Environment Variables** in Vercel *before* the first deploy, under
Settings → Environment Variables. Add each to Production, Preview and
Development:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string (the `-pooler` one) |
| `DIRECT_URL` | Neon direct string |
| `JWT_SECRET` | Min 32 chars — use Vercel's **Generate Secret** button |
| `ADMIN_EMAIL` | Your email — this is your login |
| `ADMIN_NAME` | Your name |
| `ADMIN_PASSWORD` | Min 8 chars — your first-login password only |

**4 — Deploy.** The build creates the schema, seeds your admin account and two
sample courses.

**5 — Sign in** at `https://your-app.vercel.app/login` with `ADMIN_EMAIL` and
`ADMIN_PASSWORD`. You are taken straight to `/change-password` and cannot reach
anything else until you set a real one.

**6 — After changing it, delete `ADMIN_PASSWORD`** from Vercel. It is dead
after the change, so it is just a stale secret sitting in your settings.

Then: **Courses** → add one and tick Published → **Availability** → add a time
slot. Register a second account with a different email to see the student side.

### If you leave ADMIN_PASSWORD blank

The seed generates a random 16-character password with `crypto.randomBytes` and
prints it in the Vercel build log (Deployments → your deployment → Building):

```
================================================================
  TEMPORARY ADMIN PASSWORD — generated, shown once
================================================================
  Email:    you@example.com
  Password: kJ2mX9pQr4vN8wLz
================================================================
```

Setting `ADMIN_PASSWORD` yourself is better — build logs persist and are
visible to everyone with project access.

### If you get locked out

No CLI needed. In Vercel: set `ADMIN_PASSWORD` to a new value, add
`ADMIN_PASSWORD_RESET` = `true`, and redeploy. Sign in, change your password,
then **delete `ADMIN_PASSWORD_RESET`** — if you leave it set, every future
deploy resets your password.

On a normal deploy the seed never touches an existing password, so redeploying
is always safe.

---

## Local development (optional)

```bash
npm install
cp .env.example .env      # then fill it in
npm run setup
npm run dev
```

`npm install` runs `prisma generate`, which downloads the query engine from
`binaries.prisma.sh` — allow that host if you are behind a proxy.
`npm run admin:reset` issues a fresh temporary password if you prefer the CLI
route to the environment-variable one.

---

## Languages and RTL

The interface ships in **Arabic (default)** and English. The toggle sits in the
top bar and shows the *other* language, so it reads as the thing you get by
pressing it.

- Locale lives in a `course_platform_locale` cookie, validated against the
  allowed list on write. Missing or unrecognised means Arabic.
- The root layout sets `lang` and `dir` on `<html>`. That single attribute is
  what mirrors flexbox, grid, logical CSS properties and the browser's own bidi
  handling — which is why there is almost no per-component RTL code.
- Arabic renders in Noto Kufi Arabic, with the negative letter-spacing removed
  from headings (it pulls Arabic letterforms into each other) and a looser line
  height.
- The week starts **Sunday in Arabic, Monday in English**, driven by
  `calendar.weekStart`. The month arrows are mirrored in CSS rather than by
  swapping their handlers, so DOM and tab order stay correct.
- Latin-only runs inside Arabic text — emails, `BK-000001` references, clock
  times, `Asia/Kuwait` — are wrapped in `.ltr-text`, which isolates them from
  the bidi algorithm. Without it the punctuation in `BK-000001` gets reordered
  and the reference reads wrong.
- Date and time inputs stay LTR, because the native browser widget is built
  that way and forcing it RTL breaks the picker.

Server actions return **translated** messages: schemas in `lib/validation.ts`
are built per request from the caller's dictionary, so zod errors arrive in the
user's language rather than being translated at the last moment in the UI.

### Adding a language

Add the locale to `LOCALES` and `isLocale` in `lib/i18n.ts`, then add a
dictionary object typed `Dictionary`. TypeScript will list every key you have
not translated yet. Set `dir` in that dictionary and, if it is RTL, extend the
`isRtl` check.

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
- A temporary password is gated at both layers: `requireUser()` redirects to
  `/change-password` and `requireUserAction()` throws, so the flag cannot be
  bypassed by POSTing to an action directly. Only the change-password page and
  action pass `allowPendingPasswordChange`.
- Changing a password bumps `passwordChangedAt`, and any token issued before
  that instant is rejected — so it signs out every other device, which is what
  you want if a temporary password was seen by someone else.
- The current password is re-verified on change even though the user holds a
  valid session, so a hijacked session cannot lock the real owner out.
- Registration hard-codes `role: 'STUDENT'`. It never reads a role from the
  form, so `role=ADMIN` in a crafted POST does nothing. ADMIN exists only via
  the seed.
- Students can cancel only their own bookings — ownership is checked against
  the session, not against anything in the request.
- Unpublished courses 404 for students even with a guessed id, and cannot be
  booked even if the id is posted directly.

**Input**
- zod validates every action input, with length caps on every string so a
  crafted request cannot push megabytes into the database. Passwords are
  minimum 8 characters (`PASSWORD_MIN` in `lib/validation.ts` — the client
  `minLength` reads from the same constant, so the two cannot drift).
- The locale cookie is the one deliberately non-httpOnly cookie: it is a
  display preference, not a credential. It is still validated against the
  allowed list on write rather than reflected back into the markup.
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

Dependencies installed and `tsc --noEmit` run against this tree. Typechecking
used a stubbed Prisma client because the sandbox could not reach
`binaries.prisma.sh`; the app layer compiles clean, and the remaining errors
were all missing-generated-client artifacts that resolve when Vercel runs
`prisma generate`. **the build has not been run against a real
database** — your first Vercel deploy is that test. If it fails, the build log
will say why; the usual causes are a missing environment variable or the pooled
and direct URLs being swapped.

## Next steps, roughly in order

1. Email confirmations on booking and cancellation (Resend).
2. Meeting links per booking (Zoom/Meet) — a nullable field on `AvailabilitySlot`.
3. Recurring availability, so you set "Sun–Thu 6–8pm" once instead of per day.
   Also: self-serve password reset by email, so students are not dependent on
   you running a script.
4. A cancellation cutoff (e.g. no cancelling within 24h).
5. Payments (Stripe), with `Booking.status` gaining `PENDING_PAYMENT`.
6. Per-user timezones — currently everything renders in `APP_TIMEZONE`.
7. Arabic course content. The interface is translated, but course titles and
   descriptions are stored as single strings — bilingual courses would need
   `title_ar` / `title_en` columns or a translations table.
