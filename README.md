# ChemVenture: The Siege of Bonds — online

Multiplayer (2–5 players) web version of the ChemVenture chemistry board game.

| Part | Folder | Hosted on |
|---|---|---|
| Website (landing, lobby, game UI) | `app/`, `components/`, `lib/` | **Vercel** (Next.js) |
| Realtime room server (1 per room code) | `server/` | **Cloudflare Workers + Durable Objects** (`partyserver`) |
| Game rules shared by both | `shared/` | – |

The server is the single source of truth: it rolls dice and applies rules. Browsers only send
intents (`roll`, `pickCharacter`, …) and render the state they receive.

## Status

- ✅ Phase 1: project setup, Cloudflare room server, Vercel-ready Next.js app
- ✅ Phase 2: create/join by 5-letter code, name entry, ready, host-only start, kick, leave,
  refresh/reconnect keeps your seat, host hand-over, **dice roll for turn order**
  (ties re-roll and add, manual rule 1), **character pick in turn order**
- ⏳ Phase 3: board movement, squares, questions, coins, timer
- ⏳ Phase 4: character powers · Phase 5: 3D (React Three Fiber) · Phase 6: polish

## Run locally

```bash
npm install
npm run dev:server   # room server on http://localhost:8787
npm run dev          # website on http://localhost:3000
```

Open several browser **tabs** to play as several players (each tab is its own player).

```bash
npm test             # rules unit tests
npm run typecheck
```

## Deploy

### 1. Room server → Cloudflare (free plan is enough)

```bash
npx wrangler login
npm run deploy:server
```

It prints a URL like `https://chemventure-server.<your-subdomain>.workers.dev`.

### 2. Website → Vercel

1. Import this GitHub repo in Vercel (framework: Next.js, defaults are fine).
2. Add the environment variable
   `NEXT_PUBLIC_GAME_SERVER_HOST = chemventure-server.<your-subdomain>.workers.dev` (no `https://`).
3. Deploy.

## Rules assumptions (to confirm)

- Coins: singlet = 1, duplet = 2, oktet = 8 points.
- Lobby asks for name only; characters are chosen after the turn-order dice roll, highest first (manual rule 1).
