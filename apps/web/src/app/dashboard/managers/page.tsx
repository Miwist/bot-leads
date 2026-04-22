"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { api, getApiErrorMessage, getCompanyId } from "@/lib/api";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function ManagersPage() {
  const { company, refresh } = useDashboard();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    chatId: "",
  });
  const [error, setError] = useState("");
  const companyId = company?.id || getCompanyId();
  const reload = useCallback(() => {
    if (!companyId) return;
    void api
      .get("/managers", { params: { companyId } })
      .then((r) => setItems(r.data));
  }, [companyId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return (
    <div className="dashboard-grid">
      <Paper className="glass-card span-5" sx={{ p: 3.2 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Добавить менеджера</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {!companyId && (
            <Alert severity="info">
              Сначала создайте компанию в разделе «Настройки», затем вернитесь
              сюда.
            </Alert>
          )}
          <TextField
            label="Имя"
            value={form.name}
            onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
          />
          <TextField
            label="Почта"
            value={form.email}
            onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))}
          />
          <TextField
            label="Пароль для входа"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((x) => ({ ...x, password: e.target.value }))
            }
            helperText="Менеджер будет входить в кабинет по этой почте и паролю."
          />
          <TextField
            label="ID чата Telegram"
            value={form.chatId}
            onChange={(e) => setForm((x) => ({ ...x, chatId: e.target.value }))}
          />
          <Button
            variant="contained"
            disabled={!companyId}
            onClick={async () => {
              setError("");
              if (!companyId) {
                setError(
                  "Нет привязанной компании. Откройте «Настройки» и сохраните компанию.",
                );
                return;
              }
              try {
                await api.post("/managers", { companyId, ...form });
                setForm({ name: "", email: "", password: "", chatId: "" });
                await refresh({ silent: true });
                reload();
              } catch (e) {
                setError(
                  getApiErrorMessage(e, "Не удалось добавить менеджера."),
                );
              }
            }}
          >
            Добавить менеджера
          </Button>
        </Stack>
      </Paper>
      <Paper className="glass-card span-7" sx={{ p: 3.2 }}>
        <Stack spacing={1.4}>
          <Typography variant="h5">Команда</Typography>
          {items.map((manager) => (
            <Box
              key={manager.id}
              sx={{
                p: 2,
                borderRadius: 4,
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{manager.name}</Typography>
                <Typography
                  sx={{ color: "rgba(255,255,255,0.58)", fontSize: 13.5 }}
                >
                  {manager.email} • Telegram: {manager.chatId || "не задан"}
                </Typography>
              </Box>
              <Switch
                checked={manager.isActive}
                onChange={async (_, value) => {
                  try {
                    await api.patch(`/managers/${manager.id}`, {
                      isActive: value,
                    });
                    reload();
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </Box>
          ))}
          {items.length === 0 && (
            <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
              Пока нет менеджеров. Добавьте первого, чтобы заявки начали
              распределяться автоматически.
            </Typography>
          )}
        </Stack>
      </Paper>
    </div>
  );
}
