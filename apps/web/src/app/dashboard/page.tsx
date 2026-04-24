"use client";

import { useEffect, useState } from "react";
import { api, getCompanyId } from "@/lib/api";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { getPlanDetails, getStatusLabel } from "@/lib/ui";

export default function DashboardPage() {
  const { company } = useDashboard();
  const [stats, setStats] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const companyId = getCompanyId();

  useEffect(() => {
    if (!companyId) return;
    api.get(`/leads/stats/${companyId}`).then((r) => setStats(r.data));
    api
      .get(`/billing/current`, { params: { companyId } })
      .then((r) => setBilling(r.data));
  }, [companyId]);

  const activePlan = getPlanDetails(billing?.plan);
  const statusCatalog = company?.leadStatuses;

  const cards = [
    { label: "Всего", value: stats?.total ?? 0 },
    { label: "Новые", value: stats?.newCount ?? 0 },
    { label: "В работе", value: stats?.assignedCount ?? 0 },
    { label: "Лимит заявок", value: billing?.plan?.monthlyLeadLimit ?? "—" },
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Главная
      </Typography>
      <div className="dashboard-grid">
        <Paper className="glass-card span-8" sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Chip size="small" label="Обзор" sx={{ alignSelf: "flex-start" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              {company?.name || "Компания"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", maxWidth: 720 }}
            >
              {company?.description ||
                "Кратко опишите продукт и целевого клиента в настройках — бот будет собирать заявки точнее."}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                component={Link}
                href="/dashboard/settings"
                variant="contained"
                size="small"
              >
                Настройки
              </Button>
              <Button
                component={Link}
                href="/dashboard/chats"
                color="inherit"
                size="small"
              >
                Диалоги
              </Button>
            </Stack>
          </Stack>
        </Paper>
        <Paper className="glass-card span-4" sx={{ p: 2.5 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Тариф
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, mt: 0.5 }}>
            {activePlan.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: 1 }}
          >
            Заявки: {billing?.usage?.leadsUsed ?? 0} /{" "}
            {billing?.plan?.monthlyLeadLimit ?? 100}
          </Typography>
          <Button
            component={Link}
            href="/dashboard/billing"
            size="small"
            sx={{ mt: 1.5 }}
          >
            Оплата и тарифы
          </Button>
        </Paper>
        {cards.map((card) => (
          <Paper key={card.label} className="glass-card span-3" sx={{ p: 2 }}>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {card.label}
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, mt: 0.25 }}>
              {card.value}
            </Typography>
          </Paper>
        ))}
        <Paper className="glass-card span-7" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1.25 }}>
            Последние заявки
          </Typography>
          <Stack spacing={1}>
            {(stats?.latest || []).map((lead: any) => (
              <Box
                key={lead.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {lead.fullName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary" }}
                  >
                    {lead.need}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={getStatusLabel(lead.status, statusCatalog)}
                />
              </Box>
            ))}
            {(!stats?.latest || stats.latest.length === 0) && (
              <Typography
                variant="body2"
                sx={{ color: "text.secondary" }}
              >
                Пока нет заявок.
              </Typography>
            )}
          </Stack>
        </Paper>
        <Paper className="glass-card span-5" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1.25 }}>
            Чеклист
          </Typography>
          <Stack spacing={0.75}>
            {[
              `Бот: ${company?.botMode === "custom" ? "свой" : "общий"}`,
              `Поля сбора: ${(company?.dataFields || []).length || 0}`,
              `Сценарий бота: ${company?.botObjective ? "есть" : "нет"}`,
            ].map((item) => (
              <Typography
                key={item}
                variant="body2"
                sx={{ color: "text.secondary" }}
              >
                • {item}
              </Typography>
            ))}
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
