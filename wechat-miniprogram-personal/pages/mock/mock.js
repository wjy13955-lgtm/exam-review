const app = getApp();

Page({
  data: {
    types: ["国考模拟", "省考模拟", "阶段套卷"],
    typeIndex: 0,
    mocks: [],
    targetScore: 145,
    latestScore: "—"
  },

  onShow() {
    this.load();
  },

  changeType(e) {
    this.setData({ typeIndex: Number(e.detail.value) });
  },

  load() {
    const state = app.getState();
    const targetScore = Number(state.profile.targetXingce) + Number(state.profile.targetShenlun);
    const mocks = [...state.mocks].map(m => {
      const total = Number(m.xingce) + Number(m.shenlun);
      return {
        ...m,
        total,
        diffText: total >= targetScore ? `+${total - targetScore}` : `-${targetScore - total}`
      };
    });
    this.setData({
      targetScore,
      latestScore: mocks.length ? mocks[0].total : "—",
      mocks
    });
  },

  submit(e) {
    const d = e.detail.value;
    const state = app.getState();
    state.mocks.unshift({
      id: app.uid(),
      date: app.today(),
      type: this.data.types[this.data.typeIndex],
      xingce: Number(d.xingce || 0),
      shenlun: Number(d.shenlun || 0),
      note: d.note || ""
    });
    app.setState(state);
    wx.showToast({ title: "已保存" });
    this.load();
  }
});
