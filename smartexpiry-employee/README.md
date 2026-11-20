# SmartExpiry Employee

The app store staff use to sign in and (soon) manage stock and expiry dates in the stores their admin assigned to them.
Next.js 16 + TypeScript + Tailwind v4 + Prisma 7 on the same PostgreSQL database as **SmartExpiry Admin**.

## Setup

```bash
cp .env.example .env        # same DATABASE_URL as the Admin app, NEW token secrets
npm install                 # also runs `prisma generate`
npm run dev                 # http://localhost:3001
```

The **Admin app owns the database schema and migrations**. After a schema change there:

```bash
cd ../smartexpiry-admin && npm run db:deploy
cp prisma/schema.prisma ../smartexpiry-employee/prisma/schema.prisma
cd ../smartexpiry-employee && npm run db:generate
```

## Sign-in (no registration)

- Admins create employees (email + password) in SmartExpiry Admin → **Employees**. There is no sign-up or email
  verification here.
- Login checks the password against the bcrypt hash the Admin app stored. Only **ACTIVE** employees can sign in.
- Wrong email and wrong password show the same message, so accounts can't be probed.
- The login page links back to the SmartExpiry home page and the admin login, using `SITE_URL` (the Admin app's
  public address, read at build time).

## Sessions

- **Access token** (JWT, 15 min) + **refresh token** (JWT, 7 days), both in httpOnly cookies
  `se_emp_access_token` / `se_emp_refresh_token`. The names differ from the Admin app's because browsers share cookies
  between `localhost:3000` and `localhost:3001`.
- The token secrets are separate from the Admin app's, so a token from one app is useless in the other.
- `src/proxy.ts` renews an expired access token with the refresh token on any request (no logout every 15 minutes).
  Refresh tokens rotate on use; only their SHA-256 hash is stored on the employee row.
- One session per employee: signing in elsewhere signs out the older device at its next refresh.
- The session ends when the employee logs out, or when the admin **changes their password** or **makes them inactive**.

## Theme

Indigo/blue palette (the Admin app is emerald), light / dark / system, set in `src/app/globals.css`. Saved per browser
under the `se-employee-theme` key.

## Features

- **Home**: totals for the employee's stores, a "Needs attention now" banner, and Scan / Add manually (choose one or
  more stores; inside a store page the store is fixed).
- **Stores → store → products**: same tabs, edit, remove (with a reason) and "Delete all expired" as the admin, limited
  to the stores the employee is assigned to (checked again on the server for every change).
- **Notifications** (bell badge): products in the employee's stores expiring within 2 days, or already expired.
- **My profile**: details from the admin, change own password (signs out other devices; the admin can no longer view the
  new password), and the employee's recent activity. Every change is recorded in the admin's Activity page with the
  employee's name and code.
- **Sign-in lockout**: 5 wrong passwords in 15 minutes pause sign-in for 15 minutes.

## HTTPS for the camera on phones

```bash
npm run dev:https      # https://<LAN-IP>:3001; accept the one-time certificate warning on the phone
```

Use it instead of `npm run dev`. Production must run behind a real HTTPS certificate.
