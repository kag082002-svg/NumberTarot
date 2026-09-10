#!/usr/bin/env node
// Report-generation engine: computes the 13 astrology numbers for a birth
// date/time and assembles a full report from content/gods/*.md.
//
// Usage:
//   node scripts/generate-report.js --year 1988 --month 11 --day 19 --hour 14 --minute 30
//   node scripts/generate-report.js --year 1988 --month 11 --day 19   (time unknown -> defaults to 12:00)
//
// Output: Markdown report printed to stdout, or written to a file with --out <path>.

const fs = require("fs");
const path = require("path");

const GODS_DIR = path.join(__dirname, "..", "content", "gods");

// Mirrors the PLANETS metadata and calculateNumbers() logic in script.js.
// Kept as a separate copy (not imported) because script.js is a browser
// script without module exports; if that logic changes, update both.
const PLANETS = [
  { key: "sun", name: "太陽數字", meaning: "生命模式、原生家庭的境遇。對應你的本命天神，是所有其他數字的計算基礎。", timeDependent: false },
  { key: "moon", name: "月亮數字", meaning: "你眼裡母親的樣子、你與母親相處的狀況。", timeDependent: false },
  { key: "mercury", name: "水星數字", meaning: "學習能力、智力、聰慧。", timeDependent: false },
  { key: "venus", name: "金星數字", meaning: "所有與情感、人際關係有關的人格面。", timeDependent: false },
  { key: "mars", name: "火星數字", meaning: "缺點、劣根性的存在、要脾氣的樣子。", timeDependent: false },
  { key: "jupiter", name: "木星數字", meaning: "生命適合發展的事業、如何茁壯、遠見。", timeDependent: false },
  { key: "saturn", name: "土星數字", meaning: "習慣的安穩、不想改變卻必須改變的部分。", timeDependent: false },
  { key: "uranus", name: "天王星數字", meaning: "自我中心的態度、是否尊崇自己原來的樣子、會不會為了別人改變自己。", timeDependent: true },
  { key: "neptune", name: "海王星數字", meaning: "天生的藝術氣息、掌管奉獻與服務。", timeDependent: true },
  { key: "pluto", name: "冥王星數字", meaning: "掌管生命功課。", timeDependent: false },
  { key: "ascendant", name: "上升數字", meaning: "掌管在他人面前展現的樣子、氣質、外型。", timeDependent: false },
  { key: "northNode", name: "北交數字", meaning: "優點、狀態好時的最佳表現。", timeDependent: true },
  { key: "southNode", name: "南交數字", meaning: "缺點、負面情緒出現時的表現。", timeDependent: true }
];

function reduceToRange(n) {
  let r = n % 22;
  if (r <= 0) r += 22;
  return r;
}

function calculateNumbers({ year, month, day, hour, minute }) {
  const digitSum = `${year}${month}${day}`
    .split("")
    .reduce((sum, ch) => sum + Number(ch), 0);
  const sun = reduceToRange(digitSum);

  return {
    sun,
    moon: reduceToRange(month + day),
    mercury: reduceToRange(day),
    venus: reduceToRange(sun + day),
    mars: reduceToRange(sun - day),
    jupiter: reduceToRange(sun + month),
    saturn: reduceToRange(sun - month),
    uranus: reduceToRange(sun + hour),
    neptune: reduceToRange(sun - hour),
    pluto: reduceToRange(sun + year),
    ascendant: reduceToRange(sun - year),
    northNode: reduceToRange(sun + minute),
    southNode: reduceToRange(sun - minute)
  };
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data = {};
  for (const line of match[1].split("\n")) {
    const lineMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!lineMatch) continue;
    const key = lineMatch[1];
    let value = lineMatch[2].trim();
    if (value === "null") value = null;
    data[key] = value;
  }
  return { data, body: match[2].trim() };
}

function loadGods() {
  const gods = {};
  for (const filename of fs.readdirSync(GODS_DIR)) {
    if (!filename.endsWith(".md")) continue;
    const raw = fs.readFileSync(path.join(GODS_DIR, filename), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const number = Number(data.number);
    gods[number] = { ...data, number, body };
  }
  return gods;
}

function generateReport({ year, month, day, hour, minute, usedDefaultTime }) {
  const numbers = calculateNumbers({ year, month, day, hour, minute });
  const gods = loadGods();

  const lines = [];
  lines.push(`# 占星數字塔羅報告`);
  lines.push("");
  lines.push(`出生資訊：${year} 年 ${month} 月 ${day} 日` + (usedDefaultTime ? "（時間未知，以 12:00 計算）" : ` ${hour}:${String(minute).padStart(2, "0")}`));
  lines.push("");

  for (const planet of PLANETS) {
    const value = numbers[planet.key];
    const god = gods[value];
    if (!god) {
      lines.push(`## ${planet.name}：${value}（找不到對應天神資料）`);
      lines.push("");
      continue;
    }

    lines.push(`## ${planet.name}：${value}（${god.tarot_zh} ${god.tarot_en} — ${god.title_zh}）`);
    lines.push("");
    lines.push(`> ${planet.meaning}`);
    if (planet.timeDependent && usedDefaultTime) {
      lines.push(">");
      lines.push("> ＊此數字與出生時間相關，因使用預設 12:00 計算，準確度可能受影響。");
    }
    lines.push("");
    lines.push(god.body);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const year = Number(args.year);
  const month = Number(args.month);
  const day = Number(args.day);

  if (!year || !month || !day) {
    console.error("Usage: node scripts/generate-report.js --year YYYY --month M --day D [--hour H --minute M] [--out path.md]");
    process.exit(1);
  }

  const usedDefaultTime = args.hour === undefined || args.minute === undefined;
  const hour = usedDefaultTime ? 12 : Number(args.hour);
  const minute = usedDefaultTime ? 0 : Number(args.minute);

  const report = generateReport({ year, month, day, hour, minute, usedDefaultTime });

  if (args.out) {
    fs.writeFileSync(args.out, report, "utf8");
    console.error(`Report written to ${args.out}`);
  } else {
    console.log(report);
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateNumbers, loadGods, generateReport, parseFrontmatter, PLANETS };
