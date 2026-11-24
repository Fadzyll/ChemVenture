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
- ✅ Phase 3: 2D board with the real board art, tokens walking square by square, all 8 square types,
  question cards (Asas / Ion / Kovalen), DRUM (everyone answers, or a reward/penalty card),
  RADIKAL / GANGGUAN choices, coins with change, elimination, 20-minute timer, results + play again,
  room server uses Durable Object **hibernation** + alarms (no free-tier time used while idle)
- ✅ Phase 4: the 5 character powers, 2 uses each — Oxyra (+1 duplet), Ghoston (take 2 singlets),
  Quark (see 3 ION/KOVALEN cards and choose), Mystra (challenge another player to answer),
  Calco (block a correct ION/KOVALEN answer's reward, 8-second window)
- ✅ Phase 5: 3D board (React Three Fiber): board art on a 3D slab, character standees that hop
  square by square, a 3D dice that tumbles and lands on the server's roll, floating +/− coin
  popups, cards that flip in, drag-to-rotate / scroll-to-zoom; automatic 2D fallback and a 2D/3D toggle
- ⏳ Phase 6: polish (sound, more playtesting)

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

**From the dashboard (recommended):** Workers & Pages → Create → Import a repository →
`Fadzyll/ChemVenture`, project name `chemventure-server`, build command empty, deploy command
`npx wrangler deploy` (the default). The root `wrangler.jsonc` points at `server/index.ts`.

**Or from your computer:**

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

All numbers live in `shared/config.ts`; questions live in `server/cards.ts`.

- Coins: singlet = 1, duplet = 2, oktet = 8 points. Start: 3 singlet + 2 duplet + 1 oktet (15 points).
- ASAS correct: +1 singlet. ION / KOVALEN correct: +1 duplet. Wrong or time out (30 s): −1 singlet.
- DRUM: 9 "everyone answers" questions (+1 duplet each correct player) and 7 reward/penalty cards.
- Passing or landing on REAKSI: +1 duplet. RADIKAL / GANGGUAN cost: 1 singlet + 1 duplet.
- The manual's KOVALEN cards are blank, so the 10 Kovalen questions are new — please review.
- Lobby asks for name only; characters are chosen after the turn-order dice roll, highest first (manual rule 1).
