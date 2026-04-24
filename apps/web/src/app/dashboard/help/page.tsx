"use client";

import Link from "next/link";
import { Button, Paper, Stack, Typography } from "@mui/material";

const sharedBotSteps = [
  "Откройте «Подключение» и выберите режим «Общий бот».",
  "Укажите название компании и короткое описание простыми словами.",
  "Заполните подпись «Как отличить вас» — это помогает клиенту выбрать вас в списке.",
  "На странице «Боты» скопируйте ссылку и отправьте её клиентам.",
  "Смотрите новые обращения в разделе «Заявки» и меняйте статусы по ходу работы.",
];

const customBotSteps = [
  "В Telegram найдите @BotFather и нажмите /newbot.",
  "Задайте имя бота, затем username (должен заканчиваться на bot).",
  "Скопируйте токен, который пришлёт BotFather.",
  "В кабинете откройте «Боты» и вставьте токен в блоке подключения.",
  "Проверьте статус «Активен», затем скопируйте ссылку на бота для клиентов.",
];

const firstWeekChecklist = [
  "Проверьте, что заявка создаётся с телефона, имени и задачей клиента.",
  "Добавьте 1-2 менеджеров, чтобы обращения не зависали на одном человеке.",
  "Согласуйте 3-4 статуса заявок и используйте их одинаково всей командой.",
  "Обновите приветствие бота под ваш стиль, чтобы снизить лишние вопросы клиентов.",
  "Открывайте раздел «Диалоги» минимум 2 раза в день, пока команда привыкает.",
];

export default function DashboardHelpPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 650 }}>
        Инструкция для быстрого старта
      </Typography>

      <div className="dashboard-grid">
        <Paper className="glass-card span-6" sx={{ p: 2.5 }}>
          <Stack spacing={1.2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Вариант 1: Общий бот
            </Typography>
            {sharedBotSteps.map((step, idx) => (
              <Typography key={step} variant="body2" sx={{ color: "text.secondary" }}>
                {idx + 1}. {step}
              </Typography>
            ))}
          </Stack>
        </Paper>

        <Paper className="glass-card span-6" sx={{ p: 2.5 }}>
          <Stack spacing={1.2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Вариант 2: Свой бот
            </Typography>
            {customBotSteps.map((step, idx) => (
              <Typography key={step} variant="body2" sx={{ color: "text.secondary" }}>
                {idx + 1}. {step}
              </Typography>
            ))}
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Никому не отправляйте токен бота в чатах и не публикуйте его в
              открытом доступе.
            </Typography>
          </Stack>
        </Paper>

        <Paper className="glass-card span-12" sx={{ p: 2.5 }}>
          <Stack spacing={1.2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              Чеклист на первую неделю
            </Typography>
            {firstWeekChecklist.map((item) => (
              <Typography key={item} variant="body2" sx={{ color: "text.secondary" }}>
                • {item}
              </Typography>
            ))}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 0.5 }}>
              <Button component={Link} href="/dashboard/onboarding" variant="contained">
                Открыть подключение
              </Button>
              <Button component={Link} href="/dashboard/settings" variant="outlined">
                Открыть настройки
              </Button>
              <Button component={Link} href="/dashboard/bots" variant="outlined">
                Открыть боты
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
