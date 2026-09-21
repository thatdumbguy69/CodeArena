# CodeArena — Real-Time Competitive Coding & Proctoring Ecosystem

CodeArena is a high-performance, full-stack real-time competitive programming platform and automated assessment engine. Designed for both individual practice and live institutional coding contests, it combines real-time integrity proctoring, synchronized wall-clock countdown timers, auto-evaluation, dynamic leaderboards, and a comprehensive admin management suite.

---

## ?? Key Features

### 1. Live Contest Workspace & Assessment Suite
- **Synchronized Contest Timers**: Server-authoritative countdowns with real-time admin sync extensions/reductions (+5m, -5m) streamed live via WebSockets.
- **Timed Contest Locking & Safe Finish**: Early submission controls with non-flickering remaining-time indicators and 15-minute unlock protections.
- **Onboarding Overlay**: 15-second rules & instructions modal before candidates start coding.
- **Contest-Scoped Leaderboard**: Isolated real-time rankings strictly tied to specific contest sessions.

### 2. Multi-Tiered Anti-Cheat & Live Proctoring
- **Tab Switch & Focus Lost Tracking**: Circular proctoring gauges and dynamic violation counters (`X of Max Allowed`).
- **Instant Disqualification & Reinstatement**: Real-time push notifications and audio cues on admin portals, with admin pardon/reinstatement flows.
- **Deduplicated Alert Feeds**: Clean live logs preventing duplicate notification spam.

### 3. High-Performance Execution & Caching
- **Multi-Language Sandbox**: Execution support for Python, C, C++, Java, and JavaScript.
- **Optimized Caching**: 0ms UI delay leveraging session caching and optimistic SWR patterns.
- **Auto-Submission & State Preservation**: Continuous local code persistence ensuring answers are preserved on accidental disconnects or tab close.

---

## ??? Tech Stack

- **Frontend**: React 18, Vite, Monaco Editor, Lucide Icons, Socket.IO Client, Tailwind CSS / Vanilla Modern UI.
- **Backend**: Node.js, Express, Socket.IO, Redis Cluster Adapter, MongoDB & Mongoose.
- **Proctoring**: Window blur events, Fullscreen API, WebSockets.

---

## ?? Quickstart

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or Local MongoDB instance
- Redis (optional, for multi-node clustering)

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## ?? License
MIT
