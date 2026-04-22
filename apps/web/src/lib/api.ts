import axios from "axios";

/** В Docker dev SSR идёт из контейнера web — нужен http://api:PORT (см. docker-compose.dev.yml). */
const apiBaseURL =
  typeof window === "undefined"
    ? process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: apiBaseURL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function getCompanyId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("companyId") || "";
}

export function setCompanyId(companyId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("companyId", companyId);
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("companyId");
  }
}

export function getUserRoleFromToken(): string {
  const token = getToken();
  if (!token) return "";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const parsed = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return String(parsed.role || "");
  } catch {
    return "";
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    const serverMessage = Array.isArray(data?.message)
      ? data.message.join(" ")
      : data?.message || data?.error || "";
    const text = String(serverMessage || "").toLowerCase();
    if (status === 413 || text.includes("payload too large")) {
      return "Файлы слишком большие. Уменьшите размер вложений и попробуйте снова.";
    }
    if (status === 401) {
      const m = String(serverMessage || "").trim();
      return m || "Неверная почта или пароль.";
    }
    if (status === 409 || text.includes("already exists")) {
      const m = String(serverMessage || "").trim();
      return m || "Пользователь с такой почтой уже зарегистрирован.";
    }
    if (status === 400 && text.includes("email")) {
      return "Проверьте корректность почты.";
    }
    if (status === 400 && text.includes("password")) {
      return "Пароль слишком простой. Используйте более надёжный пароль.";
    }
    if (serverMessage) {
      return String(serverMessage).trim();
    }
  }
  return fallback;
}
