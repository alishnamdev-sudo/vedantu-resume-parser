# Deploying to Railway

This app stores its database (SQLite) and uploaded resumes on local disk, so it needs a host with
a **persistent volume** — Railway provides one directly. This gets you a real live link with
almost no code changes.

## One-time setup

1. Go to [railway.app](https://railway.app) and sign in (GitHub sign-in is easiest, since the repo
   is already on GitHub).
2. **New Project → Deploy from GitHub repo** → select `vedantu-resume-parser`.
3. Railway auto-detects this as a Next.js app (via Nixpacks) and starts a first build. It will use
   the `npm run deploy:start` command from `railway.json`, which runs database migrations, seeds
   the admin user, and starts the server — in that order, every deploy.
4. Add a **Volume** (Service → Settings → Volumes → **New Volume**), mount path: `/app/data`. This
   is where the SQLite database and uploaded resume files will live, persisted across deploys and
   restarts.
5. Add these **Variables** (Service → Variables):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `file:/app/data/dev.db` |
   | `UPLOAD_DIR` | `/app/data/uploads` |
   | `GEMINI_API_KEY` | your Gemini API key |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `ADMIN_USERNAME` | pick an admin username |
   | `ADMIN_PASSWORD` | pick a **strong** password &mdash; not the local dev one |
   | `SESSION_SECRET` | a long random string (generate one below) |

   Generate a fresh `SESSION_SECRET` locally with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. Trigger a deploy (Railway usually does this automatically once variables + volume are set —
   otherwise click **Deploy**).
7. Once it's live, go to **Settings → Networking → Generate Domain** to get a public
   `https://<something>.up.railway.app` URL.

## After that

- Candidate form: `https://<your-domain>/`
- Admin panel: `https://<your-domain>/admin/login`
- Every future `git push` to `main` auto-redeploys (migrations + seed re-run safely each time).
- If you ever change `ADMIN_USERNAME`/`ADMIN_PASSWORD` in Railway's Variables, just redeploy (or
  restart the service) — the seed step re-syncs the admin account on every boot.
