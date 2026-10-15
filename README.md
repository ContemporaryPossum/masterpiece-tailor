# MasterPiece Tailor website

A static, single-page site for MasterPiece Tailor (Kelana Jaya and Cyberjaya). Plain HTML, CSS and JavaScript with no build step. Every file sits at the top level, so you can drag them straight into a GitHub repository and deploy on Cloudflare Pages.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole site: hero, client marquee, heritage timeline, the five-step craft drawing, collection, review charts, testimonials, offers, FAQ, ateliers and the WhatsApp enquiry form |
| `styles.css` | Design tokens (navy and gold), layout, responsive rules, reduced-motion fallbacks |
| `main.js` | Lenis smooth scroll, GSAP ScrollTrigger scenes, SplitText reveals, menu, FAQ, form, opening hours, offer countdown |
| `threads.js` | The scroll-scrubbed vector background (gold "threads" that morph per section and react to the cursor) |
| `charts.js` | Bklit-style animated charts (ring, bar, gauge, rolling numbers) |
| `privacy.html` | Privacy page |
| `404.html` | Not-found page (Cloudflare Pages serves it automatically) |
| `favicon.svg`, `site.webmanifest` | Icon and app manifest |
| `robots.txt`, `sitemap.xml` | Search engine files |
| `_headers` | Cloudflare Pages security headers |

## Deploy

1. **GitHub:** create a new repository, click **Add file > Upload files**, drag in every file from this folder, and commit.
2. **Cloudflare:** go to **Workers & Pages > Create > Pages > Connect to Git** and pick the repository.
   - Framework preset: **None**
   - Build command: *leave empty*
   - Build output directory: `/`
3. Deploy. Every later push to GitHub redeploys automatically.
4. **Custom domain:** in the Pages project, open **Custom domains** and add `www.masterpiecetailor.my` (and the bare domain if you want it). Follow Cloudflare's DNS prompts.

To preview locally, open `index.html` in a browser. It needs an internet connection for fonts, libraries and photos.

## Before going live: confirm with the client

- **Heritage claims.** The 1920s Penang origin and the commissions for Tunku Abdul Rahman, the Sultan of Kedah, the Raja Muda of Perlis and the Empress of Iran come from the client's current website. Confirm they're happy to show them.
- **"Top 10 in Malaysia" (2025).** Their site says "ranked #1". The publisher's article lists them without a numbered position, so this site says "named among the Top 10".
- **Kelana Jaya opening year.** Not published anywhere, so the timeline shows it as "Today". Add the year if they have it.
- **Review numbers** (Proof section, set in `main.js` under `initProof`): Google Maps on 14 October 2026 showed Cyberjaya at 4.9 from 100 reviews (96 five-star, 2 four-star, 1 two-star, 1 one-star) and Kelana Jaya at 5.0 from 21. Facebook showed 100% recommend from 11 reviews. Update these from time to time.
- **Corporate client list** (marquee) comes from their corporate flyer. Confirm each organisation is happy to be named.
- **Testimonials** are lightly trimmed from the client's own testimonial cards.
- **Privacy page** is a plain-language starting point, not legal advice.

## Photos: move them off the old host

The photos currently load from the existing website's image host (`primary.jwwb.nl`). They will stop working if the old Jouwweb site is cancelled. Before then:

1. Download each image below and add it to the repository root with the suggested name.
2. Replace the matching long URL in `index.html` with the file name (for example `src="hero-suit.jpg"`).

| Used for | Suggested name | Current file on the old host |
| --- | --- | --- |
| Hero | `hero-suit.jpg` | `3801889901.jpg` |
| Suits card | `suits.jpg` | `photo_2024-02-18152011.jpg` |
| Shirts card | `shirts.jpg` | `pl59ap/photo_2024-01-28224443.jpg` |
| Trousers card | `trousers.png` | `6j4o27/19102961171-1.png` |
| Weddings card | `wedding.jpg` | `wedding-636021_640.jpg` (only 464 px wide, a larger photo would look better) |
| Corporate card | `corporate.png` | `masterpiece-corporate-wear-high.png` (a poster cropped by CSS, a real team photo would be better) |

Better still, swap in the client's own atelier and fitting photography wherever possible.

## Everyday edits

- **Offers and their end date:** `index.html`, the `data-ends` attribute on the offers section and the `data-expires` attributes on the two promo prices. After the end date the section switches to a "Chat on WhatsApp" prompt and the promo prices hide themselves.
- **Opening hours:** `main.js`, the `HOURS` object (used for the live "Open now" status) plus the hours lists in `index.html`.
- **WhatsApp numbers:** `main.js`, the `WA` object (used by the enquiry form), plus links in `index.html`.
- **Booking link:** every "Book a fitting" button points to `https://book.masterpiecetailor.my`.

## Technical notes

- Libraries load from jsDelivr at pinned versions: GSAP 3.13.0 (with ScrollTrigger and SplitText), Lenis 1.3.26 and Phosphor Icons 2.1.1. Fonts come from Google Fonts (Bodoni Moda, Manrope, JetBrains Mono).
- **About Bklit:** Bklit UI is a React + Visx component registry that installs through the shadcn CLI and needs a Node build step. That doesn't fit a flat, no-build static site, so `charts.js` recreates Bklit's look and behaviour in plain SVG:
  - grid, series, axes and tooltip layers
  - `--chart-*` CSS tokens
  - roughly 1.1 second staggered enter animations
  - faded siblings and crosshair tooltips on hover
  - ring charts with a live centre value
  - rolling-digit numbers
- **Accessibility:** visitors with "reduce motion" switched on get native scrolling, no pinned or scrubbed scenes and a still background. Every chart includes a screen-reader data table.
- If the CDN libraries fail to load, the page still shows all content as a normal static page.
