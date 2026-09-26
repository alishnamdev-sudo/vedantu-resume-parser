# Deploying to Railway

Two Railway services: this app (Dockerized) + Railway's managed Postgres plugin. Uploaded resume
files live on a small volume attached to the app service.

(A full frontend/backend/database split was considered and skipped — Next.js API routes already
*are* the backend, colocated with the frontend by design. Splitting them would mean cross-origin
auth cookies and duplicate deploy configs for no real benefit on an app this size.)

## One-time setup

1. **Add Postgres**: In your Railway project, **New → Database → Add PostgreSQL**. Railway
   provisions it and exposes a `DATABASE_URL` you can reference from the app service.
2. **Deploy the app**: **New → GitHub Repo** → select `vedantu-resume-parser`. Railway detects the
   `Dockerfile` and builds from it (see `railway.json`).
3. **Add a volume** to the app service (Settings → Volumes → New Volume), mount path: `/app/data`
   — this is only for uploaded resume files now (the database itself lives in Postgres).
4. **Variables** on the app service:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | reference the Postgres service's `DATABASE_URL` (Railway lets you pick this from a dropdown, or copy it from the Postgres service's Variables tab) |
   | `UPLOAD_DIR` | `/app/data/uploads` |
   | `GEMINI_API_KEY` | your Gemini API key |
   | `GEMINI_MODEL` | `gemini-3.5-flash` |
   | `ADMIN_USERNAME` | pick an admin username |
   | `ADMIN_PASSWORD` | a **strong** password |
   | `SESSION_SECRET` | a long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

5. Deploy. The Docker image's `CMD` runs `npm run deploy:start`, which applies migrations against
   Postgres, seeds/syncs the admin user, then starts the server.
6. **Settings → Networking → Generate Domain** for the public URL.

## After that

- Every `git push` to `main` rebuilds the Docker image and redeploys.
- Changing `ADMIN_USERNAME`/`ADMIN_PASSWORD` in Variables takes effect on the next deploy/restart
  (the seed step re-syncs it every boot).
