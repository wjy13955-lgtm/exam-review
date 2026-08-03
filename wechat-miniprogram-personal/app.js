const KEY = "shoreline-gongkao-mini-v1";
const MODULES = ["资料分析", "言语理解", "政治理论", "判断推理", "数量关系", "申论"];
const COLORS = {
  "资料分析": "",
  "言语理解": "green",
  "政治理论": "orange",
  "判断推理": "purple",
  "数量关系": "red",
  "申论": "orange",
  "复盘": "purple",
  "模考": ""
};

const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const addDays = (date, n) => {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const days = (a, b) => Math.max(0, Math.ceil((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 864e5));
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const REVIEW_INTERVALS = [0, 1, 3, 7, 15, 30];

function freshState() {
  const exam = new Date();
  exam.setMonth(exam.getMonth() + 4);
  const targets = {
    "资料分析": { questions: 20, accuracy: 85, minutes: 25 },
    "言语理解": { questions: 40, accuracy: 80, minutes: 35 },
    "政治理论": { questions: 20, accuracy: 80, minutes: 15 },
    "判断推理": { questions: 40, accuracy: 85, minutes: 35 },
    "数量关系": { questions: 15, accuracy: 70, minutes: 20 }
  };
  return {
    version: 1,
    profile: {
      name: "",
      exam: "国考",
      province: "",
      examDate: iso(exam),
      weekday: 150,
      weekend: 300,
      stage: "强化提升",
      targetXingce: 75,
      targetShenlun: 70,
      targets,
      ready: true
    },
    tasks: [],
    records: [],
    mistakes: [],
    vocabNotes: [],
    mocks: []
  };
}

App({
  globalData: { MODULES, COLORS },

  onLaunch() {
    const state = this.getState();
    if (!state.tasks.length) {
      this.makePlan();
    }
  },

  getState() {
    const data = wx.getStorageSync(KEY);
    if (!data || data.version !== 1) {
      const state = freshState();
      wx.setStorageSync(KEY, state);
      return state;
    }
    const base = freshState();
    return {
      ...base,
      ...data,
      profile: {
        ...base.profile,
        ...data.profile,
        targets: { ...base.profile.targets, ...(data.profile && data.profile.targets || {}) }
      }
    };
  },

  setState(state) {
    wx.setStorageSync(KEY, state);
  },

  makeReviewPlan(start = today()) {
    return REVIEW_INTERVALS.map((gap, index) => ({
      index,
      gap,
      date: addDays(start, gap),
      done: false
    }));
  },

  normalizeMistake(item) {
    const createdAt = item.createdAt || item.reviewDate || today();
    const reviewPlan = Array.isArray(item.reviewPlan) && item.reviewPlan.length
      ? item.reviewPlan
      : this.makeReviewPlan(createdAt);
    const next = reviewPlan.find(step => !step.done);
    return {
      ...item,
      createdAt,
      reviewPlan,
      reviewRound: item.reviewRound || reviewPlan.filter(step => step.done).length,
      reviewDate: next ? next.date : item.reviewDate || createdAt,
      mastered: item.mastered || !next,
      done: item.done || false,
      imagePath: item.imagePath || "",
      questionText: item.questionText || "",
      knowledge: item.knowledge || ""
    };
  },

  normalizeVocab(item) {
    const createdAt = item.createdAt || item.reviewDate || today();
    const reviewPlan = Array.isArray(item.reviewPlan) && item.reviewPlan.length
      ? item.reviewPlan
      : this.makeReviewPlan(createdAt);
    const next = reviewPlan.find(step => !step.done);
    return {
      ...item,
      createdAt,
      reviewPlan,
      reviewRound: item.reviewRound || reviewPlan.filter(step => step.done).length,
      reviewDate: next ? next.date : item.reviewDate || createdAt,
      mastered: item.mastered || !next,
      done: item.done || false,
      word: item.word || "",
      meaning: item.meaning || "",
      confuseWith: item.confuseWith || "",
      difference: item.difference || "",
      context: item.context || "",
      example: item.example || "",
      source: item.source || ""
    };
  },

  dueMistakes(state = this.getState()) {
    return (state.mistakes || [])
      .map(item => this.normalizeMistake(item))
      .filter(item => !item.mastered && item.reviewDate <= today());
  },

  dueVocabs(state = this.getState()) {
    return (state.vocabNotes || [])
      .map(item => this.normalizeVocab(item))
      .filter(item => !item.mastered && item.reviewDate <= today());
  },

  resetState() {
    const state = freshState();
    wx.setStorageSync(KEY, state);
    this.makePlan();
  },

  stats(state = this.getState()) {
    const due = state.tasks.filter(t => t.date <= today());
    const todayTasks = state.tasks.filter(t => t.date === today());
    const done = state.tasks.filter(t => t.done);
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - 13);
    const recent = state.tasks.filter(t => t.date >= iso(recentStart) && t.date < today());
    const recentRateRaw = recent.length ? recent.filter(t => t.done).length / recent.length : 1;
    const doneMinutes = todayTasks.filter(t => t.done).reduce((n, t) => n + Number(t.minutes || 0), 0);
    const todayMinutes = todayTasks.reduce((n, t) => n + Number(t.minutes || 0), 0);
    return {
      left: days(today(), state.profile.examDate),
      todayTasks,
      todayMinutes,
      doneMinutes,
      todayRate: todayTasks.length ? clamp(todayTasks.filter(t => t.done).length / todayTasks.length * 100) : 0,
      planRate: due.length ? clamp(due.filter(t => t.done).length / due.length * 100) : 0,
      recentRate: clamp(recentRateRaw * 100),
      minutes: state.records.reduce((n, r) => n + Number(r.minutes || 0), 0) + done.reduce((n, t) => n + Number(t.minutes || 0), 0)
    };
  },

  makePlan() {
    const state = this.getState();
    const t = state.profile.targets;
    const base = [
      [`资料分析专项 ${t["资料分析"].questions} 题`, "资料分析", t["资料分析"].minutes],
      [`言语理解专项 ${t["言语理解"].questions} 题`, "言语理解", t["言语理解"].minutes],
      [`政治理论专项 ${t["政治理论"].questions} 题`, "政治理论", t["政治理论"].minutes],
      [`判断推理专项 ${t["判断推理"].questions} 题`, "判断推理", t["判断推理"].minutes],
      [`数量关系专项 ${t["数量关系"].questions} 题`, "数量关系", t["数量关系"].minutes],
      ["申论小题精练 1 道", "申论", 60],
      ["错题回看与方法复盘", "复盘", 35]
    ];
    const generated = [];
    const length = Math.min(120, Math.max(14, days(today(), state.profile.examDate)));
    for (let i = 0; i < length; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const cap = [0, 6].includes(date.getDay()) ? state.profile.weekend : state.profile.weekday;
      for (let j = 0; j < (cap >= 240 ? 3 : 2); j += 1) {
        const item = base[(i * 2 + j) % base.length];
        generated.push({ id: uid(), date: iso(date), title: item[0], module: item[1], minutes: item[2], done: false });
      }
      if (i > 0 && i % 14 === 0) {
        generated.push({ id: uid(), date: iso(date), title: "行测阶段模考 1 套", module: "模考", minutes: 120, done: false });
      }
    }
    state.tasks = generated;
    this.setState(state);
  },

  today,
  addDays,
  iso,
  uid,
  clamp
});
