#!/usr/bin/env node
// Renders a report into a styled A4 PDF. Used by generate-report.js output and
// by fuse-report.js (which imports renderPdf directly).
//
// Usage:
//   node scripts/render-pdf.js --year 1988 --month 11 --day 19 --hour 14 --minute 30 --out report.pdf

const fs = require("fs");
const { chromium } = require("playwright");
const {
  generateReport,
  calculateNumbers,
  loadGods,
  buildSummaryTable,
  formatBirthLine,
  parseArgs,
  parseBirthArgs,
} = require("./generate-report");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
}

function isTableRow(line) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function splitTableRow(line) {
  return line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
}

function isTableSeparator(line) {
  return isTableRow(line) && splitTableRow(line).every((cell) => /^:?-{1,}:?$/.test(cell));
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTableRow(line)) {
      closeList();
      const block = [];
      while (i < lines.length && isTableRow(lines[i])) {
        block.push(lines[i]);
        i++;
      }
      i--;

      const rows = block.filter((row) => !isTableSeparator(row)).map(splitTableRow);
      if (rows.length) {
        const [header, ...body] = rows;
        html.push("<table>");
        html.push("<thead><tr>" + header.map((c) => `<th>${inlineFormat(c)}</th>`).join("") + "</tr></thead>");
        html.push("<tbody>");
        for (const row of body) {
          html.push("<tr>" + row.map((c) => `<td>${inlineFormat(c)}</td>`).join("") + "</tr>");
        }
        html.push("</tbody></table>");
      }
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.trim() === "---") {
      closeList();
      html.push("<hr>");
    } else if (line.startsWith("> ")) {
      closeList();
      html.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineFormat(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p>${inlineFormat(line)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}

function buildCoverHtml({ birthLine, summaryTableMarkdown, subtitle }) {
  return `<section class="cover">
  <div class="cover-mark">✶</div>
  <h1 class="cover-title">占星數字塔羅</h1>
  <p class="cover-subtitle">${escapeHtml(subtitle)}</p>
  ${birthLine
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `<p class="cover-birth">${escapeHtml(line)}</p>`)
    .join("\n  ")}
  <div class="cover-table">${markdownToHtml(summaryTableMarkdown)}</div>
</section>
<div class="page-break"></div>`;
}

function wrapDocument(bodyHtml, title) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 20mm 18mm; }
  body {
    font-family: "Noto Sans CJK TC", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif;
    color: #2b2118;
    line-height: 1.8;
    font-size: 13px;
  }
  h1 {
    font-size: 24px;
    text-align: center;
    color: #6b4a23;
    margin-bottom: 4px;
  }
  h2 {
    font-size: 16px;
    color: #8a5a1f;
    border-left: 4px solid #c9974f;
    padding-left: 8px;
    margin-top: 22px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  p { margin: 6px 0; text-align: justify; }
  ul { margin: 6px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  blockquote {
    margin: 8px 0;
    padding: 8px 12px;
    background: #faf3e6;
    border-left: 3px solid #c9974f;
    color: #6b4a23;
    font-size: 12.5px;
  }
  hr {
    border: none;
    border-top: 1px solid #e3d3b8;
    margin: 18px 0;
  }
  strong { color: #5a3c14; }
  em { color: #8a5a1f; font-style: italic; }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 12.5px;
  }
  th, td {
    border: 1px solid #e3d3b8;
    padding: 5px 9px;
    text-align: left;
  }
  th {
    background: #faf3e6;
    color: #6b4a23;
    font-weight: 600;
  }

  .cover {
    height: 245mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  .cover-mark { font-size: 34px; color: #c9974f; margin-bottom: 10px; }
  .cover-title { font-size: 34px; letter-spacing: 6px; margin: 0 0 6px; }
  .cover-subtitle { font-size: 14px; color: #8a5a1f; letter-spacing: 3px; margin: 0 0 26px; text-align: center; }
  .cover-birth { font-size: 13px; color: #6b4a23; margin: 0 0 22px; text-align: center; }
  .cover-table { max-width: 118mm; margin: 0 auto; }
  .cover-table th, .cover-table td { padding: 4px 8px; }
  .page-break { page-break-after: always; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// Playwright resolves its own browser by default (the normal case after
// `npx playwright install`). Some preinstalled images ship a build Playwright
// doesn't look for, so fall back to whatever chrome binary is on disk.
function findFallbackChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !fs.existsSync(root)) return null;
  for (const entry of fs.readdirSync(root)) {
    if (!entry.startsWith("chromium-")) continue;
    const candidate = `${root}/${entry}/chrome-linux/chrome`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function launchChromium() {
  if (process.env.CHROMIUM_PATH) {
    return chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  }
  try {
    return await chromium.launch();
  } catch (err) {
    const fallback = findFallbackChromium();
    if (!fallback) throw err;
    return chromium.launch({ executablePath: fallback });
  }
}

async function renderPdf({ markdown, outPath, title = "占星數字塔羅報告", cover = null }) {
  const bodyHtml = (cover ? buildCoverHtml(cover) : "") + markdownToHtml(markdown);
  const fullHtml = wrapDocument(bodyHtml, title);

  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    await page.pdf({ path: outPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.year === undefined || args.month === undefined || args.day === undefined) {
    console.error("Usage: node scripts/render-pdf.js --year YYYY --month M --day D [--hour H --minute M] [--out report.pdf]");
    process.exit(1);
  }

  const birth = parseBirthArgs(args);
  const numbers = calculateNumbers(birth);
  const gods = loadGods();

  const reportMarkdown = generateReport({ ...birth, includeSummary: false });
  const outPath = args.out || "report.pdf";

  await renderPdf({
    markdown: reportMarkdown,
    outPath,
    title: birth.name ? `${birth.name}的占星數字塔羅報告` : "占星數字塔羅報告",
    cover: {
      subtitle: birth.name ? `${birth.name} 的個人命定報告` : "個人命定報告",
      birthLine: formatBirthLine(birth),
      summaryTableMarkdown: buildSummaryTable(numbers, gods),
    },
  });

  console.error(`PDF written to ${outPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { renderPdf, markdownToHtml, wrapDocument };
