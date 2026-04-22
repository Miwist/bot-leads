"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, getCompanyId } from "@/lib/api";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getStatusLabel } from "@/lib/ui";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function ChatsPage() {
  const { company } = useDashboard();
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [draftFiles, setDraftFiles] = useState<
    Array<{ name: string; data: string; size: number }>
  >([]);
  const [error, setError] = useState("");
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const timezone = company?.timezone || "Europe/Moscow";
  const companyId = getCompanyId();
  const load = async () => {
    if (!companyId) return;
    const r = await api.get("/conversations", { params: { companyId } });
    setItems(r.data || []);
    if (r.data?.[0]?.id) setSelectedId((prev) => prev || r.data[0].id);
  };
  useEffect(() => {
    if (!companyId) return;
    void load();
  }, [companyId]);
  const active = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0],
    [items, selectedId],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.id, active?.timeline]);

  const sendReply = async () => {
    if (!companyId || !active?.id || (!reply.trim() && draftFiles.length === 0))
      return;
    setError("");
    try {
      await api.post("/conversations/reply", {
        companyId,
        conversationId: active.id,
        text: reply.trim(),
        attachments: draftFiles.map((f) => ({ name: f.name, data: f.data })),
      });
      setReply("");
      setDraftFiles([]);
      await load();
    } catch {
      setError("Не удалось отправить ответ клиенту.");
    }
  };
  const formatTs = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };
  const roleLabel = (role: string) =>
    role === "manager" ? "Менеджер" : role === "assistant" ? "Бот" : "Клиент";
  const emojiList = [
    "😀",
    "🙂",
    "😉",
    "😊",
    "😍",
    "🤝",
    "🙏",
    "👍",
    "🔥",
    "💬",
    "📎",
    "✅",
    "✨",
    "😎",
    "🎉",
  ];
  const deleteChat = async () => {
    if (!companyId || !active?.id) return;
    setError("");
    try {
      await api.delete(`/conversations/${active.id}`, {
        params: { companyId },
      });
      setSelectedId("");
      await load();
    } catch {
      setError("Не удалось удалить переписку.");
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 1.5, md: 2 },
        overflow: "hidden",
      }}
    >
      <Paper
        className="glass-card"
        sx={{
          p: { xs: 1.75, sm: 2.4 },
          display: "flex",
          flexDirection: "column",
          flex: { xs: "0 0 auto", md: "0 0 34%" },
          width: { md: "min(360px, 36%)" },
          maxWidth: { md: 400 },
          minHeight: 0,
          maxHeight: { xs: "min(38vh, 320px)", md: "100%" },
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
          Диалоги клиентов
        </Typography>
        <Stack
          spacing={1.2}
          sx={{
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            pr: 0.5,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((chat) => (
            <Box
              key={chat.id}
              onClick={() => setSelectedId(chat.id)}
              sx={{
                cursor: "pointer",
                p: { xs: 1.25, sm: 1.8 },
                borderRadius: 3,
                border:
                  chat.id === active?.id
                    ? "1px solid rgba(124,92,255,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                background:
                  chat.id === active?.id
                    ? "rgba(124,92,255,0.08)"
                    : "rgba(255,255,255,0.03)",
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 14, sm: 15 } }}>
                {chat.lead?.fullName || `Telegram ${chat.telegramUserId}`}
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: { xs: 12.5, sm: 13.5 },
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {chat.preview}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.45)" }}
              >
                {formatTs(
                  chat.timeline?.[chat.timeline.length - 1]?.createdAt ||
                    chat.createdAt,
                )}
              </Typography>
            </Box>
          ))}
          {items.length === 0 && (
            <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
              Диалогов пока нет.
            </Typography>
          )}
        </Stack>
      </Paper>

      <Paper
        className="glass-card"
        sx={{
          p: { xs: 1.75, sm: 2.4 },
          flex: { xs: "1 1 auto", md: "1 1 0" },
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {active ? (
          <>
            <Box sx={{ flexShrink: 0 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "flex-start" }}
                spacing={1.25}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontSize: { xs: "1.05rem", sm: "1.25rem" } }}
                  >
                    {active.lead?.fullName || `Диалог ${active.telegramUserId}`}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.55)",
                      fontSize: { xs: 12.5, sm: 14 },
                      wordBreak: "break-word",
                    }}
                  >
                    Пользователь Telegram: {active.telegramUserId}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent={{ xs: "space-between", sm: "flex-end" }}
                >
                  <Chip
                    size="small"
                    label={getStatusLabel(
                      active.lead?.status || active.state || "open",
                      company?.leadStatuses,
                    )}
                    sx={{ maxWidth: { xs: "100%", sm: 220 } }}
                  />
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => void deleteChat()}
                    sx={{ flexShrink: 0 }}
                  >
                    Удалить
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                flex: "1 1 auto",
                minHeight: 0,
                overflowY: "auto",
                my: 1.5,
                pr: 0.5,
                WebkitOverflowScrolling: "touch",
              }}
            >
              <Stack spacing={1.2}>
                {(active.timeline || []).map((message: any, idx: number) => (
                  <Box
                    key={`${message.role}-${idx}`}
                    sx={{
                      alignSelf:
                        message.role === "assistant"
                          ? "flex-start"
                          : message.role === "manager"
                            ? "flex-start"
                            : "flex-end",
                      maxWidth: { xs: "min(92%, 520px)", sm: "78%" },
                      p: { xs: 1.25, sm: 1.6 },
                      borderRadius: 4,
                      background:
                        message.role === "assistant"
                          ? "rgba(255,255,255,0.05)"
                          : message.role === "manager"
                            ? "rgba(0, 194, 255, 0.16)"
                            : "linear-gradient(135deg, rgba(124,92,255,0.35), rgba(0,194,255,0.18))",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      {roleLabel(String(message.role || "user"))}
                      {message.createdAt
                        ? ` • ${formatTs(message.createdAt)}`
                        : ""}
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.86)",
                        fontSize: { xs: 14, sm: 15 },
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.text}
                    </Typography>
                    {Array.isArray(message.attachments) &&
                      message.attachments.map((a: any, aIdx: number) => (
                        <Typography
                          key={`${idx}-${aIdx}`}
                          variant="caption"
                          sx={{
                            mt: 0.7,
                            display: "block",
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          📎 {a?.name || "Файл"}
                        </Typography>
                      ))}
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            </Box>

            <Box
              sx={{
                flexShrink: 0,
                pt: 0.5,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                mt: "auto",
              }}
            >
              {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {error}
                </Alert>
              )}
              <Button
                variant="outlined"
                component="label"
                size="small"
                sx={{ alignSelf: "flex-start", mb: 1 }}
              >
                Добавить файлы
                <input
                  hidden
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const readers = files.map(
                      (file) =>
                        new Promise<{
                          name: string;
                          data: string;
                          size: number;
                        } | null>((resolve) => {
                          if (file.size > 5 * 1024 * 1024) {
                            resolve(null);
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () =>
                            resolve({
                              name: file.name,
                              data:
                                typeof reader.result === "string"
                                  ? reader.result
                                  : "",
                              size: file.size,
                            });
                          reader.onerror = () => resolve(null);
                          reader.readAsDataURL(file);
                        }),
                    );
                    Promise.all(readers).then((loaded) => {
                      const valid = loaded.filter(
                        (x): x is { name: string; data: string; size: number } =>
                          Boolean(x),
                      );
                      setDraftFiles((prev) => [...prev, ...valid].slice(0, 10));
                      if (valid.length !== files.length) {
                        setError(
                          "Некоторые файлы не добавлены. Лимит 5 МБ на файл.",
                        );
                      }
                    });
                    e.currentTarget.value = "";
                  }}
                />
              </Button>
              {draftFiles.length > 0 && (
                <List
                  dense
                  sx={{
                    p: 0,
                    mb: 1,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 2,
                  }}
                >
                  {draftFiles.map((file, idx) => (
                    <ListItem
                      key={`${file.name}-${idx}`}
                      secondaryAction={
                        <IconButton
                          onClick={() =>
                            setDraftFiles((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={file.name}
                        secondary={`${Math.max(1, Math.round(file.size / 1024))} КБ`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "flex-end" }}
              >
                <TextField
                  fullWidth
                  label="Ответ клиенту"
                  placeholder="Можно с эмодзи 😊"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  multiline
                  maxRows={4}
                  size="small"
                />
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <IconButton
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                    aria-label="Эмодзи"
                    size="small"
                  >
                    <InsertEmoticonIcon />
                  </IconButton>
                  <Button
                    variant="contained"
                    onClick={() => void sendReply()}
                    sx={{ minWidth: { xs: "100%", sm: 120 } }}
                  >
                    Отправить
                  </Button>
                </Stack>
              </Stack>
              <Popover
                open={Boolean(emojiAnchor)}
                anchorEl={emojiAnchor}
                onClose={() => setEmojiAnchor(null)}
                anchorOrigin={{ vertical: "top", horizontal: "left" }}
                transformOrigin={{ vertical: "bottom", horizontal: "left" }}
              >
                <Box sx={{ p: 1.2, maxWidth: 280 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Эмодзи
                  </Typography>
                  <Divider sx={{ my: 0.8 }} />
                  <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.6}>
                    {emojiList.map((emoji) => (
                      <Button
                        key={emoji}
                        size="small"
                        variant="text"
                        sx={{ minWidth: 40, minHeight: 40, fontSize: 20, lineHeight: 1 }}
                        onClick={() => setReply((prev) => `${prev}${emoji}`)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              </Popover>
            </Box>
          </>
        ) : (
          <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
            Выбери диалог слева.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
