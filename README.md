# KnightArena

KnightArena is a modern chess platform built with Next.js, Prisma, NextAuth, and Socket.IO.
It supports AI play, online real-time multiplayer, friend challenges, and PGN/FEN analysis.

## Features

- Play vs AI with `easy`, `medium`, and `hard` difficulty modes
- Online quick matchmaking with live board sync
- Private invites and friend challenges
- User accounts (sign up / sign in)
- Analysis board with:
  - FEN import
  - PGN import (paste or `.pgn` file)
  - PGN export
  - Move navigation (first/prev/next/last)
- Time controls and game clocks
- Multiple board themes

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite
- NextAuth (credentials auth)
- Socket.IO (real-time gameplay)
- chess.js (chess rules and move generation)

## Project Structure

- `app/` — pages, components, API routes
- `app/lib/` — game logic, AI, socket client, auth, prisma client
- `app/components/` — board/UI components
- `app/online/` — online multiplayer pages
- `app/analysis/` — analysis board page
- `prisma/schema.prisma` — database schema
- `server.ts` — custom Next + Socket.IO server

## Prerequisites

- Node.js 20+
- npm 10+

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Install

```bash
npm install
```

## Database Setup

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## Run the App

### Important

For online multiplayer, use the custom server:

```bash
npm run dev:server
```

If you run only `npm run dev`, Socket.IO multiplayer will not behave correctly.

Open: `http://localhost:3000`

## Scripts

- `npm run dev` — Next.js dev server only
- `npm run dev:server` — custom server (`server.ts`) with Socket.IO + Next
- `npm run build` — production build
- `npm run start` — start production build
- `npm run start:server` — production custom server with tsx loader
- `npm run lint` — lint project
- `npm run db:push` — Prisma schema push
- `npm run db:studio` — open Prisma Studio

## Online Matchmaking Notes

- Two players must be signed in with different accounts.
- Quick match pairs by:
  - same time control
  - rating window that expands over wait time
- Friend challenge works through `/friends`.

## PGN Analysis Workflow

1. Export PGN from a finished/ongoing game
2. Open `/analysis`
3. Import PGN via paste or `.pgn` upload
4. Review moves and positions
5. Export updated PGN if needed

## Troubleshooting

### Stuck on "Finding opponent..."

- Ensure both users selected the same time control
- Ensure two different accounts are used
- Ensure app is running with `npm run dev:server`

### Auth warning about NEXTAUTH_URL

Set `NEXTAUTH_URL` in `.env` to your active host (usually `http://localhost:3000`).

### Prisma import/module issues in IDE

Run:

```bash
npx prisma generate
```

Then restart TypeScript server/IDE if needed.

## Future Improvements

- Persistent active-game state using Redis
- Distributed socket scaling
- Game history page (`My Games`)
- Engine analysis lines (depth/eval)

---

Built as a full-featured chess demo with production-style architecture.
