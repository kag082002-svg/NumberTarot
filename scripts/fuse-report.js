#!/usr/bin/env node
// Calls Claude to fuse the 13 raw god-content sections (from generate-report.js)
// into one flowing, personalized narrative report, instead of 13 back-to-back
// sections. Requires ANTHROPIC_API_KEY in the environment.
//
// Usage:
//   node scripts/fuse-report.js --year 1988 --month 11 --day 19 --hour 14 --minute 30 --out report.md

const fs = require("fs");
const Anthropic = require("@anthropic-ai/sdk");
const { calculateNumbers, loadGods, PLANETS } = require("./generate-report");

const SYSTEM_PROMPT = `你是「占星數字塔羅」系統的報告撰寫者。這是一套以希臘神話與塔羅牌對應占星數字（1-22）的命理系統。

你會收到一份出生資料，以及由該出生資料計算出的 13 個占星數字，每個數字都已經對應到一段「天神故事」原始資料（包含神話故事、性格特質、愛情觀、大罩門、自我修復方式、占星塔羅深入解析等內容）。

你的任務：把這 13 段各自獨立的天神內容，改寫、重組、融合成「一篇連貫、針對這個人的個人化命定報告」，讀起來像是一位命理師針對這個人親自撰寫的分析，而不是 13 篇分開的百科全書條目。

嚴格規則（非常重要）：
1. **只能使用提供給你的原始資料內容**。你可以改寫語氣、重新組織段落順序、將多段內容整合成一個主題、用連接詞讓敘事流暢——但絕對不能新增原始資料中不存在的神話情節、人物、象徵、性格描述或占星細節。你不是在創作新的神話，而是在重新編排、精煉既有的內容。
2. 如果某個數字的意義与其他數字有主題上的關聯（例如金星與火星剛好是同一位天神），可以自然地把兩者合併討論，指出這種巧合的意義，但仍然只能根據原始資料的內容做出這樣的連結，不能無中生有。
3. 使用繁體中文書寫。
4. 用幾個主題式的小標題（例如：核心性格、天賦與學習、情感與人際、家庭與安全感、內在課題、外在形象、靈魂功課等），而不是逐一列出「太陽數字：15」這種 13 段標題。
5. 語氣溫暖、有洞察力，但不誇大、不做醫療或財務等專業建議。
6. 若出生時間是使用預設值（中午12:00）推算的，天王星、海王星、北交、南交這幾個與時間相關的數字準確度較低，請在報告中適度提及一次即可，不必每段重複。
7. 報告開頭請簡短說明這是根據出生資料計算出的個人命定報告，結尾可以加一小段溫和的總結或祝福語。

輸出格式：直接輸出 Markdown 格式的報告全文（用 # 和 ## 作標題），不要輸出任何其他說明文字、不要用程式碼區塊包起來。`;

function buildUserPrompt({ year, month, day, hour, minute, usedDefaultTime, numbers, gods }) {
  const lines = [];
  lines.push(`出生資訊：${year} 年 ${month} 月 ${day} 日` + (usedDefaultTime ? "（時間未知，以 12:00 計算）" : ` ${hour}:${String(minute).padStart(2, "0")}`));
  lines.push("");
  lines.push("以下是 13 個占星數字，各自對應的原始天神資料：");
  lines.push("");

  for (const planet of PLANETS) {
    const value = numbers[planet.key];
    const god = gods[value];
    lines.push(`===== ${planet.name}：${value}（${god.tarot_zh} ${god.tarot_en} — ${god.title_zh}）=====`);
    lines.push(`（此數字的一般意義：${planet.meaning}）`);
    if (planet.timeDependent) lines.push("（此數字與出生時間相關）");
    lines.push("");
    lines.push(god.body);
    lines.push("");
  }

  return lines.join("\n");
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
    console.error("Usage: node scripts/fuse-report.js --year YYYY --month M --day D [--hour H --minute M] [--out path.md]");
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Get a key at console.anthropic.com and export it before running this script.");
    process.exit(1);
  }

  const usedDefaultTime = args.hour === undefined || args.minute === undefined;
  const hour = usedDefaultTime ? 12 : Number(args.hour);
  const minute = usedDefaultTime ? 0 : Number(args.minute);

  const numbers = calculateNumbers({ year, month, day, hour, minute });
  const gods = loadGods();
  const userPrompt = buildUserPrompt({ year, month, day, hour, minute, usedDefaultTime, numbers, gods });

  const client = new Anthropic();

  console.error("Calling Claude Opus 5 to fuse the report... (this may take a minute)");

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 8000,
    output_config: { effort: "high" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const response = await stream.finalMessage();

  const textBlock = response.content.find((b) => b.type === "text");
  const fusedReport = textBlock ? textBlock.text : "";

  const outPath = args.out || "fused-report.md";
  fs.writeFileSync(outPath, fusedReport, "utf8");

  console.error(`Fused report written to ${outPath}`);
  console.error(`Usage: input=${response.usage.input_tokens} output=${response.usage.output_tokens}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
