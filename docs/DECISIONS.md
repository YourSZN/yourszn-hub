# Decisions log

Newest first. Each entry: what we chose, why, and what we rejected.

## 2026-11-02: Clean-up pass

- **Chose:** delete only what nothing loads, traced file by file (scripts in `index.html`,
  links, API calls). Git history keeps every removed file if one is ever needed.
- **Security:** removed two old ways into client data on the staff site: the old portal copy
  (`client-portal.html`, shared code `1893`) with its name + email lookup API, and the tour
  staff API's shared-password fallback (nothing used it; staff sign in with their own login).
  The client site's copy of that staff API is gone, and the staff hub no longer serves the
  client site's files (a redirect in the root `vercel.json`; `.vercelignore` was tried and
  rejected because it also applies to the client site's build).
- **Fixed:** the staff hub's start-up stopped halfway (a call to a function that no longer
  exists), so goals, finances, plan and staff views only filled in after data loaded.
- **Not removed yet:** Client Profiles (`app-crm.js`), because Finances, gift vouchers and
  questionnaires still use it. Removing it changes those screens, so Latisha decides.

## 2026-11-02: Admin Clients page replaces the in-person Clients page

- **Chose:** one list of Online Colour Analysis clients in the staff hub, one row per email,
  joining a new `oca_clients` table (paid, tier, drape season) with the questionnaire
  (`szn_submissions`) and dashboard access (`colour_clients`). All reads and writes go
  through `api/admin-clients.js`. See `docs/CLIENTS-PAGE.md`.
- **Who can use it:** first admin only; later the same evening Latisha gave Salma full
  access ("everything except financials"). The server checks `profiles.role` is `admin`
  or `staff` from the hub login on every request and records who made each change.
  Because staff could edit their own `profiles` row, including the role, the role is now
  locked (`portal/sql/2026-11-02-profiles-role-lock.sql`, applied on go).
- **Salma's menu:** everything except Finances, Dashboard (revenue targets, rates,
  expenses) and Staff (Latisha's manager view). Menus only change what she sees; the
  accounts-and-roles job locks the finance tables themselves.
- **Why a new table, not more columns on `szn_submissions`:** someone can pay before they
  submit, or pay with one email and sign in with another, so payment belongs to the
  person (email), not the questionnaire. `colour_clients` stays only for dashboard access.
- **Dashboard access only for built seasons:** `READY_SEASONS` in the API (True Spring),
  checked on the server, so the button can't open an unbuilt dashboard.
- **Grant OCA access sends no email** (Latisha's choice); she messages them herself.
- **Undo for mistakes:** "Remove dashboard access" switches the row off and signs the client
  out, instead of deleting it.
- **Removed (Latisha's choice):** in-person screens and files (`app-in-person.js`,
  `client-upload.html` in both sites, both `client-booking.js`, `client-day-colours.js`,
  the hidden Appointment Slots grid, in-person bookings on the calendar, dashboard and
  notifications), and the Client Profiles tab. The in-person **data** is deleted on go,
  with no export (`portal/sql/2026-11-02-delete-in-person.sql`), plus the
  `in-person-photos` bucket emptied by hand.
- **Kept for the clean-up pass:** `app-crm.js` (Client Profiles code; its one saved profile
  stays in the shared app data). The sidebar search and dashboard Today card moved out of
  it onto the new list.
- **Rejected:** letting the browser write `colour_clients` directly (any staff login could
  then open dashboards), and emailing from the browser.

## 2026-11-02: One sign-in on the portal front page

- **Chose:** clients sign in once on clients.yourszn.com.au (name, email, emailed code) and
  get a home page built by the server for their email. Opening the tour or colour
  dashboard hands over that dashboard's own session, only if the email is on its list.
- **Why:** replaces separate access-code boxes (codes visible in the page source) with one
  login, and shows each client only what applies to them.
- **Kept separate on purpose:** the portal session proves email ownership only. It can't
  read dashboard data itself, so a bug in the home page can't expose a dashboard.
- **Anyone can sign in:** new clients must be able to start their questionnaire. Codes are
  limited per email and per IP address to stop the form being used to spam inboxes.
- **Revised photos** are now tied to the signed-in client's own latest questionnaire,
  instead of a name + email lookup.
- **Not yet:** payment check (Shopify webhook), admin approval page, deletion requests.
- **Removed from the portal:** the online-analysis access code and the in-person card.

## 2026-11-02: Tour clients sign in with an emailed code

- **Chose:** Vietnam Tailoring Tour clients sign in with an emailed 6-digit code, the same
  system as the colour dashboard (`portal/api/_login-codes.js`). Every tour endpoint takes
  the client's identity from the signed session token (`portal/api/_tour.js`).
- **Why:** The old login used one shared access code (written in the page source, in a
  public GitHub repository) plus the client's email, and afterwards the server trusted
  whatever client id the browser sent. Anyone with a tour client's email could open her
  dashboard, including passport and flight details.
- **Also:** Tour sessions last 7 days (colour: 30) because of the personal details held.
  Session tokens now carry a scope (`colour` / `tour`) so one dashboard's sign-in can't
  open the other.
- **Removed:** the staff site's duplicate copies of the tour page and tour APIs
  (`/vietnam-tour.html`, `/api/vietnam-*.js` at the repository root), which still
  accepted the shared code.

## 2026-11-02: Database security fixes

- `notifications` and `ivorey_overrides` were readable and writable with the public key.
  Now staff-only (signed-in). Only the staff hub uses them.
- `is_admin()` could be called without signing in. Now signed-in users only.
- Migration: `security_lock_notifications_ivorey_and_is_admin`.

## 2026-11-02: Test database only for risky database changes

- **Chose:** a temporary Supabase branch ("claudedev") only when changing access rules on
  many tables, deleted afterwards. Screen and API work is tested with a labelled test
  account on the live database.
- **Why:** a permanent second project costs about US$10/month; branches are billed by the
  hour and only needed for high-risk changes.

## 2026-11-02: Account deletion is by request

- Clients get a "Request account deletion" option. Staff delete the data within 30 days.
  The client portal is a web page saved to the home screen, not an app-store app, so
  store deletion rules don't apply; privacy law (Australian Privacy Act, GDPR) does.
