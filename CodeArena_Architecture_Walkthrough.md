# 🏟️ CodeArena — Full Architecture Walkthrough

> A complete reference document for the team covering every layer of the platform: what it is, how it works, how to set it up from scratch, and how to collaborate safely on GitHub.

---

## Table of Contents

1. [What is CodeArena?](#1-what-is-codearena)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend Deep Dive](#5-backend-deep-dive)
   - [Entry Point — server.js](#51-entry-point--serverjs)
   - [Database — MongoDB + Mongoose](#52-database--mongodb--mongoose)
   - [Cache & Queue — Redis + BullMQ](#53-cache--queue--redis--bullmq)
   - [Code Execution Engine](#54-code-execution-engine)
   - [Distributed Judge Worker](#55-distributed-judge-worker)
   - [Authentication — JWT](#56-authentication--jwt)
   - [REST API Routes](#57-rest-api-routes)
   - [Real-Time Engine — Socket.IO](#58-real-time-engine--socketio)
   - [Email — Nodemailer](#59-email--nodemailer)
   - [Database Models (Schemas)](#510-database-models-schemas)
   - [Seeder — Seed Data](#511-seeder--seed-data)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
   - [React SPA Navigation Model](#61-react-spa-navigation-model)
   - [Auth Context](#62-auth-context)
   - [Socket Context](#63-socket-context)
   - [Pages & Components Map](#64-pages--components-map)
7. [Data Flow Walkthrough — From Code Submit to Verdict](#7-data-flow-walkthrough--from-code-submit-to-verdict)
8. [Real-Time Anti-Cheat Proctoring System](#8-real-time-anti-cheat-proctoring-system)
9. [Contest System Flow](#9-contest-system-flow)
10. [Docker Setup (Production / Team Server)](#10-docker-setup-production--team-server)
11. [Environment Variables (.env) Reference](#11-environment-variables-env-reference)
12. [Setting Up the Project From Scratch on a New Laptop](#12-setting-up-the-project-from-scratch-on-a-new-laptop)
13. [GitHub Collaboration Guide — Branches, PRs, and Safe Pushing](#13-github-collaboration-guide--branches-prs-and-safe-pushing)

---

## 1. What is CodeArena?

**CodeArena** is a full-stack, self-hosted competitive programming and coding assessment platform — similar to LeetCode or HackerRank, but built specifically to host live coding contests with real-time proctoring.

**Key capabilities:**
- Students register, practice coding problems, and participate in timed contests
- Admins create problems with test cases, host contests, and monitor students live in real time
- Code is executed on the server in multiple languages (Python, JavaScript, C++, Java, C)
- Anti-cheat system detects tab switches and can auto-disqualify students
- Live leaderboard updates via WebSocket during contests
- Scalable to 100+ concurrent users using a distributed job queue

---

## 2. High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                    │
│  Vite + React 19 │ Monaco Editor │ Socket.IO Client        │
└────────────────┬─────────────────────────┬─────────────────┘
                 │  HTTP REST API           │  WebSocket
                 ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                  NODE.JS BACKEND (Express)                  │
│  PORT 5000                                                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐  │
│  │ REST API │  │Socket.IO │  │ Judge Svc  │  │ BullMQ  │  │
│  │ Routes   │  │ Gateway  │  │ (Local Exe)│  │  Queue  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └────┬────┘  │
│       │             │              │               │        │
└───────┼─────────────┼──────────────┼───────────────┼────────┘
        │             │              │               │
        ▼             ▼              │               ▼
┌──────────────┐  ┌──────────────┐  │    ┌─────────────────────┐
│   MongoDB    │  │    Redis     │◄─┘    │  Judge Worker Pool  │
│  (Database)  │  │(Queue/PubSub)│       │  (judgeWorker.js)   │
│  Port 27017  │  │  Port 6379   │       │  Runs Code Locally  │
└──────────────┘  └──────────────┘       └─────────────────────┘
```

**What each block does:**
- **Browser**: React app — all UI, Monaco editor, WebSocket listener
- **Express API**: Handles all HTTP requests, auth checks, business logic
- **Socket.IO Gateway**: Handles real-time events (contest timer, leaderboard, proctoring)
- **Judge Service**: Executes user code locally (Python pool, JS sandbox, C++/Java compiler)
- **BullMQ Queue**: Distributes code jobs to worker processes via Redis
- **MongoDB**: Stores users, questions, submissions, contests
- **Redis**: Job queue bus + Socket.IO multi-server adapter

---

## 3. Project Folder Structure

```
MY PLATFORM/
├── backend/
│   ├── src/
│   │   ├── server.js              ← Entry point, Express app
│   │   ├── config/
│   │   │   ├── db.js              ← MongoDB connection + seeder logic
│   │   │   └── redis.js           ← Redis connection + graceful fallback
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── questionRoutes.js
│   │   │   ├── submissionRoutes.js
│   │   │   ├── contestRoutes.js
│   │   │   ├── leaderboardRoutes.js
│   │   │   ├── contactRoutes.js
│   │   │   └── settingRoutes.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── questionController.js
│   │   │   ├── submissionController.js
│   │   │   ├── contestController.js
│   │   │   ├── leaderboardController.js
│   │   │   └── contactController.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Question.js
│   │   │   ├── Submission.js
│   │   │   ├── Contest.js
│   │   │   ├── ContestSession.js
│   │   │   └── SystemSetting.js
│   │   ├── middleware/
│   │   │   └── auth.js            ← JWT auth + admin guard
│   │   ├── services/
│   │   │   ├── judge0Service.js   ← Code execution engine
│   │   │   ├── socketService.js   ← Socket.IO event gateway
│   │   │   └── py_worker.py       ← Python worker subprocess
│   │   ├── queues/
│   │   │   └── submissionQueue.js ← BullMQ queue manager
│   │   └── workers/
│   │       └── judgeWorker.js     ← BullMQ worker process
│   ├── data/
│   │   └── local_users.json       ← Local user backup (fallback)
│   ├── seed/
│   │   └── seed.js                ← Seeds DB with admin + questions
│   ├── .env                       ← Secret config (NOT in Git)
│   ├── package.json
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx               ← React entry point
│   │   ├── App.jsx                ← Top-level router (tab-based SPA)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    ← Auth state + login/logout
│   │   │   └── SocketContext.jsx  ← WebSocket client + helpers
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── ProblemList.jsx
│   │   │   ├── ProblemArena.jsx   ← Code editor + test runner
│   │   │   ├── ContestList.jsx
│   │   │   ├── ContestMode.jsx    ← Timed contest + anti-cheat
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminContestManagement.jsx
│   │   │   ├── AdminContestAnalytics.jsx
│   │   │   ├── CreateProblemPage.jsx
│   │   │   ├── HostContestPage.jsx
│   │   │   └── Leaderboard.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── admin/             ← Admin-specific components
│   │   │   ├── student/           ← Student-specific components
│   │   │   └── common/            ← Shared components
│   │   └── services/
│   │       └── api.js             ← Axios base config
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── load-tests/
    ├── smoke_test.js              ← k6 quick smoke test
    └── load_test_100_users.js     ← k6 load test for 100 users
```

---

## 4. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite | Fast modern SPA |
| Code Editor | Monaco Editor (`@monaco-editor/react`) | VS Code-grade editor in browser |
| Icons | Lucide React | Clean icon library |
| HTTP Client | Axios | REST API calls from frontend |
| Real-Time | Socket.IO (client + server) | Live contest events |
| Backend | Node.js + Express | API server |
| Auth | JWT (jsonwebtoken) | Stateless token auth |
| Database | MongoDB + Mongoose | Flexible document storage |
| Cache / Queue | Redis + ioredis | Job queue + Socket.IO scaling |
| Job Queue | BullMQ | Distributed code execution jobs |
| Code Execution | Local sandbox + subprocess | Runs Python, JS, C++, Java |
| Password Hashing | bcryptjs | Secure password storage |
| Email | Nodemailer | Contact form emails |
| Load Testing | k6 | Stress testing 100+ users |
| Containerization | Docker + Docker Compose | One-command production deploy |

---

## 5. Backend Deep Dive

### 5.1 Entry Point — `server.js`

**File:** `backend/src/server.js`

This is where everything starts. When you run `node src/server.js`:

1. Loads environment variables from `.env` via `dotenv`
2. Sets `UV_THREADPOOL_SIZE=64` — increases Node's async I/O thread pool for heavy concurrent execution
3. Creates the Express app with CORS allowed for all origins
4. Registers global crash guards (`uncaughtException`, `unhandledRejection`) so the server never dies silently
5. Mounts all route handlers under `/api/*`
6. Calls `startServer()` which:
   - Initializes Redis
   - Connects to MongoDB
   - Runs the seeder (creates default admin + questions if DB is empty)
   - Creates HTTP server, attaches Socket.IO
   - Starts listening on `PORT 5000`

**Key config:**
```
HOST = 0.0.0.0     (accessible on LAN, not just localhost)
PORT = 5000
keepAliveTimeout = 65s
headersTimeout = 66s
server timeout = 120s
```

**Healthcheck endpoints:**
- `GET /api/health` → basic ping
- `GET /api/health/cluster` → shows Redis status, DB status, queue stats

---

### 5.2 Database — MongoDB + Mongoose

**File:** `backend/src/config/db.js`

- Connects to MongoDB using `MONGODB_URI` from `.env`
- Default URI: `mongodb://localhost:27017/codearena`
- Contains `connectDB()` and `seedData()` functions
- `seedData()` seeds the DB with **20 curated coding questions** (Two Sum, Fibonacci, Valid Parentheses, etc.) and a default admin account on first run
- The seeder checks if data already exists before inserting, so it's safe to call on every startup
- Also maintains a `local_users.json` file in `backend/data/` as a lightweight backup of users (fallback if DB is down)

**Default seeded admin credentials:**
```
Email: tabraizsmd@gmail.com
Password: Shamstabraiz@7931
```

> [!IMPORTANT]
> Change these credentials immediately after first deployment.

---

### 5.3 Cache & Queue — Redis + BullMQ

**File:** `backend/src/config/redis.js`

Redis serves two purposes in this platform:

**Purpose 1: Job Queue Bus (BullMQ)**
- All code submission jobs are pushed into a Redis-backed BullMQ queue named `code-arena-submissions`
- Distributed worker processes (`judgeWorker.js`) pick up jobs from this queue

**Purpose 2: Socket.IO Adapter**
- When multiple backend server instances run (horizontal scaling), Redis pub/sub keeps all Socket.IO rooms in sync

**Graceful Fallback:**
The Redis connection has a **built-in fallback**. If Redis is not running:
- After 5 retries, it silently switches to **in-memory mode**
- Code execution still works (direct local execution instead of queue)
- Socket.IO works (single-instance mode, no multi-server sync)
- This means the platform works even WITHOUT Redis for basic single-server development

**Config:**
```
REDIS_HOST = 127.0.0.1
REDIS_PORT = 6379
REDIS_PASSWORD = (optional)
```

---

### 5.4 Code Execution Engine

**File:** `backend/src/services/judge0Service.js`

This is the heart of the platform. It can run code in two modes:

**Mode 1: Judge0 Cloud API**
- If `RAPIDAPI_KEY` is set in `.env`, the engine calls the [Judge0 API on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) to execute code in the cloud
- Safer and more isolated, costs API credits

**Mode 2: Local Execution Engine (default, free)**
- Falls back to running code directly on the host machine
- Each language has its own handler:

| Language | Execution Method |
|---|---|
| **JavaScript** | Node.js `vm` module — runs in a sandboxed context with a fake `fs.readFileSync` for stdin |
| **Python** | `PythonWorkerPool` — spawns a pool of persistent `python` subprocess workers (`py_worker.py`), dispatches jobs via JSON over stdin/stdout |
| **C++** | Compiles with `g++ -std=c++17`, caches the binary, runs the compiled `.exe` |
| **C** | Compiles with `gcc -std=c11`, caches binary, runs |
| **Java** | Compiles with `javac`, caches `.class` files, runs with `java -Xmx128m` |

**Performance Features:**
- **Compilation Cache** (`buildCache` Map): C/C++/Java code is compiled once and cached for 2 minutes. Batch test cases (e.g., 5 test cases) only compile once, then execute 5× instantly
- **Singleflight Coalescing** (`inFlightExecutions`): If 10 users submit the exact same code simultaneously, only 1 execution runs and the result is shared
- **Execution Result Cache** (`executionResultCache`): Identical `(language, code, stdin)` results are cached for 30 seconds
- **Concurrency Semaphore** (`ExecutionQueue`): Max 100 concurrent local executions at once, extras are queued in memory

**Python Worker Pool:**
The platform spawns N Python processes on startup (N = `max(8, cpuCount × 2)`). Each Python worker is a long-running process that:
1. Reads a JSON task from stdin (`{id, code, stdin}`)
2. Executes it using `exec()` with a 3.5s timeout
3. Writes a JSON result to stdout

This avoids Python startup overhead on every submission.

**Output Normalization:**
All code output is normalized — Windows `\r\n` → `\n`, trailing whitespace stripped — before comparing against expected output.

---

### 5.5 Distributed Judge Worker

**File:** `backend/src/workers/judgeWorker.js`

This is a **separate process** (not part of the API server). Run with:
```bash
node src/workers/judgeWorker.js
```

- Connects to Redis and listens on the `code-arena-submissions` BullMQ queue
- Picks up jobs, calls `executeLocally()`, and returns the result
- Configurable concurrency: default 10 parallel executions per worker instance
- Rate limit: 100 evaluations per second per worker
- You can run **multiple worker instances** in parallel for horizontal scaling

In Docker, 2 worker replicas are started by default:
```yaml
judge-worker:
  command: ["node", "src/workers/judgeWorker.js"]
  deploy:
    replicas: 2
```

Scale to more workers: `docker compose up --scale judge-worker=4`

---

### 5.6 Authentication — JWT

**File:** `backend/src/middleware/auth.js`

The platform uses **JWT (JSON Web Tokens)** for stateless authentication.

**Login flow:**
1. User sends `POST /api/auth/login` with `{email, password}`
2. Backend verifies password with `bcryptjs.compare()`
3. Signs a JWT with `{ userId, email, role, name }` payload using `JWT_SECRET`
4. Returns token to frontend
5. Frontend stores token in `sessionStorage` (cleared on tab close)
6. Every subsequent API request sends `Authorization: Bearer <token>` header

**Middleware:**
- `authMiddleware` — verifies JWT, attaches `req.user` with decoded payload, rejects 401 if invalid/missing
- `adminOnlyMiddleware` — additionally checks `req.user.role === 'admin'`, rejects 403 if not admin
- `optionalAuthMiddleware` — tries to verify JWT but doesn't block the request if absent

**Roles:**
- `student` — can browse problems, submit code, join contests
- `admin` — all student permissions + create/edit problems, host contests, view all submissions, manage users

> [!WARNING]
> The default `JWT_SECRET` is hardcoded as `codearena_super_secret_jwt_key_2026`. **Always override this in `.env` before deploying.**

---

### 5.7 REST API Routes

All routes are mounted under `/api/`. Every route that modifies data requires a JWT token.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, get JWT token |
| GET | `/api/auth/me` | Student | Get current user profile |
| GET | `/api/questions` | Public | List all questions |
| GET | `/api/questions/:slug` | Public | Get single question |
| POST | `/api/questions` | Admin | Create question |
| PUT | `/api/questions/:id` | Admin | Update question |
| DELETE | `/api/questions/:id` | Admin | Delete question |
| POST | `/api/submissions/run` | Student | Run code (test, no save) |
| POST | `/api/submissions/submit` | Student | Submit code (saves result) |
| GET | `/api/submissions` | Student | Get user's submissions |
| GET | `/api/submissions/:id` | Student | Get single submission |
| DELETE | `/api/submissions/all` | Admin | Delete all submissions |
| GET | `/api/leaderboard` | Public | Get leaderboard |
| GET | `/api/contests` | Public | List contests |
| POST | `/api/contests` | Admin | Create contest |
| PUT | `/api/contests/:id` | Admin | Update contest |
| DELETE | `/api/contests/:id` | Admin | Delete contest |
| POST | `/api/contact` | Public | Submit contact form |
| GET | `/api/settings` | Admin | Get system settings |
| PUT | `/api/settings` | Admin | Update system settings |
| GET | `/api/execute` | Student | (alias for run) |

---

### 5.8 Real-Time Engine — Socket.IO

**File:** `backend/src/services/socketService.js`

Socket.IO is initialized on the same HTTP server as Express. It handles all real-time bidirectional communication.

**Socket Rooms:**
- `contest_{contestId}` — all participants of a specific contest
- `user_{userId}` — private channel per user (for disqualification notices)
- `admin_proctoring` — admin's live monitoring room

**Events emitted by server → client:**

| Event | Room | Triggered By | Description |
|---|---|---|---|
| `leaderboard:update` | `contest_{id}` | Code submit | Live score update |
| `leaderboard:global_update` | All | Code submit | Global board refresh |
| `contest:timer_sync` | `contest_{id}` | Admin | Timer adjustment |
| `contest:force_submit` | `contest_{id}` | Admin / timer end | Force all to submit |
| `contest:ended` | All | Admin | Contest ended broadcast |
| `proctoring:student_joined` | `admin_proctoring` | Student connects | Student appeared |
| `proctoring:violation` | `admin_proctoring` | Tab blur | Anti-cheat alert |
| `proctoring:student_disqualified` | `admin_proctoring` | Blur limit / Admin | DQ notification |
| `user:disqualified` | `user_{id}` | Admin | Student kicked from contest |
| `user:qualified` | `user_{id}` | Admin | Student reinstated |

**Events emitted by client → server:**

| Event | Sent By | Description |
|---|---|---|
| `join_contest` | Student | Join contest room |
| `join_admin_proctoring` | Admin | Subscribe to live proctor feed |
| `student:blur_event` | Student | Tab switch detected |
| `admin:timer_sync` | Admin | Push timer change to all |
| `admin:end_contest` | Admin | Force-end contest |
| `admin:disqualify_student` | Admin | Manually kick student |
| `admin:qualify_student` | Admin | Reinstate student |

**Redis Adapter:** When Redis is available, Socket.IO uses the Redis adapter so events work correctly even when running multiple server processes.

---

### 5.9 Email — Nodemailer

**File:** `backend/src/utils/mailer.js`

Used for the **Contact Us** form. When a user submits a contact request (`POST /api/contact`):
- If SMTP credentials are set in `.env`, sends a formatted HTML email to `CONTACT_RECIPIENT_EMAIL`
- If SMTP not configured, logs the submission to the console and returns success (graceful no-op)

**Required `.env` variables for email:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
CONTACT_RECIPIENT_EMAIL=admin@yourdomain.com
```

---

### 5.10 Database Models (Schemas)

**User** (`models/User.js`):
```
name, teamName, email (unique), password (hashed),
role (student|admin), score, solvedCount, createdAt
```

**Question** (`models/Question.js`):
```
title, slug (unique URL key), description, inputFormat, outputFormat,
constraints, difficulty (Easy|Medium|Hard), category, timeLimit, memoryLimit,
points, tags[], testCases[{input, expectedOutput, isHidden, marks}],
starterCode{python, cpp, javascript}, isPublic, submissionsCount, acceptedCount
```

**Submission** (`models/Submission.js`):
```
user (ref), userName, question (ref), questionTitle,
language, code, verdict (Accepted|Wrong Answer|TLE|Compile Error|Runtime Error|Pending),
score, testCasesPassed, totalTestCases, executionTime, memoryUsed,
details[{testCaseIndex, isHidden, status, input, expectedOutput, actualOutput}],
antiCheatLogs[], contest (ref), blurCount, createdAt
```

**Contest** (`models/Contest.js`):
```
title, slug, description, startTime, duration (minutes), endTime,
status (Upcoming|Active|Ended), problems[] (ref Question),
registeredStudents[] (ref User), antiCheatEnabled, maxAllowedBlurs,
autoDisqualify, createdBy (ref User), createdAt
```

**ContestSession** (`models/ContestSession.js`):
Per-participant contest state (score progress, blur count, disqualification status)

**SystemSetting** (`models/SystemSetting.js`):
Admin-configurable platform settings (maintenance mode, registration toggle, etc.)

---

### 5.11 Seeder — Seed Data

**File:** `backend/src/config/db.js` (seed logic embedded)

Automatically runs on every server start. If the DB has no questions:
- Inserts **20 questions** across difficulties: Two Sum, Fibonacci, Binary Search, DP problems, Graph problems, etc.
- Each question includes starter code for Python, C++, and JavaScript
- Creates the default admin account if it doesn't exist

This means a fresh DB is fully functional immediately after first run.

---

## 6. Frontend Deep Dive

### 6.1 React SPA Navigation Model

**File:** `frontend/src/App.jsx`

The frontend is a **Single Page Application** with **no URL router** (no React Router). Instead, navigation is controlled by a `currentTab` state variable using `sessionStorage` for persistence across page refreshes.

**Tab values and what they render:**

| `currentTab` | Component | Who can see it |
|---|---|---|
| `landing` | `LandingPage` | Everyone |
| `auth` | `AuthPage` | Unauthenticated |
| `problems` | `ProblemList` | Authenticated |
| `arena` | `ProblemArena` | Authenticated |
| `contests` | `ContestList` | Authenticated |
| `contest` | `ContestMode` | Authenticated student |
| `leaderboard` | `Leaderboard` | Authenticated |
| `dashboard` | `StudentDashboard` or `AdminDashboard` | Authenticated |
| `admin` | `AdminDashboard` | Admin only |
| `create-problem` | `CreateProblemPage` | Admin only |
| `host-contest` | `HostContestPage` | Admin only |
| `admin-analytics` | `AdminContestManagement` | Admin only |

**Layout switching:**
- When in "workspace mode" (problem solving, contest, admin area) → full screen layout, no sidebar/navbar
- Otherwise → shows sidebar navbar + header bar with user avatar

**Session behavior:**
- JWT token and user object are stored in `sessionStorage` (not `localStorage`)
- On fresh tab open (not reload): session is cleared, user must log in again
- On page reload: session is restored from `sessionStorage`
- On server restart detected via WebSocket: session is auto-cleared

---

### 6.2 Auth Context

**File:** `frontend/src/context/AuthContext.jsx`

Global React context providing auth state to the entire app.

**Exposed values:**
- `user` — current logged-in user object `{_id, name, email, role, teamName, score}`
- `token` — JWT token string
- `loading` — boolean for loading states
- `login(email, password)` — calls `/api/auth/login`, stores token
- `register(name, teamName, email, password, role)` — calls `/api/auth/register`
- `logout()` — clears all storage, resets state
- `loginAsAdmin()` — quick dev helper (hardcoded credentials)
- `loginAsStudent()` — quick dev helper
- `refreshUser()` — re-fetches user profile from `/api/auth/me`

---

### 6.3 Socket Context

**File:** `frontend/src/context/SocketContext.jsx`

Wraps the Socket.IO client connection and provides helper functions.

**Connection URL detection logic:**
1. Uses `VITE_API_URL` env variable if set
2. Falls back to `http://{window.location.hostname}:5000`
3. This means if your backend runs on a different machine, just set `VITE_API_URL`

**Exposed functions:**
- `socket` — raw Socket.IO instance
- `isConnected` — boolean connection state
- `joinContest(contestId, userData)` — join a contest room
- `joinAdminProctoring()` — admin subscribes to proctoring feed
- `emitBlurEvent(payload)` — student reports tab switch
- `emitDisqualify(payload)` — admin kicks a student
- `emitQualify(payload)` — admin reinstates a student
- `emitTimerSync(payload)` — admin adjusts timer
- `emitEndContest(payload)` — admin force-ends contest

**Auto-reconnect:** 20 attempts with 1s delay between each. On reconnect, automatically re-joins the last contest room.

**Server restart detection:** When backend restarts with a new instance ID (sent via `server:instance` Socket event), the frontend automatically logs out and returns to landing.

---

### 6.4 Pages & Components Map

**Student-facing pages:**
- `LandingPage` — hero, features, about, contact form
- `AuthPage` — login/register toggle
- `ProblemList` — filterable problem grid
- `ProblemArena` — Monaco editor + problem description + run/submit panel + submission history
- `ContestList` — list active/upcoming contests
- `ContestMode` — timed problem-solving with anti-cheat timer
- `StudentDashboard` — stats, recent submissions, progress
- `Leaderboard` — global score rankings

**Admin-facing pages:**
- `AdminDashboard` — overview stats, user management, problem list, contest list
- `CreateProblemPage` — form to create/edit problems with test cases
- `HostContestPage` — form to create/edit contests
- `AdminContestManagement` — live contest view: participants, leaderboard, proctoring feed
- `AdminContestAnalytics` — post-contest analytics

**Admin modal components:**
- `ProblemEditorModal` — inline problem edit
- `SubmissionInspectorModal` — view any student's code + verdict
- `ParticipantDetailsModal` — view participant details
- `ConfirmActionModal` — dangerous action confirmation

**Student modal components:**
- `SubmissionDetailModal` — view past submission result
- `ResetCodeModal` — confirm resetting editor to starter code

---

## 7. Data Flow Walkthrough — From Code Submit to Verdict

Here is the exact step-by-step flow when a student clicks **"Submit"** in the code editor:

```
1. Student writes code in Monaco Editor (ProblemArena.jsx / ContestMode.jsx)

2. Frontend calls:
   POST /api/submissions/submit
   Headers: { Authorization: Bearer <token> }
   Body: { language, code, questionSlug, contestId? }

3. Backend authMiddleware verifies JWT → extracts req.user

4. submissionController creates a Submission document in MongoDB
   with verdict = "Pending"

5. For each test case in the question:
   a. Calls enqueueSubmission({ language, code, stdin, isContest? })
   b. submissionQueue checks: is Redis available?
      - YES: pushes job to BullMQ queue → judgeWorker picks it up
      - NO: calls executeLocally() directly (in-process fallback)

6. Inside judgeWorker (or direct local call):
   a. Calls executeLocally(language, code, stdin)
   b. judge0Service runs the appropriate handler:
      - JavaScript → vm.Script sandbox
      - Python → PythonWorkerPool
      - C++/C → Compile (cached) → execFile
      - Java → javac (cached) → java
   c. Returns { stdout, stderr, status, time, memory }

7. Output is compared against expectedOutput (normalized)
   - Match → Accepted
   - No match → Wrong Answer
   - TLE → Time Limit Exceeded
   - Compile fail → Compile Error
   - Runtime crash → Runtime Error

8. Submission document updated with:
   - verdict (overall)
   - score (sum of passed test case marks)
   - testCasesPassed / totalTestCases
   - details[] (per test case breakdown)

9. If it's a contest submission:
   - User's contest score updated
   - socketService.emitLeaderboardUpdate(contestId) fires
   - All participants in the contest room receive leaderboard:update WebSocket event
   - Frontend React state updates live leaderboard

10. API response returned to frontend:
    { verdict, score, testCasesPassed, totalTestCases, details[] }

11. Frontend shows verdict badge + per-test-case breakdown to student
```

---

## 8. Real-Time Anti-Cheat Proctoring System

During a contest, the platform monitors student behavior:

**Tab Switch Detection:**
- `ContestMode.jsx` listens for `window.blur` events (when student leaves the tab)
- Each blur increments a `blurCount` counter
- Frontend immediately emits `student:blur_event` via Socket.IO with `{blurCount, maxAllowedBlurs, isDisqualified}`

**Admin Proctoring View:**
- Admin's `AdminContestManagement` page joins `admin_proctoring` socket room
- Receives live `proctoring:violation` events → shows in notification drawer
- If `blurCount >= maxAllowedBlurs`, a `proctoring:student_disqualified` event fires
- Admin sees push notifications for each violation in real time

**Auto-Disqualification:**
- If `autoDisqualify` is enabled on the contest, the backend emits `user:disqualified` to the student's private socket room
- Student's `ContestMode` page listens for this and immediately locks them out

**Manual Controls (Admin):**
- Admin can manually disqualify (`admin:disqualify_student` socket event)
- Admin can reinstate (`admin:qualify_student` socket event)
- Admin can add extra time or sync timer (`admin:timer_sync` socket event)
- Admin can force-end contest (`admin:end_contest` socket event)

**Anti-Cheat Logs:**
Every blur event is also saved in the `Submission.antiCheatLogs[]` array in MongoDB, creating a permanent audit trail.

---

## 9. Contest System Flow

**Admin creates a contest:**
1. Admin goes to `HostContestPage`, fills in: title, description, start time, duration, selected problems, anti-cheat settings
2. `POST /api/contests` → saved to MongoDB with `status: "Active"` or `"Upcoming"`

**Student joins a contest:**
1. Student sees contest on `ContestList` page
2. Clicks "Enter Contest" → navigates to `ContestMode`
3. Frontend emits `join_contest` socket event → student's socket joins `contest_{id}` room
4. Timer starts counting down from `duration` minutes

**During contest:**
- Student can switch between problems
- Run → test code without saving
- Submit → save result, update score, trigger live leaderboard

**Contest end:**
- Timer hits 0 → frontend auto-submits pending code
- OR admin fires `admin:end_contest` → all clients receive `contest:force_submit` → auto-submit

**Post-contest:**
- Admin views `AdminContestManagement` page: final leaderboard, all submissions, participant stats

---

## 10. Docker Setup (Production / Team Server)

**File:** `backend/docker-compose.yml`

For a production or shared team server, Docker Compose spins up everything with one command.

**Services:**
- `redis` — Redis 7 Alpine, port 6379, persistent volume
- `mongodb` — MongoDB 7, port 27017, persistent volume  
- `api-server` — Node.js Express API, port 5000
- `judge-worker` — 2 replicas of the judge worker process

**Start everything:**
```bash
cd backend
docker compose up -d
```

**Scale judge workers:**
```bash
docker compose up --scale judge-worker=4
```

**View logs:**
```bash
docker compose logs -f api-server
docker compose logs -f judge-worker
```

**Stop:**
```bash
docker compose down
```

> [!NOTE]
> Docker is NOT required for local development. You can run MongoDB and Redis natively and just use `npm run dev`.

---

## 11. Environment Variables (.env) Reference

Create a file called `.env` in the `backend/` folder. This file is **never committed to Git** (add it to `.gitignore`).

```env
# Server
PORT=5000
HOST=0.0.0.0

# MongoDB
MONGODB_URI=mongodb://localhost:27017/codearena

# Redis (optional - app works without it)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (CHANGE THIS TO A LONG RANDOM STRING)
JWT_SECRET=your_super_secret_random_key_here_change_this

# Judge0 Cloud API (optional - app runs locally without this)
RAPIDAPI_KEY=
JUDGE0_HOST=https://judge0-ce.p.rapidapi.com

# Email / SMTP (optional - contact form logs to console without this)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
CONTACT_RECIPIENT_EMAIL=admin@yourdomain.com

# Performance Tuning
MAX_CONCURRENT_EXECUTIONS=100
WORKER_CONCURRENCY=10
UV_THREADPOOL_SIZE=64
```

**For frontend**, create `.env` in `frontend/` folder:
```env
VITE_API_URL=http://localhost:5000/api
```
If running backend on a different machine/IP:
```env
VITE_API_URL=http://192.168.1.X:5000/api
```

---

## 12. Setting Up the Project From Scratch on a New Laptop

Follow these steps in exact order after extracting the project zip.

### Prerequisites to Install First

| Software | Download Link | Why Needed |
|---|---|---|
| Node.js 20+ LTS | https://nodejs.org | Run backend + frontend |
| Python 3.10+ | https://python.org | Local Python code execution |
| MongoDB Community | https://www.mongodb.com/try/download/community | Database |
| Redis (Windows) | See note below | Job queue + real-time scaling |
| Git | https://git-scm.com | Version control |
| g++ / GCC (optional) | Via MinGW or WinLibs | C/C++ code execution |

> [!NOTE]
> **Redis on Windows:** Redis doesn't have an official Windows binary. Options:
> - Use the bundled `redis-server/redis-server.exe` that's in the backend folder (if present)
> - Install via WSL2: `wsl --install` then `sudo apt install redis`
> - Use Docker: `docker run -d -p 6379:6379 redis:7-alpine`
> - The platform works WITHOUT Redis (falls back to in-memory mode)

---

### Step 1: Extract the Zip

Unzip the project. You should have:
```
MY PLATFORM/
├── backend/
└── frontend/
```

---

### Step 2: Set Up the Backend

Open a terminal in `MY PLATFORM/backend/`:

```bash
# Install all dependencies
npm install

# Create the .env file (copy from the reference in Section 11)
# Minimum required for local dev:
echo PORT=5000 > .env
echo MONGODB_URI=mongodb://localhost:27017/codearena >> .env
echo JWT_SECRET=change_this_to_something_secret >> .env
```

---

### Step 3: Start MongoDB

If you installed MongoDB Community as a service, it may already be running. Check:
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

If not running:
```bash
# Windows (start MongoDB service)
net start MongoDB

# Or run manually
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath C:\data\db
```

---

### Step 4: Start Redis (Optional but Recommended)

```bash
# Option A: WSL2
wsl redis-server

# Option B: bundled windows binary (if present in project)
cd backend
npm run redis

# Option C: Docker
docker run -d -p 6379:6379 redis:7-alpine
```

---

### Step 5: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 CodeArena Backend API running on http://0.0.0.0:5000
⚡ Real-Time WebSockets Engine (Socket.IO) active
⚡ Distributed Multi-Judge & Concurrency Engine Online (100+ Capacity)
```

On first run, the seeder automatically creates:
- 20 coding questions in MongoDB
- Default admin account

---

### Step 6: Set Up the Frontend

Open a **new terminal** in `MY PLATFORM/frontend/`:

```bash
# Install dependencies
npm install

# Create frontend .env (if backend runs on same machine)
echo VITE_API_URL=http://localhost:5000/api > .env

# Start the dev server
npm run dev
```

You'll see:
```
  VITE v8.x.x  ready in X ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://0.0.0.0:5173/
```

Open `http://localhost:5173` in your browser.

---

### Step 7: (Optional) Start the Judge Worker

For distributed execution (only needed if Redis is running):

```bash
# In a third terminal
cd backend
npm run worker
```

---

### Step 8: Test the Setup

1. Open `http://localhost:5173`
2. Click **Sign In** → use the default admin:
3. You should land on the Admin Dashboard
4. Go to Problems → open any problem → try running code

If code runs and returns a verdict, everything is working. ✅

---

### Summary of Terminal Windows Needed

| Terminal | Command | Purpose |
|---|---|---|
| 1 | `npm run dev` (in backend/) | API server |
| 2 | `npm run dev` (in frontend/) | React dev server |
| 3 | `npm run worker` (in backend/) | Judge worker (optional) |
| 4 | Redis command | Redis (optional) |
| MongoDB | Service or manual | Database |

---

## 13. GitHub Collaboration Guide — Branches, PRs, and Safe Pushing

### How Git Branches Work

Think of your Git repository as a tree:
- **`main` branch** = the trunk. This is the stable, working version of the project. **No one pushes directly to main.**
- **Feature branches** = offshoots from the trunk where each teammate works on their own change safely.

```
main ────────────────────────────────────────────────────►
         │              │              │
         └── feature/   └── fix/       └── feature/
             login-ui       bug-42         leaderboard
```

### Initial GitHub Setup (You — Team Lead)

```bash
# 1. Initialize git in the project root (MY PLATFORM folder)
cd "MY PLATFORM"
git init

# 2. Create a .gitignore file to exclude secrets and large files
```

Create `.gitignore` in the root with:
```gitignore
# Dependencies
node_modules/
*/node_modules/

# Environment secrets - NEVER COMMIT THESE
backend/.env
frontend/.env

# Build output
frontend/dist/
frontend/.vite/

# Logs
*.log
backend/hs_err_pid*.log

# Local data
backend/data/local_users.json

# OS files
.DS_Store
Thumbs.db
```

```bash
# 3. Add all files
git add .

# 4. First commit
git commit -m "Initial commit: CodeArena platform"

# 5. Connect to GitHub (create repo on GitHub first, then:)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 6. Push to main
git push -u origin main
```

> [!CAUTION]
> Double-check that `.env` files are in `.gitignore` BEFORE your first `git add .`. If you accidentally commit `.env` with secrets, even if you delete it later the secret is in Git history. Use `git rm --cached backend/.env` to untrack it.

---

### How a Teammate Sets Up After Cloning

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Go into project
cd YOUR_REPO_NAME/MY\ PLATFORM

# Install backend deps
cd backend && npm install

# Manually create .env (you share this separately via secure message, NOT via Git)
# Create backend/.env with the values from Section 11

# Install frontend deps
cd ../frontend && npm install

# Create frontend/.env
echo VITE_API_URL=http://localhost:5000/api > .env
```

---

### How Teammates Create and Use Branches

#### Step 1 — Always start from the latest main

Before starting any new work:
```bash
# Switch to main
git checkout main

# Pull latest changes from GitHub
git pull origin main
```

#### Step 2 — Create a feature branch

Naming convention: `feature/short-description` or `fix/bug-description`

```bash
# Create and switch to a new branch
git checkout -b feature/contest-timer-fix

# Or for bug fixes:
git checkout -b fix/submission-verdict-bug
```

#### Step 3 — Do your work

Make changes, test them, then commit:
```bash
# Stage specific files
git add backend/src/controllers/contestController.js

# Or stage everything
git add .

# Commit with a meaningful message
git commit -m "Fix: contest timer not syncing correctly on page reload"
```

#### Step 4 — Push your branch to GitHub

```bash
git push origin feature/contest-timer-fix
```

#### Step 5 — Open a Pull Request (PR) on GitHub

1. Go to the GitHub repo in your browser
2. You'll see a banner: **"Compare & pull request"** for your branch — click it
3. Fill in: what you changed, why, any test instructions
4. Assign a reviewer (ideally you, the team lead)
5. Click **"Create pull request"**

#### Step 6 — Review & Merge

- You (team lead) review the code changes on GitHub
- If everything looks good, click **"Merge pull request"**
- GitHub merges the branch into `main`
- Delete the feature branch after merging (keeps repo clean)

#### Step 7 — Everyone pulls latest main

After any merge, all teammates should:
```bash
git checkout main
git pull origin main
```

---

### Branch Protection (Strongly Recommended)

On GitHub → your repo → **Settings → Branches → Branch protection rules** → Add rule for `main`:

- ✅ **Require pull request reviews before merging** — 1 required review
- ✅ **Require status checks to pass** (if you add CI later)
- ✅ **Do not allow bypassing the above settings**

This makes it **impossible** for anyone to accidentally push to `main` directly.

---

### Common Git Commands Quick Reference

```bash
# See status of changes
git status

# See all branches
git branch -a

# Switch branch
git checkout branch-name

# Merge latest main into your feature branch (to avoid conflicts)
git checkout main
git pull origin main
git checkout feature/my-branch
git merge main

# Undo last commit (keeps changes, just removes the commit)
git reset --soft HEAD~1

# Discard all unsaved changes (CAREFUL - this deletes your work)
git checkout -- .

# See commit history
git log --oneline -10
```

---

### Recommended Team Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                  TEAM BRANCHING WORKFLOW                    │
│                                                             │
│  main (stable) ─────────────────────────────────────────►  │
│                   ▲              ▲              ▲           │
│                   │ PR Merged    │ PR Merged    │           │
│                   │              │              │           │
│  feature/login ───┤      fix/bug─┤   feature/X─┘           │
│  (Ali's branch)   │  (Sara's)    │  (Usman's)               │
│                   │              │                          │
│  Rules:                                                     │
│  • Never push directly to main                              │
│  • Always create a branch from latest main                  │
│  • Open a PR and get 1 review before merging                │
│  • Pull main before starting any new branch                 │
│  • Delete branches after merging                            │
└─────────────────────────────────────────────────────────────┘
```

---

> [!TIP]
> Share the `.env` file contents with teammates **privately** (WhatsApp, email, encrypted message) — never through Git. Each teammate creates their own `.env` file manually.

---

*Document generated for CodeArena Platform — September 2026*
