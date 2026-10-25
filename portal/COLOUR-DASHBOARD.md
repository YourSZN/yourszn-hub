# Online Colour Analysis client dashboard

Page: `colour-dashboard.html` (clients.yourszn.com.au/colour-dashboard.html), linked from the client portal.

## How sign-in works
- **First time:** client taps "Email me a code instead", gets a 6-digit code by email (Resend; 10 minutes, max 5 codes an hour, 5 tries per code), then is asked to create a password (optional, "Skip for now").
- **After that:** email + password. No email is sent.
- **Forgot password:** emailed code, then choose a new password. This signs out their other devices.
- Wrong passwords: locked for 15 minutes after 10 tries (a correct email code also unlocks).
- Passwords are stored as scrypt hashes in `colour_clients.password_hash`, never as plain text.
- Sessions last 30 days per device. "Sign out of all devices" (Your account card on My Season) and any password change sign out every other device (`sessions_valid_after`).
- `/api/colour-dashboard` checks the session on every request.

Clients never get a Supabase login. Every staff table allows any "authenticated" Supabase user, so client logins are kept completely separate.

## One-time setup (Vercel project for clients.yourszn.com.au)
Add these Environment Variables, then redeploy:
- `COLOUR_SESSION_SECRET`: a long random string (generate with `openssl rand -hex 32`)
- `RESEND_API_KEY`: from resend.com (yourszn.com.au must be verified in Resend)
- `EMAIL_FROM`: `YourSZN <hello@yourszn.com.au>`
- `SUPABASE_SERVICE_ROLE_KEY`: already set for the Vietnam dashboard

## Adding a client
Insert a row into `colour_clients` (Supabase Table Editor):
`email` (lowercase), `name`, `season` (e.g. `Light Summer`), `tier` (`standard` or `premium`).
Optional `analysis`, e.g. `{"Contrast": "Low (3)"}` to show their own results on My Season.
Set `active` to false to switch a dashboard off.

## Season guide pages (private)
Upload page images to the private Storage bucket `season-guides`, in a folder named after the season:
`light-summer/p002.webp`, `light-summer/p037.webp` … Clients only get links that expire after 15 minutes, for their own season.

## Season content
`seasons/<season-slug>.js` holds the palette, colour names, combos and guide chapter page numbers.
Some Light Summer wording still lives in `colour-dashboard.html` and moves into the season file when the next season is added.

## Spotting shared logins
View `colour_access_summary`: logins, number of devices and IP addresses per client.

## Database
`sql/colour-dashboard.sql` (already applied to the yourszn-hub-claude Supabase project).
