# Client site: clients.yourszn.com.au

Everything in `portal/` is the client-facing site. It is deployed by its own Vercel
project, which serves this folder at clients.yourszn.com.au. The staff hub
(portal.yourszn.com.au) is the repository root and is a separate deployment.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Client portal: entry cards for each service |
| `colour-dashboard.html` | Online Colour Analysis results dashboard (see `COLOUR-DASHBOARD.md`) |
| `vietnam-tour.html` | Vietnam Tailoring Tour trip dashboard (+ `vietnam-wardrobe.js`, `vietnam-map.js`) |
| `yourszn-form-7.html` | Online Colour Analysis questionnaire and photo upload |
| `client-upload.html` | In-person booking photo upload |

## How clients sign in

Clients never get a Supabase login: every staff table allows any signed-in Supabase
user, so client sessions are kept completely separate.

1. The client enters their email. The server emails a 6-digit code (Resend), but only
   if the email is on that dashboard's client list. The answer looks the same either
   way, so the form can't be used to find out who is a client.
2. The client enters the code. The server checks it and returns a signed session token.
3. The page sends the token as `Authorization: Bearer …` on every API call. The server
   works out who the client is from the token alone; ids or emails sent by the browser
   are ignored.

| | Colour dashboard | Vietnam Tailoring Tour |
|---|---|---|
| Sign-in API | `api/colour-auth.js` | `api/vietnam-login.js` |
| Client list | `colour_clients` (`active = true`) | `vietnam_clients` (any row with that email) |
| Session length | 30 days | 7 days (holds passport and flight details) |
| Token scope | `colour` | `tour` |
| Passwords | Optional | No (code only) |

A token only opens the dashboard it was issued for (the `scope`), so a colour dashboard
sign-in can't open a tour dashboard, or the reverse.

Limits (in `api/_login-codes.js`): codes last 10 minutes, work once, lock after 5 wrong
tries, and at most 5 codes per email per hour. Codes are stored only as HMAC hashes.

## API files (`portal/api/`)

Files starting with `_` are shared helpers, not endpoints.

| File | Job |
|---|---|
| `_colour.js` | Supabase access (service role), CORS, signed session tokens, password hashing |
| `_login-codes.js` | Creating, emailing and checking 6-digit sign-in codes |
| `_tour.js` | `tourSession()`: who is signed in to the tour dashboard. Every tour endpoint calls it first |
| `colour-auth.js`, `colour-dashboard.js` | Colour dashboard sign-in and data |
| `vietnam-login.js` | Tour sign-in |
| `vietnam-dashboard.js`, `-board.js`, `-budget.js`, `-info.js`, `-packing.js`, `-wardrobe.js` | Tour dashboard data, each scoped to the signed-in client |
| `vietnam-staff-info.js` | Staff-only tour admin (needs a staff Supabase session) |
| `client-submission.js`, `client-booking.js` | Questionnaire and photo-upload backends |

## Environment variables (Vercel project for clients.yourszn.com.au)

| Name | What |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API. Server only, never in page code |
| `COLOUR_SESSION_SECRET` | Long random string (`openssl rand -hex 32`). Signs sessions and hashes codes. Changing it signs everyone out |
| `RESEND_API_KEY` | resend.com, with yourszn.com.au verified |
| `EMAIL_FROM` | `YourSZN <hello@yourszn.com.au>` |

## Giving someone tour access

Add them in the staff hub (Tours page) with the email they will sign in with. Each
email must belong to exactly one tour client. Removing the client ends their access
on their next request.

## Decisions

See `../docs/DECISIONS.md` for what was chosen and why.
