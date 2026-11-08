# StudyFlow - deployed demo (Cloudflare + Clerk)

This folder is the final, working source of the StudyFlow app as deployed at:
**https://studyflow.2wf0w2.workers.dev**

## Review changes

The existing blue palette and layout are kept except for the requested revisions:
- Notes is a subject-folder library. Create a named, coloured folder, enter it,
  upload files, and open them from that folder.
- File bytes are stored in IndexedDB on this browser/device. PDFs use an in-app
  PDF.js reader; supported images and text preview in a sandboxed frame. Other
  formats download as original files for their own apps. Older details-only
  entries need their original files uploaded again.
- Add/edit task accepts a typed subject name. New names create a subject.
- The signup switch is a readable, keyboard-accessible button.
- Google sign-in uses Clerk's OAuth redirect, with a callback route and managed
  fallback screens for any additional sign-in/signup requirements.
- The bell and Student space menu open working panels.
- Dashboard consistency is a compact blue heatmap. Study coach was removed.

Under the hood:
- Authentication moved from the bundled JWT/bcrypt server code to **Clerk**
  (managed auth, free Hobby plan, no card). The old `/api/auth` routes, the User
  model, and the JWT secret are gone. Passwords are handled and hashed by Clerk;
  the custom form passes credentials directly to Clerk, not to this app's backend.
- The backend now runs as a **Cloudflare Worker** (Express app served through
  `httpServerHandler`, see `server/src/worker.ts`). Session tokens are verified
  against Clerk's public JWKS endpoint (`server/src/middleware/auth.ts`) - no
  secret key is stored on the server.
- Task storage moved from MongoDB Atlas to **Cloudflare D1** (serverless SQL).
  Schema in `migrations/0001_init.sql`. All task queries are scoped per user
  (`user_id = verified Clerk user id`). The MongoDB connection string from
  the original ZIP is NOT used anywhere.

## Accounts that run this deployment

Both were created with the agent operations inbox, on free plans, no card:
- **Clerk** application "StudyFlow" (development instance) - login saved in the
  vault as "Clerk (agent hosting)".
- **Cloudflare** account (Worker `studyflow`, D1 database `studyflow-db`) -
  login saved in the vault as "Cloudflare (agent hosting)", deploy API token as
  "Cloudflare API token (wrangler deploy, agent)".

## Current limits and verification boundary

1. Clerk is a development instance, not a production deployment. Google uses
   Clerk shared development credentials and Google's chooser displays Clerk.
   Production setup needs a domain and production provider configuration.
2. The Google button was verified to open Google's real account chooser. Personal
   account selection/consent and the return-to-app flow are left for owner review.
   Do not describe that final Google sign-in step as end-to-end verified yet.
3. Only tasks sync to the account. Notes files, subjects, attendance and study logs
   stay in this browser/device. Clearing site data can remove them. Keep originals.
4. Reflections are unchanged pending the owner's storage choice. An exact task-name
   match appends text to that task's local notes, without a server update. Without
   a match the text stays only in current session state and is lost on reload.
5. The deployment remains on the existing free tiers with no paid upgrade or card.

## Redeploy / update

```
cd client && npm install && VITE_API_URL="" VITE_CLERK_PUBLISHABLE_KEY=<pk_test_...> npm run build && cd ..
npx wrangler deploy            # needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npx wrangler d1 execute studyflow-db --remote --file migrations/0001_init.sql  # first time only
```

Local development: `wrangler dev` runs the Worker with a local D1; the client
dev server (`cd client && npm run dev`) expects `VITE_API_URL` to point at it.
