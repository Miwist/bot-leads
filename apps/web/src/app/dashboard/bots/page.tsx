"use client";

import { useEffect, useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
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
  const [shareError, setShareError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
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

  const copyLink = async () => {
    if (!startLink) return;
    try {
      await navigator.clipboard.writeText(startLink);
      setCopied(true);
      setShareError("");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setShareError("Не получилось скопировать ссылку. Попробуйте еще раз.");
    }
  };

  const shareNative = async () => {
    if (!startLink || !navigator.share) return;
    try {
      await navigator.share({
        title: "Ссылка на Telegram-бота",
        text: "Напишите нам в Telegram",
        url: startLink,
      });
      setShareError("");
    } catch {
      // user cancel is normal
    }
  };

  const openTelegramShare = () => {
    if (!startLink) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(startLink)}&text=${encodeURIComponent("Напишите нам в Telegram")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
            <Typography sx={{ color: "text.secondary" }}>
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
                sx={{ color: "text.secondary" }}
              >
                Ссылка для клиентов
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Этой ссылкой можно делиться: клиент сразу попадет в нужный бот.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.1,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    color: startLink ? "text.primary" : "text.secondary",
                  }}
                >
                  {startLink || "Ссылка появится после подключения бота"}
                </Typography>
                <IconButton
                  size="small"
                  disabled={!startLink}
                  onClick={() => void copyLink()}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  disabled={!startLink}
                  onClick={() => void copyLink()}
                  sx={{ minHeight: 42, justifyContent: "center" }}
                >
                  Скопировать ссылку
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<QrCode2OutlinedIcon fontSize="small" />}
                  disabled={!startLink}
                  onClick={() => setQrOpen(true)}
                  sx={{ minHeight: 42, justifyContent: "center" }}
                >
                  QR-код
                </Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ShareOutlinedIcon fontSize="small" />}
                    disabled={!startLink}
                    onClick={() => void shareNative()}
                    sx={{ minHeight: 42, justifyContent: "center" }}
                  >
                    Поделиться
                  </Button>
                )}
                <Button
                  variant="text"
                  size="small"
                  disabled={!startLink}
                  onClick={openTelegramShare}
                  sx={{ minHeight: 42, justifyContent: "center" }}
                >
                  Отправить в Telegram
                </Button>
              </Box>
              {copied && (
                <Typography variant="caption" sx={{ color: "secondary.main" }}>
                  Ссылка скопирована
                </Typography>
              )}
              {shareError && (
                <Typography variant="caption" sx={{ color: "error.main" }}>
                  {shareError}
                </Typography>
              )}
              {startBotUsername && (
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary" }}
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
                  background: "background.paper",
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
              <Typography sx={{ color: "text.secondary" }}>
                Пока нет подключённых ботов. Это нормально, если вы используете
                общий бот.
              </Typography>
            )}
          </Stack>
        </Paper>
      </div>
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>QR-код для клиента</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} alignItems="center" sx={{ pt: 0.5, pb: 1 }}>
            {startLink && (
              <QRCodeSVG
                value={startLink}
                size={220}
                bgColor="#ffffff"
                fgColor="#111827"
                marginSize={2}
              />
            )}
            <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
              Клиент сканирует QR и сразу открывает чат с ботом.
            </Typography>
            <Button size="small" variant="outlined" onClick={() => void copyLink()}>
              Скопировать ссылку
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
