#!/usr/bin/env node
// Generates a hero image (1020x510, matches BlogPost.astro's <Image>) and an
// OG image (1200x630, standard social-share size) for a blog post title.
// Template: bordered box + the real "AS" logo mark straddling the top edge
// (reused as-is from public/AnumeyaSehgal Logo.svg) + a big serif title.
// Palette is just light/dark inversions of the blog's own tokens
// (src/styles/blog.css: --white/--black/--accent/--accent-dark), picked at
// random per run. Rendered as SVG and rasterized with sharp (already a
// project dependency) -- no browser, no new deps.
//
// Usage: node scripts/gen-blog-images.mjs "Post Title" src/assets/my-post
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "..", "public", "AnumeyaSehgal Logo.svg");

// Light/dark inversions of the actual blog palette (src/styles/blog.css).
const THEMES = [
  { bg: "#E2E2E2", fg: "#2E2E2E" }, // white / black -- the logo's own default
  { bg: "#2E2E2E", fg: "#E2E2E2" }, // inverted
  { bg: "#E2E2E2", fg: "#2E2E8E" }, // white / accent
  { bg: "#2E2E5E", fg: "#E2E2E2" }, // accent-dark / white
];

// A couple of serif faces installed on this machine for the title, matching
// the reference design's serif "Blog" wordmark. Swap this list if generating
// on a different machine with different fonts installed (see `fc-list`).
const FONTS = ["Liberation Serif", "URW Bookman", "FreeSerif"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function xmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Recolor the logo's two hardcoded hex fills to the chosen theme. The logo
// SVG already bakes in a background-colored band across its middle (see the
// source file) so that whatever border line crosses through it visually
// "cuts" the letterforms -- we rely on that instead of reimplementing it.
function recoloredLogoInner(theme) {
  const raw = readFileSync(LOGO_PATH, "utf-8");
  const inner = raw.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return inner.replaceAll("#E2E2E2", theme.bg).replaceAll("#2E2E2E", theme.fg);
}

// No text-measuring lib here (kept dependency-free) -- wraps by a rough
// average-character-width guess. ponytail: good enough for short titles; if
// a title consistently overflows, shorten the title.
function wrapText(title, maxCharsPerLine) {
  const words = title.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxCharsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildSvg(title, w, h, theme, font) {
  const margin = Math.round(Math.min(w, h) * 0.16);
  const borderWidth = Math.max(2, Math.round(w * 0.0035));

  const logoSize = Math.round(h * 0.36);
  const logoX = w / 2 - logoSize / 2;
  // The logo's own cut band sits at local y=150 of its 300-tall viewBox --
  // line that up with the border's top edge so the border reads as passing
  // *through* the wordmark, same as the reference image.
  const logoY = margin - (150 / 300) * logoSize;

  const fontSize = Math.round(h * 0.16);
  const maxChars = Math.floor((w - margin * 2 - 40) / (fontSize * 0.5));
  const lines = wrapText(title, maxChars);
  const lineHeight = fontSize * 1.15;
  const boxTop = margin + logoSize * 0.55;
  const boxBottom = h - margin;
  const centerY = (boxTop + boxBottom) / 2;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;

  const titleSpans = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${startY + i * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${fontSize}" font-weight="700" fill="${theme.fg}">${xmlEscape(line)}</text>`,
    )
    .join("");

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${theme.bg}"/>
    <rect x="${margin}" y="${margin}" width="${w - margin * 2}" height="${h - margin * 2}" fill="none" stroke="${theme.fg}" stroke-width="${borderWidth}"/>
    ${titleSpans}
    <svg x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" viewBox="0 0 300 300">${recoloredLogoInner(theme)}</svg>
  </svg>`;
}

async function main() {
  const [title, outDir] = process.argv.slice(2);
  if (!title || !outDir) {
    console.error('Usage: node scripts/gen-blog-images.mjs "Post Title" src/assets/my-post');
    process.exit(1);
  }

  const theme = pick(THEMES);
  const font = pick(FONTS);

  mkdirSync(outDir, { recursive: true });

  const targets = [
    { name: "hero.png", w: 1020, h: 510 },
    { name: "og_image.png", w: 1200, h: 630 },
  ];

  for (const { name, w, h } of targets) {
    const svg = buildSvg(title, w, h, theme, font);
    await sharp(Buffer.from(svg)).png().toFile(`${outDir}/${name}`);
    console.log(`wrote ${outDir}/${name}`);
  }

  console.log(`\ntheme: bg ${theme.bg} / fg ${theme.fg}, font: ${font}`);
  console.log(`\nfrontmatter:\nheroImage: '${outDir.replace("src/", "../../")}/hero.png'`);
  console.log(`image: '${outDir.replace("src/", "../../")}/og_image.png'`);
}

main();
