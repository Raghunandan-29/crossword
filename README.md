# Crossword Puzzle App

A full-stack cross-platform crossword puzzle app with a React Native mobile player app, React admin dashboard, and Node.js backend with real-time sync.

## Architecture

```
crossword-app/
├── backend/              # Node.js Express API + WebSocket + SQLite
│   └── src/
│       ├── index.js             # Server entry point
│       ├── database.js          # SQLite setup & schema
│       ├── crosswordEngine.js   # Crossword generation algorithm
│       ├── wsServer.js          # WebSocket for real-time sync
│       ├── middleware.js        # JWT auth middleware
│       ├── seed.js              # Sample data seeder
│       └── routes/
│           ├── auth.js          # Admin login/verify
│           ├── puzzles.js       # Puzzle CRUD + gameplay APIs
│           └── players.js       # Player registration, progress, leaderboard
├── admin-dashboard/      # React + Vite + Tailwind CSS
│   └── src/
│       ├── App.jsx              # Router with auth guard
│       ├── api.js               # API client
│       ├── components/          # CrosswordPreview, Layout
│       └── pages/               # Login, Dashboard, CreatePuzzle, EditPuzzle
└── mobile-app/           # React Native (Expo)
    ├── App.js                   # Navigation (tabs + stack)
    └── src/
        ├── api.js               # API + WebSocket client
        ├── theme.js             # Colors, fonts, spacing
        ├── store.js             # AsyncStorage player persistence
        └── screens/
            ├── HomeScreen.js        # Puzzle list with filters
            ├── GameScreen.js        # Crossword gameplay
            ├── ProfileScreen.js     # Stats, history, level
            └── LeaderboardScreen.js # Top players
```

## Tech Stack

| Component        | Technology                                    |
|-----------------|-----------------------------------------------|
| Mobile App      | React Native (Expo) + React Navigation        |
| Admin Dashboard | React + Vite + Tailwind CSS + Lucide Icons    |
| Backend API     | Node.js + Express                             |
| Database        | SQLite (better-sqlite3)                       |
| Auth            | JWT (jsonwebtoken + bcryptjs)                 |
| Real-time Sync  | WebSocket (ws library)                        |

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run seed    # Create sample puzzles
npm run dev     # Starts on http://localhost:3001
```

Default admin credentials: `admin` / `admin123`

### 2. Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev     # Starts on http://localhost:3000
```

### 3. Mobile App

```bash
cd mobile-app
npm install
npx expo start  # Scan QR with Expo Go app
```

> **Note:** For physical device testing, update `API_BASE` and `WS_URL` in `mobile-app/src/api.js` with your machine's local IP (e.g., `http://192.168.x.x:3001`).

## Database Schema

### Tables

- **admin** — Single admin user (username, password hash)
- **templates** — Crossword layout templates (extensible)
- **puzzles** — Puzzle metadata (title, difficulty, timer, grid data, status)
- **words** — Words with hints, positions, directions, numbers
- **players** — Player profiles (device-based, no sign-up required)
- **player_progress** — Per-puzzle progress tracking, scores, completion

## Features

### Player App
- Browse published puzzles with difficulty filters (Easy/Medium/Hard/Timer)
- Interactive crossword grid with tap-to-select, keyboard input
- Direction toggling (across/down) by re-tapping selected cell
- Clue display (current + full clue list)
- Real-time timer countdown for timer mode puzzles
- Check puzzle correctness with visual cell feedback (green/red)
- Completion screen with points, time, and word count
- Player profile with level system (Novice → Master)
- Activity history showing completed and in-progress puzzles
- Leaderboard ranking by total points
- Real-time puzzle sync via WebSocket (new puzzles appear instantly)

### Admin Dashboard
- Secure JWT login
- Dashboard with stats and filterable puzzle list
- Create puzzle: title, difficulty, grid size, timer mode, words & hints
- Live crossword preview with automatic generation
- Validation: duplicate words, empty hints, character checks, grid fit
- Publish / Unpublish / Delete puzzles
- Edit existing puzzles with re-generation
- Real-time broadcast to all connected player devices on publish

### Crossword Engine
- Automatic crossword layout generation from word list
- Longest-first placement strategy for optimal intersections
- Centrality scoring for aesthetic grid layout
- Grid trimming to minimal bounding box
- Reading-order numbering (top→bottom, left→right)
- Validation: word length, duplicates, missing hints, character set

## API Endpoints

### Auth
- `POST /api/auth/login` — Admin login
- `GET /api/auth/verify` — Verify JWT token

### Puzzles (Public)
- `GET /api/puzzles/published` — List published puzzles (supports `?difficulty=` and `?timer_mode=` filters)
- `GET /api/puzzles/play/:id` — Get puzzle for gameplay (no answer words, only lengths)
- `POST /api/puzzles/check-word` — Check single word answer
- `POST /api/puzzles/check-puzzle/:id` — Check full puzzle solution

### Puzzles (Admin — requires JWT)
- `GET /api/puzzles/admin/all` — All puzzles
- `GET /api/puzzles/admin/:id` — Single puzzle with words
- `POST /api/puzzles/admin/generate` — Generate crossword preview
- `POST /api/puzzles/admin/create` — Create new puzzle
- `PUT /api/puzzles/admin/:id` — Update puzzle
- `POST /api/puzzles/admin/:id/publish` — Publish puzzle
- `POST /api/puzzles/admin/:id/unpublish` — Unpublish puzzle
- `DELETE /api/puzzles/admin/:id` — Delete puzzle

### Players
- `POST /api/players/register` — Register by device ID
- `GET /api/players/:id` — Player profile + stats
- `POST /api/players/:id/progress` — Save puzzle progress
- `POST /api/players/:id/complete` — Mark puzzle complete
- `GET /api/players/:id/progress` — Get all progress
- `GET /api/players/leaderboard/top` — Top 50 leaderboard

### WebSocket
- `ws://localhost:3001/ws` — Real-time events
  - `puzzle_published` — New puzzle available
  - `puzzle_unpublished` — Puzzle removed
  - `puzzle_deleted` — Puzzle deleted

## Scoring System

| Difficulty | Base Points | Per Word | Timer Bonus |
|-----------|-------------|----------|-------------|
| Easy      | 100         | +10      | 1.5x        |
| Medium    | 200         | +10      | 1.5x        |
| Hard      | 350         | +10      | 1.5x        |

## Level System

| Level     | Points Required |
|----------|----------------|
| Novice    | 0              |
| Beginner  | 100            |
| Advanced  | 500            |
| Expert    | 2,000          |
| Master    | 5,000          |

## Future Expansion

The architecture supports:
- **Daily puzzles** — Add a scheduled job to auto-publish
- **User accounts** — Extend players table with email/password
- **Push notifications** — Add Firebase Cloud Messaging
- **Analytics** — Track solve times, abandon rates, popular puzzles
- **More game modes** — Speed rounds, collaborative solving
- **Offline mode** — Cache puzzles locally for airplane play
- **Categories/Tags** — Organize puzzles by topic
