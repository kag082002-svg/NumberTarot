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
2. 如果某個數字與其他數字有主題上的關聯（例如金星與火星剛好是同一位天神、或月亮與上升同號），要主動抓出這種巧合並把它寫成報告的敘事主軸之一，指出兩個位置共用同一股能量代表什麼——但仍然只能根據原始資料的內容做出這樣的連結，不能無中生有。
3. 使用繁體中文書寫。
4. 語氣溫暖、有洞察力，但不誇大、不做醫療或財務等專業建議。
5. 若出生時間是使用預設值（中午12:00）推算的，天王星、海王星、北交、南交這幾個與時間相關的數字準確度較低，請在開頭的斜體註記中提及一次即可，不必每段重複；若出生時間明確，則在該註記中說明這四個數字皆為準確值。

【文章結構】（請照這個骨架走，小標題文字依這個人的實際內容自訂）
- 一級標題：「# 占星數字塔羅・個人命定報告」
- 一行出生資訊
- 一行斜體註記：出生時間準確度說明
- 一條水平分隔線（三個減號）
- 接著是數個主題式章節，每個都用「## 主題：一句話副標」的形式下標題（例如「核心命盤：一個以「付出」為底色的靈魂」、「事業與茁壯：選擇艱辛而光榮的那條路」、「生命功課：從壓抑到真正的堅毅」）。建議的章節切分方式：
  1. 核心命盤（太陽）
  2. 母親的樣子與外在氣質（月亮 + 上升）
  3. 頭腦與天賦（水星 + 天王星）
  4. 情感與人際（金星 + 火星，通常會形成「對外的樣子 vs 情緒爆發的樣子」的反差）
  5. 事業與茁壯（木星）
  6. 必須改變的地方（土星）
  7. 藝術與奉獻（海王星）
  8. 生命功課（冥王星）
  9. 靈魂的方向（南交的慣性 → 北交的最佳狀態）
- 一條水平分隔線（三個減號）
- 一段總結：點出整張命盤反覆在講的同一條主線是什麼，以及擋在路上的是什麼（把幾位天神的名字串起來收攏）
- 一句溫和的祝福，可用「你」直接對讀者說
- 最後一行斜體說明：本報告由系統計算 13 個占星數字後融合對應天神內容撰寫而成

【寫作風格】
- 主述人稱用「這個人」，只在最後的祝福句轉為「你」。
- 每個章節開頭要先點名這個位置對應到誰：用粗體標出天神與塔羅牌（例如「**金牛座的狄密特**」、「**天蠍座的費頓與死神牌**」），然後才展開敘述。
- 適度直接引用原始資料裡最生動的句子，用「」括起來，例如「彷彿是心不甘情不願運轉的發電廠，非要有人逼近才會運轉，但偏偏運轉起來總是出色得不得了」。這些引用讓報告有質感，但必須逐字來自原始資料。
- 章節之間要互相呼應：如果兩個位置在講同一件事的兩端（例如火星的情緒爆發與冥王星的壓抑功課），要明講出來，讓整篇有整體感而不是九個獨立段落。
- 每個章節談完特質後，盡量帶到原始資料裡提供的「轉化方向」或「修復方式」，讓報告有出口而不只是描述。
- 全篇約 1800-2500 字。

輸出格式：直接輸出 Markdown 格式的報告全文，不要輸出任何其他說明文字、不要用程式碼區塊包起來。`;

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
