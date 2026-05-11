# KnightArena Deployment Guide (Vercel + Railway)

This project is split into two runtimes in production:

1. **Vercel** for the Next.js web app (UI + API routes + auth pages)
2. **Railway** (or Render/Fly) for the persistent Socket.IO realtime server (`server.ts`)

A single Vercel deployment is not enough for this repo's custom realtime server architecture.

## 1) Prerequisites

- A GitHub repo with this project
- A hosted PostgreSQL database (Neon/Supabase/Vercel Postgres/etc.)
- A Vercel account
- A Railway account (or equivalent runtime host)

## 2) Database setup (PostgreSQL)

1. Create a PostgreSQL database
2. Copy its connection URL
3. Sync schema to DB:

```bash
npx prisma generate
npx prisma db push
```

## 3) Deploy Next.js app to Vercel

1. In Vercel, click **Add New Project**
2. Import your GitHub repository
3. Keep framework as **Next.js**
4. In **Build & Output Settings**:
   - Build Command: `npm run vercel-build`
   - Output: default Next.js

### Vercel environment variables

Set these in **Project Settings → Environment Variables**:

- `DATABASE_URL` = your PostgreSQL URL
- `NEXTAUTH_URL` = your Vercel domain, e.g. `https://your-app.vercel.app`
- `NEXTAUTH_SECRET` = a long random secret
- `NEXT_PUBLIC_SOCKET_URL` = your Railway realtime URL, e.g. `https://knightarena-realtime.up.railway.app`

## 4) Deploy realtime server to Railway

Create a new Railway service from the same GitHub repo.

### Railway start command

Use:

```bash
npm run start:server
```

### Railway environment variables

- `NODE_ENV=production`
- `PORT` (Railway usually injects this automatically)
- `CLIENT_URL=https://your-app.vercel.app`
- `NEXTAUTH_URL=https://your-app.vercel.app`
- `NEXTAUTH_SECRET=<same secret as Vercel>`
- `DATABASE_URL=<same PostgreSQL URL>`

## 5) Redeploy both services

After all env vars are set:

1. Trigger/redeploy Railway service
2. Trigger/redeploy Vercel project

## 6) Verify production

1. Sign up two users
2. Open quick match from two browsers
3. Confirm both join same game board and moves sync
4. Test friend challenge accept flow
5. Export PGN from online game and import into `/analysis`

## 7) Common issues

### Matchmaking stuck forever

- `NEXT_PUBLIC_SOCKET_URL` missing or wrong in Vercel
- `CLIENT_URL` missing/wrong in Railway CORS config
- Railway server not running or crashed

### NextAuth callback issues

- `NEXTAUTH_URL` mismatch between Vercel and Railway
- `NEXTAUTH_SECRET` mismatch between Vercel and Railway

### Prisma runtime errors

- `DATABASE_URL` invalid
- Migrations not applied (`npx prisma migrate deploy`)

## 8) Optional production hardening

- Add Redis-backed matchmaking/presence
- Add health check endpoint for realtime server
- Add rate limiting around auth + challenge routes
