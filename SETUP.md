# StudyFlow - deployed demo (Cloudflare + Clerk)

This folder is the final, working source of the StudyFlow app as deployed at:
**https://studyflow.2wf0w2.workers.dev**

## What changed vs the original ZIP

The frontend design is unchanged. The only visible additions (approved):
- The account card now has an explicit **Sign in / Create account toggle** with a
  name field at signup.
- A legal line under the form: "Passwords are securely hashed before storage."
- An email **verification code step** after signup (and possibly when signing in
  from a new device).
- The profile button shows the signed-in name and signs out on click.

Under the hood:
- Authentication moved from the bundled JWT/bcrypt server code to **Clerk**
  (managed auth, free Hobby plan, no card). The old `/api/auth` routes, the User
  model, and the JWT secret are gone. Passwords are handled and hashed by Clerk;
  this app never sees a plaintext password.
- The backend now runs as a **Cloudflare Worker** (Express app served through
  `httpServerHandler`, see `server/src/worker.ts`). Session tokens are verified
  against Clerk's public JWKS endpoint (`server/src/middleware/auth.ts`) - no
  secret key is stored on the server.
- Task storage moved from MongoDB Atlas to **Cloudflare D1** (serverless SQL).
  Schema in `migrations/0001_init.sql`. All task queries are scoped per user
  (`user_id = verified Clerk session id`). The MongoDB connection string from
  the original ZIP is NOT used anywhere.

## Accounts that run this deployment

Both were created with the agent operations inbox, on free plans, no card:
- **Clerk** application "StudyFlow" (development instance) - login saved in the
  vault as "Clerk (agent hosting)".
- **Cloudflare** account (Worker `studyflow`, D1 database `studyflow-db`) -
  login saved in the vault as "Cloudflare (agent hosting)", deploy API token as
  "Cloudflare API token (wrangler deploy, agent)".

## Honest limitations (read before demoing)

1. **Clerk development instance.** It works fully (signup, login, email codes)
   but is meant for testing, not production traffic. Moving to production Clerk
   requires owning a domain (Clerk production needs DNS records on your own
   domain) and swapping publishable keys + issuer. No code changes otherwise.
2. **Google button is a stub** - "Continue with Google" is not wired. Social
   login needs OAuth credentials configured in Clerk.
3. **Notes store file names only.** Uploaded files are not persisted anywhere;
   that needs real file storage (e.g. Cloudflare R2).
4. **The study coach is rule-based** starter text, not an AI service.
5. Everything else (planner, calendar, pomodoro, attendance, analytics,
   subjects) works fully client-side, and tasks sync per account across devices.
6. Free-tier runtime: measured 2-10ms CPU per API request, inside the Workers
   free limit; D1 free tier covers demo-scale usage.

## Redeploy / update

```
cd client && npm install && VITE_API_URL="" VITE_CLERK_PUBLISHABLE_KEY=<pk_test_...> npm run build && cd ..
npx wrangler deploy            # needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npx wrangler d1 execute studyflow-db --remote --file migrations/0001_init.sql  # first time only
```

Local development: `wrangler dev` runs the Worker with a local D1; the client
dev server (`cd client && npm run dev`) expects `VITE_API_URL` to point at it.
