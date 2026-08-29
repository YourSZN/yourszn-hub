# Your SZN — Business Hub

## Folder structure

```
project/
  index.html          ← The app. This is what loads in the browser.
  vercel.json         ← Vercel deployment config (don't touch)

  css/                ← All styles, one file per section
    variables.css     ← Colours and fonts — change here to update everywhere
    login.css         ← Login screen
    layout.css        ← Sidebar and main content area
    components.css    ← Shared: cards, buttons, forms, tables
    clients.css       ← Clients page
    tasks.css         ← Tasks page
    sops.css          ← SOPs page
    huestripe.css     ← Hue & Stripe colour analysis
    tours.css         ← Tours page
    social.css        ← Social media planner
    comms.css         ← Comms / messages
    goals.css         ← Goals page
    finances.css      ← Finances page
    misc.css          ← Everything else (modals, planner, print styles)

  js/                 ← All JavaScript, one file per section
    globals.js        ← Shared data and state (loaded first)
    utils.js          ← Small helper functions
    core.js           ← Navigation, save/load data
    auth.js           ← Login / logout
    dashboard.js      ← Dashboard page
    clients.js        ← Clients page
    tasks.js          ← Tasks page
    staff.js          ← Staff page
    finances.js       ← Finances page
    sops.js           ← SOPs page
    tours.js          ← Tours page
    vietnam.js        ← Vietnam tour
    comms.js          ← Comms / messaging
    vouchers.js       ← Gift vouchers
    social.js         ← Social media planner
    marketing.js      ← Marketing / creator CRM
    oca.js            ← Hue & Stripe colour analysis
    reports.js        ← PDF report generation
    app.js            ← Entry point (runs on page load)
```

## How to make changes

- **Change a colour** → edit `css/variables.css`
- **Fix a bug in Tasks** → edit `js/tasks.js` or `css/tasks.css`
- **Add a new section** → create `js/newsection.js`, add `<script>` tag in `index.html`
- **Change the sidebar** → edit `css/layout.css`

## Deployment

This project deploys automatically to Vercel when you push to GitHub.

1. Make your changes
2. Push to GitHub
3. Vercel picks it up and deploys in ~30 seconds

## RevenueCat setup

1. Create a RevenueCat project and add your app in the dashboard.
2. Open [project/js/revenuecat.js](project/js/revenuecat.js) and replace the placeholder public API key.
3. Set your entitlement ID and offering ID if they differ from the defaults.
4. Load the app and click “Check RevenueCat” in the sidebar to confirm initialization.
5. Add your purchase and restore flows next using the RevenueCat web SDK.

## Data

All data is currently stored in the browser (`localStorage`). Future plan: move to Supabase for proper database storage and login security.
