// Shared calculation core for the 13 astrology numbers.
// Loaded both by the browser (index.html -> window.NumberTarot) and by the
// Node scripts (require), so the formula lives in exactly one place.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NumberTarot = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const PLANETS = [
    {
      key: "sun",
      name: "太陽數字",
      theme: "本命循環",
      meaning: "生命模式、原生家庭的境遇。對應你的本命天神，是所有其他數字的計算基礎。",
      timeDependent: false
    },
    {
      key: "moon",
      name: "月亮數字",
      theme: "情緒的安全感",
      meaning: "你眼裡母親的樣子、你與母親相處的狀況。",
      timeDependent: false
    },
    {
      key: "mercury",
      name: "水星數字",
      theme: "學習＆傳達",
      meaning: "學習能力、智力、聰慧。",
      timeDependent: false
    },
    {
      key: "venus",
      name: "金星數字",
      theme: "戀情＆人際關係",
      meaning: "所有與情感、人際關係有關的人格面。",
      timeDependent: false
    },
    {
      key: "mars",
      name: "火星數字",
      theme: "行動＆創造",
      meaning: "缺點、劣根性的存在、要脾氣的樣子。",
      timeDependent: false
    },
    {
      key: "jupiter",
      name: "木星數字",
      theme: "生命格局",
      meaning: "生命適合發展的事業、如何茁壯、遠見。",
      timeDependent: false
    },
    {
      key: "saturn",
      name: "土星數字",
      theme: "傳統＆制約",
      meaning: "習慣的安穩、不想改變卻必須改變的部分。",
      timeDependent: false
    },
    {
      key: "uranus",
      name: "天王星數字",
      theme: "創意＆自由",
      meaning: "自我中心的態度、是否尊崇自己原來的樣子、會不會為了別人改變自己。",
      timeDependent: true
    },
    {
      key: "neptune",
      name: "海王星數字",
      theme: "愛與藝術",
      meaning: "天生的藝術氣息、掌管奉獻與服務。",
      timeDependent: true
    },
    {
      key: "pluto",
      name: "冥王星數字",
      theme: "靈性發展",
      meaning: "掌管生命功課。",
      timeDependent: false
    },
    {
      key: "ascendant",
      name: "上升數字",
      theme: "特質＆形象",
      meaning: "掌管在他人面前展現的樣子、氣質、外型。",
      timeDependent: false
    },
    {
      key: "northNode",
      name: "北交數字",
      theme: "良善＆美德",
      meaning: "優點、狀態好時的最佳表現。",
      timeDependent: true
    },
    {
      key: "southNode",
      name: "南交數字",
      theme: "節制＆特質",
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

  return { PLANETS, reduceToRange, calculateNumbers };
});
