"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  api,
  getApiErrorMessage,
  getCompanyId,
  getUserRoleFromToken,
} from "@/lib/api";

type FeedbackMessage = {
  id: string;
  text: string;
  topic?: string;
  senderRole: string;
  createdAt: string;
  companyId: string;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachments?: Array<{ name?: string; data?: string }>;
};

type AdminThread = {
  companyId: string;
  companyName: string;
  lastMessage: string;
  lastMessageAt?: string | null;
  hasUnreadForAdmin: boolean;
};

type TopicRow = {
  topic: string;
  lastMessage: string;
  lastMessageAt: string | null;
};

export default function FeedbackPage() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("Общий вопрос");
  const [newTopic, setNewTopic] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [text, setText] = useState("");
  const [draftFiles, setDraftFiles] = useState<
    Array<{ name: string; data: string; size: number }>
  >([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const role = getUserRoleFromToken();
  const companyId = getCompanyId();

  const activeCompanyId = useMemo(
    () => (role === "admin" ? selectedCompanyId : companyId),
    [role, selectedCompanyId, companyId],
  );
  const formatTs = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const load = async () => {
    if (role === "admin") {
      const { data } = await api.get("/feedback/admin/threads");
      setThreads(data);
      if (!selectedCompanyId && data[0]?.companyId) {
        setSelectedCompanyId(data[0].companyId);
      }
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    api
      .get("/feedback/topics", { params: { companyId: activeCompanyId } })
      .then((r) => {
        const rows = (r.data || []) as TopicRow[];
        setTopics(rows);
        if (!rows.some((x) => x.topic === selectedTopic)) {
          setSelectedTopic(rows[0]?.topic || "Общий вопрос");
        }
      })
      .catch(() =>
        setTopics([
          { topic: "Общий вопрос", lastMessage: "", lastMessageAt: null },
        ]),
      );
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;
    api
      .get("/feedback", {
        params: { companyId: activeCompanyId, topic: selectedTopic },
      })
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]));
  }, [activeCompanyId, selectedTopic, status]);

  const send = async () => {
    if (!activeCompanyId || (!text.trim() && draftFiles.length === 0)) return;
    setError("");
    try {
      const attachments = draftFiles.map((f) => ({
        name: f.name,
        data: f.data,
      }));
      if (role === "admin") {
        await api.post("/feedback/admin/reply", {
          companyId: activeCompanyId,
          text: text.trim(),
          topic: selectedTopic,
          attachments,
        });
      } else {
        await api.post("/feedback", {
          companyId: activeCompanyId,
          text: text.trim(),
          topic: selectedTopic,
          attachments,
        });
      }
      setText("");
      setDraftFiles([]);
      setStatus("ok");
      const r = await api.get("/feedback", {
        params: { companyId: activeCompanyId, topic: selectedTopic },
      });
      setMessages(r.data);
      if (role === "admin") await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось отправить сообщение."));
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Поддержка
      </Typography>
      <div className="dashboard-grid">
        {role === "admin" && (
          <Paper className="glass-card span-4" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
                Компании
              </Typography>
              {threads.map((t) => (
                <Box
                  key={t.companyId}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.08)",
                    bgcolor:
                      selectedCompanyId === t.companyId
                        ? "rgba(124,92,255,0.14)"
                        : "rgba(255,255,255,0.02)",
                  }}
                  onClick={() => setSelectedCompanyId(t.companyId)}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {t.companyName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {t.lastMessage || "Пока нет сообщений"}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.42)" }}
                  >
                    {formatTs(t.lastMessageAt || null)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
        <Paper
          className={`glass-card ${role === "admin" ? "span-8" : "span-12"}`}
          sx={{ p: 2.5 }}
        >
          <Stack spacing={1.25}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                label="Новая тема"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                size="small"
                sx={{ maxWidth: 360 }}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  const t = newTopic.trim();
                  if (!t) return;
                  if (!topics.some((x) => x.topic === t)) {
                    setTopics((prev) => [
                      { topic: t, lastMessage: "", lastMessageAt: null },
                      ...prev,
                    ]);
                  }
                  setSelectedTopic(t);
                  setNewTopic("");
                }}
              >
                Создать тему
              </Button>
            </Stack>
            <Stack direction="row" gap={0.8} useFlexGap flexWrap="wrap">
              {topics.map((t) => (
                <Button
                  key={t.topic}
                  size="small"
                  variant={t.topic === selectedTopic ? "contained" : "outlined"}
                  onClick={() => setSelectedTopic(t.topic)}
                >
                  {t.topic}
                </Button>
              ))}
            </Stack>
            {status && <Alert severity="success">Сообщение отправлено</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack
              spacing={1}
              sx={{ maxHeight: 360, overflowY: "auto", pr: 0.5 }}
            >
              {messages.map((m) => (
                <Box
                  key={m.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor:
                      m.senderRole === "admin"
                        ? "rgba(124,92,255,0.12)"
                        : "rgba(255,255,255,0.03)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {m.senderRole === "admin" ? "Поддержка" : "Компания"} •{" "}
                    {formatTs(m.createdAt)}
                  </Typography>
                  <Typography variant="body2">{m.text}</Typography>
                  <Stack spacing={0.4} sx={{ mt: 0.6 }}>
                    {(m.attachments || []).map((file, idx) => (
                      <Link
                        key={`${m.id}-${idx}`}
                        href={file?.data || "#"}
                        download={file?.name || "file"}
                        sx={{ display: "inline-block" }}
                      >
                        📎 {file?.name || "Скачать файл"}
                      </Link>
                    ))}
                    {!m.attachments?.length && m.attachmentData && (
                      <Link
                        href={m.attachmentData}
                        download={m.attachmentName || "file"}
                        sx={{ display: "inline-block" }}
                      >
                        📎 {m.attachmentName || "Скачать файл"}
                      </Link>
                    )}
                  </Stack>
                </Box>
              ))}
              {messages.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Сообщений пока нет.
                </Typography>
              )}
            </Stack>
            <TextField
              label={role === "admin" ? "Ответ компании" : "Ваш вопрос"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              multiline
              minRows={3}
            />
            <Button
              variant="outlined"
              component="label"
              sx={{ alignSelf: "flex-start" }}
            >
              Прикрепить файлы
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
                        if (file.size > 2 * 1024 * 1024) {
                          resolve(null);
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const res =
                            typeof reader.result === "string"
                              ? reader.result
                              : "";
                          resolve({
                            name: file.name,
                            data: res,
                            size: file.size,
                          });
                        };
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(file);
                      }),
                  );
                  Promise.all(readers).then((loaded) => {
                    const valid = loaded.filter(
                      (x): x is { name: string; data: string; size: number } =>
                        Boolean(x),
                    );
                    const incomingTotal = valid.reduce(
                      (sum, x) => sum + x.size,
                      0,
                    );
                    const currentTotal = draftFiles.reduce(
                      (sum, x) => sum + x.size,
                      0,
                    );
                    if (incomingTotal + currentTotal > 6 * 1024 * 1024) {
                      setError(
                        "Слишком большой общий размер вложений. Допустимо до 6 МБ за сообщение.",
                      );
                      return;
                    }
                    if (valid.length !== files.length) {
                      setError(
                        "Часть файлов не добавлена: размер одного файла должен быть до 2 МБ.",
                      );
                    }
                    setDraftFiles((prev) => [...prev, ...valid].slice(0, 10));
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
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 2,
                }}
              >
                {draftFiles.map((file, idx) => (
                  <ListItem
                    key={`${file.name}-${idx}`}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="Открепить файл"
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
            <Button
              variant="contained"
              onClick={() => void send()}
              sx={{ alignSelf: "flex-start" }}
            >
              Отправить
            </Button>
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
