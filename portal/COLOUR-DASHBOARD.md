# Online Colour Analysis client dashboard

Page: `colour-dashboard.html` (clients.yourszn.com.au/colour-dashboard.html), linked from the client portal.

## How sign-in works
1. Client enters their email. `/api/colour-auth` checks `colour_clients` and emails a 6-digit code via Resend (10 minutes, max 5 codes an hour, 5 tries per code).
2. Client enters the code and gets a signed session (30 days) stored on their device.
3. `/api/colour-dashboard` checks that session on every request.

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
