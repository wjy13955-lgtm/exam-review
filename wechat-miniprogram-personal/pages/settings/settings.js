const app = getApp();

Page({
  data: {
    profile: {}
  },

  onShow() {
    this.load();
  },

  load() {
    const state = app.getState();
    this.setData({ profile: state.profile });
  },

  saveProfile(e) {
    const d = e.detail.value;
    const state = app.getState();
    state.profile = {
      ...state.profile,
      name: d.name || "",
      exam: d.exam || "国考",
      province: d.province || "",
      examDate: d.examDate || state.profile.examDate,
      targetXingce: Number(d.targetXingce || 75),
      targetShenlun: Number(d.targetShenlun || 70),
      weekday: Number(d.weekday || 150),
      weekend: Number(d.weekend || 300)
    };
    app.setState(state);
    wx.showToast({ title: "已保存" });
    this.load();
  },

  exportData() {
    wx.setClipboardData({
      data: JSON.stringify(app.getState()),
      success: () => wx.showToast({ title: "已复制" })
    });
  },

  importData() {
    wx.getClipboardData({
      success: res => {
        try {
          const data = JSON.parse(res.data);
          if (data.version !== 1 || !data.profile || !Array.isArray(data.tasks)) throw new Error();
          wx.showModal({
            title: "恢复备份",
            content: "会覆盖当前数据，继续吗？",
            success: modal => {
              if (!modal.confirm) return;
              app.setState(data);
              wx.showToast({ title: "已恢复" });
              this.load();
            }
          });
        } catch (err) {
          wx.showToast({ title: "备份格式不对", icon: "none" });
        }
      }
    });
  },

  regenerate() {
    app.makePlan();
    wx.showToast({ title: "已生成" });
  },

  reset() {
    wx.showModal({
      title: "清空数据",
      content: "此操作无法撤销，建议先导出备份。继续吗？",
      success: res => {
        if (!res.confirm) return;
        app.resetState();
        wx.showToast({ title: "已清空" });
        this.load();
      }
    });
  }
});
