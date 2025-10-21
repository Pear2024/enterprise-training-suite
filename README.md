# Training System

Training System is an internal learning & compliance platform built with Next.js 15 and Prisma. Administrators and trainers can author training topics, attach learning assets and quizzes, assign them to employees, and track progress through dashboards and reports. Employees see the content they are assigned, complete required assets, and submit quizzes to earn certification.

---

## Table of Contents

1. [Key Features](#key-features)  
2. [Technology Stack](#technology-stack)  
3. [Prerequisites](#prerequisites)  
4. [Getting Started](#getting-started)  
5. [Database & Migrations](#database--migrations)  
6. [Seeding Utilities](#seeding-utilities)  
7. [Available Scripts](#available-scripts)  
8. [Testing](#testing)  
9. [Project Structure](#project-structure)  
10. [Core Workflows](#core-workflows)  
11. [Deployment](#deployment)  
12. [Troubleshooting](#troubleshooting)  

---

## Key Features

- **Training Topics & Assets** – Create, edit, retire topics and attach ordered training assets (video, image, PDF, link, HTML snippets). Mark assets as required, capture duration and visual metadata.
- **Quiz Builder** – Add questions per topic or per asset (single choice, multiple choice, true/false, free text) with choices, ordering, scoring and correctness flags.
- **Assignments & Progress** – Assign topics to employees, set due dates and status, and track completion across required assets and quizzes.
- **Role-Based Dashboards** – Dedicated experiences for ADMIN, TRAINER, EMPLOYEE roles (e.g., assignment overview for employees, tooling hubs for trainers/admins).
- **Reporting Overview** – `/reports` aggregates platform-wide metrics (total assignments, completion rates, overdue counts, recent completions) via a reusable reporting service.
- **Authentication & Authorization** – Cookie-based JWT sessions (`lib/auth.ts`), middleware-enforced role checks, secure admin endpoints.
- **Quiz Flow** – Employees start attempts, answer questions, receive auto-grading (70% passing), and trigger completion/certificate logic.

---

## Technology Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), TypeScript
- **Database**: [Prisma ORM](https://www.prisma.io/) with MySQL
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + PostCSS
- **Auth**: [`jose`](https://github.com/panva/jose) for JWT signing/verification
- **Testing**: [Vitest](https://vitest.dev/) + `undici` for HTTP integration tests
- **Tooling**: [pnpm](https://pnpm.io/) package manager, ESLint, TSX for scripts

---

## Prerequisites

- **Node.js** v20 or newer  
- **pnpm** v10 (matching `packageManager` entry)  
- **MySQL** database (local or hosted). SSL certificate support is included (see `prisma/aiven-ca.pem`).  
- Ability to run Prisma CLI and `tsx` (bundled in dev dependencies).

---

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment variables**  
   Copy `.env` and update the values:
   ```dotenv
   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE?sslaccept=strict&sslcert=./aiven-ca.pem"
   JWT_SECRET="replace-with-strong-random-string"
   ```
   Adjust SSL options or certificate path to match your database provider.

3. **Apply database schema (development)**
   ```bash
   pnpm prisma migrate dev
   ```
   For existing environments, prefer `pnpm prisma migrate deploy`.

4. **(Optional) Seed example data**
   ```bash
   pnpm db:seed
   # or targeted scripts such as:
   pnpm seed:safe-start
   pnpm seed:asset-questions
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```
   Visit [http://localhost:3000](http://localhost:3000). UI navigation adapts to the signed-in role.

---

## Database & Migrations

- Prisma schema lives in `prisma/schema.prisma`.  
- Official migrations reside in `prisma/migrations`. Two extra SQL migrations (`20251021171000_add_question_asset_relation`, `20251021172000_add_attempt_asset_column`) are provided for manual execution against shared databases without performing a destructive reset. Execute them with:
  ```bash
  pnpm prisma db execute --schema prisma/schema.prisma --file prisma/migrations/<migration-folder>/migration.sql
  ```
- Use `pnpm prisma generate` whenever the schema changes to refresh the Prisma Client.

---

## Seeding Utilities

| Script | Purpose |
| --- | --- |
| `pnpm db:seed` | Populate core sample data (users, topics, assignments) |
| `pnpm seed:safe-start` | Minimal seed for smoke testing flows |
| `pnpm seed:asset-questions` | Attach example quizzes/questions to assets |

All scripts run via `tsx` and assume an accessible database (respecting `.env`).

---

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run Next.js dev server |
| `pnpm build` / `pnpm start` | Build and serve production bundle |
| `pnpm lint` | ESLint across the repo |
| `pnpm typecheck` | TypeScript compilation check (`tsc --noEmit`) |
| `pnpm test` | Run Vitest suite (API integration included) |
| `pnpm test:ui` | Vitest watch mode for UI/unit tests |
| `pnpm test:api` | Start server, then execute API tests (`start-server-and-test`) |
| `pnpm prisma migrate dev` | Apply migrations locally (with history) |
| `pnpm prisma migrate deploy` | Apply existing migrations without generating new ones |
| `pnpm prisma db execute --file ...` | Execute custom SQL (used for manual patches) |
| `pnpm scaffold:routes` / `pnpm scaffold:stubs` | Utility scripts to generate route trees or stub files |

---

## Testing

- Primary suite: `pnpm test` (Vitest) – requires the app/API to be available; tests use `undici` to hit endpoints (`TEST_BASE_URL` defaults to `http://localhost:3000`).
- `pnpm test:api` automatically launches the app (`pnpm start`) and runs the tests once.
- `pnpm test:ui` keeps Vitest in watch mode for faster feedback on UI components or pure functions.

---

## Project Structure

```
app/
  (auth)/login/             – authentication screens
  (app)/                    – authenticated shell (dashboard, topics, assignments, reports, admin)
  lesson/                   – learner-facing asset consumption
  quiz/                     – quiz attempt flow (start, answer, submit, result)
components/                 – shared UI (AppShell, TopicForm, DeleteTopicButton, etc.)
lib/                        – shared services (auth helpers, Prisma client wrapper, validators, reporting)
prisma/                     – schema, migrations, seeds
scripts/                    – CLI utilities (scaffolding, seed helpers)
__tests__/                  – Vitest specs (API auth, RBAC, etc.)
types/                      – shared TypeScript definitions
```

---

## Core Workflows

- **Authentication & Session Management**  
  - JWT stored as HTTP-only cookie (`tsession`).  
  - `middleware.ts` enforces role-based access before reaching protected routes.

- **Topic & Asset Management**  
  - `/topics` (ADMIN/TRAINER) lists topics with edit/delete controls.  
  - `/topics/[id]/edit` handles metadata.  
  - `/topics/[id]/edit/assets` manages assets, including asset-level quiz questions.

- **Assignments & Monitoring**  
  - `/assignments` lets admins/trainers assign topics to users (bulk or single), set due dates, and change statuses.  
  - Dashboard for EMPLOYEE shows required assets, completion progress, and certificate links.

- **Quiz Lifecycle**  
  - `/quiz/start` validates prerequisites and ensures only one active attempt per user/topic/asset.  
  - `/quiz/[attemptId]` renders questions with client-side state management.  
  - `/quiz/[attemptId]/submit` grades server-side, records answers, updates completion records, and unlocks certificates.

- **Reporting**  
  - `/reports` calls `GET /api/reports/overview`, which aggregates metrics via `lib/reporting.ts` (counts by status, completion rates, overdue counts, recent completions, unique learners).

---

## Deployment

1. Set environment variables (`DATABASE_URL`, `JWT_SECRET`, any provider-specific configs).
2. Install dependencies and run database migrations:
   ```bash
   pnpm install
   pnpm prisma migrate deploy
   ```
3. Build and start:
   ```bash
   pnpm build
   pnpm start
   ```
4. Ensure reverse proxy / hosting environment forwards to port `3000` (or configure `PORT`).

---

## Troubleshooting

- **Prisma `EPERM ... query_engine-windows.dll.node` on Windows**  
  - Close all `node.exe`/Next.js processes (Task Manager), run PowerShell as Administrator, remove `.prisma/client` directory, and rerun `pnpm prisma generate`.

- **Schema drift warnings**  
  - The project includes manual SQL migrations (`20251021171000_add_question_asset_relation`, `20251021172000_add_attempt_asset_column`) to reconcile shared dev DBs. Execute them with `pnpm prisma db execute`.

- **Missing SSL certificate**  
  - Update the `sslcert` parameter in `DATABASE_URL` or remove it if not required by your provider.

- **Auth tests fail with `ECONNREFUSED`**  
  - Start the dev server (`pnpm dev`) before running `pnpm test`, or use `pnpm test:api` to auto-start.

---

Happy coding! 🚀
