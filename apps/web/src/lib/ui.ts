export type PlanCode = "starter" | "growth" | "pro";

export type LeadStatusRow = {
  code: string;
  label: string;
  order?: number;
  system?: boolean;
};

export const PLAN_DETAILS: Record<
  PlanCode,
  {
    code: PlanCode;
    name: string;
    price: number;
    monthlyLeadLimit: number;
    /** Что реально входит в продукт (без выдуманных интеграций). */
    features: string[];
    tagline: string;
  }
> = {
  starter: {
    code: "starter",
    name: "Basic",
    price: 499,
    monthlyLeadLimit: 100,
    tagline: "Старт Telegram-воронки и кабинета",
    features: [
      "До 100 новых заявок в месяц по лимиту тарифа",
      "Telegram: общий бот (поиск компании) или свой бот по токену",
      "Свой бот: приветствие и тон из настроек, материалы (фото, файлы, видео)",
      "Кабинет: заявки с фильтрами, карточка с перепиской, менеджеры, round-robin",
      "Настройка полей сбора данных и статусов под ваш процесс",
      "ИИ-реплики в диалоге",
    ],
  },
  growth: {
    code: "growth",
    name: "Business",
    price: 1299,
    monthlyLeadLimit: 300,
    tagline: "Больше заявок — тот же полный функционал",
    features: [
      "До 300 новых заявок в месяц",
      "Всё из Basic: боты, кабинет, материалы, распределение заявок",
      "Telegram-бот: распознавание голосовых, смысл фото и PDF",
      "Удобнее при нескольких менеджерах и стабильном потоке заявок",
      "Скидка при оплате сразу за несколько месяцев",
    ],
  },
  pro: {
    code: "pro",
    name: "Pro",
    price: 3299,
    monthlyLeadLimit: 1000,
    tagline: "Объём для активных продаж",
    features: [
      "До 1000 новых заявок в месяц",
      "Всё из Business: без отключения функций на стороне продукта, включая голос, фото и PDF в Telegram",
      "Расчёт на высокую конверсию диалогов и команду продаж",
      "Больший запас по лимиту заявок — для пиков спроса и нескольких точек входа",
    ],
  },
};

export const PLAN_LIST = Object.values(PLAN_DETAILS);

/** Подписи для старых кодов и запасной вариант. */
export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  in_progress: "В работе",
  qualified: "Квалифицирован",
  proposal: "Коммерческое предложение",
  negotiation: "Согласование",
  won: "Успешно закрыт",
  lost: "Отказ",
  NEW: "Новый",
  QUALIFIED: "Квалифицирован",
  ASSIGNED: "В работе",
  PUSHED_TO_CRM: "Успешно закрыт",
  FAILED: "Отказ",
  OPEN: "Открыт",
};

export function formatRubles(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatRublesWithDecimals(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getPlanDetails(
  plan?: {
    code?: string;
    name?: string;
    monthlyLeadLimit?: number;
  } | null,
) {
  if (!plan) {
    return PLAN_DETAILS.starter;
  }

  if (plan.code && plan.code in PLAN_DETAILS) {
    return PLAN_DETAILS[plan.code as PlanCode];
  }

  const byName = PLAN_LIST.find(
    (item) => item.name.toLowerCase() === String(plan.name || "").toLowerCase(),
  );
  if (byName) {
    return byName;
  }

  const byLimit = PLAN_LIST.find(
    (item) => item.monthlyLeadLimit === plan.monthlyLeadLimit,
  );
  return byLimit || PLAN_DETAILS.starter;
}

export function getOveragePrice(
  plan?: {
    code?: string;
    name?: string;
    monthlyLeadLimit?: number;
  } | null,
) {
  const details = getPlanDetails(plan);
  return details.price / details.monthlyLeadLimit;
}

export function getStatusLabel(
  status?: string | null,
  catalog?: LeadStatusRow[] | null,
) {
  if (!status) {
    return "Не указан";
  }
  const hit = catalog?.find((s) => s.code === status);
  if (hit?.label) {
    return hit.label;
  }
  return LEAD_STATUS_LABELS[status] || status;
}

export function getStoredThemeMode(storageKey: string): "light" | "dark" | "system" {
  if (typeof window === "undefined") return "light";
  const raw = localStorage.getItem(storageKey);
  if (raw === "dark" || raw === "system") return raw;
  return "light";
}

export function resolveThemeMode(mode: "light" | "dark" | "system"): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}
