const app = getApp();

Page({
  data: {
    modules: [],
    answerOptions: [],
    reasons: ["知识盲点", "审题失误", "方法不熟", "时间不足", "计算失误"],
    moduleIndex: 0,
    reasonIndex: 0,
    userAnswerIndex: 0,
    correctAnswerIndex: 0,
    imagePath: "",
    dueList: [],
    futureList: [],
    masteredList: [],
    vocabDueList: [],
    vocabFutureList: [],
    vocabMasteredList: [],
    activeReview: null,
    showAnswer: false
  },

  onLoad() {
    this.setData({ modules: app.globalData.MODULES, answerOptions: app.globalData.ANSWER_OPTIONS });
  },

  onShow() {
    this.load();
  },

  changeModule(e) {
    this.setData({ moduleIndex: Number(e.detail.value) });
  },

  changeReason(e) {
    this.setData({ reasonIndex: Number(e.detail.value) });
  },

  changeUserAnswer(e) {
    this.setData({ userAnswerIndex: Number(e.detail.value) });
  },

  changeCorrectAnswer(e) {
    this.setData({ correctAnswerIndex: Number(e.detail.value) });
  },

  parseChoiceText(text = "") {
    const raw = String(text || "").trim();
    if (!raw) return { questionText: "", options: {} };
    const normalized = raw.replace(/\r/g, "\n");
    const optionRegex = /(?:^|\n|\s)([A-D])[\.\．、:：]\s*/g;
    const matches = [...normalized.matchAll(optionRegex)];
    if (!matches.length) return { questionText: raw, options: {} };
    const first = matches[0];
    const questionText = normalized.slice(0, first.index).trim();
    const options = {};
    matches.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
      options[match[1]] = normalized.slice(start, end).trim();
    });
    return { questionText: questionText || raw, options };
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: res => {
        const tempPath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!tempPath) return;
        wx.saveFile({
          tempFilePath: tempPath,
          success: saved => {
            this.setData({ imagePath: saved.savedFilePath });
            wx.showToast({ title: "图片已保存" });
          },
          fail: () => {
            this.setData({ imagePath: tempPath });
            wx.showToast({ title: "图片已选择" });
          }
        });
      }
    });
  },

  previewImage() {
    if (!this.data.imagePath) return;
    wx.previewImage({ urls: [this.data.imagePath], current: this.data.imagePath });
  },

  previewListImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    wx.previewImage({ urls: [src], current: src });
  },

  enrich(item) {
    const normalized = app.normalizeMistake(item);
    const nextIndex = normalized.reviewPlan.findIndex(step => !step.done);
    const options = normalized.options || {};
    const optionList = app.globalData.ANSWER_OPTIONS
      .filter(key => options[key])
      .map(key => ({ key, text: options[key] }));
    return {
      ...normalized,
      optionList,
      nextRound: nextIndex >= 0 ? nextIndex + 1 : 6
    };
  },

  enrichVocab(item) {
    const normalized = app.normalizeVocab(item);
    const nextIndex = normalized.reviewPlan.findIndex(step => !step.done);
    return {
      ...normalized,
      nextRound: nextIndex >= 0 ? nextIndex + 1 : 6
    };
  },

  load() {
    const state = app.getState();
    state.mistakes = (state.mistakes || []).map(item => app.normalizeMistake(item));
    state.vocabNotes = (state.vocabNotes || []).map(item => app.normalizeVocab(item));
    app.setState(state);
    const today = app.today();
    const all = state.mistakes.map(item => this.enrich(item));
    const vocabs = state.vocabNotes.map(item => this.enrichVocab(item));
    this.setData({
      dueList: all.filter(item => !item.mastered && item.reviewDate <= today),
      futureList: all.filter(item => !item.mastered && item.reviewDate > today),
      masteredList: all.filter(item => item.mastered),
      vocabDueList: vocabs.filter(item => !item.mastered && item.reviewDate <= today),
      vocabFutureList: vocabs.filter(item => !item.mastered && item.reviewDate > today),
      vocabMasteredList: vocabs.filter(item => item.mastered)
    });
  },

  submit(e) {
    const d = e.detail.value;
    const state = app.getState();
    const createdAt = app.today();
    const parsed = this.parseChoiceText(d.questionFullText || d.questionText || "");
    const options = {
      A: d.optionA || parsed.options.A || "",
      B: d.optionB || parsed.options.B || "",
      C: d.optionC || parsed.options.C || "",
      D: d.optionD || parsed.options.D || ""
    };
    state.mistakes.unshift({
      id: app.uid(),
      createdAt,
      module: this.data.modules[this.data.moduleIndex],
      source: d.source || "未填写来源",
      summary: d.summary || "未填写摘要",
      questionFullText: d.questionFullText || "",
      questionText: d.questionText || parsed.questionText || "",
      options,
      userAnswer: this.data.answerOptions[this.data.userAnswerIndex],
      correctAnswer: this.data.answerOptions[this.data.correctAnswerIndex],
      knowledge: d.knowledge || "",
      reason: this.data.reasons[this.data.reasonIndex],
      solution: d.solution || "",
      imagePath: this.data.imagePath,
      reviewPlan: app.makeReviewPlan(createdAt),
      reviewDate: createdAt,
      reviewRound: 0,
      mastered: false,
      done: false
    });
    app.setState(state);
    this.setData({ imagePath: "", userAnswerIndex: 0, correctAnswerIndex: 0 });
    wx.showToast({ title: "已生成复盘计划" });
    this.load();
  },

  submitVocab(e) {
    const d = e.detail.value;
    const state = app.getState();
    const createdAt = app.today();
    state.vocabNotes = state.vocabNotes || [];
    state.vocabNotes.unshift({
      id: app.uid(),
      createdAt,
      word: d.word || "未填写词语",
      meaning: d.meaning || "",
      confuseWith: d.confuseWith || "",
      difference: d.difference || "",
      context: d.context || "",
      example: d.example || "",
      source: d.source || "",
      reviewPlan: app.makeReviewPlan(createdAt),
      reviewDate: createdAt,
      reviewRound: 0,
      mastered: false,
      done: false
    });
    app.setState(state);
    wx.showToast({ title: "已加入词义复盘" });
    this.load();
  },

  startReview(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    const state = app.getState();
    const list = type === "vocab" ? (state.vocabNotes || []) : (state.mistakes || []);
    const raw = list.find(item => item.id === id);
    if (!raw) return;
    const item = type === "vocab" ? this.enrichVocab(raw) : this.enrich(raw);
    this.setData({
      activeReview: { ...item, type },
      showAnswer: false
    });
  },

  showReviewAnswer() {
    this.setData({ showAnswer: true });
  },

  closeReviewCard() {
    this.setData({ activeReview: null, showAnswer: false });
  },

  noop() {},

  applyReviewResult(type, id, level) {
    const state = app.getState();
    const key = type === "vocab" ? "vocabNotes" : "mistakes";
    const normalizer = type === "vocab" ? app.normalizeVocab.bind(app) : app.normalizeMistake.bind(app);
    const list = state[key] || [];
    const indexInList = list.findIndex(item => item.id === id);
    if (indexInList < 0) return;
    const normalized = normalizer(list[indexInList]);
    const currentIndex = normalized.reviewPlan.findIndex(step => !step.done);
    if (level === "forgot") {
      normalized.reviewPlan = app.makeReviewPlan(app.addDays(app.today(), 1));
      normalized.reviewDate = app.addDays(app.today(), 1);
      normalized.reviewRound = 0;
      normalized.mastered = false;
      normalized.done = false;
      normalized.lastReviewResult = "没想起";
    } else if (level === "vague") {
      if (currentIndex >= 0) {
        normalized.reviewPlan[currentIndex].date = app.addDays(app.today(), 1);
      }
      normalized.reviewDate = app.addDays(app.today(), 1);
      normalized.reviewRound = normalized.reviewPlan.filter(step => step.done).length;
      normalized.mastered = false;
      normalized.done = false;
      normalized.lastReviewResult = "模糊";
    } else {
      if (currentIndex >= 0) {
        normalized.reviewPlan[currentIndex].done = true;
      }
      const next = normalized.reviewPlan.find(step => !step.done);
      normalized.reviewRound = normalized.reviewPlan.filter(step => step.done).length;
      normalized.reviewDate = next ? next.date : normalized.reviewDate;
      normalized.mastered = !next;
      normalized.done = normalized.mastered;
      normalized.lastReviewResult = "掌握";
    }
    list[indexInList] = normalized;
    state[key] = list;
    app.setState(state);
    this.setData({ activeReview: null, showAnswer: false });
    wx.showToast({ title: normalized.mastered ? "已掌握" : "已安排下轮" });
    this.load();
  },

  markReviewResult(e) {
    const level = e.currentTarget.dataset.level;
    const active = this.data.activeReview;
    if (!active) return;
    this.applyReviewResult(active.type, active.id, level);
  },

  finishReview(e) {
    const id = e.currentTarget.dataset.id;
    this.applyReviewResult("mistake", id, "mastered");
  },

  finishVocabReview(e) {
    const id = e.currentTarget.dataset.id;
    this.applyReviewResult("vocab", id, "mastered");
  }
});
