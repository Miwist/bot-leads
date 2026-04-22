"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import BrandLogo from "@/components/BrandLogo";
import { useDashboard } from "@/components/dashboard/DashboardContext";

const baseNav = [
  ["/dashboard", "Главная"],
  ["/dashboard/onboarding", "Подключение"],
  ["/dashboard/chats", "Диалоги"],
  ["/dashboard/leads", "Заявки"],
  ["/dashboard/managers", "Менеджеры"],
  ["/dashboard/bots", "Боты"],
  ["/dashboard/billing", "Тарифы"],
  ["/dashboard/feedback", "Поддержка"],
  ["/dashboard/settings", "Настройки"],
] as const;

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { company, patchCompanyName, setCompanyNameLocal } = useDashboard();
  const nav = baseNav;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(company?.name || "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(company?.name || "");
  }, [company?.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }
  }, [editing]);

  const workspaceName = company?.name || "Новая компания";

  return (
    <aside className="dashboard-sidebar">
      <Stack spacing={2.25} sx={{ height: "100%" }}>
        <BrandLogo compact />
        <Box>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.45)", display: "block", mb: 0.5 }}
          >
            Пространство
          </Typography>
          {editing ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <InputBase
                inputRef={inputRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setCompanyNameLocal(e.target.value);
                }}
                sx={{
                  flex: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.06)",
                  fontSize: 15,
                  fontWeight: 600,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void patchCompanyName(draft).then(() => setEditing(false));
                  }
                  if (e.key === "Escape") {
                    setDraft(company?.name || "");
                    setCompanyNameLocal(company?.name || "");
                    setEditing(false);
                  }
                }}
              />
              <Tooltip title="Сохранить">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    void patchCompanyName(draft).then(() => setEditing(false));
                  }}
                >
                  <CheckOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Отмена">
                <IconButton
                  size="small"
                  onClick={() => {
                    setDraft(company?.name || "");
                    setCompanyNameLocal(company?.name || "");
                    setEditing(false);
                  }}
                >
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 650,
                  flex: 1,
                  cursor: "pointer",
                  lineHeight: 1.35,
                }}
                onClick={() => company?.id && setEditing(true)}
              >
                {workspaceName}
              </Typography>
              {company?.id && (
                <Tooltip title="Переименовать">
                  <IconButton
                    size="small"
                    onClick={() => setEditing(true)}
                    sx={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
        <Stack spacing={0.25}>
          {nav.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Box
                key={href}
                component={Link}
                href={href}
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 2,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                  bgcolor: active ? "rgba(124,92,255,0.14)" : "transparent",
                  border: "1px solid",
                  borderColor: active ? "rgba(124,92,255,0.28)" : "transparent",
                  transition: "background .15s ease, border-color .15s ease",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
                }}
              >
                {label}
              </Box>
            );
          })}
        </Stack>
        <Box sx={{ flex: 1 }} />
      </Stack>
    </aside>
  );
}
