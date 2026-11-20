# SmartExpiry — Admin

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL (local, no Docker)

## Setup

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values (see comments in the file)
npm run db:migrate          # creates the `smart_expiry` database + `admins` table
npm run dev                 # http://localhost:3000
```

**Email:** fill the `SMTP_*` variables in `.env` (Gmail App Password, Mailtrap, etc.).
They are required: the verification code is only ever delivered by email and is
never printed to the console or logs.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Browse the database |

The Admin app owns the database schema. After changing `prisma/schema.prisma`,
copy it to `../smartexpiry-employee/prisma/schema.prisma` and run
`npm run db:generate` there.

## Onboarding flow

1. **Register** (`/register`): name, email, contact number, password.
2. A **6-digit code (OTP)** is emailed. It expires after 10 minutes (`EMAIL_OTP_TTL_MINUTES`) and allows 5 wrong attempts.
3. **Verify** (`/verify-email`): enter the code (typing, paste or phone autofill; submits automatically when complete). "Resend code" has a 60s cooldown and replaces the previous code.
4. A correct code marks the email verified, signs the admin in and opens the **dashboard**.
5. **Login** (`/login`): email + password. An unverified account with the right password is sent a fresh code and taken to `/verify-email`.

Codes are stored only as an HMAC-SHA256 hash (keyed with `ACCESS_TOKEN_SECRET`), never in plain text.

## Sessions

| Token | Lifetime | Cookie | Notes |
| --- | --- | --- | --- |
| Access (JWT) | 15 min | `se_access_token`, httpOnly, path `/` | Checked by `src/proxy.ts` and `getCurrentAdmin()` |
| Refresh (JWT) | 7 days | `se_refresh_token`, httpOnly, path `/` | SHA-256 hash stored in DB, rotated on every use |

**Renewal happens in the proxy.** When the access token is missing or expired
and a refresh token is present, `src/proxy.ts` rotates the tokens in place and
lets the same request continue with the new access token — no redirect, so it
works for page loads, client navigations, prefetches and Server Action POSTs.

Rotation is race-safe: an atomic conditional update lets only one parallel
request rotate; the others (and anything sent with the just-replaced token in
the next 30 s) get a new access token and keep the new refresh cookie.

Every page except `/login`, `/register` and `/verify-email` requires a session
(`PUBLIC_PREFIXES` in `src/lib/auth/constants.ts`), so new pages are protected
automatically.

One active session per admin: signing in on another browser/device (note:
`localhost` and your LAN IP count as different browsers) signs the older one
out at its next refresh. Logout revokes the session in the database.

Every Server Component / Server Action that needs the admin must call
`requireAdmin()` from `src/lib/auth/dal.ts`. The proxy is only a fast first check.

## Products & expiry tracking

Tables: `products` (the admin's catalog, unique per barcode) and
`inventory_batches` (stock of a product in one store: quantity + its own
expiry date — the same product can have many batches).

Add products from a store page (**Scan barcode** or **Add manually**):

1. **Scan** — live camera (HTTPS or `localhost` only; browsers block the camera
   on plain-HTTP LAN addresses), **scan from a photo** (works everywhere), or
   type the number. Decoding uses `barcode-detector` (ZXing WebAssembly),
   served from `public/vendor/zxing_reader.wasm` (`npm run vendor:zxing`).
2. **Lookup** — your own catalog first, then Open Food Facts / Open Beauty
   Facts (only the barcode number is sent). Results are partial; the admin
   reviews and completes the form.
3. **Expiry** — normal EAN/UPC barcodes do **not** contain it, so it's entered
   (quick picks: +3 days … +1 year). **GS1 DataMatrix / GS1-128** codes (common
   on medicines) carry expiry (AI 17), batch (AI 10) and manufacturing date
   (AI 11); these fill in automatically (`src/lib/products/barcode.ts`).

Status: expired (< today), expiring soon (≤ 7 days, `EXPIRING_SOON_DAYS`),
fresh, or no expiry.

## Project structure

```
src/
  proxy.ts                     Route guard (Next 16 replacement for middleware)
  app/
    (auth)/                    Auth layout + login, register, verify-email, actions.ts
    (dashboard)/               Admin shell + dashboard (home), logout action
    api/auth/                  refresh, session-expired route handlers
    globals.css                Light/dark color tokens (edit colors here)
  components/
    ui/                        Button, Input, OtpInput, Alert, Card (reusable, overridable via className)
    auth/  dashboard/  theme/  brand/
  lib/
    auth/                      tokens, session, cookies, password, DAL, verification
    mail/                      SMTP mailer + email templates
    validations/               Zod schemas
    env.ts                     Validated environment variables
```

## UI components

All components have default styles; anything passed in `className` overrides them.

```tsx
<Button>Save</Button>                                  // primary (default)
<Button variant="secondary" size="lg" fullWidth />    // primary | secondary | outline | ghost | danger | link
<Button type="submit" loading={pending} loadingText="Saving…" />
<Link href="/x" className={buttonVariants({ variant: "outline" })}>Go</Link>

<Input name="email" type="email" label="Email" leftIcon={<Mail />} error={errors?.email} hint="…" />
<Input type="password" … />                           // show/hide toggle built in
<Input className="h-14 rounded-full" containerClassName="mb-4" />
```

Theme colors are semantic tokens (`bg-primary`, `text-muted-foreground`,
`bg-danger-soft`, …) defined for light and dark in `src/app/globals.css`.

## Alerts, history and money

- **Notifications** (`/notifications`, bell badge in the menu): every in-stock product that expires within **2 days**
  (today, tomorrow, the day after) or has already expired, grouped by urgency, with the cost value at risk. Computed
  live, so an alert disappears as soon as the stock is sold, removed or re-dated. The dashboard shows a red
  "Needs attention now" banner while anything is listed. Change the window with `ALERT_DAYS` in `src/lib/products/catalog.ts`.
- **Activity** (`/activity`): every stock change, by the admin or any employee: added, edited (with exactly what
  changed, e.g. `Quantity 12 → 8 · Expiry 21 Nov → 25 Nov`), removed (with a reason: sold, expired, damaged, returned,
  other) and expired stock cleared. Filter by store, person and action. Names are copied into each row, so history stays
  readable after people or products change.
- **Prices**: optional cost and selling price per unit on every product. Product lists show the stock value at cost, and
  Notifications/dashboard show the money at risk.

## Security

- **Forgot password** (`/forgot-password` → `/reset-password`): a 6-digit code is emailed (10 min, 5 attempts, 60 s resend
  cooldown). The same message is shown whether or not the email has an account. A successful reset signs out every device.
- **Sign-in lockout**: 5 wrong passwords within 15 minutes pause sign-in for that email for 15 minutes (stored in the
  database, shared with the Employee app). A successful sign-in or password reset clears it.
- When an employee changes their own password in the Employee app, the admin can no longer view it (use Edit to set a new one).

## HTTPS (camera scanning on phones)

Browsers only allow the camera on `https://` pages or `localhost`. For phones on your Wi-Fi:

```bash
npm run dev:https      # creates certs/ once (localhost + this PC's LAN IP), then https://<LAN-IP>:3000
```

Open `https://<LAN-IP>:3000` on the phone, accept the one-time "not private" warning (Advanced → Proceed), and the live
camera works. Run it **instead of** `npm run dev` (one dev server per app). If the PC's IP changes, run
`npm run cert:dev -- --force`. In production, serve the app behind a real HTTPS certificate (e.g. Vercel, or Nginx +
Let's Encrypt); cookies are already marked `Secure` there.

`APP_TIMEZONE` (default `Asia/Kolkata`) sets which calendar day counts as "today" for expiry, independent of the
server's clock.

## Landing page

`/` is the public SmartExpiry home page (`src/app/page.tsx`) with **Login as Admin** and **Login as Employee**.
Signed-in admins are sent straight to the dashboard. The employee buttons use `EMPLOYEE_APP_URL` (e.g.
`https://app.yourdomain.com`), which is read at build time, so set it before `npm run build`.

## AI assistant (Ask AI)

A floating **Ask SmartExpiry AI** bar on every page and a ChatGPT-style chat at `/assistant`.

- **Model:** Google Gemini (free tier) through `GEMINI_API_KEY`. `GEMINI_MODELS` lists models tried in order; when one hits
  its free limit or is retired, the next answers. Check current free models at https://ai.google.dev/gemini-api/docs/pricing.
- **Real data, safely:** the AI can only call read-only tools (`src/lib/assistant/tools.ts`): overview, stores, stock
  (filters: store, status, days, category, search, group by), employees and activity. Every query is limited to the
  signed-in admin; contact details and passwords are never sent to the AI.
- **History:** every chat and message is saved in `ai_conversations` / `ai_messages`. Each chat keeps its own context (the
  last 20 messages are sent with every question), so you can leave a chat and continue it later.
- **Off-topic questions** are politely declined.
- **Limits:** `AI_DAILY_LIMIT` (default 50) AI answers per admin per day. When Google's free limit is reached, a banner
  shows when it renews (per-minute limits: seconds; daily limits: midnight Pacific time).
- **Quick answers:** while the AI is unavailable (no key, limit reached, Google down), common questions (summary, expired,
  expiring, money at risk, employees, recent activity) are answered from live data without the AI
  (`src/lib/assistant/quick-answers.ts`).
