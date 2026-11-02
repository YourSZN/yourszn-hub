# Handoff: client portal and colour dashboards (2 Nov 2026)

Start here if you're picking this work up. For how the client site works, read
`portal/README.md`. For why things were built the way they were, read `docs/DECISIONS.md`.

## Where everything is

| What | Where |
|---|---|
| Code | GitHub `YourSZN/yourszn-hub`, branch `main` (currently public; Latisha is making it private) |
| Client site | clients.yourszn.com.au = `portal/` folder, Vercel team "Your SZN", project `yourszn-hub` (root directory `portal`) |
| Staff hub | portal.yourszn.com.au = repository root, Vercel project `yourszn-hub.update` (a Netlify site `charming-starlight-37db1e` also builds on every push) |
| Database | Supabase project `ntqemlkwsymdxhaonfdv` (Pro plan). Migrations are tracked in Supabase; new ones are also recorded in `portal/sql/` |
| Email | Resend, from hello@yourszn.com.au |
| True Spring dashboard preview | claude.ai artifact https://claude.ai/artifact/6N2rq3aniDe1aqLyy7ZXuj (source and images published there) |
| Light Summer dashboard preview | https://claude.ai/artifact/QY7enmmapn6RpbdtnNqi4U |
| Portal mock-up (approved) | Design canvas https://claude.ai/artifact/Kb8VRp6KUtCt37XLwD47Zs |

## How we work

- Every change goes on a branch, then a draft PR with a plain-language description, then
  a Vercel preview for Latisha to test. It is merged (squash) only after she says **go**.
- Run `node tests/portal/api.test.js` before every change to `portal/api`, and add checks.
- Update `portal/README.md` and add an entry to `docs/DECISIONS.md` with every feature.
- After each feature, give Latisha a short security check (what could go wrong / what we did).
- Latisha isn't technical: explain in plain language, flag anything that weakens security
  or makes the code messy.
- Tooling notes: GitHub GraphQL is blocked here, so use `gh api` REST (PR create, merge, and
  `/pulls/{n}/ccr/ready_for_review`). Deleting remote branches through the API is blocked;
  leave them. The Vercel connection can see projects but not environment variables.
  Preview environments have the same variables as production (Latisha enabled them).

## Done on 2 Nov (all live)

1. **Database security:** `notifications` and `ivorey_overrides` were open to the public key;
   now staff-only. `is_admin()` no longer callable without signing in. Public storage
   buckets checked: none hold client photos or personal details.
2. **Tour login (PR #8):** shared code `2462` replaced by emailed 6-digit code; every tour API
   takes the client from the signed session only. Staff-site duplicate tour files removed.
3. **New portal front page (PR #9):** one sign-in (name, email, code), then a home page from
   `/api/client-home`: analysis progress, tour (straight in if booked, else the interest
   form), colour dashboard (locked until approved, then straight in). Access code `1893`
   and the in-person card removed. Revised photos tied to the signed-in client. Codes
   limited per email and per IP. Sign out anywhere clears all sessions on the device.
4. **True Spring preview:** Wardrobe tab has subtabs, "Latisha's picks" first (8 ShopMy
   Spring items with photos), then "My wardrobe". App screen recording plays in the
   "Inside the YourSZN app" card (`img/app-demo.mp4`, same for every season).

## Next: admin Clients page (agreed with Latisha)

In the staff hub, replace the in-person **Clients** view with a list of everyone with a portal
account / online submission. Per client:

- **Paid** tick (manual for now; Shopify webhook later).
- **Status** (New, In progress, Complete, Sent; same values as `szn_submissions.status`).
- **Season** (from the drape, separate from the client's prediction) and **Tier** (standard / premium).
- **Give dashboard access + email client** button: creates/activates the `colour_clients`
  row and emails "Your results are ready" with a link to clients.yourszn.com.au. Only
  allowed for seasons whose dashboard is built (True Spring first; nobody else gets
  access until the other seasons are done).
- **Grant OCA access** for someone who paid with a different email.
- Filters: All, Paid not submitted, New, In progress, Complete, Dashboard live.
- Remove the in-person screens and `client-upload.html` / `api/client-booking.js` (confirm
  nothing else uses them first). Latisha is dropping in-person work.
- Mock-up: the "Your admin · Clients" artboard on the design canvas above.

## After that

1. **Season-driven colour dashboard:** port the True Spring preview (season file
   `portal/seasons/true-spring.js`, images on the preview artifact) into
   `portal/colour-dashboard.html`, keeping sign-in, server sync and account. Move Light
   Summer onto the same setup. Latisha uploads guide pages to Supabase bucket
   `season-guides/true-spring/`. First test client: Montana (email still needed).
2. **Clean-up pass (agreed):** two `api` folders with overlapping files; `comms-fix-v37/38/39.js`
   patch files; `project/` folder (old copy of the hub); Netlify config next to Vercel and a
   second Vercel project; root `client-portal.html` (old portal copy on the staff site,
   still shows code `1893` and uses root `api/client-submission.js` / `client-booking.js`);
   social-media PNGs in the repo root. Trace what the staff hub actually loads before deleting.
3. **Accounts and roles:** one client account table; lock every staff table by role
   (38 tables currently allow any signed-in user). Test on a temporary Supabase branch
   ("claudedev") and delete it afterwards.
4. **Shopify webhook** for payment (Latisha chose manual for now).
5. **Pre-launch checklist:** security, performance, accessibility, backup restore test.

## Not doing (Latisha decided)

- Privacy policy / terms and a deletion button: deletion requests by email for now.
- Messaging tour clients about the login change; adding the missing tour client email.

## True Spring loose ends

- Website brown hex to match exactly (currently `#7A5C48`).
- Links for 2 bronzers (Tarte, Rare Beauty) and 4 perfumes. New ShopMy links go into a
  hidden collection first (e.g. "True Spring Makeup").
- VRG GRL Yumi jumper: photo shows "Sea", ShopMy link is the "Coffee" colour. Orange
  "& Other Stories" photo may be a cardigan; check the link.
- Welcome video. App recording could be re-recorded once product images have loaded.

## Watch out for

- `colour_clients` has one active row (Light Summer, premium). Approving someone today =
  adding a row there.
- One booked tour client has no email and can't sign in (Latisha is fine with that).
- Anyone signed in can start the questionnaire (no payment check yet), same as before.
