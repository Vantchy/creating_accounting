const state = {
  events: [],
  timeline: { upcoming: [], ongoing: [], ended: [], incomplete: [] },
  view: "timeline",
  query: "",
  priority: "all",
  calendarMonth: startOfMonth(new Date()),
  selectedDate: dateKey(new Date()),
};

const elements = {
  timelineView: document.querySelector("#timeline-view"),
  calendarView: document.querySelector("#calendar-view"),
  searchInput: document.querySelector("#search-input"),
  priorityFilter: document.querySelector("#priority-filter"),
  dialog: document.querySelector("#event-dialog"),
  form: document.querySelector("#event-form"),
  formError: document.querySelector("#form-error"),
  dialogTitle: document.querySelector("#dialog-title"),
  eventId: document.querySelector("#event-id"),
  title: document.querySelector("#event-title"),
  start: document.querySelector("#event-start"),
  end: document.querySelector("#event-end"),
  location: document.querySelector("#event-location"),
  priority: document.querySelector("#event-priority"),
  allDay: document.querySelector("#event-all-day"),
  description: document.querySelector("#event-description"),
  aiNotice: document.querySelector("#ai-notice"),
  toast: document.querySelector("#toast"),
  calendarGrid: document.querySelector("#calendar-grid"),
  calendarTitle: document.querySelector("#calendar-title"),
  agendaTitle: document.querySelector("#agenda-title"),
  agendaList: document.querySelector("#agenda-list"),
};

document.addEventListener("DOMContentLoaded", () => {
  renderToday();
  bindInteractions();
  loadEvents();
});

function bindInteractions() {
  document.querySelector("#new-event-button").addEventListener("click", () => openEditor());
  document.querySelector("#dialog-close").addEventListener("click", closeEditor);
  document.querySelector("#cancel-button").addEventListener("click", closeEditor);
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeEditor();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.dialog.hidden) closeEditor();
  });
  elements.form.addEventListener("submit", saveEvent);
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase("zh-CN");
    renderCurrentView();
  });
  elements.priorityFilter.addEventListener("change", (event) => {
    state.priority = event.target.value;
    renderCurrentView();
  });
  document.querySelectorAll(".view-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.querySelector("#previous-month").addEventListener("click", () => moveMonth(-1));
  document.querySelector("#next-month").addEventListener("click", () => moveMonth(1));
  document.querySelector("#today-button").addEventListener("click", () => {
    state.calendarMonth = startOfMonth(new Date());
    state.selectedDate = dateKey(new Date());
    renderCalendar();
  });
  document.querySelector("#agenda-add-button").addEventListener("click", () => openEditor(null, state.selectedDate));
  document.querySelector("#ai-add-button").addEventListener("click", async () => {
    const notice = elements.aiNotice.value.trim();
    if (!notice) {
      showToast("请先填写通知内容。", false);
      return;
    }
    elements.formError.textContent = "";
    document.querySelector("#ai-add-button").disabled = true;
    document.querySelector("#ai-add-button").textContent = "正在解析…";
    try {
      const result = await apiRequest("/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notice }),
      });
      const event = result.event;
      elements.title.value = event.title || "";
      if (event.start_time) elements.start.value = isoToLocalInput(event.start_time);
      if (event.end_time) elements.end.value = isoToLocalInput(event.end_time);
      elements.location.value = event.location || "";
      elements.description.value = event.description || "";
      elements.priority.value = event.priority || "medium";
      elements.allDay.checked = event.all_day || false;
      showToast("AI 已提取事项信息，请确认后保存。", false);
    } catch (error) {
      elements.formError.textContent = error.message;
    } finally {
      document.querySelector("#ai-add-button").disabled = false;
      document.querySelector("#ai-add-button").textContent = "用 AI 添加事项";
    }
  });
}

async function loadEvents() {
  setListsLoading();
  try {
    const payload = await apiRequest("/events");
    state.events = payload.events;
    state.timeline = payload.timeline;
    updateSummary();
    renderCurrentView();
  } catch (error) {
    showToast(error.message, true);
    setListsError(error.message);
  }
}

function updateSummary() {
  const pending = state.timeline.upcoming.length + state.timeline.ongoing.length + state.timeline.incomplete.length;
  setText("#count-pending", pending);
  setText("#count-ongoing", state.timeline.ongoing.length);
  setText("#count-ended", state.timeline.ended.length);
  setText("#count-incomplete", state.timeline.incomplete.length);
  setText("#badge-upcoming", state.timeline.upcoming.length);
  setText("#badge-ongoing", state.timeline.ongoing.length);
  setText("#badge-ended", state.timeline.ended.length);
  setText("#badge-incomplete", state.timeline.incomplete.length);
  const next = state.timeline.ongoing[0] || state.timeline.upcoming[0];
  document.querySelector("#next-event-copy").textContent = next
    ? `${next.title} · ${formatEventRange(next)}`
    : "今天没有临近事项，留一点时间给自己。";
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".view-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  elements.timelineView.hidden = view !== "timeline";
  elements.calendarView.hidden = view !== "calendar";
  renderCurrentView();
}

function renderCurrentView() {
  if (state.view === "calendar") renderCalendar();
  else renderTimeline();
}

function renderTimeline() {
  renderEventList("#upcoming-list", filterEvents(state.timeline.upcoming), "upcoming", "还没有未来事项，点击“新建事项”开始记录。", true);
  renderEventList("#ongoing-list", filterEvents(state.timeline.ongoing), "ongoing", "当前没有正在进行的事项。");
  renderEventList("#incomplete-list", filterEvents(state.timeline.incomplete), "incomplete", "没有需要补充时间的事项。");
  renderEventList("#ended-list", filterEvents(state.timeline.ended), "ended", "还没有已完成或已结束的事项。");
}

function renderEventList(selector, events, status, emptyMessage, timeline = false) {
  const container = document.querySelector(selector);
  container.replaceChildren();
  if (!events.length) {
    container.append(createEmptyState(emptyMessage));
    return;
  }
  events.forEach((event) => container.append(createEventCard(event, status, timeline)));
}

function createEventCard(event, status) {
  const card = document.createElement("article");
  card.className = `event-card${event.completed_at ? " is-completed" : ""}`;

  const time = document.createElement("div");
  time.className = "event-time";
  time.textContent = formatEventRange(event);

  const content = document.createElement("div");
  content.className = "event-content";
  const titleRow = document.createElement("div");
  titleRow.className = "event-title-row";
  const dot = document.createElement("span");
  dot.className = `priority-dot ${event.priority || "medium"}`;
  const title = document.createElement("h4");
  title.className = "event-title";
  title.textContent = event.title || "未命名事项";
  titleRow.append(dot, title);
  content.append(titleRow);
  const metaParts = [event.location, priorityLabel(event.priority), event.all_day ? "全天" : null].filter(Boolean);
  if (metaParts.length) content.append(textElement("p", "event-meta", metaParts.join(" · ")));
  if (event.description) content.append(textElement("p", "event-description", event.description));

  const actions = document.createElement("div");
  actions.className = "event-actions";
  actions.append(actionButton("编辑", () => openEditor(event)));
  if (event.completed_at) {
    actions.append(actionButton("恢复待办", () => toggleCompletion(event, false), "complete"));
  } else if (status !== "ended") {
    actions.append(actionButton("完成", () => toggleCompletion(event, true), "complete"));
  }
  actions.append(actionButton("删除", () => removeEvent(event), "delete"));
  card.append(time, content, actions);
  return card;
}

function actionButton(label, handler, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `card-action ${extraClass}`.trim();
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function filterEvents(events) {
  return events.filter((event) => {
    if (state.priority !== "all" && (event.priority || "medium") !== state.priority) return false;
    if (!state.query) return true;
    return [event.title, event.location, event.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("zh-CN").includes(state.query));
  });
}

function renderCalendar() {
  elements.calendarTitle.textContent = `${state.calendarMonth.getFullYear()} 年 ${state.calendarMonth.getMonth() + 1} 月`;
  elements.calendarGrid.replaceChildren();
  const gridStart = startOfCalendarGrid(state.calendarMonth);
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const key = dateKey(date);
    const dayEvents = filterEvents(eventsForDate(key));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    if (date.getMonth() !== state.calendarMonth.getMonth()) button.classList.add("is-outside");
    if (key === dateKey(new Date())) button.classList.add("is-today");
    if (key === state.selectedDate) button.classList.add("is-selected");
    const number = textElement("span", "day-number", date.getDate());
    button.append(number);
    dayEvents.slice(0, 3).forEach((event) => {
      const chip = textElement("span", `day-event ${event.priority || "medium"}`, event.title);
      button.append(chip);
    });
    if (dayEvents.length > 3) button.append(textElement("span", "day-event", `还有 ${dayEvents.length - 3} 项`));
    button.addEventListener("click", () => {
      state.selectedDate = key;
      if (date.getMonth() !== state.calendarMonth.getMonth()) state.calendarMonth = startOfMonth(date);
      renderCalendar();
    });
    elements.calendarGrid.append(button);
  }
  renderAgenda();
}

function renderAgenda() {
  const selected = parseDateKey(state.selectedDate);
  elements.agendaTitle.textContent = `${selected.getMonth() + 1} 月 ${selected.getDate()} 日`;
  elements.agendaList.replaceChildren();
  const events = filterEvents(eventsForDate(state.selectedDate));
  if (!events.length) {
    elements.agendaList.append(createEmptyState("这一天还没有安排。"));
    return;
  }
  events.forEach((event) => {
    const status = event.completed_at ? "ended" : "calendar";
    elements.agendaList.append(createEventCard(event, status));
  });
}

function eventsForDate(key) {
  return state.events.filter((event) => {
    const source = event.start_time || event.end_time;
    return source && dateKey(new Date(source)) === key;
  });
}

function openEditor(event = null, suggestedDate = null) {
  elements.form.reset();
  elements.formError.textContent = "";
  elements.eventId.value = event?.id || "";
  elements.dialogTitle.textContent = event ? "编辑事项" : "新建事项";
  elements.title.value = event?.title || "";
  elements.start.value = event?.start_time ? toDateTimeLocal(event.start_time) : suggestedDate ? `${suggestedDate}T09:00` : "";
  elements.end.value = event?.end_time ? toDateTimeLocal(event.end_time) : "";
  elements.location.value = event?.location || "";
  elements.priority.value = event?.priority || "medium";
  elements.allDay.checked = Boolean(event?.all_day);
  elements.description.value = event?.description || "";
  elements.dialog.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => elements.title.focus(), 0);
}

function closeEditor() {
  elements.dialog.hidden = true;
  document.body.style.overflow = "";
}

async function saveEvent(event) {
  event.preventDefault();
  elements.formError.textContent = "";
  const payload = {
    title: elements.title.value.trim(),
    start_time: localInputToIso(elements.start.value),
    end_time: localInputToIso(elements.end.value),
    location: elements.location.value.trim() || null,
    description: elements.description.value.trim() || null,
    priority: elements.priority.value,
    all_day: elements.allDay.checked,
  };
  const eventId = elements.eventId.value;
  try {
    await apiRequest(eventId ? `/events/${eventId}` : "/events", {
      method: eventId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeEditor();
    showToast(eventId ? "事项已更新。" : "事项已保存到时间轴。", false);
    await loadEvents();
  } catch (error) {
    elements.formError.textContent = error.message;
  }
}

async function toggleCompletion(event, completed) {
  try {
    await apiRequest(`/events/${event.id}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    showToast(completed ? "事项已完成并归档。" : "事项已恢复。", false);
    await loadEvents();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function removeEvent(event) {
  if (!window.confirm(`确定删除“${event.title}”吗？删除后无法恢复。`)) return;
  try {
    await apiRequest(`/events/${event.id}`, { method: "DELETE" });
    showToast("事项已删除。", false);
    await loadEvents();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error?.message || "请求失败，请稍后重试。");
  }
  return payload;
}

function renderToday() {
  const now = new Date();
  document.querySelector("#today-day").textContent = String(now.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("zh-CN", { month: "long" }).format(now);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(now);
  document.querySelector("#today-meta").textContent = `${month} · ${weekday}`;
}

function formatEventRange(event) {
  const start = parseDate(event.start_time);
  const end = parseDate(event.end_time);
  if (event.all_day && start) return formatDate(start);
  if (start && end) return `${formatDateTime(start)} — ${formatDateTime(end)}`;
  if (start) return `${formatDateTime(start)} 开始`;
  if (end) return `${formatDateTime(end)} 结束`;
  return "时间待补充";
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
function formatDate(date) { return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(date); }
function parseDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function localInputToIso(value) { return value ? new Date(value).toISOString() : null; }
function isoToLocalInput(value) { return value ? toDateTimeLocal(value) : ""; }
function toDateTimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addDays(date, amount) { const result = new Date(date); result.setDate(result.getDate() + amount); return result; }
function startOfCalendarGrid(month) { const first = startOfMonth(month); return addDays(first, -((first.getDay() + 6) % 7)); }
function moveMonth(amount) { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + amount, 1); renderCalendar(); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseDateKey(key) { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day); }
function priorityLabel(priority) { return ({ high: "高优先级", medium: "普通", low: "低优先级" })[priority] || "普通"; }
function setText(selector, value) { document.querySelector(selector).textContent = String(value); }
function textElement(tag, className, value) { const element = document.createElement(tag); element.className = className; element.textContent = String(value); return element; }
function createEmptyState(message) { return textElement("p", "empty-state", message); }
function setListsLoading() { ["#upcoming-list", "#ongoing-list", "#incomplete-list", "#ended-list"].forEach((selector) => document.querySelector(selector).replaceChildren(createEmptyState("正在整理事项…"))); }
function setListsError(message) { ["#upcoming-list", "#ongoing-list", "#incomplete-list", "#ended-list"].forEach((selector) => document.querySelector(selector).replaceChildren(createEmptyState(message))); }
let toastTimer;
function showToast(message, isError) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}
