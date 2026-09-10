#!/usr/bin/env node
// Renders a generated report (see generate-report.js) into a styled PDF.
//
// Usage:
//   node scripts/render-pdf.js --year 1988 --month 11 --day 19 --hour 14 --minute 30 --out report.pdf

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { generateReport, calculateNumbers } = require("./generate-report");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

  for (const line of lines) {
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
    line-height: 1.75;
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
  p { margin: 6px 0; }
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
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const year = Number(args.year);
  const month = Number(args.month);
  const day = Number(args.day);

  if (!year || !month || !day) {
    console.error("Usage: node scripts/render-pdf.js --year YYYY --month M --day D [--hour H --minute M] [--out report.pdf]");
    process.exit(1);
  }

  const usedDefaultTime = args.hour === undefined || args.minute === undefined;
  const hour = usedDefaultTime ? 12 : Number(args.hour);
  const minute = usedDefaultTime ? 0 : Number(args.minute);

  const reportMarkdown = generateReport({ year, month, day, hour, minute, usedDefaultTime });
  const bodyHtml = markdownToHtml(reportMarkdown);
  const fullHtml = wrapDocument(bodyHtml, "占星數字塔羅報告");

  const outPath = args.out || "report.pdf";

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    await page.pdf({ path: outPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  console.error(`PDF written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
