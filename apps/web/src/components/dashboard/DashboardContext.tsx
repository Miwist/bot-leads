"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  getCompanyId,
  getUserRoleFromToken,
  setCompanyId,
} from "@/lib/api";
import type { LeadStatusRow } from "@/lib/ui";

export type CompanyRow = {
  id: string;
  name: string;
  leadStatuses?: LeadStatusRow[];
  botMode?: string;
  description?: string | null;
  botObjective?: string | null;
  communicationTone?: string | null;
  welcomeMessage?: string | null;
  assistantInstruction?: string | null;
  clientDisambiguation?: string | null;
  createLeadFromFirstMessage?: boolean;
  timezone?: string;
  dataFields?: string[];
  botMaterials?: Array<{
    id: string;
    title: string;
    fileName: string;
    mime: string;
    kind: string;
    url?: string;
    data?: string;
    groupId?: string | null;
  }>;
};

type DashboardCtx = {
  company: CompanyRow | null;
  role: string;
  loading: boolean;
  /** silent: не включать глобальный loading (чтобы не размонтировать страницы вроде онбординга). */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  setCompanyNameLocal: (name: string) => void;
  patchCompanyName: (name: string) => Promise<void>;
};

const Ctx = createContext<DashboardCtx | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      setRole(getUserRoleFromToken());
      const res = await api.get("/companies");
      const list = res.data || [];
      const stored = getCompanyId();
      const id =
        (stored && list.some((c: CompanyRow) => c.id === stored)
          ? stored
          : list[0]?.id) || "";
      if (!id) {
        setCompany(null);
        return;
      }
      try {
        const detail = await api.get(`/companies/${id}`);
        setCompanyId(detail.data.id);
        setCompany(detail.data as CompanyRow);
      } catch {
        setCompany(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patchCompanyName = useCallback(
    async (name: string) => {
      const id = company?.id;
      if (!id || !name.trim()) return;
      const { data } = await api.patch(`/companies/${id}`, {
        name: name.trim(),
      });
      setCompany(data as CompanyRow);
    },
    [company?.id],
  );

  const value = useMemo(
    () => ({
      company,
      role,
      loading,
      refresh,
      setCompanyNameLocal: (name: string) =>
        setCompany((c) => (c ? { ...c, name } : c)),
      patchCompanyName,
    }),
    [company, role, loading, refresh, patchCompanyName],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useDashboard: нет провайдера");
  }
  return v;
}
