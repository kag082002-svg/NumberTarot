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
