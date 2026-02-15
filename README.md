# RemindMe

A minimal assignment deadline tracker. Add assignments, get push notification reminders at 9 AM and 7 PM until you mark them done or the deadline passes. Works offline as a PWA.

## Setup

### Prerequisites

- Node.js 18+
- npm

### Server

```bash
cd server
npm install

# Generate VAPID keys for push notifications
npm run generate-vapid

# Copy the output into .env (see .env.example)
cp .env.example .env
# Then paste your VAPID keys and set a JWT_SECRET

npm run dev
```

The server runs on `http://localhost:3001`.

### Client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` and proxies API requests to the server.

### Environment Variables (server/.env)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3001) |
| `JWT_SECRET` | Secret for signing auth tokens. Use a long random string. |
| `VAPID_PUBLIC_KEY` | Web Push public key (from `npm run generate-vapid`) |
| `VAPID_PRIVATE_KEY` | Web Push private key |
| `VAPID_EMAIL` | Contact email for push service (mailto:you@example.com) |

## How It Works

1. Sign up with email + password
2. Add assignments with a title and due date
3. Enable notifications when prompted (after a few seconds on the dashboard)
4. You'll get push notifications at 9 AM and 7 PM for each pending assignment
5. Check off assignments when done — notifications stop automatically
6. Notifications also stop once the due date passes

## Project Structure

```
server/
  src/
    index.js          — Express server entry point
    db.js             — SQLite database (sql.js, no native deps)
    middleware/
      auth.js         — JWT cookie authentication
    routes/
      auth.js         — Signup, login, logout, session check
      assignments.js  — CRUD for assignments
      notifications.js — Web Push subscription + cron scheduler

client/
  src/
    main.tsx          — App entry, service worker registration
    App.tsx           — Routing
    api.ts            — All API calls
    context/
      AuthContext.tsx  — Auth state management
    pages/
      Login.tsx
      Signup.tsx
      Dashboard.tsx
    components/
      AddAssignment.tsx
      AssignmentItem.tsx
      NotificationPrompt.tsx
    index.css         — All styles
  public/
    sw.js             — Service worker (push + offline)
    manifest.json     — PWA manifest
    offline.html      — Offline fallback page
    favicon.svg
    icon-192.svg
    icon-512.svg
```

## Building for Production

```bash
cd client
npm run build
# Output in client/dist/

# Serve dist/ with the Express server or any static host
# Point the server's CORS origin to your production domain
```

## Notes

- Database is a single SQLite file (`server/remindme.db`), no external DB needed
- Push notifications require HTTPS in production (localhost works for development)
- For real PNG icons, convert the SVG files in `client/public/` using any image tool
