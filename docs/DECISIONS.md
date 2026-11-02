# Decisions log

Newest first. Each entry: what we chose, why, and what we rejected.

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
