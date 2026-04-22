/** CRM-подобные статусы по умолчанию (коды стабильны для автоматики). */
export type LeadStatusItem = {
  code: string;
  label: string;
  order: number;
  system?: boolean;
};

export const DEFAULT_LEAD_STATUSES: LeadStatusItem[] = [
  { code: "new", label: "Новый", order: 0, system: true },
  { code: "in_progress", label: "В работе", order: 1, system: true },
  { code: "qualified", label: "Квалифицирован", order: 2 },
  { code: "proposal", label: "Коммерческое предложение", order: 3 },
  { code: "negotiation", label: "Согласование", order: 4 },
  { code: "won", label: "Успешно закрыт", order: 5 },
  { code: "lost", label: "Отказ", order: 6 },
];

export const SYSTEM_STATUS_NEW = "new";
export const SYSTEM_STATUS_IN_PROGRESS = "in_progress";

export function normalizeLeadStatuses(
  raw: unknown,
): LeadStatusItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_LEAD_STATUSES.map((x) => ({ ...x }));
  }
  const out: LeadStatusItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const code = String((row as { code?: string }).code || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const label = String((row as { label?: string }).label || "").trim();
    const order = Number((row as { order?: number }).order);
    const system = Boolean((row as { system?: boolean }).system);
    if (!code || !label) continue;
    out.push({
      code,
      label,
      order: Number.isFinite(order) ? order : out.length,
      system,
    });
  }
  const codes = new Set(out.map((x) => x.code));
  for (const def of DEFAULT_LEAD_STATUSES) {
    if (def.system && !codes.has(def.code)) {
      out.push({ ...def });
    }
  }
  if (out.length === 0) {
    return DEFAULT_LEAD_STATUSES.map((x) => ({ ...x }));
  }
  const sorted = out.sort((a, b) => a.order - b.order);
  const seen = new Set<string>();
  const dedup: LeadStatusItem[] = [];
  for (const s of sorted) {
    if (seen.has(s.code)) continue;
    seen.add(s.code);
    dedup.push(s);
  }
  return dedup;
}
