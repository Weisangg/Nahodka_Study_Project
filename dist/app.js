import { api, isDemo } from "./api.js";
import { categories } from "./demo.js";
const root = document.querySelector("#app");
const dialog = document.querySelector("#dialog");
const toastBox = document.querySelector("#toast");
const state = { user: null, notices: [], detail: null, query: "", kind: "all", category: "all", city: "all", sort: "newest", error: null, createAfterLogin: false };
let busy = false;
let routeGeneration = 0;
let toastTimer;
let returnFocus;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name) => String(name || "?").split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const paths = {
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  edit: '<path d="m16 3 5 5-12 12H4v-5L16 3Z"/><path d="m13 6 5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
};
function icon(name, size = 18) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`; }
function route() {
  const pieces = location.hash.replace(/^#\/?/, "").split("/");
  if (!pieces[0] || pieces[0] === "board") return { name: "board" };
  if (pieces[0] === "mine") return { name: "mine" };
  if (pieces[0] === "notice" && pieces[1]) {
    try { return { name: "notice", id: decodeURIComponent(pieces[1]) }; } catch { return { name: "missing" }; }
  }
  return { name: "missing" };
}
function navigate(name, id = "") {
  const hash = `#/${name}${id ? `/${encodeURIComponent(id)}` : ""}`;
  if (location.hash === hash) showRoute(); else location.hash = hash;
}
function toast(text) { clearTimeout(toastTimer); toastBox.textContent = text; toastBox.classList.add("visible"); toastTimer = setTimeout(() => toastBox.classList.remove("visible"), 4000); }
function noticeDate(value) { return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value)); }
function badge(notice) { return `<span class="kind-badge ${notice.kind}">${icon(notice.kind === "found" ? "check" : "search", 12)}${notice.kind === "found" ? "Найдено" : "Потеряно"}</span>`; }
function image(notice) {
  if (typeof notice.image_url === "string" && /^https?:\/\//.test(notice.image_url)) return `<img src="${esc(notice.image_url)}" alt="${esc(notice.title)}" width="1000" height="750" loading="lazy">`;
  if (["keys", "headphones", "backpack"].includes(notice.image)) return `<img src="./assets/${notice.image}.webp" alt="${esc(notice.title)}" width="1000" height="750" loading="lazy">`;
  return `<div class="no-photo"><span>${icon("image", 32)}Без фотографии</span></div>`;
}
function shell(content) {
  const current = route().name === "mine" ? "mine" : "board";
  const links = [["board", "Все объявления", "grid"], ["mine", "Мои объявления", "user"]];
  root.innerHTML = `<header class="header"><div class="header-inner"><a href="#/board" class="logo" aria-label="Находка — все объявления"><span class="logo-mark">${icon("search", 23)}</span>Находка${isDemo ? '<span class="demo-badge">ДЕМО</span>' : ""}</a><nav class="navigation" aria-label="Основная навигация">${links.map(([name, title]) => `<a href="#/${name}" class="${current === name ? "active" : ""}" ${current === name ? 'aria-current="page"' : ""}>${title}</a>`).join("")}</nav><div class="header-actions">${state.user ? `<span class="account"><span class="avatar">${esc(initials(state.user.name))}</span><span class="account-name">${esc(state.user.name.split(" ")[0])}</span></span><button class="btn btn-quiet" data-action="logout">Выйти</button>` : '<button class="btn" data-action="auth">Войти</button>'}</div></div></header><main class="main" id="main" tabindex="-1">${content}<footer class="footer"><span>Находка · ${new Date().getFullYear()}</span><span>${isDemo ? "Учебная демонстрация · объявления и люди вымышлены" : "Доска потерянных и найденных вещей"}</span></footer></main><nav class="mobile-navigation" aria-label="Мобильная навигация">${links.map(([name, title, glyph]) => `<a href="#/${name}" class="${current === name ? "active" : ""}" ${current === name ? 'aria-current="page"' : ""}>${icon(glyph, 18)}${title}</a>`).join("")}</nav>`;
}
function heading(title, subtitle, eyebrow = "", create = true) { return `<div class="heading"><div>${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ""}<h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${create ? `<button class="btn btn-yellow" data-action="create" aria-label="Новое объявление">${icon("plus", 17)}Новое объявление</button>` : ""}</div>`; }
function empty(title, description, action = "reset") { return `<div class="empty"><div class="empty-icon">${icon("search", 27)}</div><h2>${esc(title)}</h2><p>${esc(description)}</p><button class="btn btn-primary" data-action="${action}">${action === "auth" ? "Войти в аккаунт" : action === "create" ? "Добавить объявление" : "Сбросить фильтры"}</button></div>`; }
function card(notice) { return `<article class="card"><a href="#/notice/${encodeURIComponent(notice.id)}" class="photo" aria-label="Открыть объявление: ${esc(notice.title)}">${image(notice)}${badge(notice)}${notice.status === "resolved" ? '<span class="closed-badge">Закрыто</span>' : ""}</a><div class="card-body"><h3 class="card-title"><a href="#/notice/${encodeURIComponent(notice.id)}">${esc(notice.title)}</a></h3><p class="card-place">${icon("pin", 14)}${esc(notice.city)} · ${esc(notice.place)}</p><div class="card-bottom"><span>${esc(noticeDate(notice.event_date))} · ${esc(categories[notice.category] || "Другое")}</span><a href="#/notice/${encodeURIComponent(notice.id)}">Подробнее</a></div></div></article>`; }
function filteredNotices() {
  const query = state.query.trim().toLocaleLowerCase("ru");
  return state.notices.filter((n) => n.status === "open" && (state.kind === "all" || n.kind === state.kind) && (state.category === "all" || n.category === state.category) && (state.city === "all" || n.city === state.city) && (!query || `${n.title} ${n.description} ${n.place}`.toLocaleLowerCase("ru").includes(query))).sort((a, b) => state.sort === "oldest" ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at));
}
function renderResults() {
  const results = document.querySelector("#results");
  if (!results) return;
  const notices = filteredNotices();
  results.innerHTML = `<div class="results-header"><h2>${state.kind === "lost" ? "Потерянные вещи" : state.kind === "found" ? "Найденные вещи" : "Свежие объявления"}</h2><span aria-live="polite">Найдено: ${notices.length}</span></div>${notices.length ? `<div class="cards">${notices.map(card).join("")}</div>` : empty("Совпадений пока нет", "Попробуйте другой запрос, город или категорию.")}`;
}
function renderBoard() {
  const active = state.notices.filter((n) => n.status === "open");
  const cities = ["Киев", "Львов", "Днепр", "Одесса", ...state.notices.map((n) => n.city)].filter((city, i, all) => all.indexOf(city) === i);
  shell(`${heading("Бюро находок", "Потеряли вещь или нашли чужую? Здесь можно помочь друг другу.", "Рядом с вами")}<div class="board"><aside class="filters" aria-label="Фильтры объявлений"><h2>Показать</h2><div class="kind-filters" role="group" aria-label="Тип объявления">${[["all", "Все объявления"], ["lost", "Потеряно"], ["found", "Найдено"]].map(([kind, label]) => `<button class="kind-filter ${state.kind === kind ? "active" : ""}" data-action="filter-kind" data-kind="${kind}" aria-pressed="${state.kind === kind}">${label}<span>${active.filter((n) => kind === "all" || n.kind === kind).length}</span></button>`).join("")}</div><hr><div class="filter-field"><label class="filter-label" for="city">Город</label><select id="city" aria-label="Город"><option value="all">Все города</option>${cities.map((city) => `<option value="${esc(city)}" ${state.city === city ? "selected" : ""}>${esc(city)}</option>`).join("")}</select></div><div class="filter-field"><label class="filter-label" for="category">Категория</label><select id="category" aria-label="Категория"><option value="all">Все категории</option>${Object.entries(categories).map(([id, text]) => `<option value="${id}" ${state.category === id ? "selected" : ""}>${text}</option>`).join("")}</select></div><button class="btn btn-quiet" data-action="reset">Сбросить фильтры</button></aside><section aria-label="Объявления"><div class="toolbar"><label class="search">${icon("search", 18)}<input id="search" type="search" value="${esc(state.query)}" placeholder="Поиск вещи или места" aria-label="Поиск объявлений"></label><select class="sort" id="sort" aria-label="Сортировка"><option value="newest" ${state.sort === "newest" ? "selected" : ""}>Сначала новые</option><option value="oldest" ${state.sort === "oldest" ? "selected" : ""}>Сначала старые</option></select></div><div id="results"></div><p class="notice-caption">${icon("info", 15)}Нашли свою вещь? Оставьте отклик под объявлением.</p></section></div>`);
  renderResults();
}
function renderMine() {
  if (!state.user) { shell(`${heading("Мои объявления", "Ваши публикации и отклики на них.", "Личный кабинет", false)}${empty("Войдите в свой аккаунт", "После входа здесь появятся ваши объявления. Можно редактировать их и отмечать, что вещь нашлась.", "auth")}`); return; }
  const notices = state.notices.filter((n) => n.owner.id === state.user.id);
  shell(`${heading("Мои объявления", "Откройте объявление, чтобы изменить его или отметить находку.", "Личный кабинет")}${notices.length ? `<div class="cards mine-cards">${notices.map(card).join("")}</div>` : empty("Пока нет своих объявлений", "Расскажите о потерянной или найденной вещи. Ваше объявление появится на общей доске.", "create")}`);
}
function renderDetail(notice) {
  const owns = notice.owner.id === state.user?.id;
  shell(`<a href="#/board" class="back-link">${icon("back", 16)}Все объявления</a><article class="detail"><div class="detail-image">${image(notice)}</div><div class="detail-content">${badge(notice)}${notice.status === "resolved" ? '<span class="kind-badge found" style="margin-left:7px">Объявление закрыто</span>' : ""}<h1>${esc(notice.title)}</h1><div class="detail-meta"><span>${icon("pin", 16)} ${esc(notice.city)} · ${esc(notice.place)}</span><span>${icon("calendar", 16)} ${esc(noticeDate(notice.event_date))}</span></div><p class="detail-description">${esc(notice.description)}</p><div class="author"><span class="avatar">${esc(initials(notice.owner.name))}</span><div><b>${esc(notice.owner.name)}</b><p>Автор объявления · опубликовано ${esc(noticeDate(notice.created_at))}</p></div></div>${owns ? `<div class="owner-actions"><button class="btn" data-action="edit" data-id="${esc(notice.id)}">${icon("edit", 15)}Редактировать</button><button class="btn btn-primary" data-action="status" data-id="${esc(notice.id)}" data-status="${notice.status === "open" ? "resolved" : "open"}">${icon("check", 15)}${notice.status === "open" ? notice.kind === "lost" ? "Вещь нашлась" : "Вернул владельцу" : "Открыть снова"}</button><button class="btn btn-quiet" data-action="delete" data-id="${esc(notice.id)}">Удалить</button></div>` : `<div class="info-note">${icon("info", 17)}Опишите приметы вещи в отклике, чтобы автор мог узнать владельца.</div>`}</div></article><section class="reply-section"><h2>Отклики <span style="color:var(--muted);font-weight:400">${notice.replies?.length || 0}</span></h2>${notice.replies?.length ? notice.replies.map((reply) => `<div class="reply"><span class="avatar">${esc(initials(reply.author.name))}</span><div class="reply-body"><div class="reply-header"><b>${esc(reply.author.name)}</b><span>${esc(noticeDate(reply.created_at))}</span></div><p>${esc(reply.text)}</p></div></div>`).join("") : '<p class="reply-empty">Пока никто не откликнулся.</p>'}${notice.status !== "open" ? '<div class="info-note">'+icon("check",17)+'Объявление закрыто. Новые отклики больше не принимаются.</div>' : state.user ? `<form class="reply-form" data-form="reply" data-id="${esc(notice.id)}"><label for="reply-text">Оставить отклик</label><textarea id="reply-text" name="text" placeholder="Расскажите, что вы знаете о вещи…" minlength="3" maxlength="1000" required></textarea><p class="form-error" role="alert" tabindex="-1"></p><button class="btn btn-primary" type="submit">Отправить отклик</button></form>` : `<div class="info-note" style="align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Войдите, чтобы оставить отклик.</span><button class="btn btn-primary" data-action="auth">Войти</button></div>`}</section>`);
  document.title = `${notice.title} — Находка`;
}
async function showRoute() {
  const generation = ++routeGeneration;
  const r = route();
  document.title = "Находка — доска потерянных и найденных вещей";
  if (state.error) { shell(`<div class="empty"><h1>Не удалось загрузить доску</h1><p>${esc(state.error)}</p><button class="btn btn-primary" data-action="retry">Попробовать снова</button></div>`); return; }
  if (r.name === "board") renderBoard();
  else if (r.name === "mine") renderMine();
  else if (r.name === "notice") {
    if (state.detail?.id === r.id) renderDetail(state.detail);
    else shell('<div class="empty" role="status"><h2>Открываем объявление…</h2></div>');
    try { const notice = await api.getNotice(r.id); if (generation !== routeGeneration) return; state.detail = notice; renderDetail(notice); }
    catch (error) { if (generation !== routeGeneration) return; shell(`<div class="empty"><h1>Объявление недоступно</h1><p>${esc(error.message)}</p><a href="#/board" class="btn btn-primary">Вернуться к объявлениям</a></div>`); }
  } else shell('<div class="empty"><h1>Такой страницы нет</h1><p>Вернитесь на доску объявлений.</p><a href="#/board" class="btn btn-primary">Все объявления</a></div>');
}
async function refresh() {
  const [notices, user] = await Promise.all([api.listNotices(), api.getMe()]);
  if (!Array.isArray(notices)) throw new Error("Сервер вернул неожиданный формат объявлений.");
  state.notices = notices; state.user = user; state.error = null;
}
function openDialog(title, content) {
  returnFocus = document.activeElement;
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Закрыть окно">${icon("close", 18)}</button></div><div class="dialog-body">${content}</div>`;
  if (!dialog.open) dialog.showModal();
}
const closeDialog = () => { if (dialog.open) dialog.close(); };
function openAuth(register = false) {
  openDialog(register ? "Создать аккаунт" : "Войти в Находку", `<div class="auth-switch" role="group" aria-label="Вход или регистрация"><button class="${register ? "" : "active"}" data-action="auth-tab" data-mode="login" aria-pressed="${!register}">Вход</button><button class="${register ? "active" : ""}" data-action="auth-tab" data-mode="register" aria-pressed="${register}">Регистрация</button></div><form data-form="${register ? "register" : "login"}"><div class="form-grid">${register ? '<div class="field wide"><label for="auth-name">Ваше имя</label><input id="auth-name" name="name" minlength="2" maxlength="60" autocomplete="name" placeholder="Дима Соколов" required></div>' : ""}<div class="field wide"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required></div><div class="field wide"><label for="auth-password">Пароль</label><input id="auth-password" name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="8" maxlength="128" placeholder="Не менее 8 символов" required></div></div><p class="form-error" role="alert" tabindex="-1"></p><button class="btn btn-primary full" type="submit" style="margin-top:22px">${register ? "Зарегистрироваться" : "Войти"}</button></form>${isDemo ? '<div class="demo-login"><p>Хотите посмотреть приложение без заполнения формы?</p><button class="btn" data-action="demo-login">Войти как Дима · демо</button><p class="hint">Данные аккаунтов и действия сбрасываются после перезагрузки.</p></div>' : ""}`);
}
function openEditor(notice = null) {
  if (!state.user) { state.createAfterLogin = true; openAuth(); return; }
  const n = notice || { kind: "lost", category: "keys", city: "Киев", event_date: today(), title: "", place: "", description: "" };
  openDialog(notice ? "Редактировать объявление" : "Новое объявление", `<form data-form="notice" data-id="${esc(notice?.id || "")}"><div class="form-grid"><fieldset class="choices wide"><legend>Что произошло?</legend><label class="choice"><input type="radio" name="kind" value="lost" ${n.kind === "lost" ? "checked" : ""}>${icon("search", 15)}Потерял вещь</label><label class="choice"><input type="radio" name="kind" value="found" ${n.kind === "found" ? "checked" : ""}>${icon("check", 15)}Нашёл вещь</label></fieldset><div class="field wide"><label for="notice-title">Название</label><input id="notice-title" name="title" value="${esc(n.title)}" placeholder="Например, нашёл ключи возле парка" minlength="3" maxlength="100" required></div><div class="field"><label for="notice-category">Категория</label><select id="notice-category" name="category">${Object.entries(categories).map(([id, name]) => `<option value="${id}" ${n.category === id ? "selected" : ""}>${name}</option>`).join("")}</select></div><div class="field"><label for="notice-city">Город</label><select id="notice-city" name="city">${["Киев", "Львов", "Днепр", "Одесса"].map((city) => `<option ${n.city === city ? "selected" : ""}>${city}</option>`).join("")}</select></div><div class="field"><label for="notice-place">Где это было?</label><input id="notice-place" name="place" value="${esc(n.place)}" placeholder="Парк, улица или остановка" maxlength="100" required></div><div class="field"><label for="notice-date">Дата события</label><input id="notice-date" name="event_date" type="date" value="${esc(n.event_date)}" max="${today()}" required></div><div class="field wide"><label for="notice-description">Описание</label><textarea id="notice-description" name="description" placeholder="Опишите вещь и обстоятельства. Укажите приметы, по которым можно узнать владельца." minlength="10" maxlength="2000" required>${esc(n.description)}</textarea></div></div><p class="form-error" role="alert" tabindex="-1"></p><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Отмена</button><button class="btn btn-primary" type="submit">${notice ? "Сохранить" : "Опубликовать"}</button></div></form>`);
}
function openDelete(notice) { openDialog("Удалить объявление?", `<form data-form="delete" data-id="${esc(notice.id)}"><p>Объявление «${esc(notice.title)}» и отклики под ним будут удалены.</p><p class="form-error" role="alert" tabindex="-1"></p><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Оставить</button><button type="submit" class="btn btn-danger">Удалить объявление</button></div></form>`); }
async function afterAuthentication() {
  await refresh(); closeDialog(); await showRoute();
  toast("Вы вошли в аккаунт.");
  if (state.createAfterLogin) { state.createAfterLogin = false; openEditor(); }
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled || busy) return;
  const action = button.dataset.action;
  const notice = state.detail?.id === button.dataset.id ? state.detail : state.notices.find((n) => n.id === button.dataset.id);
  try {
    if (action === "create") openEditor();
    else if (action === "auth") { state.createAfterLogin = false; openAuth(); }
    else if (action === "auth-tab") openAuth(button.dataset.mode === "register");
    else if (action === "close-dialog") { state.createAfterLogin = false; closeDialog(); }
    else if (action === "filter-kind") { state.kind = button.dataset.kind; renderBoard(); }
    else if (action === "reset") { state.query = ""; state.kind = "all"; state.city = "all"; state.category = "all"; renderBoard(); }
    else if (action === "edit" && notice) openEditor(notice);
    else if (action === "delete" && notice) openDelete(notice);
    else if (action === "demo-login") { busy = true; button.disabled = true; await api.login({ email: "dima@example.com", password: "demo12345" }); await afterAuthentication(); }
    else if (action === "logout") { busy = true; await api.logout(); await refresh(); await showRoute(); toast("Вы вышли из аккаунта."); }
    else if (action === "status" && notice) { busy = true; button.disabled = true; state.detail = await api.updateNotice(notice.id, { status: button.dataset.status }); await refresh(); await showRoute(); toast(button.dataset.status === "resolved" ? "Объявление закрыто. Спасибо за обновление!" : "Объявление снова открыто."); }
    else if (action === "retry") { busy = true; button.disabled = true; await refresh(); await showRoute(); }
  } catch (error) { toast(error.message); }
  finally { busy = false; if (button.isConnected) button.disabled = false; }
});
document.addEventListener("input", (event) => { if (event.target.id === "search") { state.query = event.target.value; renderResults(); } });
document.addEventListener("change", (event) => {
  if (event.target.id === "city") state.city = event.target.value;
  else if (event.target.id === "category") state.category = event.target.value;
  else if (event.target.id === "sort") state.sort = event.target.value;
  else return;
  renderResults();
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('[type="submit"]');
  const initialText = submit.textContent;
  const errorArea = form.querySelector(".form-error");
  busy = true; submit.disabled = true; submit.textContent = "Сохраняем…"; form.setAttribute("aria-busy", "true");
  errorArea.textContent = "";
  try {
    const kind = form.dataset.form;
    if (kind === "login" || kind === "register") { await api[kind](values); await afterAuthentication(); }
    else if (kind === "notice") {
      const notice = form.dataset.id ? await api.updateNotice(form.dataset.id, values) : await api.createNotice(values);
      state.detail = notice; await refresh(); closeDialog(); navigate("notice", notice.id); await showRoute(); toast(form.dataset.id ? "Изменения сохранены." : "Объявление опубликовано.");
    } else if (kind === "reply") { await api.addReply(form.dataset.id, values.text); await refresh(); await showRoute(); toast("Отклик отправлен."); }
    else if (kind === "delete") { await api.deleteNotice(form.dataset.id); state.detail = null; await refresh(); closeDialog(); navigate("mine"); await showRoute(); toast("Объявление удалено."); }
  } catch (error) { errorArea.textContent = error.message; errorArea.focus(); }
  finally { busy = false; submit.disabled = false; submit.textContent = initialText; form.removeAttribute("aria-busy"); }
});
dialog.addEventListener("cancel", (event) => { if (busy) event.preventDefault(); else state.createAfterLogin = false; });
dialog.addEventListener("close", () => { if (returnFocus?.isConnected) returnFocus.focus(); });
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog || busy) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { state.createAfterLogin = false; closeDialog(); }
});
window.addEventListener("hashchange", () => { closeDialog(); window.scrollTo({ top: 0, behavior: "instant" }); showRoute(); });
async function initialize() {
  root.innerHTML = '<main class="main"><div class="empty" role="status"><h1>Находка</h1><p>Загружаем объявления…</p></div></main>';
  try { await refresh(); } catch (error) { state.error = error.message; }
  await showRoute(); registerAgentTools();
}
function registerAgentTools() {
  if (!document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  const tools = [
    { name: "search_notices", title: "Найти объявления", description: "Read open lost-and-found notices. Does not publish or reply.", inputSchema: { type: "object", properties: { query: { type: "string" } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute(input = {}) { if (input.query !== undefined && typeof input.query !== "string") throw new Error("query must be a string"); const q = (input.query || "").toLowerCase(); return state.notices.filter((n) => n.status === "open" && `${n.title} ${n.description}`.toLowerCase().includes(q)).map((n) => ({ id: n.id, title: n.title, kind: n.kind, city: n.city, place: n.place })); } },
    { name: "create_notice", title: "Опубликовать объявление", description: "Complete publication of a lost-or-found notice for the signed-in user and display it. Requires authentication.", inputSchema: { type: "object", properties: { title: { type: "string", minLength: 3, maxLength: 100 }, description: { type: "string", minLength: 10, maxLength: 2000 }, kind: { type: "string", enum: ["lost", "found"] }, category: { type: "string", enum: Object.keys(categories) }, city: { type: "string" }, place: { type: "string" }, event_date: { type: "string", format: "date" } }, required: ["title", "description", "kind", "category", "city", "place", "event_date"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, async execute(input) { if (!state.user) throw new Error("Authentication required"); if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid input"); const notice = await api.createNotice(input); await refresh(); closeDialog(); state.detail = notice; location.hash = `#/notice/${encodeURIComponent(notice.id)}`; await showRoute(); return { id: notice.id, status: notice.status }; } },
  ];
  for (const tool of tools) { try { void Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Unsupported browser. */ } }
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
initialize();
