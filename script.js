const PLANETS = [
  {
    key: "sun",
    name: "太陽數字",
    meaning: "生命模式、原生家庭的境遇。對應你的本命天神，是所有其他數字的計算基礎。",
    timeDependent: false
  },
  {
    key: "moon",
    name: "月亮數字",
    meaning: "你眼裡母親的樣子、你與母親相處的狀況。",
    timeDependent: false
  },
  {
    key: "mercury",
    name: "水星數字",
    meaning: "學習能力、智力、聰慧。",
    timeDependent: false
  },
  {
    key: "venus",
    name: "金星數字",
    meaning: "所有與情感、人際關係有關的人格面。",
    timeDependent: false
  },
  {
    key: "mars",
    name: "火星數字",
    meaning: "缺點、劣根性的存在、要脾氣的樣子。",
    timeDependent: false
  },
  {
    key: "jupiter",
    name: "木星數字",
    meaning: "生命適合發展的事業、如何茁壯、遠見。",
    timeDependent: false
  },
  {
    key: "saturn",
    name: "土星數字",
    meaning: "習慣的安穩、不想改變卻必須改變的部分。",
    timeDependent: false
  },
  {
    key: "uranus",
    name: "天王星數字",
    meaning: "自我中心的態度、是否尊崇自己原來的樣子、會不會為了別人改變自己。",
    timeDependent: true
  },
  {
    key: "neptune",
    name: "海王星數字",
    meaning: "天生的藝術氣息、掌管奉獻與服務。",
    timeDependent: true
  },
  {
    key: "pluto",
    name: "冥王星數字",
    meaning: "掌管生命功課。",
    timeDependent: false
  },
  {
    key: "ascendant",
    name: "上升數字",
    meaning: "掌管在他人面前展現的樣子、氣質、外型。",
    timeDependent: false
  },
  {
    key: "northNode",
    name: "北交數字",
    meaning: "優點、狀態好時的最佳表現。",
    timeDependent: true
  },
  {
    key: "southNode",
    name: "南交數字",
    meaning: "缺點、負面情緒出現時的表現。",
    timeDependent: true
  }
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

const form = document.getElementById("birth-form");
const unknownTimeCheckbox = document.getElementById("unknown-time");
const timeFields = document.getElementById("time-fields");
const hourInput = document.getElementById("hour");
const minuteInput = document.getElementById("minute");
const formError = document.getElementById("form-error");
const timeWarning = document.getElementById("time-warning");
const grid = document.getElementById("grid");
const gridPlaceholder = document.getElementById("grid-placeholder");
const explanation = document.getElementById("explanation");

unknownTimeCheckbox.addEventListener("change", () => {
  const unknown = unknownTimeCheckbox.checked;
  timeFields.classList.toggle("disabled", unknown);
  hourInput.disabled = unknown;
  minuteInput.disabled = unknown;
});

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function renderGrid(numbers, usedDefaultTime) {
  grid.innerHTML = "";
  explanation.hidden = true;

  PLANETS.forEach((planet) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "grid-card";
    card.dataset.key = planet.key;

    const nameEl = document.createElement("span");
    nameEl.className = "planet-name";
    nameEl.textContent = planet.name;

    const valueEl = document.createElement("span");
    valueEl.className = "planet-value";
    valueEl.textContent = numbers[planet.key];

    card.appendChild(nameEl);
    card.appendChild(valueEl);

    card.addEventListener("click", () => {
      document
        .querySelectorAll(".grid-card")
        .forEach((el) => el.classList.remove("active"));
      card.classList.add("active");
      showExplanation(planet, numbers[planet.key], usedDefaultTime);
    });

    grid.appendChild(card);
  });

  grid.hidden = false;
  gridPlaceholder.hidden = true;
  timeWarning.hidden = !usedDefaultTime;
}

function showExplanation(planet, value, usedDefaultTime) {
  explanation.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = `${planet.name}：${value}`;

  const desc = document.createElement("p");
  desc.textContent = planet.meaning;

  explanation.appendChild(title);
  explanation.appendChild(desc);

  if (planet.timeDependent && usedDefaultTime) {
    const note = document.createElement("p");
    note.style.marginTop = "0.5rem";
    note.style.color = "#e8c99a";
    note.style.fontSize = "0.85rem";
    note.textContent = "＊此數字與出生時間相關，因使用預設 12:00 計算，準確度可能受影響。";
    explanation.appendChild(note);
  }

  explanation.hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const year = Number(document.getElementById("year").value);
  const month = Number(document.getElementById("month").value);
  const day = Number(document.getElementById("day").value);
  const unknownTime = unknownTimeCheckbox.checked;

  if (!year || !month || !day) {
    showError("請完整輸入年、月、日。");
    return;
  }
  if (month < 1 || month > 12) {
    showError("月份請輸入 1-12。");
    return;
  }
  if (day < 1 || day > 31) {
    showError("日期請輸入 1-31。");
    return;
  }

  let hour = 12;
  let minute = 0;

  if (!unknownTime) {
    const hourVal = document.getElementById("hour").value;
    const minuteVal = document.getElementById("minute").value;
    if (hourVal === "" || minuteVal === "") {
      showError("請輸入完整的時、分，或勾選「不知道確切的出生時間」。");
      return;
    }
    hour = Number(hourVal);
    minute = Number(minuteVal);
    if (hour < 0 || hour > 23) {
      showError("時請輸入 0-23。");
      return;
    }
    if (minute < 0 || minute > 59) {
      showError("分請輸入 0-59。");
      return;
    }
  }

  const numbers = calculateNumbers({ year, month, day, hour, minute });
  renderGrid(numbers, unknownTime);
});
