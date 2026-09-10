// Calculation core (PLANETS, calculateNumbers) is shared with the Node
// report scripts via lib/astrology.js, loaded before this file.
const { PLANETS, calculateNumbers } = window.NumberTarot;

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
const nameInput = document.getElementById("person-name");
const genderSelect = document.getElementById("gender");
const resultTitle = document.getElementById("result-title");
const shareRow = document.getElementById("share-row");
const shareButton = document.getElementById("share-button");
const shareStatus = document.getElementById("share-status");

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

    const themeEl = document.createElement("span");
    themeEl.className = "planet-theme";
    themeEl.textContent = planet.theme;

    const valueEl = document.createElement("span");
    valueEl.className = "planet-value";
    valueEl.textContent = numbers[planet.key];

    card.appendChild(nameEl);
    card.appendChild(themeEl);
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

  const theme = document.createElement("p");
  theme.className = "explanation-theme";
  theme.textContent = planet.theme;

  const desc = document.createElement("p");
  desc.textContent = planet.meaning;

  explanation.appendChild(title);
  explanation.appendChild(theme);
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

function readForm() {
  const year = Number(document.getElementById("year").value);
  const month = Number(document.getElementById("month").value);
  const day = Number(document.getElementById("day").value);
  const unknownTime = unknownTimeCheckbox.checked;

  if (!year || !month || !day) {
    showError("請完整輸入年、月、日。");
    return null;
  }
  if (month < 1 || month > 12) {
    showError("月份請輸入 1-12。");
    return null;
  }
  if (day < 1 || day > 31) {
    showError("日期請輸入 1-31。");
    return null;
  }
  if (day > new Date(year, month, 0).getDate()) {
    showError(`${year} 年 ${month} 月只有 ${new Date(year, month, 0).getDate()} 天。`);
    return null;
  }

  let hour = 12;
  let minute = 0;

  if (!unknownTime) {
    const hourVal = document.getElementById("hour").value;
    const minuteVal = document.getElementById("minute").value;
    if (hourVal === "" || minuteVal === "") {
      showError("請輸入完整的時、分，或勾選「不知道確切的出生時間」。");
      return null;
    }
    hour = Number(hourVal);
    minute = Number(minuteVal);
    if (hour < 0 || hour > 23) {
      showError("時請輸入 0-23。");
      return null;
    }
    if (minute < 0 || minute > 59) {
      showError("分請輸入 0-59。");
      return null;
    }
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    unknownTime,
    name: nameInput.value.trim().slice(0, 20),
    gender: genderSelect.value,
  };
}

// Birth data lives in the URL so a result can be bookmarked, refreshed and
// shared. Nothing is sent anywhere — the page recomputes from these params.
function writeUrl(input) {
  const params = new URLSearchParams({
    y: input.year,
    m: input.month,
    d: input.day,
  });
  if (!input.unknownTime) {
    params.set("h", input.hour);
    params.set("mi", input.minute);
  }
  if (input.name) params.set("name", input.name);
  if (input.gender) params.set("g", input.gender);
  history.replaceState(null, "", `${location.pathname}?${params}`);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has("y") || !params.has("m") || !params.has("d")) return null;
  return {
    year: params.get("y"),
    month: params.get("m"),
    day: params.get("d"),
    hour: params.get("h"),
    minute: params.get("mi"),
    name: params.get("name") || "",
    gender: params.get("g") || "",
  };
}

function applyResult(input) {
  const numbers = calculateNumbers(input);
  renderGrid(numbers, input.unknownTime);
  resultTitle.textContent = input.name
    ? `${input.name}的占星數字九宮格`
    : "占星數字九宮格";
  shareRow.hidden = false;
  shareStatus.textContent = "";
  writeUrl(input);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();
  const input = readForm();
  if (input) applyResult(input);
});

shareButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    shareStatus.textContent = "已複製！";
  } catch {
    shareStatus.textContent = "複製失敗，請手動複製網址列。";
  }
  setTimeout(() => {
    shareStatus.textContent = "";
  }, 3000);
});

// Restore a shared or bookmarked result on load.
(function restoreFromUrl() {
  const saved = readUrl();
  if (!saved) return;

  document.getElementById("year").value = saved.year;
  document.getElementById("month").value = saved.month;
  document.getElementById("day").value = saved.day;
  nameInput.value = saved.name;
  genderSelect.value = saved.gender;

  const hasTime = saved.hour !== null && saved.minute !== null;
  if (hasTime) {
    hourInput.value = saved.hour;
    minuteInput.value = saved.minute;
  } else {
    unknownTimeCheckbox.checked = true;
    unknownTimeCheckbox.dispatchEvent(new Event("change"));
  }

  const input = readForm();
  if (input) applyResult(input);
})();
