# True Spring dashboard: handoff notes

Preview artifact: https://claude.ai/artifact/6N2rq3aniDe1aqLyy7ZXuj (file true-spring-dashboard.html, also in design/true-spring-dashboard-preview.html)
Light Summer preview artifact: https://claude.ai/artifact/QY7enmmapn6RpbdtnNqi4U
Season data: portal/seasons/true-spring.js (palette, families, topics, makeup, chapters, scales)
Images (guide pages, product crops img/mk/*, guide photos img/gp/*, mood/styled img/*) are published on the preview artifact; read them from there with the Artifact tool. Guide pages zip was sent to Latisha for Supabase bucket season-guides/true-spring/.

## makeup.json
Each product: img, brand, name, url (link from the PDF), clean (tracking stripped), idx (0-130 order of products with links), shopmy (ShopMy link once created).

## ShopMy (in progress, 1 Nov 2026)
All 131 makeup links are created in her ShopMy and are on the product cards (makeup.json "shopmy"; season file "url").

## Still to do

- Montana's sign-in email, then go live: port the season-driven dashboard into portal/colour-dashboard.html (keep sign-in, server sync, account), add Montana to colour_clients, Latisha uploads guide pages to season-guides/true-spring
- Website brown hex to match exactly (currently #7A5C48)
- Links for 2 bronzers (Tarte, Rare Beauty) and 4 perfumes
- App screen recording for the app card; welcome video
- Move Light Summer onto the same season-driven setup

## ShopMy rule (from Latisha)
From now on, any new product links must be added to a hidden ShopMy collection first (e.g. "True Spring Makeup"). The first True Spring makeup batch was left out of a collection on purpose. New links appear in her "Latest Finds" section, which is hidden from the public.
