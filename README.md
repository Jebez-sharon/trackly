# Trackly

An issue tracker for small teams. Organizations contain projects, projects
contain issues, and issues carry status, priority, severity, an assignee,
a comment thread and an activity history.

## Stack


| Backend | Flask 3.1, SQLAlchemy 2.0, Alembic, Flask-JWT-Extended |
| Database | PostgreSQL (developed against Supabase) |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, axios |

Alembic is used directly rather than through Flask-Migrate, so migration
commands are plain `alembic`, run from the `backend/` directory.

## Requirements

- Python 3.13
- Node 20 or newer
- A PostgreSQL database

## Setup

### Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate        # macOS or Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # then fill in DATABASE_URL and JWT_SECRET_KEY
alembic upgrade head
python app.py
```

The API listens on <http://localhost:5000>. Check it with:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/db
```

`/api/health` answers without touching the database, so if it returns 200
while `/api/health/db` does not, the problem is the database rather than
the app.

### Frontend

In a second terminal, because `python app.py` holds the first one:

```bash
cd frontend
npm install
npm run dev
```

The app runs on <http://localhost:5173>.

## Port 5173 is not optional

CORS is pinned to `http://localhost:5173` in `backend/app.py`. If that port
is busy, Vite silently starts on 5174 instead and **every API request will
fail CORS** — the app loads but nothing works, with no obvious error. Free
the port rather than accepting the fallback.

## Migrations

Run from `backend/` with the virtualenv active.

```bash
alembic revision --autogenerate -m "what changed"
alembic upgrade head
alembic current          # which revision the database is on
alembic downgrade -1     # step back one
```

Always read the generated migration before applying it. Autogenerate does
not detect every change, and it occasionally proposes drops it should not.

## Layout

```
backend/
  app.py            application factory, error handlers, health checks
  config.py         configuration read from the environment
  models.py         SQLAlchemy models
  routes/           blueprints: auth, organizations, projects, issues, comments
  services/         write operations that also record activity
  migrations/       Alembic
frontend/src/
  pages/            one component per route
  components/       ui/ is generic, the rest is feature-specific
  context/          auth and projects; the hook and the provider live in
                    separate files so Vite Fast Refresh keeps working
  lib/              axios instance, useFetch, shared constants
  hooks/            useFocusTrap
```

## Authentication

`POST /api/auth/register` creates a user **and** an organization, with that
user as its admin. `POST /api/auth/login` returns an access token valid for
8 hours. The frontend stores it in `localStorage` and attaches it to every
request; a 401 or 422 sends the user back to `/login`.

Permissions are checked per request. Any member of an organization can read
its projects and issues and add comments. Only an admin can create a project
or manage members. Only an admin or the assignee can change an issue's status
or assignee.

## Rate limiting

`/api/auth/login` allows 10 attempts a minute and 100 an hour per IP;
`/api/auth/register` allows 5 an hour and 20 a day. Nothing else is limited —
a signed-in user reading their own board should never be throttled.

Two things must be dealt with before this is deployed, or the limiter will be
either useless or actively harmful:

**Storage is in-process.** Each gunicorn worker keeps its own counters, so
running four workers quadruples every limit. Set `RATELIMIT_STORAGE_URI` to a
Redis URL before running more than one worker.

**The client IP must be real.** Limits key on `request.remote_addr`, which
behind a load balancer is the balancer, not the visitor. Deployed without
`ProxyFix`, every visitor shares one bucket and the tenth failed login by
anyone locks out everyone. Wrap the app in
`werkzeug.middleware.proxy_fix.ProxyFix` with the trusted hop count for your
host — and only when actually behind a proxy, since otherwise the forwarding
headers can be spoofed.

## Checks

```bash
cd backend && ./venv/Scripts/python.exe -m pytest
cd frontend && npx eslint src --max-warnings=0
cd frontend && npm run build
```

The API suite runs against an in-memory SQLite database, so it needs no
network and does not touch your real data. It covers registration and login,
who is allowed to do what, the validation on every write, and that deletes
cascade.

Two things it deliberately does not prove. SQLite ignores
`SELECT ... FOR UPDATE`, so the row lock that stops two concurrent requests
claiming the same issue key is a no-op there — the tests check the key
sequence, not the locking. And SQLite does not enforce `VARCHAR` length, so
the length limits are verified by the application rejecting them rather than
by the column refusing them.

There are no frontend tests. That behaviour has been checked by hand,
including with axe-core for accessibility.