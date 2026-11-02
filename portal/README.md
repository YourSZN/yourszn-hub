# Client site: clients.yourszn.com.au

Everything in `portal/` is the client-facing site. It is deployed by its own Vercel
project, which serves this folder at clients.yourszn.com.au. The staff hub
(portal.yourszn.com.au) is the repository root and is a separate deployment.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Client portal: sign-in, then a home page showing this client's analysis, tour and dashboard |
| `colour-dashboard.html` | Online Colour Analysis results dashboard (see `COLOUR-DASHBOARD.md`) |
| `vietnam-tour.html` | Vietnam Tailoring Tour trip dashboard (+ `vietnam-wardrobe.js`, `vietnam-map.js`) |
| `yourszn-form-7.html` | Online Colour Analysis questionnaire and photo upload |

## How clients sign in

Clients never get a Supabase login: every staff table allows any signed-in Supabase
user, so client sessions are kept completely separate.

Clients sign in once, on the portal front page (`index.html`):

1. Name and email, then a 6-digit emailed code (`api/client-auth.js`). Anyone can sign
   in, because new clients need to start their questionnaire. This gives a **portal**
   session, which only proves the person owns the email.
2. The home page asks `api/client-home.js` what applies to that email: their latest
   questionnaire, whether they're booked on the tour, and whether their colour
   dashboard is open.
3. Tapping **Open your tour** or **Open your Colour Dashboard** asks `client-home` for
   that dashboard's own session. It is only given if the email is on that dashboard's
   client list. The page stores it where the dashboard looks for it, so there's no
   second sign-in.
4. **Sign out** (on any of the three pages) removes every YourSZN session from the device.

The tour and colour dashboard pages also keep their own sign-in, for clients who go
there directly:

1. The client enters their email. The server emails a 6-digit code (Resend), but only
   if the email is on that dashboard's client list. The answer looks the same either
   way, so the form can't be used to find out who is a client.
2. The client enters the code. The server checks it and returns a signed session token.
3. The page sends the token as `Authorization: Bearer …` on every API call. The server
   works out who the client is from the token alone; ids or emails sent by the browser
   are ignored.

| | Portal home | Colour dashboard | Vietnam Tailoring Tour |
|---|---|---|---|
| Sign-in API | `api/client-auth.js` | `api/colour-auth.js` | `api/vietnam-login.js` |
| Who can sign in | Anyone | `colour_clients` (`active = true`) | `vietnam_clients` (any row with that email) |
| Session length | 30 days | 30 days | 7 days (holds passport and flight details) |
| Token scope | `portal` (holds the email) | `colour` | `tour` |
| Stored on the device as | `szn_portal_session` | `szn_colour_token` | `vt_session` |
| Passwords | No (code only) | Optional | No (code only) |

A token only opens the area it was issued for (the `scope`): a portal session can't
read a tour or colour dashboard directly, and the dashboards' sessions can't open the
portal home.

Limits (in `api/_login-codes.js`): codes last 10 minutes, work once, lock after 5 wrong
tries; at most 5 codes per email and 10 per IP address per hour. Codes are stored only
as HMAC hashes, and code rows are deleted after 7 days.

### Home page states (from `client-home`)

| Analysis | When | Client sees |
|---|---|---|
| `none` | No questionnaire, or only a draft | Start your questionnaire |
| `submitted` | Status `pending` | Progress: Submitted, plus Upload revised photos |
| `review` | Status `in_progress` or `complete` | Progress: In review, plus Upload revised photos |
| `sent` | Status `sent` | Progress: Results, marked Done |

The colour dashboard card unlocks when the email has an active `colour_clients` row.
Latisha creates that row with **Give dashboard access + email client** on the staff hub's
Clients page (see `../docs/CLIENTS-PAGE.md`). The tour card shows **Open your tour** when the
email is on the tour list, otherwise a link to the website.

## API files (`portal/api/`)

Files starting with `_` are shared helpers, not endpoints.

| File | Job |
|---|---|
| `_colour.js` | Supabase access (service role), CORS, signed session tokens, password hashing |
| `_login-codes.js` | Creating, emailing and checking 6-digit sign-in codes |
| `_tour.js` | `tourSession()`: who is signed in to the tour dashboard (every tour endpoint calls it first); `findTourClient()` |
| `_portal.js` | `portalSession()`: who is signed in to the portal home; `latestSubmission()` |
| `client-auth.js`, `client-home.js` | Portal sign-in and home page data |
| `colour-auth.js`, `colour-dashboard.js` | Colour dashboard sign-in and data |
| `vietnam-login.js` | Tour sign-in |
| `vietnam-dashboard.js`, `-board.js`, `-budget.js`, `-info.js`, `-packing.js`, `-wardrobe.js` | Tour dashboard data, each scoped to the signed-in client |
| `vietnam-staff-info.js` | Staff-only tour admin (needs a staff Supabase session) |
| `client-submission.js` | Revised photos, for the signed-in client's own questionnaire |

## Environment variables (Vercel project for clients.yourszn.com.au)

| Name | What |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API. Server only, never in page code |
| `COLOUR_SESSION_SECRET` | Long random string (`openssl rand -hex 32`). Signs sessions and hashes codes. Changing it signs everyone out |
| `RESEND_API_KEY` | resend.com, with yourszn.com.au verified |
| `EMAIL_FROM` | `YourSZN <hello@yourszn.com.au>` |

## Tests

`node tests/portal/api.test.js` runs security and behaviour checks on these APIs against
a pretend database and email service (no network, no real data). Run it before every
change to `portal/api`, and add a check when you change an API.

The staff hub's Clients API has its own checks: `node tests/staff/admin-clients.test.js`.

## Not built yet

- **Payment check:** anyone signed in can start the questionnaire, as before (the old
  access code was visible in the page source). The Shopify webhook will add this.
- **Account deletion requests:** handled by email for now (hello@yourszn.com.au).

## Giving someone colour dashboard access

Staff hub → **Clients** → pick the client → choose their season (from the drape) and
tier → **Give dashboard access + email client**. Only seasons whose dashboard is built
can be chosen (`READY_SEASONS` in `api/admin-clients.js`, at the repository root).
Details: `../docs/CLIENTS-PAGE.md`.

## Giving someone tour access

Add them in the staff hub (Tours page) with the email they will sign in with. Each
email must belong to exactly one tour client. Removing the client ends their access
on their next request.

## Decisions

See `../docs/DECISIONS.md` for what was chosen and why.
