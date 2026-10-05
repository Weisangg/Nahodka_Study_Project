import { API_BASE_URL } from "./config.js";
import { createDemoApi } from "./demo.js";
export const isDemo = !API_BASE_URL;
function createHttpApi(base) {
  let token = null; // This educational frontend keeps the token in page memory.
  const origin = base.replace(/\/$/, "");
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(origin + path, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: controller.signal });
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) token = null;
        throw new Error(typeof data?.detail === "string" ? data.detail : response.status === 401 ? "Войдите, чтобы продолжить." : `Ошибка запроса (${response.status}).`);
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("Сервер не отвечает. Попробуйте снова.");
      if (error instanceof TypeError) throw new Error("Не удалось связаться с сервером.");
      throw error;
    } finally { clearTimeout(timeout); }
  }
  const json = (method, data) => ({ method, body: JSON.stringify(data) });
  async function login(input) {
    const result = await request("/auth/login", json("POST", input));
    if (!result?.access_token) throw new Error("Сервер не вернул access_token.");
    token = result.access_token; return request("/auth/me");
  }
  const id = encodeURIComponent;
  return {
    getMe: () => token ? request("/auth/me") : Promise.resolve(null),
    listNotices: () => request("/notices"),
    getNotice: (value) => request(`/notices/${id(value)}`),
    login,
    async register(input) { await request("/auth/register", json("POST", input)); return login({ email: input.email, password: input.password }); },
    async logout() { token = null; },
    createNotice: (input) => request("/notices", json("POST", input)),
    updateNotice: (value, input) => request(`/notices/${id(value)}`, json("PATCH", input)),
    deleteNotice: (value) => request(`/notices/${id(value)}`, { method: "DELETE" }),
    addReply: (value, text) => request(`/notices/${id(value)}/replies`, json("POST", { text })),
  };
}
export const api = isDemo ? createDemoApi() : createHttpApi(API_BASE_URL);
