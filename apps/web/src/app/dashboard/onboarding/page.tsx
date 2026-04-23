"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { api, getApiErrorMessage, getCompanyId, setCompanyId } from "@/lib/api";
import { useDashboard } from "@/components/dashboard/DashboardContext";

const fieldPresets = [
  "Имя",
  "Телефон",
  "Услуга",
  "Бюджет",
  "Сроки",
  "Регион",
  "Источник",
  "Комментарий",
];

const steps = ["Компания", "Поведение бота", "Сбор данных", "Готово"];

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const { company, refresh } = useDashboard();
  const pendingPlan = searchParams.get("plan");

  const [activeStep, setActiveStep] = useState(0);
  const [cid, setCid] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiAction, setAiAction] = useState<null | "welcome" | "refine">(null);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientDisambiguation, setClientDisambiguation] = useState("");

  const [communicationTone, setCommunicationTone] = useState("");
  const [botObjective, setBotObjective] = useState("");
  const [assistantInstruction, setAssistantInstruction] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");

  const [dataFields, setDataFields] = useState<string[]>([]);
  const [customField, setCustomField] = useState("");
  const [timezone, setTimezone] = useState("Europe/Moscow");

  const hydrate = useCallback(() => {
    const id = company?.id || getCompanyId() || "";
    setCid(id);
    if (company) {
      setName(company.name || "");
      setDescription(String(company.description || ""));
      setClientDisambiguation(String(company.clientDisambiguation || ""));
      setCommunicationTone(String(company.communicationTone || ""));
      setBotObjective(String(company.botObjective || ""));
      setAssistantInstruction(String(company.assistantInstruction || ""));
      setWelcomeMessage(String(company.welcomeMessage || ""));
      setDataFields(company.dataFields?.length ? company.dataFields : []);
      setTimezone(company.timezone || "Europe/Moscow");
    }
  }, [company]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const effectiveId = cid || company?.id || "";

  const toggleField = (label: string) => {
    const t = label.trim();
    if (!t) return;
    setDataFields((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const addCustomField = () => {
    const t = customField.trim();
    if (!t || dataFields.includes(t)) return;
    setDataFields((prev) => [...prev, t]);
    setCustomField("");
  };

  const saveStepCompany = async () => {
    setErr("");
    if (!name.trim()) {
      setErr("Укажите название компании.");
      return;
    }
    setBusy(true);
    try {
      if (!effectiveId) {
        const { data } = await api.post("/companies", {
          name: name.trim(),
          description: description.trim() || null,
          clientDisambiguation: clientDisambiguation.trim() || null,
          timezone: "Europe/Moscow",
          dataFields: [],
        });
        setCompanyId(data.id);
        setCid(data.id);
        await refresh({ silent: true });
      } else {
        await api.patch(`/companies/${effectiveId}`, {
          name: name.trim(),
          description: description.trim() || null,
          clientDisambiguation: clientDisambiguation.trim() || null,
        });
        await refresh({ silent: true });
      }
      setActiveStep(1);
    } catch (e) {
      setErr(getApiErrorMessage(e, "Не удалось сохранить шаг."));
    } finally {
      setBusy(false);
    }
  };

  const saveStepBot = async () => {
    const id = effectiveId || company?.id;
    if (!id) {
      setErr("Сначала сохраните шаг «Компания».");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.patch(`/companies/${id}`, {
        communicationTone: communicationTone.trim() || null,
        botObjective: botObjective.trim() || null,
        assistantInstruction: assistantInstruction.trim() || null,
        welcomeMessage: welcomeMessage.trim() || null,
      });
      await refresh({ silent: true });
      setActiveStep(2);
    } catch (e) {
      setErr(getApiErrorMessage(e, "Не удалось сохранить настройки бота."));
    } finally {
      setBusy(false);
    }
  };

  const saveStepData = async () => {
    const id = effectiveId || company?.id;
    if (!id) {
      setErr("Сначала сохраните шаг «Компания».");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.patch(`/companies/${id}`, {
        dataFields,
        timezone,
      });
      await refresh({ silent: true });
      setActiveStep(3);
    } catch (e) {
      setErr(getApiErrorMessage(e, "Не удалось сохранить поля."));
    } finally {
      setBusy(false);
    }
  };

  const genWelcome = async () => {
    const id = effectiveId || company?.id;
    if (!id) {
      setErr("Сначала сохраните шаг «Компания».");
      return;
    }
    setAiAction("welcome");
    setErr("");
    try {
      const { data } = await api.post(
        `/companies/${id}/assistant/generate-welcome`,
        {
          companyName: name,
          description,
          botObjective,
          communicationTone,
        },
      );
      if (data?.text) setWelcomeMessage(String(data.text));
      else setErr("Пустой ответ ИИ.");
    } catch (e) {
      setErr(
        getApiErrorMessage(
          e,
          "Не удалось сгенерировать текст. Введите приветствие вручную или попробуйте позже.",
        ),
      );
    } finally {
      setAiAction(null);
    }
  };

  const refineWelcome = async () => {
    const id = effectiveId || company?.id;
    if (!id || !welcomeMessage.trim()) {
      setErr("Сначала введите черновик приветствия.");
      return;
    }
    setAiAction("refine");
    setErr("");
    try {
      const { data } = await api.post(
        `/companies/${id}/assistant/refine-text`,
        {
          text: welcomeMessage,
          userHint:
            "Сделай приветствие естественнее, без канцелярита, одно короткое сообщение.",
          communicationTone,
          assistantInstruction,
        },
      );
      if (data?.text) setWelcomeMessage(String(data.text));
    } catch (e) {
      setErr(getApiErrorMessage(e, "Не удалось улучшить текст."));
    } finally {
      setAiAction(null);
    }
  };

  const finishHref = useMemo(() => {
    if (
      pendingPlan === "starter" ||
      pendingPlan === "growth" ||
      pendingPlan === "pro"
    ) {
      return `/dashboard/billing?plan=${pendingPlan}`;
    }
    return "/dashboard";
  }, [pendingPlan]);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Подключение
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.52)" }}>
        Компания → настройка бота → поля заявки. Всё можно позже изменить в
        разделе «Настройки».
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 1 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {err && <Alert severity="error">{err}</Alert>}
      {activeStep === 0 && (
        <Paper className="glass-card" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Компания и поиск в общем боте
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.48)" }}
            >
              Если вы пользуетесь общим Telegram-ботом, у клиентов с таким же
              названием компании должен быть способ отличить вас — короткая
              подпись показывается в списке и на кнопке.
            </Typography>
            <TextField
              label="Название компании"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Описание / ниша"
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              helperText="Чем занимаетесь и кому полезны — это подхватит ИИ в диалоге."
            />
            <TextField
              label="Как вас отличить в списке (для общего бота)"
              multiline
              minRows={2}
              value={clientDisambiguation}
              onChange={(e) => setClientDisambiguation(e.target.value)}
              placeholder="Например: выставка SkrepkaExpo, стенд C4 · Москва"
              helperText="Необязательно, если название уникальное. Для своего бота не используется."
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => void saveStepCompany()}
              >
                Далее
              </Button>
              <Button component={Link} href="/dashboard/settings" size="small">
                Расширенные настройки
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper className="glass-card" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Поведение бота
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.48)" }}
            >
              Приветствие после /start действует только у своего Telegram-бота.
              В общем боте клиент сначала выбирает компанию из списка.
            </Typography>
            <TextField
              label="Тон общения"
              value={communicationTone}
              onChange={(e) => setCommunicationTone(e.target.value)}
              placeholder="Например: дружелюбно, коротко, на «вы»"
              helperText="Как звучит ассистент в переписке."
            />
            <TextField
              label="Задача бота / оффер"
              multiline
              minRows={3}
              value={botObjective}
              onChange={(e) => setBotObjective(e.target.value)}
              helperText="Что бот должен сделать для бизнеса: запись, квалификация, передача менеджеру."
            />
            <TextField
              label="Инструкция для ИИ (дополнительно)"
              multiline
              minRows={3}
              value={assistantInstruction}
              onChange={(e) => setAssistantInstruction(e.target.value)}
              helperText="Табу, продуктовые ограничения, обязательные формулировки — всё, что нельзя нарушать в ответах."
            />
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.48)" }}
            >
              Приветствие
            </Typography>
            <TextField
              label="Первое сообщение после /start (свой бот)"
              multiline
              minRows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              helperText="Одно сообщение. Имя клиента спросит следующий шаг сценария."
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={busy || aiAction !== null}
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
                disabled={busy || aiAction !== null || !welcomeMessage.trim()}
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
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                disabled={busy || aiAction !== null}
                onClick={() => void saveStepBot()}
              >
                Далее
              </Button>
              <Button
                size="small"
                onClick={() => setActiveStep(0)}
                disabled={busy || aiAction !== null}
              >
                Назад
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {activeStep === 2 && (
        <Paper className="glass-card" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Что собирать по заявке
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.48)" }}
            >
              Отметьте готовые пункты или добавьте свой — название появится в
              карточке заявки для менеджера.
            </Typography>
            <Stack direction="row" gap={0.75} useFlexGap flexWrap="wrap">
              {fieldPresets.map((item) => {
                const active = dataFields.includes(item);
                return (
                  <Button
                    key={item}
                    size="small"
                    variant={active ? "contained" : "outlined"}
                    onClick={() => toggleField(item)}
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
                value={customField}
                onChange={(e) => setCustomField(e.target.value)}
                placeholder="Например: ИНН, сайт, количество сотрудников"
                fullWidth
              />
              <Button variant="outlined" onClick={addCustomField}>
                Добавить
              </Button>
            </Stack>
            <TextField
              label="Часовой пояс"
              size="small"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helperText="IANA, например Europe/Moscow. Можно уточнить позже в настройках."
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => void saveStepData()}
              >
                Завершить
              </Button>
              <Button
                size="small"
                onClick={() => setActiveStep(1)}
                disabled={busy}
              >
                Назад
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {activeStep === 3 && (
        <Paper className="glass-card" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Готово
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.55)" }}
            >
              Подключите Telegram-бота, проверьте заявки и при необходимости
              оплатите тариф.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" component={Link} href={finishHref}>
                {pendingPlan ? "К тарифам" : "На главную"}
              </Button>
              <Button
                component={Link}
                href="/dashboard/bots"
                variant="outlined"
              >
                Боты
              </Button>
              <Button
                component={Link}
                href="/dashboard/settings"
                variant="outlined"
              >
                Настройки
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
