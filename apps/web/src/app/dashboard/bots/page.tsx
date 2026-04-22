"use client";

import { useEffect, useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, getCompanyId } from "@/lib/api";
import { getStatusLabel } from "@/lib/ui";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function BotsPage() {
  const { company } = useDashboard();
  const [companyData, setCompanyData] = useState<any>(null);
  const [token, setToken] = useState("");
  const [bots, setBots] = useState<any[]>([]);
  const [startLink, setStartLink] = useState("");
  const [startBotUsername, setStartBotUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");
  const mode = companyData?.botMode || company?.botMode;
  const companyId = company?.id || getCompanyId();
  const reload = () => {
    if (!companyId) return;
    setLoadError("");
    api
      .get(`/companies/${companyId}`)
      .then((r) => setCompanyData(r.data))
      .catch(() => setLoadError("Не удалось загрузить данные компании."));
    api
      .get(`/bots`, { params: { companyId } })
      .then((r) => setBots(r.data))
      .catch(() => setBots([]));
    api
      .get("/bots/start-link", { params: { companyId } })
      .then((r) => {
        setStartLink(r.data?.link || "");
        setStartBotUsername(r.data?.botUsername || "");
      })
      .catch(() => {
        setStartLink("");
        setStartBotUsername("");
        setLoadError(
          "Не удалось получить стартовую ссылку. Проверьте доступ к компании.",
        );
      });
  };
  useEffect(() => {
    reload();
  }, [companyId]);
  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Боты
      </Typography>
      <div className="dashboard-grid">
        <Paper className="glass-card span-6" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {loadError && <Alert severity="warning">{loadError}</Alert>}
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Какой бот использовать
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
              Переключение между общим ботом и своим ботом доступно здесь.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
              <Button
                variant={mode === "shared" ? "contained" : "outlined"}
                onClick={async () => {
                  await api.patch(`/companies/${companyId}`, {
                    botMode: "shared",
                  });
                  reload();
                }}
              >
                Использовать общий бот
              </Button>
              <Button
                variant={mode === "custom" ? "contained" : "outlined"}
                onClick={async () => {
                  await api.patch(`/companies/${companyId}`, {
                    botMode: "custom",
                  });
                  reload();
                }}
              >
                Использовать свой бот
              </Button>
            </Stack>
            <Alert severity="info">
              Сейчас выбран режим:{" "}
              {mode === "custom" ? "свой Telegram-бот" : "общий бот"}.
              {mode === "custom"
                ? " Текст приветствия после /start задаётся в «Настройках» → поле «Приветствие»."
                : " Клиент сначала находит компанию по названию; при похожих названиях используйте подпись для отличия в настройках компании."}
            </Alert>
            <Stack spacing={0.75}>
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.55)" }}
              >
                Ссылка для клиентов
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.1,
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    color: startLink
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.45)",
                  }}
                >
                  {startLink || "Ссылка появится после подключения бота"}
                </Typography>
                <IconButton
                  size="small"
                  disabled={!startLink}
                  onClick={async () => {
                    if (!startLink) return;
                    await navigator.clipboard.writeText(startLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              {copied && (
                <Typography variant="caption" sx={{ color: "secondary.main" }}>
                  Ссылка скопирована
                </Typography>
              )}
              {startBotUsername && (
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Ссылка использует бот: @{startBotUsername}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Paper>
        <Paper className="glass-card span-6" sx={{ p: 3.2 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Подключить свой Telegram-бот</Typography>
            <TextField
              label="Токен бота"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              helperText="Нужен только если вы подключаете своего Telegram-бота."
            />
            <Button
              variant="contained"
              onClick={async () => {
                await api.post("/bots/connect", {
                  companyId,
                  token,
                  webhookSecret: `ws-${Date.now()}`,
                });
                setToken("");
                reload();
              }}
            >
              Подключить бота
            </Button>
          </Stack>
        </Paper>
        <Paper className="glass-card span-12" sx={{ p: 3.2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h5">Подключённые боты</Typography>
            {bots.map((bot) => (
              <Box
                key={bot.id}
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
                  <Typography sx={{ fontWeight: 600 }}>
                    @{bot.botUsername}
                  </Typography>
                </Box>
                <Chip
                  label={
                    bot.status === "active"
                      ? "Активен"
                      : getStatusLabel(bot.status)
                  }
                  color={bot.status === "active" ? "primary" : "default"}
                />
              </Box>
            ))}
            {bots.length === 0 && (
              <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
                Пока нет подключённых ботов. Это нормально, если вы используете
                общий бот.
              </Typography>
            )}
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
