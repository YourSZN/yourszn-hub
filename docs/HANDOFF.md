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
- Run `node tests/portal/api.test.js` before every change to `portal/api`, and
  `node tests/staff/admin-clients.test.js` before every change to `api/admin-clients.js`
  or `api/_staff.js`; add checks.
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

## Admin Clients page (PR, 2 Nov): waiting for Latisha's go

Built on branch `admin-clients-page`. How it works: `docs/CLIENTS-PAGE.md`. On **go**:
merge, then apply `portal/sql/2026-11-02-profiles-role-lock.sql` and
`portal/sql/2026-11-02-delete-in-person.sql` as migrations, then Latisha empties and
deletes the `in-person-photos` bucket in Supabase Storage. (`oca_clients` is already
created; it's additive and needed for the preview.)

### What was agreed (kept for reference)

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
  nothing else uses them first). Latisha is dropping in-person work. (2 Nov: also delete
  the in-person data, no export; remove Client Profiles tab; no email on grant. Admin only
  at first, then opened to Salma the same evening.)
- Mock-up: the "Your admin · Clients" artboard on the design canvas above.

## After that

1. **Season-driven colour dashboard:** port the True Spring preview (season file
   `portal/seasons/true-spring.js`, images on the preview artifact) into
   `portal/colour-dashboard.html`, keeping sign-in, server sync and account. Move Light
   Summer onto the same setup. Latisha uploads guide pages to Supabase bucket
   `season-guides/true-spring/`. First test client: Montana (email still needed).
2. **Clean-up pass** (PR on branch `cleanup`, built on top of the Clients page PR). Done:
   removed `project/` (old hub copy), root `client-portal.html` (old portal copy with code
   `1893`) and its `api/client-submission.js` (name + email lookup), root `yourszn-form-7.html`,
   `Your SZN LOOKBOOK.html`, `comms-fix.js`/`-v37`/`-v38`, `yourszn-patches.js`,
   `app-colours.js` (none loaded), Netlify config, `.DS_Store`, the client site's unused copy
   of `vietnam-staff-info.js`, the staff tour API's shared-password fallback, and the social
   and season PNGs (saved to a zip for Latisha). `DATA_SCHEMA.md` moved to `docs/`.
   `launchApp()` no longer calls the missing `renderAdCreativePage()`, so start-up finishes.
   The staff hub no longer publishes the `portal/` folder (`.vercelignore`).
   **Still open:** Client Profiles code (`app-crm.js`) is used by Finances ("CRM Revenue"),
   gift vouchers and "Save to CRM" on questionnaires: needs Latisha's decision before removal.
   The dashboard's in-person stat cards ("In-Person Rate", "10 in-person") need her numbers.
   Latisha to delete the Netlify site `charming-starlight-37db1e` (it still builds on push).
3. **Accounts and roles:** one client account table; lock every staff table by role
   (38 tables currently allow any signed-in user). Latisha's rule (2 Nov): Salma (`staff`)
   gets everything except financials: no finance tables, no Dashboard, no Staff page. Test on a temporary Supabase branch
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

- `colour_clients` has one active row (Light Summer, premium). Once the Clients page is
  live, approving someone = **Give dashboard access** on that page.
- One booked tour client has no email and can't sign in (Latisha is fine with that).
- Anyone signed in can start the questionnaire (no payment check yet), same as before.
