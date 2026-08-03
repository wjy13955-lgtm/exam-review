const app = getApp();

Page({
  data: {
    modules: [],
    reasons: ["知识盲点", "审题失误", "方法不熟", "时间不足", "计算失误"],
    moduleIndex: 0,
    reasonIndex: 0,
    imagePath: "",
    dueList: [],
    futureList: [],
    masteredList: [],
    vocabDueList: [],
    vocabFutureList: [],
    vocabMasteredList: []
  },

  onLoad() {
    this.setData({ modules: app.globalData.MODULES });
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
    return {
      ...normalized,
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
    state.mistakes.unshift({
      id: app.uid(),
      createdAt,
      module: this.data.modules[this.data.moduleIndex],
      source: d.source || "未填写来源",
      summary: d.summary || "未填写摘要",
      questionText: d.questionText || "",
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
    this.setData({ imagePath: "" });
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

  finishReview(e) {
    const id = e.currentTarget.dataset.id;
    const state = app.getState();
    const item = state.mistakes.find(m => m.id === id);
    if (!item) return;
    const normalized = app.normalizeMistake(item);
    const index = normalized.reviewPlan.findIndex(step => !step.done);
    if (index >= 0) {
      normalized.reviewPlan[index].done = true;
    }
    const next = normalized.reviewPlan.find(step => !step.done);
    normalized.reviewRound = normalized.reviewPlan.filter(step => step.done).length;
    normalized.reviewDate = next ? next.date : normalized.reviewDate;
    normalized.mastered = !next;
    normalized.done = normalized.mastered;
    const position = state.mistakes.findIndex(m => m.id === id);
    state.mistakes[position] = normalized;
    app.setState(state);
    wx.showToast({ title: normalized.mastered ? "已掌握" : "已安排下轮" });
    this.load();
  },

  finishVocabReview(e) {
    const id = e.currentTarget.dataset.id;
    const state = app.getState();
    const list = state.vocabNotes || [];
    const item = list.find(v => v.id === id);
    if (!item) return;
    const normalized = app.normalizeVocab(item);
    const index = normalized.reviewPlan.findIndex(step => !step.done);
    if (index >= 0) {
      normalized.reviewPlan[index].done = true;
    }
    const next = normalized.reviewPlan.find(step => !step.done);
    normalized.reviewRound = normalized.reviewPlan.filter(step => step.done).length;
    normalized.reviewDate = next ? next.date : normalized.reviewDate;
    normalized.mastered = !next;
    normalized.done = normalized.mastered;
    const position = list.findIndex(v => v.id === id);
    list[position] = normalized;
    state.vocabNotes = list;
    app.setState(state);
    wx.showToast({ title: normalized.mastered ? "已掌握" : "已安排下轮" });
    this.load();
  }
});
