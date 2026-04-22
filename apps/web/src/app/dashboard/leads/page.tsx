"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getApiErrorMessage, getCompanyId } from "@/lib/api";
import {
  Alert,
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function LeadsPage() {
  const { company } = useDashboard();
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [qInput, setQInput] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [activity, setActivity] = useState<
    Array<{ role: string; text: string; createdAt?: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const companyId = getCompanyId();
  const statuses = (company?.leadStatuses || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  useEffect(() => {
    const t = setTimeout(() => setQDeb(qInput), 420);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.get("/leads/sources/list", {
          params: { companyId },
        });
        if (!cancelled) setSources(Array.isArray(r.data) ? r.data : []);
      } catch {
        if (!cancelled) setSources([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.get("/leads", {
          params: {
            companyId,
            ...(status ? { status } : {}),
            ...(source ? { source } : {}),
            ...(dateFrom ? { dateFrom } : {}),
            ...(dateTo ? { dateTo } : {}),
            ...(qDeb.trim() ? { q: qDeb.trim() } : {}),
          },
        });
        if (!cancelled) setItems(r.data || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    companyId,
    status,
    source,
    dateFrom,
    dateTo,
    qDeb,
    company?.leadStatuses,
  ]);

  const load = async () => {
    if (!companyId) return;
    const r = await api.get("/leads", {
      params: {
        companyId,
        ...(status ? { status } : {}),
        ...(source ? { source } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(qDeb.trim() ? { q: qDeb.trim() } : {}),
      },
    });
    setItems(r.data || []);
  };

  const updateStatus = async (leadId: string, nextStatus: string) => {
    try {
      await api.patch(`/leads/${leadId}/status`, { status: nextStatus });
      await load();
      if (active?.id === leadId) {
        const r = await api.get(`/leads/${leadId}`);
        setActive(r.data);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось изменить статус заявки."));
    }
  };

  const saveLead = async () => {
    if (!active?.id) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/leads/${active.id}`, {
        fullName: active.fullName,
        phone: active.phone,
        email: active.email || null,
        need: active.need,
        source: active.source || null,
        budget: active.budget || null,
        comment: active.comment || null,
        status: active.status,
        details: active.details || {},
      });
      setActive(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось сохранить изменения заявки."));
    } finally {
      setSaving(false);
    }
  };

  const openLead = async (lead: any) => {
    setActive(lead);
    setActivity([]);
    try {
      if (!companyId) return;
      const r = await api.get("/conversations", { params: { companyId } });
      const conv = (r.data || []).find(
        (x: any) => x.id === lead.conversationId,
      );
      const timeline = Array.isArray(conv?.timeline) ? conv.timeline : [];
      setActivity(
        timeline.map((x: any) => ({
          role: String(x.role || "assistant"),
          text: String(x.text || ""),
          createdAt: x.createdAt ? String(x.createdAt) : undefined,
        })),
      );
    } catch {}
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Заявки
      </Typography>
      {!companyId && (
        <Alert severity="info">
          Сначала создайте компанию в{" "}
          <Link href="/dashboard/onboarding">мастере подключения</Link> или в{" "}
          <Link href="/dashboard/settings">настройках</Link>.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper className="glass-card" sx={{ p: 2.5 }}>
        <Typography
          variant="caption"
          sx={{ color: "rgba(255,255,255,0.45)", display: "block", mb: 1.5 }}
        >
          Фильтры применяются автоматически. Поиск по тексту — с небольшой
          задержкой после ввода.
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          flexWrap="wrap"
          spacing={2}
          useFlexGap
          sx={{ mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.45)" }}
            >
              Статус
            </Typography>
            <Select
              value={status}
              onChange={(e) => setStatus(String(e.target.value))}
              displayEmpty
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">Все</MenuItem>
              {statuses.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <Stack spacing={0.5}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.45)" }}
            >
              Источник
            </Typography>
            <Select
              value={source}
              onChange={(e) => setSource(String(e.target.value))}
              displayEmpty
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">Все</MenuItem>
              {sources.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </Stack>
          <TextField
            label="С даты"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="По дату"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Поиск"
            size="small"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Имя, телефон, запрос…"
            sx={{ minWidth: 220, flex: 1 }}
          />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Клиент</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Запрос</TableCell>
              <TableCell>Источник</TableCell>
              <TableCell>Создана</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действие</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{lead.fullName}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.58)" }}>
                  {lead.need}
                </TableCell>
                <TableCell
                  sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
                >
                  {lead.source || "—"}
                </TableCell>
                <TableCell
                  sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
                >
                  {lead.createdAt
                    ? new Intl.DateTimeFormat("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(lead.createdAt))
                    : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={lead.status || ""}
                    onChange={(e) =>
                      void updateStatus(lead.id, String(e.target.value))
                    }
                    sx={{ minWidth: 170 }}
                  >
                    {statuses.map((s) => (
                      <MenuItem key={s.code} value={s.code}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => void openLead(lead)}>
                    Подробнее
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && (
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.45)", mt: 1.5 }}
          >
            Заявок пока нет.
          </Typography>
        )}
      </Paper>
      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Карточка заявки</DialogTitle>
        <DialogContent>
          <Stack spacing={1.4} sx={{ mt: 0.5 }}>
            <TextField
              label="Имя"
              value={active?.fullName || ""}
              onChange={(e) =>
                setActive((prev: any) => ({
                  ...prev,
                  fullName: e.target.value,
                }))
              }
            />
            <TextField
              label="Телефон"
              value={active?.phone || ""}
              onChange={(e) =>
                setActive((prev: any) => ({ ...prev, phone: e.target.value }))
              }
            />
            <TextField
              label="Email"
              value={active?.email || ""}
              onChange={(e) =>
                setActive((prev: any) => ({ ...prev, email: e.target.value }))
              }
            />
            <TextField
              label="Запрос клиента"
              value={active?.need || ""}
              multiline
              minRows={2}
              onChange={(e) =>
                setActive((prev: any) => ({ ...prev, need: e.target.value }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="Источник"
                value={active?.source || ""}
                onChange={(e) =>
                  setActive((prev: any) => ({
                    ...prev,
                    source: e.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Бюджет"
                value={active?.budget || ""}
                onChange={(e) =>
                  setActive((prev: any) => ({
                    ...prev,
                    budget: e.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
            <Box>
              <InputLabel sx={{ mb: 0.7 }}>Статус</InputLabel>
              <Select
                size="small"
                fullWidth
                value={active?.status || ""}
                onChange={(e) =>
                  setActive((prev: any) => ({
                    ...prev,
                    status: String(e.target.value),
                  }))
                }
              >
                {statuses.map((s) => (
                  <MenuItem key={s.code} value={s.code}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <TextField
              label="Комментарий менеджера"
              value={active?.comment || ""}
              multiline
              minRows={3}
              onChange={(e) =>
                setActive((prev: any) => ({ ...prev, comment: e.target.value }))
              }
            />
            {(company?.dataFields || []).length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2">Дополнительные поля</Typography>
                {(company?.dataFields || []).map((field: string) => (
                  <TextField
                    key={field}
                    label={field}
                    value={(active?.details?.[field] as string) || ""}
                    onChange={(e) =>
                      setActive((prev: any) => ({
                        ...prev,
                        details: {
                          ...(prev?.details || {}),
                          [field]: e.target.value,
                        },
                      }))
                    }
                  />
                ))}
              </>
            )}
            <Divider />
            <Typography variant="subtitle2">История переписки</Typography>
            <Stack
              spacing={0.9}
              sx={{ maxHeight: 220, overflowY: "auto", pr: 0.4 }}
            >
              {activity.map((m, idx) => (
                <Box
                  key={`${m.role}-${idx}`}
                  sx={{
                    p: 1.1,
                    borderRadius: 2,
                    background:
                      m.role === "assistant"
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(124,92,255,0.14)",
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {m.role === "assistant"
                      ? "Бот"
                      : m.role === "manager"
                        ? "Менеджер"
                        : "Клиент"}
                  </Typography>
                  <Typography variant="body2">{m.text}</Typography>
                </Box>
              ))}
              {activity.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.52)" }}
                >
                  История пока недоступна для этой заявки.
                </Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActive(null)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void saveLead()}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
