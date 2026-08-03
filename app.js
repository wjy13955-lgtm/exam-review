const KEY = "shoreline-gongkao-v1";
const MODULES = ["资料分析", "言语理解", "政治理论", "判断推理", "数量关系", "申论"];
const NAV = [
  ["dashboard", "home", "总览"], ["plan", "calendar", "计划"], ["records", "practice", "练习"],
  ["mistakes", "review", "复盘"], ["mocks", "chart", "模考"], ["settings", "settings", "设置"]
];
const ICONS = {
  home: `<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 18h2M14 18h2"/>`,
  practice: `<path d="M4 4h10v16H4z"/><path d="M8 8h4M8 12h4"/><path d="m14 17 5.5-5.5 2 2L16 19l-3 1z"/>`,
  review: `<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/><path d="m15 9 1.5 1.5L19 8"/>`,
  chart: `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m3 7 6-4 6 6 6-5"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.37.2.7.5.9.9.16.3.23.66.2 1V13c.03.34-.04.7-.2 1-.2.4-.53.7-.9 1z"/>`
};
const iconSvg = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const days = (a, b) => Math.max(0, Math.ceil((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 864e5));
const niceDate = v => { const d = new Date(`${v}T12:00`); return `${d.getMonth() + 1}月${d.getDate()}日`; };
const clamp = n => Math.max(0, Math.min(100, n));

function freshState() {
  const exam = new Date(); exam.setMonth(exam.getMonth() + 4);
  const targets = {
    "资料分析": { questions: 20, accuracy: 85, minutes: 25 },
    "言语理解": { questions: 40, accuracy: 80, minutes: 35 },
    "政治理论": { questions: 20, accuracy: 80, minutes: 15 },
    "判断推理": { questions: 40, accuracy: 85, minutes: 35 },
    "数量关系": { questions: 15, accuracy: 70, minutes: 20 }
  };
  return {
    version: 1,
    profile: { name: "", exam: "国考", province: "", examDate: iso(exam), weekday: 150, weekend: 300, stage: "强化提升", targetXingce: 75, targetShenlun: 70, targets, ready: false },
    tasks: [], records: [], mistakes: [], mocks: []
  };
}

function read() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data?.version !== 1) return freshState();
    const base = freshState();
    return {
      ...base, ...data,
      profile: {
        ...base.profile, ...data.profile,
        targets: { ...base.profile.targets, ...(data.profile?.targets || {}) }
      }
    };
  } catch { return freshState(); }
}

let state = read();
let page = location.hash.slice(1) || (window.matchMedia("(max-width: 720px)").matches ? "plan" : "dashboard");
let recordFilter = "全部";
let planMode = "week";
let planMonthOffset = 0;
let deferredInstallPrompt = null;

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function updateInstallPrompt() {
  const prompt = $("#install-prompt");
  if (!prompt) return;
  const dismissed = sessionStorage.getItem("shoreline-install-dismissed") === "1";
  prompt.hidden = isStandalone() || dismissed || (!deferredInstallPrompt && !isIos());
  const button = prompt.querySelector('[data-action="install-app"]');
  if (button) button.textContent = isIos() && !deferredInstallPrompt ? "查看方法" : "安装";
}

function showIosInstallHelp() {
  modal(`${closeHead("添加到手机桌面", "iPhone / iPad 安装方法")}
    <div class="premium-modal-list"><article><div><b>1. 使用 Safari 打开本页面</b><p>微信内置浏览器暂不支持安装，请点右上角后选择“在 Safari 中打开”。</p></div><span>第一步</span></article>
    <article><div><b>2. 点击浏览器底部的分享按钮</b><p>图标是一个带向上箭头的方框。</p></div><span>第二步</span></article>
    <article><div><b>3. 选择“添加到主屏幕”</b><p>确认名称后点击“添加”，桌面就会出现上岸轨迹。</p></div><span>完成</span></article></div>
    <div class="form-actions"><button class="btn" data-action="close">知道了</button></div>`);
}

async function installApp() {
  if (!deferredInstallPrompt) { showIosInstallHelp(); return; }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (choice.outcome === "accepted") toast("已添加到桌面");
  updateInstallPrompt();
}

function save(message) {
  localStorage.setItem(KEY, JSON.stringify(state));
  if (message) toast(message);
}

function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function makePlan() {
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
  for (let i = 0; i < length; i++) {
    const date = new Date(); date.setDate(date.getDate() + i);
    const cap = [0, 6].includes(date.getDay()) ? state.profile.weekend : state.profile.weekday;
    for (let j = 0; j < (cap >= 240 ? 3 : 2); j++) {
      const t = base[(i * 2 + j) % base.length];
      generated.push({ id: uid(), date: iso(date), title: t[0], module: t[1], minutes: t[2], done: false, fixed: false });
    }
    if (i > 0 && i % 14 === 0) generated.push({ id: uid(), date: iso(date), title: "行测阶段模考 1 套", module: "模考", minutes: 120, done: false, fixed: true });
  }
  state.tasks = generated;
}

function stats() {
  const due = state.tasks.filter(t => t.date <= today());
  const todayTasks = state.tasks.filter(t => t.date === today());
  const done = state.tasks.filter(t => t.done);
  const recentStart = new Date(); recentStart.setDate(recentStart.getDate() - 13);
  const recent = state.tasks.filter(t => t.date >= iso(recentStart) && t.date < today());
  const recentRate = recent.length ? recent.filter(t => t.done).length / recent.length : 1;
  const left = days(today(), state.profile.examDate);
  const remaining = state.tasks.filter(t => !t.done && t.date >= today()).reduce((n, t) => n + t.minutes, 0);
  const capacity = Math.max(1, left * (state.profile.weekday * 5 + state.profile.weekend * 2) / 7);
  const load = remaining / capacity / Math.max(.35, recentRate);
  return {
    todayTasks, done,
    todayRate: todayTasks.length ? Math.round(todayTasks.filter(t => t.done).length / todayTasks.length * 100) : 0,
    planRate: due.length ? Math.round(due.filter(t => t.done).length / due.length * 100) : 0,
    recentRate: Math.round(recentRate * 100),
    minutes: state.records.reduce((n, r) => n + r.minutes, 0) + done.reduce((n, t) => n + t.minutes, 0),
    left, risk: load > 1 ? "red" : load > .82 || recentRate < .65 ? "yellow" : "green"
  };
}

function renderNav() {
  const items = list => list.map(([id, icon, text]) => `<button class="nav-item ${page === id ? "active" : ""}" data-page="${id}"><i>${iconSvg(icon)}</i><span>${text}</span></button>`).join("");
  $("#side-nav").innerHTML = items(NAV);
  $("#mobile-nav").innerHTML = items(NAV.slice(0, 5));
}

function render() {
  renderNav();
  const title = { dashboard: "总览", plan: "学习计划", records: "练习记录", mistakes: "错题复盘", mocks: "模考分析", settings: "设置" };
  $("#page-title").textContent = title[page] || "总览";
  $("#date-label").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  const views = { dashboard, plan, records, mistakes, mocks, settings };
  $("#view").innerHTML = (views[page] || dashboard)();
  if (!state.profile.ready) setTimeout(welcome, 30);
}

const statCard = (label, value, unit, pct) => `<article class="card stat"><div class="label"><span>${label}</span><span class="pill">实时</span></div><strong>${value}</strong><small>${unit}</small><div class="progress" style="margin-top:11px"><i style="width:${clamp(pct)}%"></i></div></article>`;

function taskList(list) {
  if (!list.length) return `<div class="empty"><b>☕</b>今天还没有任务，给自己安排一个小目标吧。</div>`;
  return `<div class="task-list">${list.map(t => `<div class="task ${t.done ? "done" : ""}">
    <input class="check" type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}>
    <div><div class="task-title">${esc(t.title)}</div><div class="task-meta">${esc(t.module)} · ${t.minutes} 分钟${t.fixed ? " · 固定节点" : ""}</div></div>
    <span class="pill ${t.module === "申论" ? "orange" : ""}">${esc(t.module)}</span></div>`).join("")}</div>`;
}

function timelineTaskList(list) {
  if (!list.length) return `<div class="empty"><b>☕</b>这一天暂时没有任务。</div>`;
  const colors = { "资料分析": "blue", "言语理解": "green", "政治理论": "orange", "判断推理": "purple", "数量关系": "red", "申论": "navy", "复盘": "gray", "模考": "navy" };
  let cursor = 8 * 60;
  return `<div class="timeline">${list.map(t => {
    const start = `${pad(Math.floor(cursor / 60))}:${pad(cursor % 60)}`;
    cursor += t.minutes;
    const end = `${pad(Math.floor(cursor / 60))}:${pad(cursor % 60)}`;
    cursor += 15;
    return `<div class="timeline-item ${colors[t.module] || "navy"} ${t.done ? "done" : ""}">
      <time>${start}</time><i></i><label>
        <input class="check" type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}>
        <span><strong>${esc(t.title)}</strong><small>${start}–${end} · 目标 ${t.minutes} 分钟</small></span>
        <em>${esc(t.module)}</em>
      </label>
    </div>`;
  }).join("")}</div>`;
}

function performance() {
  const data = MODULES.map(module => {
    const rs = state.records.filter(r => r.module === module);
    const total = rs.reduce((n, r) => n + r.total, 0);
    const correct = rs.reduce((n, r) => n + r.correct, 0);
    const target = state.profile.targets[module]?.accuracy;
    return { module, total, rate: total ? Math.round(correct / total * 100) : 0, target };
  }).filter(x => x.total).sort((a, b) => b.rate - a.rate);
  if (!data.length) return `<div class="empty" style="padding:15px"><b>◌</b>记录练习后，这里会识别强弱项。</div>`;
  return `<div class="module-list">${data.map(x => `<div class="module-row"><span>${x.module}</span><div class="progress"><i style="width:${x.rate}%"></i></div><b class="${x.target && x.rate < x.target ? "below" : ""}">${x.rate}%${x.target ? `<small> / ${x.target}%</small>` : ""}</b></div>`).join("")}</div>`;
}

function moduleGoalCards() {
  const colors = { "资料分析": "blue", "言语理解": "green", "政治理论": "orange", "判断推理": "purple", "数量关系": "red" };
  return `<div class="goal-strip">${Object.entries(state.profile.targets).map(([module, target]) => {
    const records = state.records.filter(r => r.module === module);
    const total = records.reduce((n, r) => n + r.total, 0);
    const correct = records.reduce((n, r) => n + r.correct, 0);
    const actual = total ? Math.round(correct / total * 100) : null;
    return `<article class="goal-card ${colors[module]}"><i>${module.slice(0, 1)}</i><b>${module}</b>
      <span>${target.questions} 题</span><span>目标 ${target.accuracy}%</span><span>≤ ${target.minutes} 分钟</span>
      <small>${actual === null ? "尚未记录" : `当前 ${actual}%`}</small></article>`;
  }).join("")}</div>`;
}

const premiumFeatures = [
  ["本地备份", "定期导出数据文件，换设备时可手动恢复。", "个人版"],
  ["智能周计划", "按考试日期、目标分数、薄弱模块自动调整每日安排。", "规划中"],
  ["每周学习报告", "总结正确率、用时、执行率，并提示下周重点。", "规划中"],
  ["错题深度复盘", "按错因、题型和复习到期日提醒，避免反复踩坑。", "规划中"],
  ["模考趋势分析", "对比目标分数，查看行测/申论差距与提分方向。", "规划中"],
  ["报告导出", "导出 PDF/表格，沉淀自己的备考档案。", "规划中"]
];

function premiumCard(title = "个人版能力规划", subtitle = "当前定位为个人自用，不接入微信支付，重点做好记录、复盘和本地备份。") {
  return `<section class="card premium-card">
    <div class="premium-top"><div><span>个人版</span><h3>${title}</h3><p>${subtitle}</p></div><button class="btn small" data-action="premium">查看规划</button></div>
    <div class="premium-grid">${premiumFeatures.slice(0, 4).map(([name, desc, tag]) => `<article><b>${name}</b><small>${desc}</small><em>${tag}</em></article>`).join("")}</div>
  </section>`;
}

function lockedPanel(title, text, action = "查看规划") {
  return `<section class="card locked-panel"><div><span>规划中</span><h3>${title}</h3><p>${text}</p></div><button class="btn outline small" data-action="premium">${action}</button></section>`;
}

function dashboard() {
  const s = stats();
  const latestMock = [...state.mocks].sort((a, b) => b.date.localeCompare(a.date))[0];
  const targetScore = Number(state.profile.targetXingce) + Number(state.profile.targetShenlun);
  const latestScore = latestMock ? Number(latestMock.xingce) + Number(latestMock.shenlun) : null;
  const riskName = { green: "节奏稳健", yellow: "需要提速", red: "进度告急" }[s.risk];
  const riskText = s.risk === "green" ? "按近 14 天节奏，当前计划可在考试前完成。继续保持，不必盲目加量。"
    : s.risk === "yellow" ? `近期执行率为 ${s.recentRate}%，本周优先补齐高价值专项。`
    : "剩余任务超过未来容量，需要减少低优先级任务或增加学习时间。";
  const todayMinutes = s.todayTasks.reduce((n, t) => n + t.minutes, 0);
  const doneMinutes = s.todayTasks.filter(t => t.done).reduce((n, t) => n + t.minutes, 0);
  const dueReviews = state.mistakes.filter(m => !m.done && (!m.reviewDate || m.reviewDate <= today()));
  return `<section class="overview-head">
    <div><span>${esc(state.profile.stage)} · ${esc(state.profile.exam)}主线</span><h2>${state.profile.name ? `${esc(state.profile.name)}，` : ""}今天也向目标靠近一点。</h2><p>${niceDate(state.profile.examDate)} 笔试 · ${state.profile.province || "目标地区待设置"} · 目标 ${targetScore} 分</p></div>
    <div class="overview-countdown"><small>考试倒计时</small><strong>${s.left}</strong><span>天</span></div>
  </section>
  <section class="overview-metrics">
    <article class="today-ring" style="--p:${s.todayRate * 3.6}deg"><div><small>今日完成</small><strong>${s.todayRate}%</strong><span>${s.todayTasks.filter(t => t.done).length} / ${s.todayTasks.length} 项</span></div></article>
    <article><span>今日用时</span><strong>${doneMinutes}<small> / ${todayMinutes || 0} 分钟</small></strong><div class="progress"><i style="width:${clamp(doneMinutes / Math.max(1, todayMinutes) * 100)}%"></i></div></article>
    <article><span>连续执行</span><strong>${Math.max(1, Math.round(s.minutes / Math.max(60, state.profile.weekday)))}<small> 天</small></strong><p>近 14 天执行率 ${s.recentRate}%</p></article>
  </section>
  <section class="score-target-card"><div><span>笔试目标分数</span><strong>${targetScore}<small> 分</small></strong></div>
    <div><span>行测目标</span><b>${state.profile.targetXingce} 分</b></div><div><span>申论目标</span><b>${state.profile.targetShenlun} 分</b></div>
    <div><span>最近模考</span><b>${latestScore === null ? "尚未录入" : `${latestScore} 分`}</b><small>${latestScore === null ? "录入模考后计算差距" : latestScore >= targetScore ? `已超过目标 ${latestScore - targetScore} 分` : `距离目标 ${targetScore - latestScore} 分`}</small></div>
  </section>
  ${premiumCard("个人版能力规划", "当前先服务你自己：记录目标、执行计划、复盘错题、沉淀模考数据。")}
  <section class="card goal-section"><div class="card-head"><div><h3>五大模块今日目标</h3><p>题量 · 正确率 · 完成时间</p></div><button class="text-btn" data-action="profile">调整目标</button></div>${moduleGoalCards()}</section>
  <div class="overview-layout">
    <section class="card overview-tasks"><div class="card-head"><div><h3>今日任务</h3><p>按计划逐项完成</p></div><button class="text-btn" data-page="plan">查看周计划</button></div>${timelineTaskList(s.todayTasks)}</section>
    <div class="overview-side">
      <section class="card future-progress"><div class="card-head"><div><h3>未来进度</h3><p>按当前节奏预测</p></div><span class="pill ${s.risk !== "green" ? "orange" : ""}">${riskName}</span></div>
        <div class="future-row"><span>阶段计划</span><b>${s.planRate}%</b></div><div class="progress"><i style="width:${s.planRate}%"></i></div>
        <div class="future-row"><span>近期执行</span><b>${s.recentRate}%</b></div><div class="progress"><i style="width:${s.recentRate}%"></i></div><p>${riskText}</p></section>
      <section class="card review-reminder"><div class="card-head"><div><h3>错题复盘</h3><p>到期未复习</p></div><strong>${dueReviews.length}</strong></div>
        ${dueReviews.length ? dueReviews.slice(0, 3).map(m => `<div><span class="pill">${esc(m.module)}</span><p>${esc(m.summary)}</p></div>`).join("") : `<p class="review-clear">当前没有到期错题，保持住。</p>`}
        <button class="btn outline" data-page="mistakes">进入复盘</button></section>
    </div>
  </div>`;
}

function monthPlan() {
  const monthDate = new Date();
  monthDate.setDate(1);
  monthDate.setMonth(monthDate.getMonth() + planMonthOffset);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const monthTasks = state.tasks.filter(t => t.date.startsWith(monthPrefix));
  const doneTasks = monthTasks.filter(t => t.done);
  const totalMinutes = monthTasks.reduce((n, t) => n + t.minutes, 0);
  const cells = [
    ...Array.from({ length: firstWeekday }, () => `<div class="month-day blank"></div>`),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${monthPrefix}-${pad(day)}`;
      const tasks = monthTasks.filter(t => t.date === date);
      const completed = tasks.filter(t => t.done).length;
      return `<button class="month-day ${date === today() ? "today" : ""}" data-task-date="${date}">
        <b>${day}</b><small>${completed}/${tasks.length}</small>
        <span>${tasks.slice(0, 3).map(t => `<i class="month-dot ${t.module === "资料分析" ? "blue" : t.module === "言语理解" ? "green" : t.module === "政治理论" ? "orange" : t.module === "判断推理" ? "purple" : "red"}"></i>`).join("")}</span>
        ${tasks.slice(0, 2).map(t => `<em>${esc(t.title)}</em>`).join("")}${tasks.length > 2 ? `<u>+${tasks.length - 2}</u>` : ""}
      </button>`;
    })
  ].join("");
  return `<section class="month-summary">
      <article><span>本月任务</span><strong>${monthTasks.length}<small> 项</small></strong></article>
      <article><span>已经完成</span><strong>${doneTasks.length}<small> 项</small></strong></article>
      <article><span>计划时长</span><strong>${(totalMinutes / 60).toFixed(1)}<small> 小时</small></strong></article>
      <article><span>月完成率</span><strong>${monthTasks.length ? Math.round(doneTasks.length / monthTasks.length * 100) : 0}<small>%</small></strong></article>
    </section>
    <section class="card month-card"><div class="month-toolbar"><button class="month-arrow" data-month-shift="-1">‹</button><h3>${year}年${month + 1}月</h3><button class="month-arrow" data-month-shift="1">›</button></div>
      <div class="month-weekdays">${["日","一","二","三","四","五","六"].map(d => `<span>周${d}</span>`).join("")}</div>
      <div class="month-grid">${cells}</div>
    </section>
    <section class="card month-note"><div><h3>月度规划提示</h3><p>点击任意日期即可添加任务；建议每两周安排一次模考，并为错题复盘预留固定时间。</p></div><button class="btn outline" data-action="task">＋ 添加月度任务</button></section>`;
}

function plan() {
  const switcher = `<div class="plan-switcher"><button class="${planMode === "week" ? "active" : ""}" data-plan-mode="week">周计划</button><button class="${planMode === "month" ? "active" : ""}" data-plan-mode="month">月计划</button></div>`;
  if (planMode === "month") {
    return `<div class="section-head"><div><h2>计划</h2><p>按周执行，按月校准方向。</p></div>${switcher}</div>${lockedPanel("智能月计划", "根据目标分数、剩余天数和薄弱模块，自动给出本月训练重心。", "预留入口")}${monthPlan()}`;
  }
  const s = stats();
  const futureDates = [...new Set(state.tasks.filter(t => t.date >= today()).map(t => t.date))].slice(0, 14);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); const date = iso(d);
    return `<div class="day ${i === 0 ? "today" : ""}"><small>周${"日一二三四五六"[d.getDay()]}</small><b>${d.getDate()}</b>${state.tasks.some(t => t.date === date) ? "<i></i>" : ""}</div>`;
  }).join("");
  const todayCapacity = [0, 6].includes(new Date().getDay()) ? state.profile.weekend : state.profile.weekday;
  const doneMinutes = s.todayTasks.filter(t => t.done).reduce((n, t) => n + t.minutes, 0);
  const remaining = Math.max(0, todayCapacity - doneMinutes);
  return `<div class="section-head plan-heading"><div><h2>周计划</h2><p>按时间轴执行今天，按周历掌握未来。</p></div><div class="plan-head-actions">${switcher}<button class="btn" data-action="task">＋ 新建任务</button></div></div>
    <div class="mobile-plan-switcher">${switcher}</div>
    <section class="card week-card"><div class="calendar">${week}</div></section>
    <section class="card capacity-card">
      <div><span>今日剩余可用时长</span><strong>${remaining}<small>分钟</small></strong><div class="progress"><i style="width:${clamp(doneMinutes / Math.max(1, todayCapacity) * 100)}%"></i></div><small>每日计划 ${todayCapacity} 分钟</small></div>
      <div><span>任务进度</span><strong>${s.todayTasks.filter(t => t.done).length}<small> / ${s.todayTasks.length} 项</small></strong><div class="capacity-ring" style="--p:${s.todayRate * 3.6}deg"><b>${s.todayRate}%</b></div></div>
    </section>
    ${lockedPanel("智能周计划生成", "后续可一键生成本周安排：补弱项、排模考、留复盘，不再手动凑任务。")}
    <div class="plan-layout"><div class="grid plan-days">
      ${futureDates.map(date => { const ts = state.tasks.filter(t => t.date === date); return `<section class="card day-plan ${date === today() ? "current-day" : ""}"><div class="card-head"><div><h3>${date === today() ? "今天 · " : ""}${niceDate(date)}</h3><p>${ts.length} 项 · ${ts.reduce((n, t) => n + t.minutes, 0)} 分钟</p></div><button class="text-btn" data-task-date="${date}">添加任务</button></div>${timelineTaskList(ts)}</section>`; }).join("")}
    </div><aside class="card weekly-targets"><div class="card-head"><div><h3>五大模块目标</h3><p>本周训练标准</p></div><span class="pill">可编辑</span></div>
      ${Object.entries(state.profile.targets).map(([module, target]) => `<div class="weekly-target"><b>${module}</b><span>${target.questions} 题</span><span>≥ ${target.accuracy}%</span><span>≤ ${target.minutes} 分钟</span></div>`).join("")}
      <button class="btn outline" data-action="profile">调整目标</button></aside></div>`;
}

function records() {
  const list = recordFilter === "全部" ? state.records : state.records.filter(r => r.module === recordFilter);
  return `<div class="section-head"><div><h2>练习记录</h2><p>记录外部题库 App 的结果，用真实数据看见进步。</p></div><button class="btn" data-action="practice">＋ 记录练习</button></div>
    <div class="filters">${["全部", ...MODULES].map(m => `<button class="filter ${recordFilter === m ? "active" : ""}" data-filter="${m}">${m}</button>`).join("")}</div>
    ${lockedPanel("每周学习报告", "把练习记录自动汇总成趋势：哪个模块提分最快，哪个模块还在拖后腿。")}
    <section class="card" style="margin-top:15px">${list.length ? `<div class="table-wrap"><table><thead><tr><th>日期</th><th>模块</th><th>来源</th><th>题量</th><th>正确率</th><th>用时</th><th></th></tr></thead><tbody>
    ${[...list].sort((a, b) => b.date.localeCompare(a.date)).map(r => {
      const target = state.profile.targets[r.module];
      const rate = Math.round(r.correct / r.total * 100);
      return `<tr><td>${niceDate(r.date)}</td><td><span class="pill">${r.module}</span></td><td>${esc(r.source)}</td><td>${r.total}${target ? `<small class="target-hint">目标 ${target.questions}</small>` : ""}</td><td><span class="score ${target && rate < target.accuracy ? "below" : ""}">${rate}%</span>${target ? `<small class="target-hint">目标 ${target.accuracy}%</small>` : ""}</td><td>${r.minutes} 分钟${target ? `<small class="target-hint">目标 ${target.minutes} 分钟</small>` : ""}</td><td><button class="text-btn" data-delete-record="${r.id}">删除</button></td></tr>`;
    }).join("")}</tbody></table></div>` : `<div class="empty"><b>◫</b>还没有记录。做完一组题，就把结果放进来。</div>`}</section>`;
}

function mistakes() {
  const reasons = state.mistakes.reduce((a, m) => (a[m.reason] = (a[m.reason] || 0) + 1, a), {});
  const max = Math.max(1, ...Object.values(reasons));
  const reasonView = Object.keys(reasons).length ? `<div class="module-list">${Object.entries(reasons).map(([k, v]) => `<div class="module-row"><span>${k}</span><div class="progress"><i style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join("")}</div>` : `<div class="empty">暂无数据</div>`;
  return `<div class="section-head"><div><h2>错题复盘</h2><p>只记录索引和错误原因，不复制商业题库内容。</p></div><button class="btn" data-action="mistake">＋ 添加错题</button></div>
    <div class="grid two"><section class="card"><div class="card-head"><h3>待复习</h3><span class="pill orange">${state.mistakes.filter(m => !m.done).length} 项</span></div>
    ${state.mistakes.length ? `<div class="task-list">${state.mistakes.map(m => `<div class="task ${m.done ? "done" : ""}"><input class="check" type="checkbox" data-mistake="${m.id}" ${m.done ? "checked" : ""}><div><div class="task-title">${esc(m.summary)}</div><div class="task-meta">${esc(m.source)} · ${esc(m.reason)}</div></div><span class="pill">${m.module}</span></div>`).join("")}</div>` : `<div class="empty"><b>◎</b>错题不可怕，没有复盘的错题才可惜。</div>`}</section>
    <section class="card"><div class="card-head"><h3>错误原因分布</h3></div>${reasonView}</section></div>
    ${lockedPanel("错题深度复盘", "按错因和到期日生成复盘队列，提醒你优先处理反复出错的题型。")}`;
}

function mocks() {
  const latest = [...state.mocks].sort((a, b) => b.date.localeCompare(a.date))[0];
  const targetScore = Number(state.profile.targetXingce) + Number(state.profile.targetShenlun);
  return `<div class="section-head"><div><h2>模考分析</h2><p>只有真实模考成绩才用于成绩趋势判断。</p></div><button class="btn" data-action="mock">＋ 录入模考</button></div>
    <div class="grid stats">${statCard("模考次数", state.mocks.length, "次", state.mocks.length * 10)}${statCard("最近行测", latest?.xingce ?? "—", "分", latest?.xingce ?? 0)}${statCard("最近申论", latest?.shenlun ?? "—", "分", latest?.shenlun ?? 0)}${statCard("最近总分", latest ? latest.xingce + latest.shenlun : "—", "分", latest ? (latest.xingce + latest.shenlun) / 2 : 0)}</div>
    <section class="card mock-target"><div><span>目标总分</span><strong>${targetScore} 分</strong></div><div><span>行测目标</span><b>${state.profile.targetXingce} 分</b></div><div><span>申论目标</span><b>${state.profile.targetShenlun} 分</b></div><div><span>当前差距</span><b>${latest ? `${targetScore - (latest.xingce + latest.shenlun)} 分` : "等待首次模考"}</b></div></section>
    ${lockedPanel("模考趋势分析", "录入 3 次以上模考后，可生成目标差距、提分路径和下次模考重点。")}
    <section class="card" style="margin-top:18px">${state.mocks.length ? `<div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>行测</th><th>申论</th><th>总分</th><th>复盘</th></tr></thead><tbody>${[...state.mocks].sort((a, b) => b.date.localeCompare(a.date)).map(m => `<tr><td>${niceDate(m.date)}</td><td>${m.type}</td><td class="score">${m.xingce}</td><td class="score">${m.shenlun}</td><td class="score">${m.xingce + m.shenlun}</td><td>${esc(m.note || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><b>△</b>完成第一次模考后，从这里开始观察真实趋势。</div>`}</section>`;
}

function setting(label, value) { return `<div class="setting"><span>${label}</span><b>${esc(value)}</b></div>`; }
function settings() {
  const s = stats();
  return `<div class="section-head"><div><h2>设置</h2><p>调整目标与节奏，管理本机数据。</p></div></div><div class="grid two">
    <section class="card"><div class="card-head"><h3>备考目标</h3><button class="btn small outline" data-action="profile">编辑</button></div>
    ${setting("主目标", state.profile.exam)}${setting("目标地区", state.profile.province || "暂未设置")}${setting("考试日期", `${state.profile.examDate}（剩余 ${s.left} 天）`)}${setting("目标分数", `行测 ${state.profile.targetXingce} + 申论 ${state.profile.targetShenlun} = ${Number(state.profile.targetXingce) + Number(state.profile.targetShenlun)} 分`)}${setting("当前阶段", state.profile.stage)}${setting("学习容量", `工作日 ${state.profile.weekday} 分钟 · 周末 ${state.profile.weekend} 分钟`)}
    <div class="target-summary"><h3>模块目标</h3>${Object.entries(state.profile.targets).map(([module, target]) => `<div><span>${module}</span><b>${target.questions} 题 · ${target.accuracy}% · ${target.minutes} 分钟</b></div>`).join("")}</div></section>
    <section class="card"><div class="card-head"><h3>数据与计划</h3></div>
    <div class="setting"><div><b>导出备份</b><p>下载包含全部记录的 JSON 文件</p></div><button class="btn small outline" data-action="export">导出</button></div>
    <div class="setting"><div><b>恢复备份</b><p>从此前导出的文件恢复</p></div><button class="btn small outline" data-action="import">选择</button></div>
    <div class="setting"><div><b>重新生成计划</b><p>保留历史，替换未来未完成任务</p></div><button class="btn small outline" data-action="regenerate">生成</button></div>
    <div class="setting"><div><b>清空全部数据</b><p>此操作无法撤销，请先备份</p></div><button class="btn small danger" data-action="reset">清空</button></div></section></div>
    ${premiumCard("个人版路线", "不接入微信支付，数据先保存在本机；如需换设备，优先使用导出备份。")}`;
}

function modal(content) { $("#modal-root").innerHTML = `<div class="modal-backdrop"><div class="modal" data-modal>${content}</div></div>`; }
function closeModal() { $("#modal-root").innerHTML = ""; }
const closeHead = (title, sub) => `<div class="modal-head"><div><h2>${title}</h2><p>${sub}</p></div><button class="close" data-action="close">×</button></div>`;
const options = list => list.map(x => `<option>${x}</option>`).join("");

function targetEditor() {
  const targetModules = ["资料分析", "言语理解", "政治理论", "判断推理", "数量关系"];
  return `<div class="field full"><div class="target-title"><label>行测模块目标</label><small>完成时间必须与目标题量配套设置</small></div>
    <div class="target-editor"><div class="target-row target-header"><b>模块</b><b>题量</b><b>正确率</b><b>完成时间</b></div>
    ${targetModules.map((module, index) => {
      const t = state.profile.targets[module];
      return `<div class="target-row"><strong>${module}</strong>
        <label><input required type="number" min="1" max="100" name="target_${index}_questions" value="${t.questions}"><span>题</span></label>
        <label><input required type="number" min="1" max="100" name="target_${index}_accuracy" value="${t.accuracy}"><span>%</span></label>
        <label><input required type="number" min="1" max="180" name="target_${index}_minutes" value="${t.minutes}"><span>分钟</span></label>
      </div>`;
    }).join("")}</div></div>`;
}

function profileForm(first = false) {
  return `${first ? `<div class="welcome"><span class="brand-badge">岸</span><h2>建立你的上岸坐标</h2><p>用两分钟告诉我目标和可用时间，我们会生成一份能真正执行的计划。</p></div>` : closeHead("调整备考目标", "修改设置不会删除历史记录。")}
    <form id="profile-form" data-first="${first}"><div class="form-grid">
    <div class="field"><label>你的称呼</label><input name="name" value="${esc(state.profile.name)}" placeholder="可选"></div>
    <div class="field"><label>主考试目标</label><select name="exam"><option ${state.profile.exam === "国考" ? "selected" : ""}>国考</option><option ${state.profile.exam === "省考" ? "selected" : ""}>省考</option></select></div>
    <div class="field"><label>省考地区</label><input name="province" value="${esc(state.profile.province)}" placeholder="例如：江苏"></div>
    <div class="field"><label>目标笔试日期</label><input required type="date" name="examDate" min="${today()}" value="${state.profile.examDate}"></div>
    <div class="field"><label>工作日分钟</label><input required type="number" min="30" max="720" name="weekday" value="${state.profile.weekday}"></div>
    <div class="field"><label>周末分钟</label><input required type="number" min="30" max="720" name="weekend" value="${state.profile.weekend}"></div>
    <div class="field"><label>行测目标分数</label><input required type="number" min="0" max="100" step="0.5" name="targetXingce" value="${state.profile.targetXingce}"></div>
    <div class="field"><label>申论目标分数</label><input required type="number" min="0" max="100" step="0.5" name="targetShenlun" value="${state.profile.targetShenlun}"></div>
    <div class="field full"><label>当前阶段</label><select name="stage">${["基础建立", "强化提升", "套卷训练", "考前冲刺"].map(x => `<option ${state.profile.stage === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    ${targetEditor()}
    </div><div class="form-actions">${first ? "" : `<button type="button" class="btn outline" data-action="close">取消</button>`}<button class="btn">${first ? "生成我的计划" : "保存设置"}</button></div></form>`;
}

function welcome() { modal(profileForm(true), true); }
function practiceModal() {
  modal(`${closeHead("记录一次练习", "填写结果即可，题目和解析仍留在原题库 App。")}<form id="record-form"><div class="form-grid">
    <div class="field"><label>日期</label><input required type="date" name="date" value="${today()}"></div><div class="field"><label>模块</label><select name="module">${options(MODULES)}</select></div>
    <div class="field full"><label>来源</label><input required name="source" placeholder="例如：粉笔资料分析专项"></div><div class="field"><label>总题数</label><input required type="number" min="1" name="total" value="20"></div>
    <div class="field"><label>正确题数</label><input required type="number" min="0" name="correct" value="15"></div><div class="field"><label>用时（分钟）</label><input required type="number" min="1" name="minutes" value="30"></div>
    <div class="field full"><label>一句复盘</label><textarea name="note" placeholder="哪里卡住了？下次怎样更快？"></textarea></div></div>
    <div class="form-actions"><button type="button" class="btn outline" data-action="close">取消</button><button class="btn">保存记录</button></div></form>`);
}
function taskModal(date = today()) {
  modal(`${closeHead("添加学习任务", "任务要具体到能直接开始。")}<form id="task-form"><div class="form-grid">
    <div class="field full"><label>任务名称</label><input required name="title" placeholder="例如：资料分析速算 20 题"></div><div class="field"><label>日期</label><input required type="date" name="date" value="${date}"></div>
    <div class="field"><label>模块</label><select name="module">${options([...MODULES, "复盘", "模考"])}</select></div><div class="field"><label>预计分钟</label><input required type="number" min="5" name="minutes" value="45"></div>
    <div class="field"><label>类型</label><select name="fixed"><option value="false">可调整</option><option value="true">固定节点</option></select></div></div>
    <div class="form-actions"><button type="button" class="btn outline" data-action="close">取消</button><button class="btn">加入计划</button></div></form>`);
}
function mistakeModal() {
  modal(`${closeHead("添加错题索引", "记住为什么错，比抄下整道题更重要。")}<form id="mistake-form"><div class="form-grid">
    <div class="field"><label>模块</label><select name="module">${options(MODULES)}</select></div><div class="field"><label>来源/题号</label><input required name="source" placeholder="粉笔 · 练习日期 · 第12题"></div>
    <div class="field full"><label>题目摘要</label><input required name="summary" placeholder="用一句话描述考点"></div><div class="field"><label>错误原因</label><select name="reason">${options(["知识盲点", "审题失误", "方法不熟", "时间不足", "计算失误"])}</select></div>
    <div class="field"><label>计划复习日</label><input type="date" name="reviewDate" value="${today()}"></div><div class="field full"><label>正确思路</label><textarea name="solution" placeholder="下次看到什么特征，就用什么方法？"></textarea></div></div>
    <div class="form-actions"><button type="button" class="btn outline" data-action="close">取消</button><button class="btn">保存错题</button></div></form>`);
}
function mockModal() {
  modal(`${closeHead("录入模考成绩", "记录完整套卷，观察真实应试变化。")}<form id="mock-form"><div class="form-grid">
    <div class="field"><label>日期</label><input required type="date" name="date" value="${today()}"></div><div class="field"><label>类型</label><select name="type">${options(["国考模拟", "省考模拟"])}</select></div>
    <div class="field"><label>行测得分</label><input required type="number" min="0" max="100" step=".1" name="xingce"></div><div class="field"><label>申论得分</label><input required type="number" min="0" max="100" step=".1" name="shenlun"></div>
    <div class="field full"><label>复盘结论</label><textarea name="note" placeholder="本次最需要修正的一个问题"></textarea></div></div>
    <div class="form-actions"><button type="button" class="btn outline" data-action="close">取消</button><button class="btn">保存成绩</button></div></form>`);
}

function premiumModal() {
  modal(`${closeHead("个人版功能规划", "当前不接入微信支付，也不做收费入口；先把自用体验打磨顺。")}
    <div class="premium-modal-list">${premiumFeatures.map(([name, desc, tag]) => `<article><div><b>${name}</b><p>${desc}</p></div><span>${tag}</span></article>`).join("")}</div>
    <div class="pay-roadmap"><h3>当前使用原则</h3><p>核心：目标、计划、练习、错题、模考都优先服务个人备考。</p><p>数据：默认保存在当前浏览器，重要阶段建议手动导出备份。</p><p>后续：如果未来再考虑分享或商业化，再单独评估云同步和主体认证。</p></div>
    <div class="form-actions"><button class="btn" data-action="close">知道了</button></div>`);
}

function exportData() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `上岸轨迹备份-${today()}.json`; a.click(); URL.revokeObjectURL(url); toast("备份已导出");
}

document.addEventListener("click", e => {
  if (e.target.closest("[data-modal]")) e.stopPropagation();
  const targetPage = e.target.closest("[data-page]")?.dataset.page;
  if (targetPage) { location.hash = targetPage; return; }
  const action = e.target.closest("[data-action]")?.dataset.action;
  const actions = {
    practice: practiceModal, task: () => taskModal(), mistake: mistakeModal, mock: mockModal, close: closeModal,
    profile: () => modal(profileForm()), premium: premiumModal, export: exportData, import: () => $("#import-file").click(),
    "install-app": installApp,
    "dismiss-install": () => { sessionStorage.setItem("shoreline-install-dismissed", "1"); updateInstallPrompt(); },
    regenerate: () => {
      if (!confirm("替换今天及之后未完成的任务？历史记录会保留。")) return;
      const history = state.tasks.filter(t => t.done || t.date < today()); makePlan(); state.tasks = [...history, ...state.tasks]; save("未来计划已重新生成"); render();
    },
    reset: () => { if (confirm("确定清空全部数据吗？建议先导出备份。")) { state = freshState(); localStorage.removeItem(KEY); render(); } }
  };
  if (action && actions[action]) actions[action]();
  const date = e.target.closest("[data-task-date]")?.dataset.taskDate;
  if (date) taskModal(date);
  const filter = e.target.closest("[data-filter]")?.dataset.filter;
  if (filter) { recordFilter = filter; render(); }
  const nextPlanMode = e.target.closest("[data-plan-mode]")?.dataset.planMode;
  if (nextPlanMode) { planMode = nextPlanMode; render(); }
  const monthShift = e.target.closest("[data-month-shift]")?.dataset.monthShift;
  if (monthShift) { planMonthOffset += Number(monthShift); render(); }
  const deleteId = e.target.closest("[data-delete-record]")?.dataset.deleteRecord;
  if (deleteId && confirm("删除这条练习记录？")) { state.records = state.records.filter(r => r.id !== deleteId); save("记录已删除"); render(); }
});

document.addEventListener("change", e => {
  if (e.target.dataset.task) { const t = state.tasks.find(x => x.id === e.target.dataset.task); if (t) t.done = e.target.checked; save(e.target.checked ? "完成一项，漂亮。" : "任务已恢复"); render(); }
  if (e.target.dataset.mistake) { const m = state.mistakes.find(x => x.id === e.target.dataset.mistake); if (m) m.done = e.target.checked; save("复习状态已更新"); render(); }
});

document.addEventListener("submit", e => {
  e.preventDefault(); const f = e.target; const d = Object.fromEntries(new FormData(f));
  if (f.id === "profile-form") {
    const targetModules = ["资料分析", "言语理解", "政治理论", "判断推理", "数量关系"];
    const targets = Object.fromEntries(targetModules.map((module, index) => [module, {
      questions: Number(d[`target_${index}_questions`]),
      accuracy: Number(d[`target_${index}_accuracy`]),
      minutes: Number(d[`target_${index}_minutes`])
    }]));
    state.profile = {
      ...state.profile,
      name: d.name, exam: d.exam, province: d.province, examDate: d.examDate,
      weekday: Number(d.weekday), weekend: Number(d.weekend), stage: d.stage,
      targetXingce: Number(d.targetXingce), targetShenlun: Number(d.targetShenlun),
      targets, ready: true
    };
    if (f.dataset.first === "true") makePlan(); save(f.dataset.first === "true" ? "" : "目标设置已更新"); closeModal(); render();
    if (f.dataset.first === "true") toast("计划已生成，今天就开始");
  }
  if (f.id === "record-form") { state.records.unshift({ id: uid(), ...d, total: Number(d.total), correct: Number(d.correct), minutes: Number(d.minutes) }); save("练习记录已保存"); closeModal(); render(); }
  if (f.id === "task-form") { state.tasks.push({ id: uid(), ...d, minutes: Number(d.minutes), fixed: d.fixed === "true", done: false }); save("任务已加入计划"); closeModal(); render(); }
  if (f.id === "mistake-form") { state.mistakes.unshift({ id: uid(), ...d, done: false }); save("错题已加入复盘"); closeModal(); render(); }
  if (f.id === "mock-form") { state.mocks.unshift({ id: uid(), ...d, xingce: Number(d.xingce), shenlun: Number(d.shenlun) }); save("模考成绩已保存"); closeModal(); render(); }
});

$("#import-file").addEventListener("change", async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || !data.profile || !Array.isArray(data.tasks)) throw new Error();
    if (confirm("恢复备份将覆盖当前数据，继续吗？")) { state = data; save("备份恢复成功"); render(); }
  } catch { alert("无法读取该文件，请选择由上岸轨迹导出的备份。"); }
  e.target.value = "";
});

window.addEventListener("hashchange", () => { page = location.hash.slice(1) || (window.matchMedia("(max-width: 720px)").matches ? "plan" : "dashboard"); render(); });
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallPrompt();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallPrompt();
  toast("上岸轨迹已安装到桌面");
});
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
render();
updateInstallPrompt();
