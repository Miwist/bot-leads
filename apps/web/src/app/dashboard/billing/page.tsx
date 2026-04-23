"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { api, getCompanyId } from "@/lib/api";
import {
  formatRubles,
  formatRublesWithDecimals,
  getOveragePrice,
  getPlanDetails,
  PLAN_LIST,
  type PlanCode,
} from "@/lib/ui";

function formatBalanceRubFromKopecks(kopecks?: number | null) {
  const k = Number(kopecks) || 0;
  return formatRublesWithDecimals(k / 100);
}

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plan" | "custom">("plan");
  const [months, setMonths] = useState(1);
  const [customAmount, setCustomAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const companyId = getCompanyId();
  const searchParams = useSearchParams();
  const requestedPlan = (searchParams.get("plan") || "") as PlanCode | "";
  const paymentResult = searchParams.get("payment");
  const paymentId = searchParams.get("paymentId");

  const [selectedCode, setSelectedCode] = useState<PlanCode>("starter");

  useEffect(() => {
    if (
      requestedPlan === "starter" ||
      requestedPlan === "growth" ||
      requestedPlan === "pro"
    ) {
      setSelectedCode(requestedPlan);
    }
  }, [requestedPlan]);

  const reload = () => {
    if (companyId) {
      api
        .get("/billing/current", { params: { companyId } })
        .then((r) => setData(r.data));
    }
  };
  useEffect(() => {
    reload();
  }, [companyId]);

  useEffect(() => {
    if (paymentResult !== "success" || !paymentId || !companyId) return;
    setMessage("");
    api
      .get("/billing/payment-status", { params: { companyId, paymentId } })
      .then((r) => {
        const status = String(r.data?.status || "");
        if (status === "succeeded") {
          setMessage("Оплата подтверждена.");
          reload();
        } else if (status === "pending") {
          setError(
            "Платеж еще обрабатывается. Обновите страницу через минуту.",
          );
        }
      })
      .catch(() => {
        setError("Не удалось проверить статус платежа.");
      });
  }, [paymentResult, paymentId, companyId]);

  const usagePercent = data?.plan?.monthlyLeadLimit
    ? Math.min(
        100,
        Math.round(
          ((data?.usage?.leadsUsed || 0) / data.plan.monthlyLeadLimit) * 100,
        ),
      )
    : 0;
  const leadsUsed = Number(data?.usage?.leadsUsed || 0);
  const monthlyLeadLimit = Number(data?.plan?.monthlyLeadLimit || 100);
  const leadsLeft = Math.max(0, monthlyLeadLimit - leadsUsed);
  const usageState =
    usagePercent >= 100
      ? "limit_reached"
      : usagePercent >= 85
        ? "near_limit"
        : "ok";
  const currentPlan = useMemo(() => getPlanDetails(data?.plan), [data?.plan]);
  const selected = getPlanDetails({ code: selectedCode });
  const plansToRender = (
    data?.plans?.length ? data.plans : PLAN_LIST
  ) as Array<{
    code: string;
    monthlyLeadLimit: number;
  }>;
  const totalPlanRub = selected.price * months;
  const discountPercent = Number(data?.discounts?.[months] || 0);
  const discountedTotalRub = Math.round(
    totalPlanRub * (1 - discountPercent / 100),
  );

  const pay = async () => {
    if (!companyId) return;
    setPaying(true);
    setError("");
    setMessage("");
    try {
      const body =
        tab === "plan"
          ? { companyId, planCode: selectedCode, months }
          : { companyId, amountRub: Math.floor(Number(customAmount)) };
      const { data: res } = await api.post("/billing/checkout", body);
      if (res.confirmationUrl) {
        window.location.href = res.confirmationUrl;
        return;
      }
      setError("Не удалось получить ссылку на оплату.");
    } catch (e: unknown) {
      const raw = (
        e as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(", ") : raw;
      setError(msg || "Ошибка при создании платежа.");
    } finally {
      setPaying(false);
    }
  };

  if (!companyId) {
    return (
      <Paper className="glass-card" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Тарифы</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
            Сначала пройдите мастер подключения или создайте компанию в
            настройках.
          </Typography>
          <Button
            component={Link}
            href={
              requestedPlan
                ? `/dashboard/onboarding?plan=${requestedPlan}`
                : "/dashboard/onboarding"
            }
            variant="contained"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          >
            Мастер подключения
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Тарифы и оплата
      </Typography>

      <Paper className="glass-card" sx={{ p: 2.5 }}>
        <Stack spacing={1.25}>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {!data?.yookassaReady && (
            <Alert severity="warning">Оплата временно недоступна.</Alert>
          )}
          <Typography
            variant="subtitle2"
            sx={{ color: "rgba(255,255,255,0.55)" }}
          >
            Текущий тариф
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
            {currentPlan.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.48)", mb: 0.5 }}
          >
            {currentPlan.tagline}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
            Использовано {leadsUsed} / {monthlyLeadLimit} заявок ({usagePercent}
            %)
          </Typography>
          {usageState === "limit_reached" && (
            <Alert severity="error">
              Лимит заявок на этот месяц исчерпан. Новые заявки будут
              создаваться только при наличии баланса сверх лимита.
            </Alert>
          )}
          {usageState === "near_limit" && (
            <Alert severity="warning">
              До исчерпания лимита осталось {leadsLeft}{" "}
              {leadsLeft % 10 === 1 && leadsLeft % 100 !== 11
                ? "заявка"
                : leadsLeft % 10 >= 2 &&
                    leadsLeft % 10 <= 4 &&
                    !(leadsLeft % 100 >= 12 && leadsLeft % 100 <= 14)
                  ? "заявки"
                  : "заявок"}
              . Рекомендуем пополнить баланс заранее.
            </Alert>
          )}
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.25,
              color: "rgba(255,255,255,0.52)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {currentPlan.features.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </Box>
          {data?.trial?.active && (
            <Alert severity="info">
              Тестовый период 7 дней активен до{" "}
              {new Intl.DateTimeFormat("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(data.trial.endsAt))}
              .
            </Alert>
          )}
          <LinearProgress
            variant="determinate"
            value={usagePercent}
            color={
              usageState === "limit_reached"
                ? "error"
                : usageState === "near_limit"
                  ? "warning"
                  : "primary"
            }
            sx={{ height: 8, borderRadius: 999 }}
          />
        </Stack>
      </Paper>

      <Paper className="glass-card" sx={{ p: 2.5 }}>
        <Stack spacing={0.75}>
          <Typography
            variant="subtitle2"
            sx={{ color: "rgba(255,255,255,0.55)" }}
          >
            Баланс сверх лимита
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>
            {formatBalanceRubFromKopecks(data?.overageBalanceKopecks)} ₽
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.52)" }}>
            После исчерпания месячного лимита списывается{" "}
            {formatRublesWithDecimals(
              typeof data?.overageRubPerLead === "number"
                ? data.overageRubPerLead
                : getOveragePrice(data?.plan),
            )}{" "}
            ₽ за каждую новую заявку.
          </Typography>
        </Stack>
      </Paper>

      <div className="dashboard-grid">
        <Paper className="glass-card span-7" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1.5 }}>
            Оформление оплаты
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.52)", mb: 2 }}
          >
            Выберите услугу (тариф), срок или произвольную сумму, затем оплатите
            через ЮKassa.
          </Typography>

          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.45)", display: "block", mb: 0.75 }}
          >
            Услуга
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            {PLAN_LIST.map((p) => (
              <Button
                key={p.code}
                size="small"
                variant={selectedCode === p.code ? "contained" : "outlined"}
                onClick={() => setSelectedCode(p.code)}
                sx={{ justifyContent: "flex-start", textAlign: "left" }}
              >
                {p.name} — {formatRubles(p.price)} ₽ / мес ·{" "}
                {p.monthlyLeadLimit} заявок
              </Button>
            ))}
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ minHeight: 40, mb: 1.5 }}
          >
            <Tab
              value="plan"
              label="По месяцам"
              sx={{ minHeight: 40, py: 0 }}
            />
            <Tab
              value="custom"
              label="Произвольная сумма"
              sx={{ minHeight: 40, py: 0 }}
            />
          </Tabs>

          {tab === "plan" ? (
            <Stack spacing={1.5}>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.45)" }}
              >
                Срок оплаты
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={months}
                onChange={(_, v) => v != null && setMonths(v)}
              >
                {[1, 3, 6, 12].map((m) => (
                  <ToggleButton key={m} value={m}>
                    {m} мес.
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 1 }} />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.55)" }}
                >
                  К оплате
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
                  {formatRubles(discountedTotalRub)} ₽
                </Typography>
              </Stack>
              {discountPercent > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.52)" }}
                >
                  Скидка {discountPercent}%: было {formatRubles(totalPlanRub)}{" "}
                  ₽, экономия {formatRubles(totalPlanRub - discountedTotalRub)}{" "}
                  ₽
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.45)" }}
              >
                После оплаты тариф «{selected.name}» активируется автоматически.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <TextField
                label="Сумма, ₽"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                helperText="Зачисляется на баланс предоплаты за заявки сверх лимита (тариф не меняется)."
              />
            </Stack>
          )}

          <Button
            variant="contained"
            disabled={paying || !data?.yookassaReady}
            onClick={() => void pay()}
            sx={{ mt: 2, alignSelf: "flex-start" }}
          >
            Перейти к оплате в ЮKassa
          </Button>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.48)", display: "block", mt: 1.25 }}
          >
            Оплачивая тариф, вы принимаете{" "}
            <Link href="/offer" style={{ color: "inherit" }}>
              оферту
            </Link>
            ,{" "}
            <Link href="/terms" style={{ color: "inherit" }}>
              условия использования
            </Link>{" "}
            и{" "}
            <Link href="/privacy" style={{ color: "inherit" }}>
              политику обработки данных
            </Link>
            .
          </Typography>
        </Paper>

        <Paper className="glass-card span-5" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1.5 }}>
            Все тарифы
          </Typography>
          <Stack spacing={1.25}>
            {plansToRender.map(
              (plan: { code: string; monthlyLeadLimit: number }) => {
                const d = getPlanDetails(plan);
                return (
                  <Box
                    key={plan.code}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.08)",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>{d.name}</Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.48)", mb: 0.5 }}
                    >
                      {d.tagline}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.52)" }}
                    >
                      {formatRubles(d.price)} ₽ / мес · {plan.monthlyLeadLimit}{" "}
                      заявок
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      Сверх лимита:{" "}
                      {formatRublesWithDecimals(getOveragePrice(plan))} ₽ /
                      заявку
                    </Typography>
                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        mt: 1,
                        pl: 2,
                        "& li": {
                          color: "rgba(255,255,255,0.48)",
                          fontSize: 12,
                          mb: 0.25,
                        },
                      }}
                    >
                      {(d.features || []).map((f) => (
                        <Typography key={f} component="li" variant="caption">
                          {f}
                        </Typography>
                      ))}
                    </Box>
                    {data?.subscription?.planCode === plan.code && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "secondary.main",
                          display: "block",
                          mt: 0.5,
                        }}
                      >
                        Сейчас подключён
                      </Typography>
                    )}
                  </Box>
                );
              },
            )}
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
