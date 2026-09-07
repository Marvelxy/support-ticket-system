# Support Ticket System

A friendly little helpdesk app with ticket tracking, team roles, and automatic AI triage. Built with React, Node.js, and TypeScript — great for learning, demos, and interviews.

**What it can do:**

- User accounts with three roles: customer, agent, and admin
- Create, search, filter, and comment on support tickets
- Automatic triage: every new ticket gets a category, priority, SLA deadline, and a suggested reply
- A review queue for tickets the AI isn't sure about
- A full audit log, so you can see everything that happened on a ticket
- A dashboard with support stats (agents and admins)

## Contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Log in and explore](#log-in-and-explore)
- [Command cheat sheet](#command-cheat-sheet)
- [Choosing an AI provider](#choosing-an-ai-provider)
- [A 5-minute demo tour](#a-5-minute-demo-tour)
- [Ideas for next steps](#ideas-for-next-steps)

## Tech stack

| Part     | Tools                                                          |
| -------- | -------------------------------------------------------------- |
| Backend  | Node 20, Express, TypeScript, Prisma, JWT auth, Zod validation |
| Database | SQLite for local dev, ready to swap to Postgres                |
| Frontend | React, Vite, TypeScript, React Router, TanStack Query          |
| AI       | Pluggable providers with automatic fallback (see below)        |

## Getting started

You'll need **Node.js 20+** and **npm**. Everything runs comfortably on modest hardware.

**1. Install all dependencies (from the repo root):**

```bash
npm run install:all
```

**2. Configure the backend:**

```bash
cp backend/.env.example backend/.env
```

**3. Set up the database with demo data:**

```bash
npm run setup
```

**4. Start both servers with one command:**

```bash
npm run dev
```

That's it! Open your browser to:

- **App:** http://localhost:5173
- **API:** http://localhost:4000

Press `Ctrl+C` to stop both servers at once.

### Log in and explore

Pick any of these demo accounts (all use the password `password123`):

| Role     | Email            | What you'll see                  |
| -------- | ---------------- | -------------------------------- |
| Admin    | admin@demo.io    | Everything, plus dashboard stats |
| Agent    | agent@demo.io    | All tickets, dashboard stats     |
| Customer | customer@demo.io | Only your own tickets            |

> Running into trouble? The two-terminal fallback is tucked away below in the command cheat sheet.

## Command cheat sheet

All of these run from the repo root:

| Command                | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Starts backend + frontend together                       |
| `npm run dev:backend`  | Starts just the API (port 4000)                          |
| `npm run dev:frontend` | Starts just the app (port 5173)                          |
| `npm run install:all`  | Installs dependencies for root + both projects           |
| `npm run setup`        | Generates the DB client, creates tables, seeds demo data |
| `npm run build`        | Builds both projects for production                      |
| `npm start`            | Runs both production builds                              |

<details>
<summary>Prefer two terminals? Click to expand the manual setup</summary>

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev # http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev # http://localhost:5173
```

</details>

## Choosing an AI provider

Out of the box, the app uses a built-in **rule-based** classifier — no API keys, no downloads, triage just works. When you're ready for smarter results, switch to a free provider in `backend/.env`:

| Provider         | Best for                 | What you need                         |
| ---------------- | ------------------------ | ------------------------------------- |
| `rule` (default) | Getting started, offline | Nothing — it just works               |
| `ollama`         | Private, no API key      | Ollama running locally with a model   |
| `groq`           | Smarter replies, hosted  | Free API key from console.groq.com    |
| `gemini`         | Smarter replies, hosted  | Free API key from aistudio.google.com |

To switch, update `backend/.env` and restart the backend:

```bash
# Local and private — first run:
ollama serve
ollama pull llama3.2:3b

# Then in backend/.env:
AI_PROVIDER=ollama
```

```bash
# Or hosted — pick one, in backend/.env:
AI_PROVIDER=groq
GROQ_API_KEY=your-key-here

# AI_PROVIDER=gemini
# GEMINI_API_KEY=your-key-here
```

If a provider errors out or gets rate-limited, the app quietly falls back to the rule-based classifier, so triage never breaks. The AI code lives in `backend/src/services/ai/` — one small interface per provider plus the fallback logic.

## A 5-minute demo tour

Perfect for interviews or showing a friend:

1. **Create a ticket** as the customer — watch it auto-triage with a category, priority, SLA deadline, and suggested reply. Check the audit log for the `ai:* classified` entries.
2. **Find the review queue** — tickets the AI scored below 0.7 confidence land in `needsReview` for a human to confirm.
3. **Re-run triage** from a ticket's detail page and point out the suggested reply plus which provider produced it.
4. **Switch roles** — log in as the customer to see only your own tickets, then as an agent to see everything plus `/api/dashboard/stats`.
5. **Show the code** — walk through `backend/src/services/ai/` and explain the provider interface and fallback pattern.

## Ideas for next steps

- Move to Postgres with Docker for production
- Queue triage jobs with BullMQ + Redis
- Add a live agent inbox with Socket.io
- Cover it with tests (Vitest + Supertest)
