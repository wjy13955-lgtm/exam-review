const app = getApp();

Page({
  data: {
    profile: {},
    stats: {},
    goals: [],
    todayTasks: [],
    dueMistakes: [],
    dueVocabs: [],
    targetScore: 0,
    timeRate: 0
  },

  onShow() {
    this.load();
  },

  load() {
    const state = app.getState();
    const stats = app.stats(state);
    const records = state.records || [];
    const dueMistakes = app.dueMistakes(state).map(item => {
      const normalized = app.normalizeMistake(item);
      const nextIndex = normalized.reviewPlan.findIndex(step => !step.done);
      return {
        ...normalized,
        nextRound: nextIndex >= 0 ? nextIndex + 1 : 6
      };
    });
    const dueVocabs = app.dueVocabs(state).map(item => {
      const normalized = app.normalizeVocab(item);
      const nextIndex = normalized.reviewPlan.findIndex(step => !step.done);
      return {
        ...normalized,
        nextRound: nextIndex >= 0 ? nextIndex + 1 : 6
      };
    });
    const goals = Object.entries(state.profile.targets).map(([module, target]) => {
      const rs = records.filter(r => r.module === module);
      const total = rs.reduce((n, r) => n + Number(r.total || 0), 0);
      const correct = rs.reduce((n, r) => n + Number(r.correct || 0), 0);
      const actual = total ? Math.round(correct / total * 100) : null;
      return {
        module,
        ...target,
        color: app.globalData.COLORS[module],
        actualText: actual === null ? "尚未记录" : `当前 ${actual}%`
      };
    });
    this.setData({
      profile: state.profile,
      stats,
      goals,
      todayTasks: stats.todayTasks,
      dueMistakes,
      dueVocabs,
      targetScore: Number(state.profile.targetXingce) + Number(state.profile.targetShenlun),
      timeRate: stats.todayMinutes ? app.clamp(stats.doneMinutes / stats.todayMinutes * 100) : 0
    });
  },

  toggleTask(e) {
    const id = e.currentTarget.dataset.id;
    const state = app.getState();
    const task = state.tasks.find(t => t.id === id);
    if (task) task.done = !task.done;
    app.setState(state);
    this.load();
  },

  goPlan() {
    wx.switchTab({ url: "/pages/plan/plan" });
  },

  goReview() {
    wx.switchTab({ url: "/pages/review/review" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/settings" });
  }
});
