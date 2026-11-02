# Online Colour Analysis client dashboard

Clients open it from the portal home (clients.yourszn.com.au → **Open your Colour Dashboard**).
There are two pages, sharing one sign-in:

| Page | What | Used for |
|---|---|---|
| `colour-dashboard.html` | The season-driven design (Home, Palette, Try On, Makeup, Wardrobe, Learn) | Every season whose season file has `topics` (True Spring) |
| `colour-dashboard-classic.html` | The original design (My Season, Palette, Season Guide, Combos, Practise, Closet) | Seasons not yet written for the new design (Light Summer) |

`colour-dashboard.html` always loads first. After sign-in it loads the client's season file;
if that file has no `topics`, it hands over to the classic page (same session, no second sign-in).
When a season's content is written for the new design, add `topics` (and the rest, see below)
and its clients move over automatically. The classic page can be deleted once no season needs it.

## How sign-in works
Clients normally sign in on the portal front page and come here from their home page.
**One password covers the whole client site** (front page and this dashboard), stored once
per email in `client_accounts` (`api/_accounts.js`). The front page asks for it after a code
sign-in ("Skip for now" allowed); it can also be set here.

On this page's own sign-in:
- **First time:** client taps "Email me a code instead", gets a 6-digit code by email (Resend; 10 minutes, max 5 codes an hour, 5 tries per code), then is asked to create a password (optional, "Skip for now").
- **After that:** email + password. No email is sent.
- **Forgot password:** emailed code, then choose a new password. This signs out their other devices.
- Wrong passwords: locked for 15 minutes after 10 tries (a correct email code also unlocks).
- Passwords are stored as scrypt hashes in `client_accounts.password_hash`, never as plain text. (`colour_clients.password_*` columns are no longer used.)
- Sessions last 30 days per device. "Sign out of all devices" (account menu) and any password change sign out every other device, on the front page and here (`sessions_valid_after` in both `client_accounts` and `colour_clients`).
- Clients coming from the portal home are signed in automatically (see `README.md`).
- `/api/colour-dashboard` checks the session on every request.

Clients never get a Supabase login. Every staff table allows any "authenticated" Supabase user, so client logins are kept completely separate.

## What is saved, and where
Saved to the server (`colour_client_state`), so it follows the client to any device:
favourite colours, quiz scores, closet worksheet, first-week checklist, and the makeup bag
(`makeup_bag`). Saved on the device only: the selfie used for Try On (never uploaded), which
tab and section was open.

## Giving a client access
Staff hub → **Clients** → choose their season and tier → **Give dashboard access + email client**
(see `../docs/CLIENTS-PAGE.md`). That creates or switches on their `colour_clients` row.
Optional `analysis` on that row, e.g. `{"Contrast": "Low (3)"}`, shows their own results (classic page).

**Trial clients** try a finished season (e.g. True Spring) before their own is built: their
`colour_clients` row has `trial = true`, and the dashboard shows a banner saying it isn't
their result. Set it in Supabase (Table editor → colour_clients). When their own season is
ready: Clients page → Remove dashboard access → choose their real season → Give dashboard
access. That switches `trial` off and emails them.

## Season guide pages (private)
The full guide pages are paid content, so they are never in this folder. Upload page images
to the private Storage bucket `season-guides`, in a folder named after the season:
`true-spring/p002.webp` … `true-spring/p100.webp`. Clients only get links that expire after
15 minutes, for their own season. The page refreshes them automatically.

## Season content (`seasons/<season-slug>.js`)
One file per season: palette, colour names, families, combos, guide topics, makeup, picks.
Season images (styling photos, product shots, small guide crops) live next to it in
`seasons/<season-slug>/` and are named in the file without the folder, e.g. `hero.webp`,
`mk/lips-67-0-177.webp`. Images shared by every season (logo, app recording) are in `img/`.

To be shown on the new design, a season file needs at least: `name`, `plural`, `traits`,
`hero`, `sig`, `families`, `palette`, `names`, `avoidGeneral`, `swaps`, `combos`, `neighbours`,
`sisters`, `metals`, `scales`, `guidePages`, `fanPages`, `topics`, `images`, `trySlots`.
`makeup`, `makeupLooks` and `shopPicks` are optional (the sections hide without them).
Optional wording: `swapText` (neutral swaps intro), `swapQuiz` and `swapWhy` (Neutral swaps quiz).

## Layout
- **Home:** welcome, next steps, looks, app showcase (`img/app-demo.mp4`, trimmed 2 Nov so it never stops on unloaded product photos).
- **Account menu:** the avatar (top right on phones) or "Signed in as" (sidebar on desktop) opens Your account (password, sign out, sign out everywhere), the Vietnam Tailoring Tour (Open your tour if their email is on the tour list, otherwise the enquiry form) and Add to your home screen.
- **Palette:** My colours · Season profile (temperature/value/chroma/contrast, metals, sister seasons) · Combos. Tapping a colour opens its card; **See it full screen** (or tapping the big swatch) fills the screen with it, swipe or arrows to move through the palette.
- **Try On:** photo and colour picker side by side on desktop, stacked on phones.
- **Makeup:** opens on "Makeup for <season>" (intro, looks, the three keys) with a tile per category (and My makeup bag once something is saved); a tile opens that category, with "← All makeup" to go back.
- **Wardrobe** (Latisha's picks · My wardrobe, which ends with the travel capsule), **Learn** (Guide · Quizzes).
`seasons/true-spring.js` is the complete example to copy.

## Spotting shared logins
View `colour_access_summary`: logins, number of devices and IP addresses per client.

## Database
`sql/colour-dashboard.sql` and `sql/2026-11-02-makeup-bag.sql` (both applied to the yourszn-hub-claude Supabase project).
