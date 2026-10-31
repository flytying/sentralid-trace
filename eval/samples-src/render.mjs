// Renders the synthetic sample screenshots in public/samples/ from the scenes below.
// Usage: node eval/samples-src/render.mjs   (needs Google Chrome installed)
//
// The layouts are generic phone browser / chat UIs: no Facebook or Messenger logos, wordmarks
// or icons. Every image carries a "SYNTHETIC SAMPLE · NOT A REAL BUSINESS" stamp and a faint
// repeating watermark. Names, links, numbers and messages must stay as they are: the tests,
// the extraction eval and the QA repeat runs expect exactly this content.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "public", "samples");
const tmp = join(here, ".build");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// ---- scenes -------------------------------------------------------------------------------

const PAGES = {
  "A-page-lumencove-cropped": {
    cropped: true, // starts below the address bar: the page link is deliberately not visible
    name: "Lumen Cove Resort",
    initials: "LC",
    palette: ["#1e6f8a", "#7fc4d6", "#f4e3c1"],
    meta: "Resort · 4.8 ★ · 12K followers",
    intro: [
      ["info", "Page transparency"],
      ["text", "Beachfront resort in Panglao, Bohol. Reservations team replies daily 8am–8pm."],
      ["clock", "Page created · March 2017"],
    ],
    post: { when: "3d", text: "Sunset from the garden villas last night 🌅", photo: true },
  },
  "B-page-bahaydagat-lookalike": {
    url: "facebook.com/bahaydagat.moalboal.ph",
    name: "Bahay Dagat Resort Moalboal",
    initials: "BD",
    palette: ["#2e7a55", "#9fd3b8", "#f1e6c8"],
    meta: "Resort · 4.8 ★ · 12K followers",
    intro: [
      ["info", "Page transparency"],
      ["text", "Official booking page. Promo rates for December — message us now, limited rooms!"],
      ["clock", "Page created · August 2026"],
    ],
    post: { when: "5h", text: "LAST 3 ROOMS for Dec 24–31 🎄 Promo rate today only. Message us to reserve!", photo: true },
  },
  "D-page-mirasolcove": {
    url: "facebook.com/mirasolcoveanilao",
    name: "Mirasol Cove Resort",
    initials: "MC",
    palette: ["#c0612b", "#f2c08a", "#fbe9d0"],
    meta: "Resort · Mabini, Batangas · 8.4K followers",
    intro: [
      ["text", "Dive-friendly cove resort in Anilao. Garden and seaview rooms, house reef, day tours."],
      ["phone", "Reservations: (043) 555 0188"],
      ["clock", "Open daily 8:00 AM – 8:00 PM"],
    ],
    post: { when: "1d", text: "Christmas week is filling up — message us for availability.", photo: true },
  },
};

const CHATS = {
  "A-chat-lumencove-gcash": {
    name: "Lumen Cove Reservations",
    color: "#1e6f8a",
    initials: "LC",
    day: "DEC 14, 9:12 AM",
    msgs: [
      ["me", "Hi! Is the garden villa available Dec 20–23?"],
      ["them", "Hello po! Yes, available. Rate is ₱9,000/night."],
      ["them", "To hold the booking, please send a ₱4,500 deposit via GCash: L. M. Reyes · 0917 ••• 4821"],
      ["me", "Is this the official resort account?"],
    ],
  },
  "B-chat-bahaydagat-deposit": {
    name: "Bahay Dagat Resort Moalboal",
    color: "#2e7a55",
    initials: "BD",
    day: "TODAY 8:47 AM",
    msgs: [
      ["me", "Hello, do you have a room for 2 on Dec 27?"],
      ["them", "Yes ma'am! Promo ₱3,200/night. 50% deposit needed today to secure."],
      ["them", "Send to GCash J. Santos · 0928 ••• 7731. Send screenshot after."],
    ],
  },
  "B-chat-bahaydagat-number": {
    name: "Bahay Dagat Resort Moalboal",
    color: "#2e7a55",
    initials: "BD",
    day: "TODAY 9:03 AM",
    msgs: [
      ["me", "Can I call to confirm?"],
      ["them", "Sure, call our reservations number 0966 ••• 2290."],
      ["them", "Please send the deposit first so we can hold the room."],
    ],
  },
  "C-chat-islaverde-cropped": {
    cropped: true, // starts mid-conversation: no header, so the sender isn't visible
    height: 300, // a cropped snippet, not a full screen
    color: "#4f7d3a",
    msgs: [
      ["them", "…so total is ₱12,000 for 3 nights."],
      ["them", "Bank deposit only. Account: BPI ••••"],
      ["me", "Ok, what is the account name?"],
    ],
  },
  "D-chat-mirasolcove-deposit": {
    name: "Mirasol Cove Resort",
    color: "#c0612b",
    initials: "MC",
    day: "TODAY 10:21 AM",
    msgs: [
      ["me", "Hi! Is a Garden Room free on Dec 28–29 for 2?"],
      ["them", "Hello po! Yes, last one left. ₱4,500/night."],
      ["them", "To hold it, send 50% today via GCash to M. Lopez · 0917 ••• 3305, then send the receipt here."],
      ["me", "Can I pay at the front desk instead?"],
      ["them", "Sorry po, deposit is needed today or the room goes to the next guest."],
    ],
  },
};

// ---- shared pieces ------------------------------------------------------------------------

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const ICON = {
  signal: `<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`,
  wifi: `<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0z"/><path d="M3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0z"/><path d="M1.1 4.5a9.8 9.8 0 0 1 13.8 0L13.5 6A7.8 7.8 0 0 0 2.5 6z"/></svg>`,
  battery: `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2"/><rect x="24.5" y="4" width="2" height="5" rx="1" opacity=".4"/></svg>`,
  lock: `<svg width="11" height="13" viewBox="0 0 11 13"><rect x="0" y="5.5" width="11" height="7.5" rx="1.6"/><path d="M2.5 5.5V4a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  back: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  search: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
  dots: `<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>`,
  text: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6h14M5 11h14M5 16h9"/></svg>`,
  phone: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>`,
  clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  chat: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2.5 6.9 2.5 11.7c0 2.6 1.2 4.8 3.1 6.4V21l2.9-1.6c1.1.3 2.3.5 3.5.5 5.5 0 9.5-3.9 9.5-8.7S17.5 3 12 3z"/></svg>`,
  follow: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>`,
  call: `<svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3.5h3.6l1.8 4.6-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2 4.6 1.8V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/></svg>`,
  video: `<svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="13.5" height="12" rx="3"/><path d="M17 10.2 22 7v10l-5-3.2z"/></svg>`,
  plus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  camera: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5 10 3h4l1.5 2H19a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z"/><circle cx="12" cy="12.5" r="3.6" fill="#fff"/></svg>`,
  image: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2.5" y="3.5" width="19" height="17" rx="3"/><circle cx="8.5" cy="9" r="2" fill="#fff"/><path d="m4 18 5.5-5.5 3.5 3.5 2.5-2.5 4.5 4.5z" fill="#fff"/></svg>`,
  mic: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  like: `<svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 10h3.5v10.5H2.5zM8 20.5V10l4.2-6.8c.9-1.4 3-.6 2.8 1L14.4 9H20a2 2 0 0 1 2 2.3l-1.3 7.5a2 2 0 0 1-2 1.7z"/></svg>`,
  globe: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>`,
};

function statusBar(dark = false) {
  return `<div class="status${dark ? " dark" : ""}"><span class="clock">9:41</span><span class="sys">${ICON.signal}${ICON.wifi}${ICON.battery}</span></div>`;
}

/** A beach scene for cover photos and post photos, tinted per resort. */
function scene([deep, sea, sand], h = 210, seed = 0) {
  const palmX = 300 - seed * 60;
  return `<svg class="scene" viewBox="0 0 390 ${h}" preserveAspectRatio="xMidYMid slice" style="height:${h}px">
  <defs>
    <linearGradient id="sky${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a8"/><stop offset=".55" stop-color="#ffeedd"/><stop offset="1" stop-color="${sea}"/></linearGradient>
    <linearGradient id="sea${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea}"/><stop offset="1" stop-color="${deep}"/></linearGradient>
  </defs>
  <rect width="390" height="${h}" fill="url(#sky${seed})"/>
  <circle cx="${120 + seed * 70}" cy="${h * 0.42}" r="26" fill="#fff4dc" opacity=".95"/>
  <path d="M0 ${h * 0.55} H390 V${h} H0z" fill="url(#sea${seed})"/>
  <path d="M0 ${h * 0.6} q60 -6 120 0 t120 0 t150 0" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>
  <path d="M0 ${h * 0.68} q50 -5 100 0 t110 0 t180 0" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/>
  <path d="M-10 ${h} C80 ${h * 0.74} 210 ${h * 0.72} 400 ${h * 0.84} V${h}z" fill="${sand}"/>
  <g transform="translate(${palmX} ${h * 0.83})" fill="#2c3b2f">
    <path d="M0 0 C4 -40 10 -80 22 -112 L27 -110 C17 -78 11 -40 7 0z"/>
    <path d="M24 -112 c-30 -10 -55 0 -70 18 c22 -10 45 -12 70 -14z"/>
    <path d="M24 -112 c26 -18 54 -16 72 -2 c-24 -5 -48 -2 -72 6z"/>
    <path d="M24 -112 c-6 -26 -26 -40 -48 -40 c18 8 34 22 44 42z"/>
    <path d="M24 -112 c14 -24 38 -32 58 -26 c-20 4 -38 14 -54 30z"/>
    <path d="M24 -112 c-24 6 -38 26 -40 46 c10 -18 24 -32 42 -42z"/>
  </g>
</svg>`;
}

function avatar(initials, color, size) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${color};font-size:${Math.round(size * 0.36)}px">
  <svg viewBox="0 0 40 40" width="${size * 0.62}" height="${size * 0.62}" class="mark"><path d="M4 26c5-5 9-5 14 0s9 5 14 0 5-3 4-3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><circle cx="27" cy="13" r="5" fill="#fff" opacity=".85"/></svg>
  <span>${initials}</span></div>`;
}

const STAMP = `<div class="stamp">SYNTHETIC SAMPLE · NOT A REAL BUSINESS</div>
<div class="wm">${Array.from({ length: 9 }, () => "<span>SYNTHETIC SAMPLE · NOT A REAL BUSINESS</span>").join("")}</div>`;

function pageHtml(p) {
  const top = p.cropped
    ? ""
    : `${statusBar()}<div class="urlbar"><div class="url">${ICON.lock}<span>${p.url}</span></div>${ICON.dots}</div>
<div class="pagenav">${ICON.back}<strong>${esc(p.name)}</strong>${ICON.search}</div>`;
  const intro = p.intro
    .map(([icon, t]) => `<li>${ICON[icon] ?? ICON.text}<span>${esc(t)}</span></li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../../phone.css"></head>
<body class="page${p.cropped ? " cropped" : ""}">
${top}
<div class="cover">${scene(p.palette, p.cropped ? 150 : 200, 0)}</div>
<div class="who">
  ${avatar(p.initials, p.palette[0], 112)}
  <h1>${esc(p.name)}</h1>
  <div class="meta">${esc(p.meta)}</div>
  <div class="actions"><span class="primary">${ICON.chat} Message</span><span>${ICON.follow} Follow</span><span class="more">${ICON.dots}</span></div>
</div>
<div class="tabsrow"><span class="on">Posts</span><span>About</span><span>Photos</span><span>Reviews</span></div>
<section class="card"><h2>Intro</h2><ul class="intro">${intro}</ul></section>
<section class="card post">
  <div class="posthead">${avatar(p.initials, p.palette[0], 40)}<div><strong>${esc(p.name)}</strong><small>${p.post.when} · ${ICON.globe}</small></div>${ICON.dots}</div>
  <p>${esc(p.post.text)}</p>
  ${p.post.photo ? `<div class="postphoto">${scene(p.palette, 190, 1)}</div>` : ""}
</section>
${STAMP}
</body></html>`;
}

function chatHtml(c) {
  const head = c.cropped
    ? ""
    : `${statusBar()}<header class="chathead">${ICON.back}<div class="who2">${avatar(c.initials, c.color, 38)}<i class="online"></i></div><div class="title"><strong>${esc(c.name)}</strong><small>Active 5m ago</small></div><span class="calls">${ICON.call}${ICON.video}</span></header>`;
  // Group consecutive messages from the same side; the sender's photo sits by the last one.
  const rows = c.msgs
    .map(([who, text], i) => {
      const prev = c.msgs[i - 1]?.[0];
      const next = c.msgs[i + 1]?.[0];
      const pos = prev !== who && next !== who ? "single" : prev !== who ? "first" : next !== who ? "last" : "mid";
      const pic = who === "them" ? (next !== who && !c.cropped ? avatar(c.initials, c.color, 28) : `<span class="pic-gap"></span>`) : "";
      return `<div class="row ${who} ${pos}">${pic}<div class="bubble">${esc(text)}</div></div>`;
    })
    .join("");
  const lastMe = c.msgs[c.msgs.length - 1][0] === "me";
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../../phone.css"></head>
<body class="chat${c.cropped ? " cropped" : ""}" style="--accent:${c.color};${c.height ? `height:${c.height}px` : ""}">
${head}
<main class="thread">
  ${c.day ? `<div class="day">${c.day}</div>` : ""}
  ${rows}
  ${lastMe && !c.cropped ? `<div class="seen">${avatar(c.initials, c.color, 15)}</div>` : ""}
</main>
<footer class="composer"${c.height ? ' hidden' : ""}><span class="tools">${ICON.plus}${ICON.camera}${ICON.image}${ICON.mic}</span><span class="input">Aa</span><span class="likebtn">${ICON.like}</span></footer>
${STAMP}
</body></html>`;
}

// ---- render ---------------------------------------------------------------------------------

mkdirSync(join(tmp, "pages"), { recursive: true });
const jobs = [
  ...Object.entries(PAGES).map(([name, p]) => [name, pageHtml(p), 844]),
  ...Object.entries(CHATS).map(([name, c]) => [name, chatHtml(c), c.height ?? 844]),
];
for (const [name, html, height] of jobs) {
  const file = join(tmp, "pages", `${name}.html`);
  writeFileSync(file, html);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=390,${height}`,
    "--force-device-scale-factor=2",
    "--default-background-color=00000000",
    `--screenshot=${join(out, `${name}.png`)}`,
    `file://${file}`,
  ], { stdio: "ignore" });
  console.log("rendered", name);
}
