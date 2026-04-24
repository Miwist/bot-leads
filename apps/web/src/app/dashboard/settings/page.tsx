"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Checkbox,
  MenuItem,
  IconButton,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Tooltip,
  FormControlLabel,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  api,
  clearSession,
  getApiErrorMessage,
  getCompanyId,
  setCompanyId,
} from "@/lib/api";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import type { LeadStatusRow } from "@/lib/ui";
import { getThemeMode, setThemeMode } from "@/components/MuiAppProvider";

const fieldOptions = [
  "Имя",
  "Телефон",
  "Услуга",
  "Бюджет",
  "Сроки",
  "Регион",
  "Источник",
  "Комментарий",
];
const CIS_TIMEZONES = [
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Europe/Samara",
  "Europe/Volgograd",
  "Europe/Saratov",
  "Europe/Astrakhan",
  "Europe/Ulyanovsk",
  "Europe/Minsk",
  "Europe/Chisinau",
  "Europe/Kyiv",
  "Europe/Simferopol",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Barnaul",
  "Asia/Tomsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Chita",
  "Asia/Yakutsk",
  "Asia/Khandyga",
  "Asia/Vladivostok",
  "Asia/Ust-Nera",
  "Asia/Magadan",
  "Asia/Sakhalin",
  "Asia/Srednekolymsk",
  "Asia/Kamchatka",
  "Asia/Anadyr",
  "Asia/Almaty",
  "Asia/Qostanay",
  "Asia/Aqtobe",
  "Asia/Aqtau",
  "Asia/Atyrau",
  "Asia/Oral",
  "Asia/Qyzylorda",
  "Asia/Tashkent",
  "Asia/Samarkand",
  "Asia/Baku",
  "Asia/Yerevan",
  "Asia/Tbilisi",
  "Asia/Bishkek",
  "Asia/Dushanbe",
  "Asia/Ashgabat",
];

function sortStatuses(rows: LeadStatusRow[]) {
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getUtcOffsetLabel(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const offset =
      parts.find((x) => x.type === "timeZoneName")?.value || "GMT+0";
    return offset.replace("GMT", "UTC");
  } catch {
    return "UTC+0";
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { company, refresh } = useDashboard();
  const [companyId, setCurrentCompanyId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    clientDisambiguation: "",
    botObjective: "",
    communicationTone: "",
    welcomeMessage: "",
    assistantInstruction: "",
    createLeadFromFirstMessage: false,
    timezone: "Europe/Moscow",
    dataFields: [] as string[],
    botMaterials: [] as Array<{
      id: string;
      title: string;
      fileName: string;
      mime: string;
      kind: string;
      url?: string;
      data?: string;
      groupId?: string | null;
    }>,
    leadStatuses: [] as LeadStatusRow[],
  });
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [customFieldInput, setCustomFieldInput] = useState("");
  const [aiAction, setAiAction] = useState<null | "welcome" | "refine">(null);
  const aiBusy = aiAction !== null;
  const [profileTelegram, setProfileTelegram] = useState("");
  const [themeMode, setThemeModeLocal] = useState<"light" | "dark" | "system">(
    "light",
  );
  const [profileSaved, setProfileSaved] = useState("");
  const [profileError, setProfileError] = useState("");
  const pendingPlan = searchParams.get("plan");
  const timezoneOptions = useMemo(
    () =>
      Array.from(new Set(CIS_TIMEZONES)).map((tz) => ({
        value: tz,
        label: `${tz} (${getUtcOffsetLabel(tz)})`,
      })),
    [],
  );

  useEffect(() => {
    void api
      .get("/auth/me")
      .then((r) => {
        setProfileTelegram(String(r.data?.telegramChatId || ""));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    setThemeModeLocal(getThemeMode());
  }, []);

  useEffect(() => {
    const stored = getCompanyId();
    if (company?.id) {
      setCurrentCompanyId(company.id);
      setForm({
        name: company.name || "",
        description: (company.description as string) || "",
        clientDisambiguation: String(company.clientDisambiguation || ""),
        botObjective: (company.botObjective as string) || "",
        communicationTone: String(company.communicationTone || ""),
        welcomeMessage: String(company.welcomeMessage || ""),
        assistantInstruction: String(company.assistantInstruction || ""),
        createLeadFromFirstMessage: Boolean(company.createLeadFromFirstMessage),
        timezone: (company.timezone as string) || "Europe/Moscow",
        dataFields: company.dataFields || [],
        botMaterials: company.botMaterials || [],
        leadStatuses: sortStatuses(
          (company.leadStatuses as LeadStatusRow[]) || [],
        ),
      });
      return;
    }
    if (!stored) return;
    setCurrentCompanyId(stored);
    api.get(`/companies/${stored}`).then((r) => {
      const c = r.data;
      setForm({
        name: c?.name || "",
        description: c?.description || "",
        clientDisambiguation: String(c?.clientDisambiguation || ""),
        botObjective: c?.botObjective || "",
        communicationTone: String(c?.communicationTone || ""),
        welcomeMessage: String(c?.welcomeMessage || ""),
        assistantInstruction: String(c?.assistantInstruction || ""),
        createLeadFromFirstMessage: Boolean(c?.createLeadFromFirstMessage),
        timezone: c?.timezone || "Europe/Moscow",
        dataFields: c?.dataFields || [],
        botMaterials: c?.botMaterials || [],
        leadStatuses: sortStatuses(c?.leadStatuses || []),
      });
    });
  }, [company]);

  const title = useMemo(
    () => (companyId ? "Настройки" : "Создать компанию"),
    [companyId],
  );

  const addCustomDataField = () => {
    const t = customFieldInput.trim();
    if (!t || form.dataFields.includes(t)) return;
    setForm((f) => ({ ...f, dataFields: [...f.dataFields, t] }));
    setCustomFieldInput("");
  };

  const genWelcome = async () => {
    if (!companyId) {
      setError("Сохраните компанию, затем сгенерируйте приветствие.");
      return;
    }
    setAiAction("welcome");
    setError("");
    try {
      const { data } = await api.post(
        `/companies/${companyId}/assistant/generate-welcome`,
        {
          companyName: form.name,
          description: form.description,
          botObjective: form.botObjective,
          communicationTone: form.communicationTone,
        },
      );
      if (data?.text) {
        setForm((f) => ({ ...f, welcomeMessage: String(data.text) }));
      }
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Не удалось сгенерировать. Проверьте настройку ИИ на сервере или введите текст вручную.",
        ),
      );
    } finally {
      setAiAction(null);
    }
  };

  const refineWelcome = async () => {
    if (!companyId || !form.welcomeMessage.trim()) {
      setError("Нужна сохранённая компания и текст приветствия.");
      return;
    }
    setAiAction("refine");
    setError("");
    try {
      const { data } = await api.post(
        `/companies/${companyId}/assistant/refine-text`,
        {
          text: form.welcomeMessage,
          userHint: "Сделай приветствие естественнее, короче, без канцелярита.",
          communicationTone: form.communicationTone,
          assistantInstruction: form.assistantInstruction,
        },
      );
      if (data?.text) {
        setForm((f) => ({ ...f, welcomeMessage: String(data.text) }));
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось улучшить текст."));
    } finally {
      setAiAction(null);
    }
  };

  const save = async () => {
    setError("");
    if (!companyId) {
      try {
        const { data } = await api.post("/companies", {
          name: form.name,
          description: form.description,
          clientDisambiguation: form.clientDisambiguation.trim() || null,
          botObjective: form.botObjective,
          communicationTone: form.communicationTone.trim() || null,
          welcomeMessage: form.welcomeMessage.trim() || null,
          assistantInstruction: form.assistantInstruction.trim() || null,
          createLeadFromFirstMessage: form.createLeadFromFirstMessage,
          timezone: form.timezone,
          dataFields: form.dataFields,
          botMaterials: form.botMaterials,
          leadStatuses: form.leadStatuses,
        });
        setCompanyId(data.id);
        setCurrentCompanyId(data.id);
        setForm((prev) => ({
          ...prev,
          botMaterials: data?.botMaterials || [],
          leadStatuses: sortStatuses(data?.leadStatuses || prev.leadStatuses),
        }));
        setSaved("Компания создана");
        await refresh({ silent: true });
        if (pendingPlan) {
          router.push(`/dashboard/billing?plan=${pendingPlan}`);
        }
      } catch {
        setError(
          "Не удалось сохранить настройки. Проверьте файлы и попробуйте снова.",
        );
      }
      return;
    }
    try {
      const { data } = await api.patch(`/companies/${companyId}`, {
        name: form.name,
        description: form.description,
        clientDisambiguation: form.clientDisambiguation.trim() || null,
        botObjective: form.botObjective,
        communicationTone: form.communicationTone.trim() || null,
        welcomeMessage: form.welcomeMessage.trim() || null,
        assistantInstruction: form.assistantInstruction.trim() || null,
        createLeadFromFirstMessage: form.createLeadFromFirstMessage,
        timezone: form.timezone,
        dataFields: form.dataFields,
        botMaterials: form.botMaterials,
        leadStatuses: form.leadStatuses.map((s, i) => ({
          code: s.code,
          label: s.label,
          order: i,
          system: s.system,
        })),
      });
      setForm((prev) => ({
        ...prev,
        botMaterials: data?.botMaterials || [],
        leadStatuses: sortStatuses(data?.leadStatuses || prev.leadStatuses),
      }));
      setSaved("Сохранено");
      await refresh({ silent: true });
      if (pendingPlan) {
        router.push(`/dashboard/billing?plan=${pendingPlan}`);
      }
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        try {
          const { data } = await api.post("/companies", {
            name: form.name,
            description: form.description,
            clientDisambiguation: form.clientDisambiguation.trim() || null,
            botObjective: form.botObjective,
            communicationTone: form.communicationTone.trim() || null,
            welcomeMessage: form.welcomeMessage.trim() || null,
            assistantInstruction: form.assistantInstruction.trim() || null,
            createLeadFromFirstMessage: form.createLeadFromFirstMessage,
            timezone: form.timezone,
            dataFields: form.dataFields,
            botMaterials: form.botMaterials,
            leadStatuses: form.leadStatuses,
          });
          setCompanyId(data.id);
          setCurrentCompanyId(data.id);
          setForm((prev) => ({
            ...prev,
            botMaterials: data?.botMaterials || [],
            leadStatuses: sortStatuses(data?.leadStatuses || prev.leadStatuses),
          }));
          setSaved("Компания создана заново и сохранена.");
          await refresh({ silent: true });
          return;
        } catch (e2) {
          setError(getApiErrorMessage(e2, "Не удалось сохранить настройки."));
          return;
        }
      }
      setError(getApiErrorMessage(e, "Не удалось сохранить настройки."));
    }
  };

  const saveProfileTelegram = async () => {
    setProfileError("");
    setProfileSaved("");
    try {
      await api.patch("/auth/me", { telegramChatId: profileTelegram });
      setProfileSaved("Telegram ID сохранён");
    } catch (e: unknown) {
      setProfileError(
        getApiErrorMessage(e, "Не удалось сохранить Telegram ID."),
      );
    }
  };

  const resetStatuses = () => {
    setForm((f) => ({ ...f, leadStatuses: [] }));
  };

  const addStatus = () => {
    const code = `stage_${Math.random().toString(36).slice(2, 8)}`;
    setForm((f) => ({
      ...f,
      leadStatuses: [
        ...f.leadStatuses,
        { code, label: "Новый этап", order: f.leadStatuses.length },
      ],
    }));
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.75}>
        <Typography variant="h6" sx={{ fontWeight: 650 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Пошаговый ввод — в разделе{" "}
          <Link href="/dashboard/onboarding" style={{ color: "inherit" }}>
            «Подключение»
          </Link>
          .
        </Typography>
      </Stack>
      <div className="dashboard-grid">
        <Paper className="glass-card span-8" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {saved && <Alert severity="success">{saved}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack spacing={1.25} sx={{ py: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary" }}
              >
                Ваш Telegram
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
              >
                Напишите в вашем Telegram-боте команду{" "}
                <strong>/getMyInfo</strong> и скопируйте{" "}
                <strong>chat_id</strong> сюда (это не @username).
              </Typography>
              {profileSaved && <Alert severity="success">{profileSaved}</Alert>}
              {profileError && <Alert severity="error">{profileError}</Alert>}
              <TextField
                label="Telegram ID"
                size="small"
                value={profileTelegram}
                onChange={(e) => setProfileTelegram(e.target.value)}
                helperText="Очистите поле и нажмите «Сохранить Telegram», чтобы сбросить."
                sx={{ maxWidth: 440 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => void saveProfileTelegram()}
                sx={{ alignSelf: "flex-start" }}
              >
                Сохранить Telegram
              </Button>
            </Stack>
            <TextField
              label="Название компании"
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
            />
            <TextField
              label="Как отличить вас в общем Telegram-боте"
              multiline
              minRows={2}
              value={form.clientDisambiguation}
              onChange={(e) =>
                setForm((x) => ({
                  ...x,
                  clientDisambiguation: e.target.value,
                }))
              }
              placeholder="Например: стенд D7, выставка Nails · СПб"
              helperText="Если название не уникальное, клиент увидит эту подпись в списке и на кнопке. Для своего бота не используется."
            />
            <TextField
              label="Описание"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) =>
                setForm((x) => ({ ...x, description: e.target.value }))
              }
            />
            <TextField
              label="Задача бота"
              multiline
              minRows={4}
              value={form.botObjective}
              onChange={(e) =>
                setForm((x) => ({ ...x, botObjective: e.target.value }))
              }
              helperText="Что бот должен делать для бизнеса: запись, квалификация, передача менеджеру."
            />
            <TextField
              label="Тон общения"
              value={form.communicationTone}
              onChange={(e) =>
                setForm((x) => ({ ...x, communicationTone: e.target.value }))
              }
              placeholder="Например: тепло, на «вы», без жаргона"
              helperText="Влияет на реплики ИИ в диалоге (если ИИ включён на сервере)."
            />
            <TextField
              label="Инструкция для ИИ"
              multiline
              minRows={3}
              value={form.assistantInstruction}
              onChange={(e) =>
                setForm((x) => ({
                  ...x,
                  assistantInstruction: e.target.value,
                }))
              }
              helperText="Дополнительные правила: табу, продукт, что нельзя обещать. Не храните пароли и секреты."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.createLeadFromFirstMessage}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      createLeadFromFirstMessage: e.target.checked,
                    }))
                  }
                />
              }
              label="Создавать заявку с первого сообщения клиента (после согласия)"
            />
            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              Приветствие после /start — только для своего Telegram-бота. В
              общем боте клиент сначала выбирает компанию из списка.
            </Typography>
            <TextField
              label="Приветствие (свой бот)"
              multiline
              minRows={3}
              value={form.welcomeMessage}
              onChange={(e) =>
                setForm((x) => ({ ...x, welcomeMessage: e.target.value }))
              }
              helperText="Одно сообщение. Имя клиента спросит следующий шаг сценария."
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={aiBusy || !companyId}
                onClick={() => void genWelcome()}
                startIcon={
                  aiAction === "welcome" ? (
                    <CircularProgress color="inherit" size={14} thickness={5} />
                  ) : undefined
                }
                sx={{ minWidth: { xs: "100%", sm: 200 } }}
              >
                Сгенерировать (ИИ)
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={aiBusy || !companyId || !form.welcomeMessage.trim()}
                onClick={() => void refineWelcome()}
                startIcon={
                  aiAction === "refine" ? (
                    <CircularProgress color="inherit" size={14} thickness={5} />
                  ) : undefined
                }
                sx={{ minWidth: { xs: "100%", sm: 200 } }}
              >
                Улучшить текст (ИИ)
              </Button>
            </Stack>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary" }}
              >
                Тема интерфейса
              </Typography>
              <Select
                size="small"
                value={themeMode}
                onChange={(e) => {
                  const value = String(e.target.value) as
                    | "light"
                    | "dark"
                    | "system";
                  setThemeModeLocal(value);
                  setThemeMode(value);
                }}
              >
                <MenuItem value="light">Светлая (основная)</MenuItem>
                <MenuItem value="dark">Тёмная</MenuItem>
                <MenuItem value="system">Как в системе</MenuItem>
              </Select>
            </Stack>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary" }}
              >
                Часовой пояс
              </Typography>
              <Select
                size="small"
                value={
                  timezoneOptions.some((x) => x.value === form.timezone)
                    ? form.timezone
                    : "Europe/Moscow"
                }
                onChange={(e) => {
                  setForm((x) => ({ ...x, timezone: String(e.target.value) }));
                }}
              >
                {timezoneOptions.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary" }}
              >
                Поля для сбора у клиента
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
              >
                Отметьте шаблоны или добавьте своё поле — подписи попадут в
                карточку заявки.
              </Typography>
              <Stack direction="row" gap={0.75} useFlexGap flexWrap="wrap">
                {fieldOptions.map((item) => {
                  const active = form.dataFields.includes(item);
                  return (
                    <Button
                      key={item}
                      size="small"
                      variant={active ? "contained" : "outlined"}
                      onClick={() =>
                        setForm((x) => ({
                          ...x,
                          dataFields: active
                            ? x.dataFields.filter((f) => f !== item)
                            : [...x.dataFields, item],
                        }))
                      }
                    >
                      {item}
                    </Button>
                  );
                })}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="Своё поле"
                  size="small"
                  value={customFieldInput}
                  onChange={(e) => setCustomFieldInput(e.target.value)}
                  placeholder="Например: сайт, количество сотрудников"
                  fullWidth
                />
                <Button variant="outlined" onClick={addCustomDataField}>
                  Добавить
                </Button>
              </Stack>
            </Stack>
            <Stack spacing={1.2}>
              <Typography
                variant="subtitle2"
                sx={{ color: "text.secondary" }}
              >
                Материалы для бота (каталог/меню/видео и т.д.)
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
              >
                Бот сможет предложить клиенту материалы и отправить их после
                согласия.
              </Typography>
              <Button
                variant="outlined"
                component="label"
                sx={{ alignSelf: "flex-start" }}
              >
                Добавить материалы
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
                          id: string;
                          title: string;
                          fileName: string;
                          mime: string;
                          kind: string;
                          data: string;
                          groupId: string | null;
                        } | null>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const data =
                              typeof reader.result === "string"
                                ? reader.result
                                : "";
                            resolve({
                              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                              title: file.name.replace(/\.[^.]+$/, ""),
                              fileName: file.name,
                              mime: file.type || "application/octet-stream",
                              kind: "auto",
                              data,
                              groupId: null,
                            });
                          };
                          reader.onerror = () => resolve(null);
                          reader.readAsDataURL(file);
                        }),
                    );
                    Promise.all(readers).then((loaded) => {
                      const valid = loaded.filter(
                        (x): x is NonNullable<typeof x> => Boolean(x),
                      );
                      setForm((f) => ({
                        ...f,
                        botMaterials: [...f.botMaterials, ...valid].slice(
                          0,
                          50,
                        ),
                      }));
                    });
                    e.currentTarget.value = "";
                  }}
                />
              </Button>
              {form.botMaterials.map((item, idx) => (
                <Stack
                  key={item.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ sm: "center" }}
                >
                  <TextField
                    label="Название"
                    size="small"
                    value={item.title}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        botMaterials: f.botMaterials.map((x) =>
                          x.id === item.id
                            ? { ...x, title: e.target.value }
                            : x,
                        ),
                      }))
                    }
                    sx={{ flex: 1 }}
                  />
                  <Select
                    size="small"
                    value={item.kind || "auto"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        botMaterials: f.botMaterials.map((x) =>
                          x.id === item.id
                            ? { ...x, kind: String(e.target.value) }
                            : x,
                        ),
                      }))
                    }
                    sx={{ width: { xs: "100%", sm: 170 } }}
                  >
                    <MenuItem value="auto">Автоопределение</MenuItem>
                    <MenuItem value="photo">Фото</MenuItem>
                    <MenuItem value="video">Видео</MenuItem>
                    <MenuItem value="document">Файл</MenuItem>
                    <MenuItem value="voice">Голосовое</MenuItem>
                    <MenuItem value="video_note">Кружочек</MenuItem>
                    <MenuItem value="group">Группа</MenuItem>
                  </Select>
                  <TextField
                    label="Набор материалов (опционально)"
                    size="small"
                    value={item.groupId || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        botMaterials: f.botMaterials.map((x) =>
                          x.id === item.id
                            ? { ...x, groupId: e.target.value.trim() || null }
                            : x,
                        ),
                      }))
                    }
                    sx={{ width: { xs: "100%", sm: 170 } }}
                  />
                  <Tooltip title="Если указать одинаковое название у нескольких файлов, бот отправит их одной подборкой.">
                    <InfoOutlinedIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (companyId && item.url) {
                        await api.delete(
                          `/companies/${companyId}/bot-materials/${item.id}`,
                        );
                      }
                      setForm((f) => ({
                        ...f,
                        botMaterials: f.botMaterials.filter(
                          (_, i) => i !== idx,
                        ),
                      }));
                    }}
                    aria-label="Удалить материал"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>

            <Stack spacing={1.25}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary" }}
                >
                  Статусы заявок
                </Typography>
                <Stack direction="row" spacing={0.75}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={resetStatuses}
                  >
                    Сбросить к умолчанию
                  </Button>
                  <Button size="small" variant="contained" onClick={addStatus}>
                    Добавить
                  </Button>
                </Stack>
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
              >
                «Новый» и «В работе» нельзя удалить — они нужны для автоматики.
                Код статуса меняйте только если знаете, зачем.
              </Typography>
              {sortStatuses(form.leadStatuses).map((row, idx) => (
                <Stack
                  key={row.code + idx}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ sm: "center" }}
                >
                  <TextField
                    label="Подпись"
                    size="small"
                    value={row.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({
                        ...f,
                        leadStatuses: f.leadStatuses.map((s) =>
                          s.code === row.code ? { ...s, label: v } : s,
                        ),
                      }));
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Код"
                    size="small"
                    value={row.code}
                    disabled={Boolean(row.system)}
                    onChange={(e) => {
                      const v = e.target.value
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9_]+/g, "_");
                      setForm((f) => ({
                        ...f,
                        leadStatuses: f.leadStatuses.map((s) =>
                          s.code === row.code ? { ...s, code: v } : s,
                        ),
                      }));
                    }}
                    sx={{ width: { xs: "100%", sm: 160 } }}
                  />
                  <IconButton
                    size="small"
                    disabled={Boolean(row.system)}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        leadStatuses: f.leadStatuses.filter(
                          (s) => s.code !== row.code,
                        ),
                      }))
                    }
                    aria-label="Удалить статус"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>

            <Button
              variant="contained"
              size="medium"
              onClick={() => void save()}
              sx={{ alignSelf: "flex-start" }}
            >
              Сохранить
            </Button>
          </Stack>
        </Paper>

        <Paper className="glass-card span-4" sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Что заполнить
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              1) Название, описание и подпись для общего бота (если названия
              похожи).
              <br />
              2) Тон, задача бота, инструкция для ИИ и приветствие для своего
              бота.
              <br />
              3) Часовой пояс и поля, которые менеджер видит в заявке.
              <br />
              4) Материалы для отправки клиенту по запросу.
              <br />
              5) Статусы заявок под ваш процесс.
            </Typography>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
            >
              Выйти
            </Button>
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
