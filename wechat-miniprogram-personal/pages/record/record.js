const app = getApp();

Page({
  data: {
    modules: [],
    moduleIndex: 0,
    records: []
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

  load() {
    const state = app.getState();
    const records = [...state.records].slice(0, 30).map(r => ({
      ...r,
      rate: r.total ? Math.round(Number(r.correct) / Number(r.total) * 100) : 0
    }));
    this.setData({ records });
  },

  submit(e) {
    const d = e.detail.value;
    const state = app.getState();
    state.records.unshift({
      id: app.uid(),
      date: app.today(),
      module: this.data.modules[this.data.moduleIndex],
      source: d.source || "未填写来源",
      total: Number(d.total || 0),
      correct: Number(d.correct || 0),
      minutes: Number(d.minutes || 0),
      note: d.note || ""
    });
    app.setState(state);
    wx.showToast({ title: "已保存" });
    this.load();
  }
});
