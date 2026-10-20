# MasterPiece Tailor website

A static, single-page site for MasterPiece Tailor (Kelana Jaya and Cyberjaya), built to the client's **Homepage Master Wireframe**. Plain HTML, CSS and JavaScript with no build step. Every file sits at the top level, so you can drag them straight into a GitHub repository and deploy on Cloudflare Pages.

## Page structure (follows the wireframe)

| # | Section | What it does |
| --- | --- | --- |
| 1 | Hero + quick trust bar | "Luxury tailored clothing", Book a consultation, *Bespoke Within Reach.* Trust bar: Est. 1998, Kelana Jaya + Cyberjaya, 15–20 days, 4.9★ Google |
| 2 | Identity | "There is only one you". Words light up as you scroll, and the editorial portrait opens up |
| 3 | The MasterPiece experience | "Constructing your MasterPiece". A fabric swatch book fans open, followed by the three pillars and Book a consultation |
| 4 | The process | "Your MasterPiece journey": 01 Discover, 02 Craft, 03 Distinguish. A jacket draws itself as you scroll (pinned on desktop and phones, with tappable steps) |
| 5 | Heritage + authority | "A legacy of craftsmanship". Rolling stats (100+ years, since 1998, 19,889 clients, 28 years), a timeline bar chart and Discover our story. Then the horizontal "Our story" timeline and the Trusted by strip |
| 6 | Product discovery | "One you. Many moments.": stacking Business, Weddings, Occasions and Everyday cards. Then "Explore the collection": Suits, Jackets, Shirts, Trousers, Tuxedos and Womenswear, with prices |
| 7 | Social proof | "The power of presence": client stories with portrait frames, plus the 4.9★ Google rating ring and Read more client stories |
| 8 | Final CTA | "Make powerful impressions", Book your complimentary consultation |
| Footer | | Visit us (both ateliers with live open/closed status, hours and directions), Explore, Connect, Book a consultation, Privacy and Terms |
| Mobile | | Sticky WhatsApp and Book a consultation bar |

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole homepage |
| `styles.css` | Design tokens (navy and gold), brand font stacks, layout, responsive rules, reduced-motion fallbacks |
| `main.js` | Lenis smooth scroll, GSAP ScrollTrigger scenes, SplitText reveals, collection filter, menu, opening hours, sticky mobile bar |
| `threads.js` | The scroll-scrubbed vector background (gold threads that morph per section and react to the cursor) |
| `charts.js` | Bklit-style charts: rating ring, timeline bar, rolling numbers |
| `privacy.html`, `terms.html` | Privacy and Terms pages |
| `404.html` | Not-found page (Cloudflare Pages serves it automatically) |
| `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `_headers` | Icon, manifest, search files, security headers |

## Deploy

1. **GitHub:** create a repository, click **Add file > Upload files**, drag in every file and commit.
2. **Cloudflare:** go to **Workers & Pages > Create > Pages > Connect to Git** and pick the repository.
   - Framework preset: **None**
   - Build command: *leave empty*
   - Build output directory: `/`
3. **Custom domain:** add `www.masterpiecetailor.my` under **Custom domains** and follow the DNS prompts.

## Brand fonts

The wireframe specifies **Optima** and **Canva Sans**. Both are licensed fonts that can't be loaded from a free web font service.

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

## Before going live: confirm with the client

- **Client-supplied figures** shown as given: 100+ years, 19,889 clients served, 28 years, and the prices (suits from RM1,100, shirts from RM160, trousers from RM400). Jackets, tuxedos and womenswear show "Made to measure" because no price was given.
- **Trusted by:** Malaysia Airports, MDEC, MyCEB, MS Gold and PPHM (from the wireframe), plus the other names from their corporate flyer (PR1MA, MRCA, Yes Holiday, Sonali Jewels, Persatuan Guru Besar Malaysia, Malaysian Gifts & Premium Association). They're shown as names. Swap in logo files if the client has permission to use them.
- **Heritage:** the 1920s Penang origin and royal commissions come from their old website.
- **Google rating:** from Google Maps in October 2026 (4.9 from 121 reviews across both ateliers). The figures are in `main.js` (`initRating`) and the trust bar in `index.html`.
- **Testimonials:** three, lightly trimmed from the client's own testimonial cards.
- **Privacy and Terms:** plain-language starting points, not legal advice.

## Photography still needed

The wireframe asks for editorial portraits, fitting, consultation and fabric imagery, and large real-client portraits. The old site only had a handful of usable photos, so:

- **Client portraits:** shown as gold monogram frames. Replace each `<span>` inside `.portrait` with `<img src="client-name.jpg" alt="">`, with the client's consent.
- **Fabric and consultation imagery:** a vector swatch book stands in for these.
- **The six garments in "Explore the collection":** drawn as gold line illustrations, which suits the site's vector style. Real product photos can replace them later.
- **Hotlinked photos:** every photo still loads from the old site's image host (`primary.jwwb.nl`), and will break if that site is cancelled. Download each one into the repository and change the URLs:
  - hero: `3801889901.jpg`
  - identity: `6j4o27/19102961171-1.png`
  - Business: `photo_2024-02-18152011.jpg`
  - Weddings: `wedding-636021_640.jpg`
  - Occasions: `tux-1-high.png` (cropped from a promo poster, so a clean tuxedo photo would be sharper)
  - Everyday: `pl59ap/photo_2024-01-28224443.jpg`

## Everyday edits

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
- **Accessibility:** "reduce motion" visitors get native scrolling, no pinned or scrubbed scenes and a still background. Every chart has a screen-reader data table.
- **Fallback:** if the CDN libraries fail to load, the page still shows all content.
