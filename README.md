# Vedantu Early Learning &mdash; Master Teacher Resume Parser

A small internal tool for candidates applying to VEL's master teacher programmes.

- **Candidates** go to the home page, fill in their details, choose the programme they're applying
  for, and upload their resume (PDF or `.docx`). They immediately see a thank-you screen.
- On submit, the resume is parsed and sent to Google Gemini along with the programme-specific
  screening rubric (see `src/lib/rubric.ts`, sourced from `CV Analysis Logic`). Gemini returns a
  verdict &mdash; **GTG**, **On Hold**, or **Not Considered** &mdash; plus a reason and, for Hold
  cases, the specific thing to verify at interview.
- **Admins** sign in at `/admin/login` and see every submission with its verdict, reason, full
  resume text, a download link for the original file, and the ability to re-run the analysis or
  manually override the verdict.
- Admins can also **bulk-upload candidates from a CSV** at `/admin/bulk-upload` &mdash; columns
  for name, a resume link (direct URL or Google Drive share link), subject, and programme. Each
  row is downloaded, parsed, and analyzed the same way as a form submission, with live per-row
  progress and error reporting. Bulk-uploaded candidates don't have email/phone (not in the CSV).

## Setup

1. Install dependencies (already done if you're reading this after the initial build):

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` (already created for you) and fill in:
   - `GEMINI_API_KEY` &mdash; your Google Gemini API key.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` &mdash; credentials for the first admin account.
   - `SESSION_SECRET` &mdash; already generated with a random value; change it if you like.

3. Create the database and tables:

   ```bash
   npm run db:migrate
   ```

4. Create the admin login from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`:

   ```bash
   npm run seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

   - Candidate form: http://localhost:3000
   - Admin panel: http://localhost:3000/admin/login

## Notes

- Uploaded resumes are stored on disk under `uploads/` (gitignored) and referenced from the SQLite
  database at `prisma/dev.db` (also gitignored).
- The screening rubric lives entirely in `src/lib/rubric.ts` as plain text fed to Gemini as
  instructions. To change how candidates are graded, edit that file &mdash; no code changes needed
  elsewhere.
- If Gemini analysis fails for a submission (bad API key, rate limit, etc.), the candidate is still
  saved and shown in the admin panel with an "Analysis failed" badge; open the candidate and click
  **Retry analysis**.
- Admins can manually override any verdict and reason from the candidate detail page.
