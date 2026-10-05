export const categories = { keys: "Ключи", headphones: "Электроника", backpack: "Сумки и рюкзаки", other: "Другое" };
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const date = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
const dima = { id: "dima", name: "Дима Соколов", email: "dima@example.com" };
const anna = { id: "anna", name: "Анна Мельник", email: "anna@example.com" };
const maxim = { id: "maxim", name: "Максим Коваль", email: "maxim@example.com" };
export function seedNotices() {
  return [
    { id: "keys-park", title: "Нашёл ключи возле парка", kind: "found", category: "keys", city: "Киев", place: "Парк Шевченко", event_date: day(-1), created_at: date(3), status: "open", image: "keys", description: "Небольшая связка ключей с тёмным тканевым брелоком. Лежали на дорожке у входа в парк со стороны улицы Терещенковской. Если это ваши ключи, напишите, сколько их было и как выглядит брелок.", owner: anna, replies: [] },
    { id: "headphones-metro", title: "Потерял чёрные наушники", kind: "lost", category: "headphones", city: "Киев", place: "Метро Контрактовая площадь", event_date: day(-2), created_at: date(8), status: "open", image: "headphones", description: "Потерял беспроводные полноразмерные наушники по дороге от метро к набережной. Чёрные, без чехла. На внутренней стороне оголовья небольшая наклейка. Буду благодарен за любую информацию.", owner: dima, replies: [{ id: "reply-1", text: "Вчера видел похожие наушники у сотрудника станции. Попробуйте обратиться к дежурному.", author: anna, created_at: date(2) }] },
    { id: "backpack-cafe", title: "Рюкзак ждёт владельца", kind: "found", category: "backpack", city: "Львов", place: "Площадь Рынок", event_date: day(-1), created_at: date(12), status: "open", image: "backpack", description: "В кафе на площади Рынок оставили тёмно-синий рюкзак. Передал его администратору. Напишите, что находилось внутри, чтобы подтвердить, что рюкзак ваш.", owner: maxim, replies: [] },
    { id: "keys-podil", title: "Потерялись ключи на Подоле", kind: "lost", category: "keys", city: "Киев", place: "Улица Сагайдачного", event_date: day(-3), created_at: date(22), status: "open", image: "keys", description: "Пропала связка из трёх ключей с тканевым брелоком. Возможно, выпали возле остановки. Если находили похожие, оставьте отклик — уточню детали.", owner: maxim, replies: [] },
    { id: "headphones-tram", title: "Нашлись наушники в трамвае", kind: "found", category: "headphones", city: "Днепр", place: "Трамвай № 1", event_date: day(-2), created_at: date(30), status: "open", image: "headphones", description: "Нашёл чёрные наушники на сиденье трамвая. Владелец может описать модель и приметную деталь. Пока вещь находится у меня.", owner: anna, replies: [] },
    { id: "backpack-library", title: "Потерян синий рюкзак", kind: "lost", category: "backpack", city: "Одесса", place: "Улица Дерибасовская", event_date: day(-4), created_at: date(40), status: "open", image: "backpack", description: "Забыл синий рюкзак на скамейке. Внутри были тетрадь и зарядка. Напишите, если находили, — смогу назвать другие детали.", owner: maxim, replies: [] },
    { id: "keys-returned", title: "Ключи вернулись домой", kind: "lost", category: "keys", city: "Киев", place: "Оболонская набережная", event_date: day(-7), created_at: date(140), status: "resolved", image: "keys", description: "Ключи нашлись, спасибо всем за помощь! Объявление закрыто.", owner: dima, replies: [] },
  ];
}
const clone = (value) => structuredClone(value);
// This is an in-memory UI fixture, not an implementation of backend security.
async function fixtureDigest(password) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`demo-only:${password}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
function validateFields(input, partial = false) {
  const output = {};
  const fields = ["title", "description", "kind", "category", "city", "place", "event_date"];
  for (const key of fields) {
    if (partial && !(key in input)) continue;
    output[key] = String(input[key] ?? "").trim();
  }
  if ("title" in output && (output.title.length < 3 || output.title.length > 100)) throw new Error("Название: от 3 до 100 символов.");
  if ("description" in output && (output.description.length < 10 || output.description.length > 2000)) throw new Error("Описание: от 10 до 2000 символов.");
  if ("kind" in output && !["lost", "found"].includes(output.kind)) throw new Error("Выберите тип объявления.");
  if ("category" in output && !Object.hasOwn(categories, output.category)) throw new Error("Выберите категорию.");
  if ("city" in output && !output.city) throw new Error("Укажите город.");
  if ("place" in output && !output.place) throw new Error("Укажите место.");
  if ("event_date" in output && (!/^\d{4}-\d{2}-\d{2}$/.test(output.event_date) || !Number.isFinite(Date.parse(output.event_date)) || new Date(output.event_date).toISOString().slice(0, 10) !== output.event_date || output.event_date > day(0))) throw new Error("Укажите существующую дату не позже сегодняшней.");
  if ("status" in input) {
    if (!["open", "resolved"].includes(input.status)) throw new Error("Неизвестный статус.");
    output.status = input.status;
  }
  return output;
}
export function createDemoApi(initial = seedNotices()) {
  let notices = clone(initial);
  let user = null;
  let accountsReady;
  const accounts = [dima, anna, maxim].map((account) => ({ ...account, password_hash: null }));
  function ensureAccounts() {
    accountsReady ||= fixtureDigest("demo12345").then((digest) => { accounts.forEach((a) => { a.password_hash = digest; }); });
    return accountsReady;
  }
  const safeUser = (account) => ({ id: account.id, name: account.name, email: account.email });
  const auth = () => { if (!user) throw new Error("Войдите, чтобы продолжить."); return user; };
  const find = (id) => { const notice = notices.find((n) => n.id === id); if (!notice) throw new Error("Объявление не найдено."); return notice; };
  const own = (notice) => { if (notice.owner.id !== auth().id) throw new Error("Изменять объявление может только его автор."); };
  return {
    async getMe() { return clone(user); },
    async listNotices() { return clone(notices); },
    async getNotice(id) { return clone(find(id)); },
    async login(input) {
      await ensureAccounts();
      const email = String(input.email || "").trim().toLowerCase();
      const account = accounts.find((a) => a.email === email);
      if (!account || account.password_hash !== await fixtureDigest(String(input.password || ""))) throw new Error("Неверный email или пароль.");
      user = safeUser(account); return clone(user);
    },
    async register(input) {
      await ensureAccounts();
      const name = String(input.name || "").trim();
      const email = String(input.email || "").trim().toLowerCase();
      const password = String(input.password || "");
      if (name.length < 2 || name.length > 60) throw new Error("Имя: от 2 до 60 символов.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Введите корректный email.");
      if (password.length < 8 || password.length > 128) throw new Error("Пароль: от 8 до 128 символов.");
      if (accounts.some((a) => a.email === email)) throw new Error("Этот email уже зарегистрирован.");
      const account = { id: crypto.randomUUID(), name, email, password_hash: await fixtureDigest(password) };
      accounts.push(account); user = safeUser(account); return clone(user);
    },
    async logout() { user = null; },
    async createNotice(input) {
      const owner = auth();
      const fields = validateFields(input);
      const notice = { ...fields, id: crypto.randomUUID(), status: "open", created_at: new Date().toISOString(), owner: clone(owner), replies: [], image: null };
      notices.unshift(notice); return clone(notice);
    },
    async updateNotice(id, input) {
      const notice = find(id); own(notice);
      Object.assign(notice, validateFields(input, true)); return clone(notice);
    },
    async deleteNotice(id) { const notice = find(id); own(notice); notices = notices.filter((n) => n.id !== id); },
    async addReply(id, text) {
      const author = auth(); const notice = find(id);
      if (notice.status !== "open") throw new Error("Объявление закрыто. Новые отклики недоступны.");
      text = String(text || "").trim();
      if (text.length < 3 || text.length > 1000) throw new Error("Отклик: от 3 до 1000 символов.");
      const reply = { id: crypto.randomUUID(), text, author: clone(author), created_at: new Date().toISOString() };
      notice.replies.push(reply); return clone(reply);
    },
  };
}
