# True Spring dashboard: handoff notes

Preview artifact: https://claude.ai/artifact/6N2rq3aniDe1aqLyy7ZXuj (file true-spring-dashboard.html, also in design/true-spring-dashboard-preview.html)
Light Summer preview artifact: https://claude.ai/artifact/QY7enmmapn6RpbdtnNqi4U
Season data: portal/seasons/true-spring.js (palette, families, topics, makeup, chapters, scales)
Images (guide pages, product crops img/mk/*, guide photos img/gp/*, mood/styled img/*) are published on the preview artifact; read them from there with the Artifact tool. Guide pages zip was sent to Latisha for Supabase bucket season-guides/true-spring/.

## makeup.json
Each product: img, brand, name, url (link from the PDF), clean (tracking stripped), idx (0-130 order of products with links), shopmy (ShopMy link once created).

## ShopMy (in progress, 1 Nov 2026)
Links are being created in Latisha's ShopMy (Chrome, shopmy.us/links) by a script running in that tab, in idx order 4..130. Duplicate URLs reuse the same link. Done and recorded here: idx 0-28. To collect the rest: read her ShopMy "My Links" list (newest first) and match by product/merchant, or re-run for missing idx. Then put shopmy links on the product cards (prodCard uses x.url; switch to shopmy where present) and republish.

## Still to do
- Finish ShopMy links, swap into dashboard
- Montana's sign-in email, then go live: port the season-driven dashboard into portal/colour-dashboard.html (keep sign-in, server sync, account), add Montana to colour_clients, Latisha uploads guide pages to season-guides/true-spring
- Website brown hex to match exactly (currently #7A5C48)
- Links for 2 bronzers (Tarte, Rare Beauty) and 4 perfumes
- App screen recording for the app card; welcome video
- Move Light Summer onto the same season-driven setup

## ShopMy rule (from Latisha)
From now on, any new product links must be added to a hidden ShopMy collection first (e.g. "True Spring Makeup"). The first True Spring makeup batch was left out of a collection on purpose. New links appear in her "Latest Finds" section, which is hidden from the public.
