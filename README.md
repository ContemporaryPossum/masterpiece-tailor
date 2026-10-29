# MasterPiece Tailor website

A static website for MasterPiece Tailor (Kelana Jaya and Cyberjaya): the homepage, an Insights page, and Privacy and Terms pages. It is built to the client's wireframe, the v2 content and logo, and the later rounds of client changes. Plain HTML, CSS and JavaScript with no build step. Every file sits at the top level, so you can drag them straight into GitHub and deploy on Cloudflare.

## What's on the homepage

| # | Section | What it does |
| --- | --- | --- |
| - | Welcome pop-up | 10% off your first MasterPiece. Visitors enter their email and the voucher is emailed to them (see "Setting up the voucher email"). Shows once, shortly after the page loads. "Maybe later" leaves a small "10% off" tab in the corner |
| 1 | Hero + trust crawl | Stacked logo in the nav, "Enquire us" (WhatsApp) top right, "Luxury tailored clothing", Book a consultation. One line of text crawls across: Est. 1998, Top 10 in Malaysia, 20,000+ clients, ★4.9 Google |
| 2 | Identity | "There is only one **you**". Words light up as you scroll |
| 3 | Your MasterPiece journey | Five steps: Consultation, Measurement, Fabric selection, Fitting, Delivery. A jacket draws itself as you scroll (pinned on desktop and phones, with tappable steps) |
| 4 | Questions & answers | The FAQ from the old website (turnaround, weddings, fabrics, womenswear) plus corporate orders, payment and appointments |
| 5 | Heritage + authority | "A legacy of craftsmanship", rolling stats, timeline chart, the "Our story" timeline and Trusted by |
| 6 | One you. Many moments. | Business, Weddings, Occasions and Everyday cards |
| 6b | Explore the collection | Six photographs (Suits, Jackets, Shirts, Trousers, Tuxedos, Womenswear), each with a price |
| 6c | Worn by our clients | The lookbook: 41 client looks as a tilted wall of columns that drift up and down, speed up and reverse with scrolling, and pause under the pointer. Style chips (Black tie, Business, Statement, Weddings, Smart casual) re-deal the wall. Any look opens full screen with arrows, swipe, thumbnails and an "Enquire about this look" WhatsApp button that names the look. Below it, 3 placeholders for client films |
| 7 | The power of presence | Client stories and the Google rating ring |
| 8 | Final CTA + footer | Book your complimentary consultation, both ateliers with live opening hours |

## The Insights page

`insights.html` shows the client's articles. They come from **Soro** (trysoro.com), the service that already writes and publishes an article every couple of days on their current website. The same Soro feed is embedded here, so:

- new articles keep appearing automatically, with nothing to upload
- every old article link (for example `masterpiecetailor.my/insights?post=guide-to-trouser-break`) keeps working once the domain moves to this site
- the page adds topic filters (Weddings, Suits & jackets, Shirts, Trousers, Fabrics, Fit & care), a search box, a large "latest article" card, "Show more", and a reading-progress bar inside articles, all in the MasterPiece look

## Files

| File | What it does |
| --- | --- |
| `index.html` | The homepage |
| `insights.html`, `insights.js` | The Insights page, and its filters and search |
| `voucher.js` | The 10% welcome voucher pop-up |
| `lookbook.js` | The "Worn by our clients" wall, style chips and full-screen viewer |
| `_worker.js` | The small server part on Cloudflare: emails the voucher through Brevo, and forwards old website addresses |
| `wrangler.jsonc` | Cloudflare Workers settings: runs `_worker.js` only for the voucher and the old addresses; everything else is served as plain files |
| `.assetsignore` | Keeps `_worker.js`, the README and any zip files from being published as web pages |
| `_routes.json` | The same routing for a Cloudflare *Pages* project (unused on Workers, harmless to keep) |
| `styles.css` | All styling: design tokens (navy and brand gold `#F4C251`), layout, responsive rules, reduced-motion fallbacks |
| `main.js` | Smooth scrolling (Lenis), scroll animations (GSAP), the preloader, nav, menu, FAQ, opening hours. Runs on both pages |
| `threads.js` | The scroll-animated vector background |
| `charts.js` | Bklit-style charts: rating ring, timeline bar, rolling numbers |
| `privacy.html`, `terms.html` | Privacy notice (now covers the voucher email) and Terms (now includes the voucher terms) |
| `404.html` | Not-found page |
| `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers` | Icon, manifest, search files, security headers |
| `logo.svg`, `logo-lockup.svg`, `logo-crown.svg`, `logo-wordmark.svg` | The logo, redrawn as vectors from the client's Illustrator file. The nav uses the stacked `logo.svg`; the lockup is kept as a spare |
| `email-logo.png` | The logo as a picture for the voucher email (email apps can't show SVG) |

### Photos

| File | Where |
| --- | --- |
| `hero-suit.jpg` | Hero |
| `identity-suit.jpg` | "There is only one you" and the voucher pop-up |
| `look-01.jpg` to `look-41.jpg` | The client lookbook (from the client's MPT pictures, 800 x 1132) |
| `fabric-collection.jpg` | The Insights page's link preview picture. `fabric-glen-check.jpg` and `fabric-herringbone.jpg` are spares (the section that used them was removed) |
| `suit-business.jpg`, `suit-wedding.jpg`, `suit-occasions.jpg`, `shirt-everyday.jpg` | Business, Weddings, Occasions and Everyday cards |
| `collection-suits.jpg`, `collection-jackets.jpg`, `collection-shirts.jpg`, `collection-trousers.jpg`, `collection-tuxedos.jpg`, `collection-womenswear.jpg` | Explore the collection. AI-generated studio photos, made for this site |

Suit photos carry the gold crown "logo on suit" pin. **To replace any photo**, save the new one as a JPG with the same file name and upload it over the old one. Collection photos are portrait 4:5, about 900 px wide.

## Deploy

1. **GitHub:** open the repository, click **Add file > Upload files**, drag in every file (including `.assetsignore` and `wrangler.jsonc`) and commit. Files with the same name are replaced; new ones are added. Only upload the site files, never the `.zip` packages.
2. **Cloudflare (Workers, the dashboard's default):** **Workers & Pages > Create > Import a repository**, pick the repository and keep the deploy command `npx wrangler deploy`. Every commit to GitHub redeploys automatically.
3. **Check the preview** on the `*.workers.dev` address Cloudflare gives you.
4. **Custom domain:** when the client approves, add `www.masterpiecetailor.my` under **Settings > Domains & Routes**. This replaces their current website.

Using a Cloudflare *Pages* project instead also works: framework preset **None**, empty build command, output directory `/`. Pages reads `_routes.json` and ignores `wrangler.jsonc`.

## Setting up the voucher email (Brevo, free)

Until this is done, the pop-up still works: when the email can't be sent, it offers to send the voucher over WhatsApp instead.

1. Create a free account at **brevo.com** with the client's business email (the free plan sends 300 emails a day).
2. In Brevo, open **Senders, Domains & Dedicated IPs > Senders** and add the address the voucher should come from, for example `ask@masterpiecetailor.my`. Brevo emails a code to confirm it. For the best delivery, also authenticate the domain under **Domains**; Brevo shows the DNS records to add.
3. Open **SMTP & API > API keys**, create a key and copy it.
4. Optional: under **Contacts > Lists**, create a list such as "Website voucher" and note its number (ID). People who tick "send me news and offers" are added to it.
5. In Cloudflare, open the project, then **Settings > Variables and Secrets**, and add:

   | Name | Value |
   | --- | --- |
   | `BREVO_API_KEY` | the key from step 3 (choose type **Secret**) |
   | `VOUCHER_FROM_EMAIL` | the sender address from step 2 |
   | `VOUCHER_CODE` | optional, defaults to `WELCOME10` |
   | `BREVO_LIST_ID` | optional, the list number from step 4 |
   | `VOUCHER_NOTIFY_EMAIL` | optional, gets a note each time a voucher is sent |
   | `VOUCHER_FROM_NAME` | optional, defaults to `MasterPiece Tailor` |

6. Settings take effect on the next deployment (any GitHub commit, or **Deployments** in Cloudflare). Then test with your own email. `wrangler.jsonc` sets `keep_vars`, so these settings survive future deployments.
7. Tell the atelier staff the voucher code, so they can apply 10% when a client quotes it.

If Brevo rejects the key with an "unrecognised IP address" message, open Brevo's **Security > Authorised IPs** and turn the IP restriction off (Cloudflare's servers don't have fixed addresses).

## Adding client photos and videos

- **A new look:** in `index.html`, find the `<li class="look" ...>` lines, copy the last one and change its `data-look` (the next number, starting from 0), `data-cat` (`black-tie`, `business`, `statement`, `weddings` or `smart-casual`), `data-cat-label`, `data-title`, the picture (`look-42.jpg`, portrait 800 x 1132) and the look number shown on it. Then update the numbers on the style chips above the wall. The wall, filters and viewer pick it up automatically.
- **A client film:** the three "Client film" placeholders are under the wall (search for `worn__ph`). Replace a whole `<div class="worn__ph">...</div>` with `<video src="client-video-1.mp4" poster="client-video-1.jpg" muted loop playsinline preload="none"></video>`. Use short, portrait 9:16 MP4s under about 8 MB each. They play by themselves while on screen, and a sound button appears automatically.
- Upload the new files to GitHub, and only use client photos and videos with the client's consent.

## Old website addresses

Once the domain points here, these old pages forward automatically (in `_worker.js`, routed by `wrangler.jsonc`): `/craftsmanship` to the journey, `/promotion` to the collection, `/corporate` to Business, `/contact` to Visit us, `/news` to Our story, `/career` to the homepage and `/privacy-policy` to Privacy. `/insights` and its `?post=` article links keep working as they are.

## Confirm with the client before going live

- **Prices.** Suits from RM1,100, Shirts from RM160 and Trousers from RM400 are the wireframe's figures. Tuxedos from RM1,399 comes from their Promotion page. **Jackets (RM700) and Womenswear (RM1,100) are placeholders** worked out from the suit and trouser prices, because the client hasn't published them. Also, their Promotion page lists shirts from RM195 and trousers from RM450, which differs from the wireframe. Prices are in `index.html` (search for `garment__price`).
- **Voucher terms.** The pop-up and email say "one voucher per client, on your first order" and that it can't be combined with other promotions (worded like their own promotion terms). Edit in `index.html`, `insights.html`, `terms.html` and `_worker.js` (`TERMS`).
- **FAQ.** The first four answers are from their old website. "How does payment work?" (50% deposit, balance on collection) comes from their promotion terms. Check that it applies to all orders.
- **Figures.** 100+ years, 20,000+ clients, 28 years and Top 10 in Malaysia are shown as the client gave them. The Google rating (4.9 from 121 reviews, October 2026) is in `main.js` (`initRating`).
- **Collection photos are AI-generated** product shots. Replace them with real photos whenever the client has them.
- **Privacy and Terms** are plain-language starting points, not legal advice.

## Everyday edits

- **Trust crawl wording:** the `.trust__track` list in `index.html`.
- **FAQ:** the `faq__item` blocks in `index.html`, and the matching `FAQPage` data near the top of the file (for Google).
- **Opening hours:** `HOURS` in `main.js` and the hours lists in both footers.
- **WhatsApp numbers:** links in `index.html` and `insights.html`. Enquire us and the voucher use 017-458 2366.

## Technical notes

- **Libraries:** GSAP 3.13.0 (ScrollTrigger, SplitText), Lenis 1.3.26 and Phosphor Icons 2.1.1 from jsDelivr, Belleza and Figtree from Google Fonts.
- **Fonts:** the brand fonts Optima and Canva Sans are licensed. The CSS asks for Optima first (most Apple devices have it), then Belleza; Figtree stands in for Canva Sans. Add `@font-face` rules if the client buys web licences.
- **Bklit:** `charts.js` recreates Bklit UI's look in plain SVG, as Bklit itself needs a React build step.
- **Accessibility:** reduced-motion visitors get native scrolling and still scenes; the pop-up is a native dialog (Escape closes it, focus stays inside); every chart has a screen-reader table.
- **Fallback:** if the CDN libraries fail to load, the pages still show all content.
