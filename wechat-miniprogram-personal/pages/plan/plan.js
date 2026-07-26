const app = getApp();

Page({
  data: {
    mode: "week",
    stats: {},
    groupedTasks: [],
    remaining: 0,
    month: {}
  },

  onShow() {
    this.load();
  },

  setMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
    this.load();
  },

  load() {
    const state = app.getState();
    const stats = app.stats(state);
    const todayDate = app.today();
    const capacity = [0, 6].includes(new Date().getDay()) ? state.profile.weekend : state.profile.weekday;
    const dates = [...new Set(state.tasks.filter(t => t.date >= todayDate).map(t => t.date))].slice(0, 7);
    const groupedTasks = dates.map(date => ({ date, tasks: state.tasks.filter(t => t.date === date) }));
    const monthPrefix = todayDate.slice(0, 7);
    const monthTasks = state.tasks.filter(t => t.date.startsWith(monthPrefix));
    const done = monthTasks.filter(t => t.done).length;
    this.setData({
      stats,
      groupedTasks,
      remaining: Math.max(0, capacity - stats.doneMinutes),
      month: {
        total: monthTasks.length,
        done,
        hours: (monthTasks.reduce((n, t) => n + Number(t.minutes || 0), 0) / 60).toFixed(1),
        rate: monthTasks.length ? app.clamp(done / monthTasks.length * 100) : 0
      }
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

  quickAdd() {
    const state = app.getState();
    const module = "资料分析";
    state.tasks.push({
      id: app.uid(),
      date: app.today(),
      title: "临时加练 20 题",
      module,
      minutes: 30,
      done: false
    });
    app.setState(state);
    wx.showToast({ title: "已添加" });
    this.load();
  },

  regenerate() {
    wx.showModal({
      title: "重新生成计划",
      content: "会替换未来计划，已完成任务不保留。继续吗？",
      success: res => {
        if (!res.confirm) return;
        app.makePlan();
        wx.showToast({ title: "已生成" });
        this.load();
      }
    });
  }
});
