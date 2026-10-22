# MasterPiece Tailor website

A static, single-page site for MasterPiece Tailor (Kelana Jaya and Cyberjaya), built to the client's **Homepage Master Wireframe** and updated with the **v2 content and logo** (MPT Website v2, Fabric Guide). Plain HTML, CSS and JavaScript with no build step. Every file sits at the top level, so you can drag them straight into a GitHub repository and deploy on Cloudflare Pages.

## Page structure

| # | Section | What it does |
| --- | --- | --- |
| 1 | Hero + trust crawl | "Luxury tailored clothing", Book a consultation, *Bespoke Within Reach.* A single line of text crawls across the screen: Est. 1998 · 28 Years of MasterPiece, Top 10 in Malaysia · Bespoke Tailoring 2025, 20,000+ · Clients Tailored, ★4.9 Google · Client Rated |
| 2 | Identity | "There is only one **you**". Words light up as you scroll, and the editorial portrait opens up |
| 3 | The MasterPiece experience | "Constructing your **MasterPiece**", led by "It all starts with understanding **you**." Numbered steps 1 Personal style, 2 Expert guidance, 3 Distinctly yours light up one by one while the Fabric Guide photos crossfade beside them |
| 4 | The process | "Your MasterPiece journey": "The Creation of Your MasterPiece in **THREE** simple steps". 01 Discover, 02 Craft, 03 Distinguish. A jacket draws itself as you scroll (pinned on desktop and phones, with tappable steps) |
| 5 | Heritage + authority | "A legacy of craftsmanship". Rolling stats (100+ years, since 1998, 20,000+ clients, 28 years), a timeline bar chart and Discover our story. Then the horizontal "Our story" timeline and the Trusted by strip |
| 6 | Product discovery | "One you. Many moments.": stacking Business, Weddings, Occasions and Everyday cards. Then "Explore the collection" with prices |
| 7 | Social proof | "The power of presence": client stories, the 4.9★ Google rating ring and Read more client stories |
| 8 | Final CTA | "Make powerful impressions", Book your complimentary consultation |
| Footer | | Large MasterPiece Tailor wordmark, both ateliers with live open/closed status, hours and directions, Explore, Connect, Privacy and Terms |
| Mobile | | Sticky WhatsApp and Book a consultation bar |

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole homepage |
| `styles.css` | Design tokens (navy and brand gold `#F4C251`), brand font stacks, layout, responsive rules, reduced-motion fallbacks |
| `main.js` | Lenis smooth scroll, GSAP ScrollTrigger scenes, SplitText reveals, the crown-drawing preloader, trust crawl, experience steps, collection filter, menu, opening hours |
| `threads.js` | The scroll-scrubbed vector background (gold threads that morph per section and react to the cursor) |
| `charts.js` | Bklit-style charts: rating ring, timeline bar, rolling numbers |
| `privacy.html`, `terms.html` | Privacy and Terms pages |
| `404.html` | Not-found page (Cloudflare Pages serves it automatically) |
| `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers` | Icon, manifest, search files, security headers |

### Logo files

Redrawn as exact vectors from the client's Illustrator file (`Masterpiece Tailor.ai`), in brand gold `#F4C251`.

| File | Used for |
| --- | --- |
| `logo.svg` | Full stacked logo (crown over wordmark). Used on the 404 page; also the one to send to anyone who asks for the logo |
| `logo-lockup.svg` | Horizontal crown + wordmark. Navigation bar on every page |
| `logo-crown.svg` | Crown only. Separators in the trust crawl and Trusted by strip |
| `logo-wordmark.svg` | "MasterPiece Tailor" wordmark. Preloader and the large footer signature |
| `favicon.svg` | Crown on navy, for browser tabs |

### Photos

Every photo is stored in the repository, so nothing depends on the old website. The suit photos have the gold crown "logo on suit" pin painted onto the lapel, as the v2 brief asks.

| File | Section | Source |
| --- | --- | --- |
| `hero-suit.jpg` | Hero (also the preview image when the link is shared) | Old website |
| `identity-suit.jpg` | There is only one you | Fabric Guide |
| `fabric-collection.jpg` | Experience, step 1 | Fabric Guide (Italian fabrics) |
| `fabric-glen-check.jpg` | Experience, step 2 | Fabric Guide (glen check) |
| `fabric-herringbone.jpg` | Experience, step 3 | Fabric Guide (herringbone) |
| `suit-business.jpg` | Business card | Old website |
| `suit-wedding.jpg` | Weddings card | Old website |
| `suit-occasions.jpg` | Occasions card | Old website (cropped from a promo poster) |
| `shirt-everyday.jpg` | Everyday card | Old website |

**To replace a photo:** save the new one as a JPG with **the same file name** and upload it to GitHub over the old one. No code changes are needed. Suit photos look best around 800 px wide and portrait; the three fabric photos are 3:2 landscape, about 1400 px wide.

## Deploy

1. **GitHub:** open the repository, click **Add file > Upload files**, drag in every file and commit. Files with the same name are replaced; the rest are added.
2. **Cloudflare:** go to **Workers & Pages > Create > Pages > Connect to Git** and pick the repository.
   - Framework preset: **None**
   - Build command: *leave empty*
   - Build output directory: `/`
3. **Check the preview** on the `*.pages.dev` address Cloudflare gives you.
4. **Custom domain:** when the client approves, add `www.masterpiecetailor.my` under **Custom domains** and follow the DNS prompts.

## Brand fonts

The brief specifies **Optima** and **Canva Sans**. Both are licensed fonts that can't be loaded from a free web font service.

- **Optima:** the CSS asks for it first, so devices that have it installed (most Macs, iPhones and iPads) show real Optima. Everyone else sees **Belleza**, the closest free match.
- **Canva Sans:** only available inside Canva. The site uses **Figtree** as its stand-in.

If the client buys web licences (for example Optima from Linotype/Monotype), add the `.woff2` files to the repository and add `@font-face` rules at the top of `styles.css`. Name them `Optima` and `Canva Sans`, and every visitor will see the real fonts.

## Buttons that point somewhere temporary

The wireframe's buttons refer to pages that don't exist yet. Until they do:

| Button | Currently goes to | Change it to |
| --- | --- | --- |
| Explore business, Discover MasterPiece Groom, Explore occasion wear, Explore | Scrolls to "Explore the collection" and highlights the matching pieces | The Business, Groom, Occasions and Everyday pages once built (edit the `href` in `index.html`) |
| Explore our collection | Instagram profile | A collection page |
| Discover our story | The "Our story" timeline on this page | An Our Story page |
| Read more client stories | Google Maps reviews (Cyberjaya) | A testimonials page |
| Insights (footer) | Instagram profile | An Insights page |
| Book a consultation (all) | https://book.masterpiecetailor.my | No change needed |

## Still to come from the client

- **Journey visuals:** the v2 brief says "Visuals to follow" for "Your MasterPiece journey". The animated line-drawn jacket stays in place until they arrive.
- **Client portraits:** client stories show gold monogram frames. Replace each `<span>` inside `.portrait` in `index.html` with `<img src="client-name.jpg" alt="">`, with the client's consent.
- **The six garments in "Explore the collection":** drawn as gold line illustrations. Real product photos can replace them later.

## Before going live: confirm with the client

- **Client-supplied figures** shown as given: 100+ years, 20,000+ clients, 28 years, Top 10 in Malaysia (Bespoke Tailoring 2025), and the prices (suits from RM1,100, shirts from RM160, trousers from RM400). Jackets, tuxedos and womenswear show "Made to measure" because no price was given.
- **Trusted by:** Malaysia Airports, MDEC, MyCEB, MS Gold and PPHM (from the wireframe), plus the other names from their corporate flyer (PR1MA, MRCA, Yes Holiday, Sonali Jewels, Persatuan Guru Besar Malaysia, Malaysian Gifts & Premium Association). They're shown as names. Swap in logo files if the client has permission to use them.
- **Heritage:** the 1920s Penang origin and royal commissions come from their old website.
- **Google rating:** from Google Maps in October 2026 (4.9 from 121 reviews across both ateliers). The figure is in `main.js` (`initRating`) and the trust crawl in `index.html`.
- **Testimonials:** three, lightly trimmed from the client's own testimonial cards.
- **Privacy and Terms:** plain-language starting points, not legal advice.

## Everyday edits

- **Trust crawl wording:** the `.trust__track` list in `index.html`. The script repeats it automatically for the loop.
- **Opening hours:** the `HOURS` object in `main.js` (live open/closed status) and the hours lists in the footer of `index.html`.
- **WhatsApp numbers:** links in `index.html`. The general number is 017-458 2366.
- **Which pieces each moment highlights:** the `data-moments` attribute on each garment in `index.html`.

## Technical notes

- **Libraries:** GSAP 3.13.0 (ScrollTrigger, SplitText), Lenis 1.3.26 and Phosphor Icons 2.1.1 from jsDelivr, and Belleza and Figtree from Google Fonts.
- **Bklit:** Bklit UI is a React + Visx registry that needs a Node build step, so `charts.js` recreates its look and behaviour in plain SVG:
  - `--chart-*` tokens
  - staggered enter animations
  - hover fades and tooltips
  - a ring chart with a live centre value
  - rolling-digit numbers
- **Accessibility:** "reduce motion" visitors get native scrolling, no pinned or scrubbed scenes, a still trust bar and a still background. Every chart has a screen-reader data table.
- **Fallback:** if the CDN libraries fail to load, the page still shows all content.
