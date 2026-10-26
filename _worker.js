/*
  _worker.js - the small server side of masterpiecetailor.my (Cloudflare)

  Cloudflare runs this file only for the addresses listed in wrangler.jsonc ("run_worker_first",
  for a Workers project) or _routes.json (for a Pages project); every other page and image is
  served straight from the static files. It does two things:
    1. POST /api/voucher  emails the 10% welcome voucher through Brevo (brevo.com)
    2. Old website addresses (/craftsmanship, /contact ...) forward to their new homes

  Settings live in Cloudflare: Workers & Pages > masterpiece-tailor > Settings > Variables and Secrets
    BREVO_API_KEY         (secret, required)  Brevo > SMTP & API > API keys
    VOUCHER_FROM_EMAIL    (required)          a sender address verified in Brevo, e.g. ask@masterpiecetailor.my
    VOUCHER_FROM_NAME     (optional)          defaults to "MasterPiece Tailor"
    VOUCHER_CODE          (optional)          defaults to "WELCOME10"
    BREVO_LIST_ID         (optional)          Brevo list for people who tick "send me news and offers"
    VOUCHER_NOTIFY_EMAIL  (optional)          gets a short note for every voucher sent
  Without BREVO_API_KEY and VOUCHER_FROM_EMAIL the pop-up still works: it offers WhatsApp instead.
*/

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

// Pages from the old website, so existing Google results and bookmarks still land somewhere useful
const REDIRECTS = {
  '/craftsmanship': '/#journey',
  '/promotion': '/#collection-grid',
  '/corporate': '/#business',
  '/contact': '/#visit',
  '/news': '/#story',
  '/career': '/',
  '/privacy-policy': '/privacy'
};

const BREVO = 'https://api.brevo.com/v3';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (REDIRECTS[path]) {
      return Response.redirect(new URL(REDIRECTS[path], url.origin).toString(), 301);
    }
    if (path === '/api/voucher') {
      return secure(await voucher(request, env, url));
    }

    return secure(await env.ASSETS.fetch(request));
  }
};

function secure(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

/* ---------- POST /api/voucher ---------- */
async function voucher(request, env, url) {
  if (request.method !== 'POST') return json(405, { error: 'method' });

  // Only accept the site's own pop-up
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json(403, { error: 'origin' });

  let data;
  try {
    const text = await request.text();
    if (text.length > 2000) return json(413, { error: 'too_large' });
    data = JSON.parse(text);
  } catch (e) {
    return json(400, { error: 'bad_request' });
  }

  const email = String(data.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json(400, { error: 'invalid_email' });
  }
  // Bots fill the hidden field, or submit in under a second: pretend it worked, send nothing
  if (data.website || Number(data.ms) < 1000) return json(200, { ok: true });

  if (!env.BREVO_API_KEY || !env.VOUCHER_FROM_EMAIL) return json(503, { error: 'not_configured' });

  // Light rate limits (best effort: the Cache API works on the custom domain, not on *.pages.dev)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await seenRecently(url.origin, 'ip-' + ip, 60)) return json(429, { error: 'slow_down' });
  if (await seenRecently(url.origin, 'em-' + (await sha256(email)), 86400)) return json(200, { ok: true, already: true });

  const code = env.VOUCHER_CODE || 'WELCOME10';
  const fromName = env.VOUCHER_FROM_NAME || 'MasterPiece Tailor';
  const headers = { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' };

  if (data.consent && env.BREVO_LIST_ID) {
    await fetch(BREVO + '/contacts', {
      method: 'POST', headers,
      body: JSON.stringify({ email, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true })
    }).catch(() => null);
  }

  const sent = await fetch(BREVO + '/smtp/email', {
    method: 'POST', headers,
    body: JSON.stringify({
      sender: { name: fromName, email: env.VOUCHER_FROM_EMAIL },
      replyTo: { name: fromName, email: env.VOUCHER_FROM_EMAIL },
      to: [{ email }],
      subject: 'Your 10% MasterPiece welcome voucher',
      htmlContent: voucherHtml(code, url.origin),
      textContent: voucherText(code),
      tags: ['welcome-voucher']
    })
  }).catch(() => null);

  if (!sent || !sent.ok) return json(502, { error: 'send_failed' });

  if (env.VOUCHER_NOTIFY_EMAIL) {
    await fetch(BREVO + '/smtp/email', {
      method: 'POST', headers,
      body: JSON.stringify({
        sender: { name: 'MasterPiece website', email: env.VOUCHER_FROM_EMAIL },
        to: [{ email: env.VOUCHER_NOTIFY_EMAIL }],
        subject: 'Welcome voucher sent to ' + email,
        textContent: 'The website just sent the ' + code + ' welcome voucher to ' + email +
          (data.consent ? '. They also asked for news and offers.' : '.')
      })
    }).catch(() => null);
  }

  return json(200, { ok: true });
}

async function seenRecently(origin, key, seconds) {
  try {
    const cache = caches.default;
    const req = new Request(origin + '/__voucher-throttle/' + key);
    if (await cache.match(req)) return true;
    await cache.put(req, new Response('1', { headers: { 'Cache-Control': 'max-age=' + seconds } }));
  } catch (e) { /* no cache here: skip the limit */ }
  return false;
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- The voucher email ---------- */
const TERMS = 'One voucher per client, valid on your first order at either atelier. ' +
  'Cannot be combined with other promotions, discounts or vouchers unless otherwise stated. ' +
  'MasterPiece Tailor reserves the right to amend or withdraw this offer without prior notice.';

function voucherText(code) {
  return [
    'Welcome to MasterPiece.',
    '',
    'Here is 10% off your first MasterPiece. Your code: ' + code,
    '',
    'Quote the code, or show this email, when you place your order at our Kelana Jaya or Cyberjaya atelier.',
    '',
    'Book a consultation: https://book.masterpiecetailor.my',
    'WhatsApp: https://wa.me/60174582366',
    '',
    'Kelana Jaya: G25, Block B, Jalan SS7/26, Zenith Corporate Park, 47301 Petaling Jaya, Selangor',
    'Cyberjaya: 01-10, Kenwingston Business Centre, Persiaran Bestari, 63000 Cyberjaya, Selangor',
    '',
    TERMS
  ].join('\n');
}

function voucherHtml(code, origin) {
  const gold = '#F4C251', navy = '#0b1424', panel = '#121d33', bone = '#f3efe6', mute = '#aeb6c7';
  const serif = "Optima, 'Optima Nova', Candara, 'Segoe UI', Georgia, serif";
  const sans = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark"><title>Your 10% MasterPiece welcome voucher</title></head>
<body style="margin:0;padding:0;background:${navy};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${navy}" style="background:${navy};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${panel};border:1px solid #2b3550;">
    <tr><td align="center" style="padding:40px 32px 8px;">
      <img src="${origin}/email-logo.png" width="180" height="130" alt="MasterPiece Tailor" style="display:block;border:0;width:180px;height:auto;">
    </td></tr>
    <tr><td align="center" style="padding:24px 32px 0;font-family:${sans};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${gold};">Welcome to MasterPiece</td></tr>
    <tr><td align="center" style="padding:14px 32px 0;font-family:${serif};font-size:30px;line-height:1.2;letter-spacing:1px;text-transform:uppercase;color:${bone};">
      <span style="color:${gold};">10% off</span> your first MasterPiece
    </td></tr>
    <tr><td align="center" style="padding:16px 40px 0;font-family:${sans};font-size:16px;line-height:1.6;color:${mute};">
      Crafted exclusively for you. Quote this code, or show this email, when you place your order at our Kelana Jaya or Cyberjaya atelier.
    </td></tr>
    <tr><td align="center" style="padding:28px 32px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="border:1px dashed ${gold};padding:16px 36px;font-family:${serif};font-size:28px;letter-spacing:6px;color:${gold};">${code}</td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:32px 32px 0;">
      <a href="https://book.masterpiecetailor.my" style="display:inline-block;background:${gold};color:${navy};font-family:${sans};font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 28px;border-radius:999px;">Book a consultation</a>
    </td></tr>
    <tr><td align="center" style="padding:16px 32px 0;font-family:${sans};font-size:14px;color:${mute};">
      or <a href="https://wa.me/60174582366" style="color:${gold};">message us on WhatsApp</a>
    </td></tr>
    <tr><td style="padding:36px 32px 0;"><div style="height:1px;background:#2b3550;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
    <tr><td style="padding:24px 32px 0;font-family:${sans};font-size:13px;line-height:1.6;color:${mute};">
      <strong style="color:${bone};">Kelana Jaya</strong><br>G25, Block B, Jalan SS7/26, Zenith Corporate Park, 47301 Petaling Jaya, Selangor<br><br>
      <strong style="color:${bone};">Cyberjaya</strong><br>01-10, Kenwingston Business Centre, Persiaran Bestari, 63000 Cyberjaya, Selangor<br><br>
      Sunday to Thursday 11am to 8pm, Friday 11am to 7pm, closed Saturday.
    </td></tr>
    <tr><td style="padding:20px 32px 36px;font-family:${sans};font-size:11px;line-height:1.6;color:#7f889b;">${TERMS}</td></tr>
  </table>
  <p style="margin:20px 0 0;font-family:${sans};font-size:11px;color:#6b7488;">MasterPiece Bespoke Sdn. Bhd. &middot; <a href="${origin}/privacy" style="color:#8f98ab;">Privacy</a></p>
</td></tr>
</table>
</body></html>`;
}
