# Staff hub: Clients page (Latisha and Salma)

The **Clients** page in the staff hub (portal.yourszn.com.au) lists every Online Colour
Analysis client, one row per email. It replaced the old in-person Clients page and the
Client Profiles tab on 2 Nov 2026.

## What it shows and does

| On the page | Saved in | Notes |
|---|---|---|
| **Paid** tick | `oca_clients.paid`, `paid_at` | Ticked by hand for now. The Shopify webhook will do it later. |
| **Status** (New, In progress, Complete, Sent) | `szn_submissions.status` of their latest questionnaire | Same values as the Online Analysis page; changing it in either place changes both. |
| **Season (from your drape)** | `oca_clients.drape_season` | Separate from the season the client predicted. |
| **Tier** (Standard / Premium) | `oca_clients.tier` | Also updates a live dashboard. |
| **Give dashboard access + email client** | `colour_clients` (row made or switched on) | Only for seasons in `READY_SEASONS` in `api/admin-clients.js` (True Spring for now). Sends "Your colour results are ready" with a link to clients.yourszn.com.au. |
| **Resend "results ready" email** | | Only when the dashboard is live. |
| **Remove dashboard access** | `colour_clients.active = false` | Signs them out of the dashboard straight away. Can be reopened. |
| **+ Grant OCA access** | new `oca_clients` row, marked paid | For someone who paid with a different email: add the email they'll sign in with (and optionally the one they paid with). No email is sent. |
| **Open questionnaire + photos** | | Jumps to that questionnaire on the Online Analysis page. |

Filters: All, Paid not submitted, New, In progress, Complete, Dashboard live.
A client appears once they have any of: an `oca_clients` row, a sent questionnaire (drafts
don't count), or a `colour_clients` row. The sidebar badge counts New questionnaires.

The sidebar **Search clients…** box and the dashboard's **Today** card ("Clients waiting
on you": New, In progress, or Complete without a live dashboard) use the same list.

## Files

| File | Job |
|---|---|
| `app-admin-clients.js` | The page, the sidebar search and the dashboard Today card. Draws only; every change goes through the API. |
| `api/admin-clients.js` | The API. Admin check first, then list / update / grant / give_dashboard / resend_email / remove_dashboard. |
| `api/_staff.js` | Shared helper for staff APIs: works out who is signed in from their hub session and checks their role. |
| `portal/sql/2026-11-02-oca-clients.sql` | The `oca_clients` table (service role only). |
| `tests/staff/admin-clients.test.js` | Checks for the API. Run `node tests/staff/admin-clients.test.js`. |

## Who can use it

People whose `profiles.role` is `admin` or `staff` (today: Latisha and Salma). The server
checks this on every request, from the hub's own login session; the browser can't claim a
role. Any other signed-in login is refused. Every change records who made it
(`oca_clients.updated_by`, and `colour_access_log` for dashboard access).
`oca_clients` can't be read or changed with the public or staff keys at all, only by the server.

To give someone else access: give them a `profiles.role` of `staff` in Supabase
(Table editor → profiles), and add `'clients'` to their `pages` in `USERS` in `app.js`.
To take it away from staff, change `['admin', 'staff']` to `['admin']` in `api/admin-clients.js`.

## Server settings (Vercel project for portal.yourszn.com.au)

Uses `SUPABASE_SERVICE_ROLE_KEY` (already needed by the Tours page) and `RESEND_API_KEY`
(already used for staff emails). Optional `EMAIL_FROM`.
