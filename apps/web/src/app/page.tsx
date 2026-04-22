"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import BrandLogo from "@/components/BrandLogo";
import { getToken } from "@/lib/api";
import {
  formatRubles,
  formatRublesWithDecimals,
  getOveragePrice,
  PLAN_LIST,
} from "@/lib/ui";

const featureCards = [
  {
    title: "Быстрый первый контакт",
    text: "Клиент получает ответ сразу, без ожидания менеджера, а заявка не теряется в пиковые часы.",
  },
  {
    title: "Распределение без хаоса",
    text: "Заявки автоматически уходят в работу менеджерам с учетом очереди и текущей загрузки.",
  },
  {
    title: "Прозрачный контроль",
    text: "Руководитель видит статусы, диалоги, лимиты и качество обработки в одном окне.",
  },
];
const metrics = [
  { value: "< 15 сек", label: "до первого ответа клиенту" },
  { value: "100 / 300 / 1000", label: "заявок в месяц по тарифам" },
  { value: "1 кабинет", label: "боты, менеджеры, заявки и диалоги" },
];

export default function Home() {
  const router = useRouter();
  const handlePlanSelect = (planCode: string) => {
    const token = getToken();
    if (token) {
      router.push(`/dashboard/billing?plan=${planCode}`);
      return;
    }
    router.push(`/login?plan=${planCode}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper className="glass-card" sx={{ p: { xs: 3, md: 3.5 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <BrandLogo />
          <Stack direction="row" spacing={1.2} flexWrap="wrap">
            <Button component={Link} href="/login" color="inherit">
              Войти
            </Button>
            <Button
              component={Link}
              href="/register"
              variant="contained"
              sx={{
                background:
                  "linear-gradient(135deg, #7c5cff 0%, #5b8cff 50%, #00c2ff 100%)",
              }}
            >
              Запустить кабинет
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <div className="hero-grid">
        <Paper className="glass-card" sx={{ p: { xs: 3.5, md: 5.5 } }}>
          <Stack spacing={3.2}>
            <Chip
              label="AI-продавец для компаний"
              sx={{
                alignSelf: "flex-start",
                color: "#c9d2ff",
                background: "rgba(124, 92, 255, 0.12)",
                border: "1px solid rgba(124, 92, 255, 0.25)",
              }}
            />
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: 40, md: 64 }, lineHeight: 1.05 }}
            >
              <span className="gradient-text">AI Seller</span>
              <br />
              помогает компаниям быстрее закрывать заявки.
            </Typography>
            <Typography
              sx={{
                fontSize: 18,
                color: "rgba(255,255,255,0.72)",
                maxWidth: 760,
                lineHeight: 1.6,
              }}
            >
              Единый инструмент для входящих заявок в Telegram: бот задает
              правильные вопросы, собирает контакты, направляет заявку в работу
              и помогает команде не терять продажи.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                component={Link}
                href="/register"
                size="large"
                variant="contained"
                sx={{
                  px: 3,
                  py: 1.4,
                  background:
                    "linear-gradient(135deg, #7c5cff 0%, #5b8cff 50%, #00c2ff 100%)",
                }}
              >
                Создать кабинет
              </Button>
              <Button
                component={Link}
                href="/login"
                size="large"
                color="inherit"
              >
                Войти в кабинет
              </Button>
            </Stack>
          </Stack>
        </Paper>
        <Paper className="glass-card" sx={{ p: 3.5 }}>
          <Stack spacing={2.2}>
            <Typography variant="h5">Что вы получаете</Typography>
            <Stack spacing={1.2}>
              {featureCards.map((card) => (
                <Box
                  key={card.title}
                  sx={{
                    p: 2.4,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Typography sx={{ fontWeight: 600, mb: 0.8 }}>
                    {card.title}
                  </Typography>
                  <Typography
                    sx={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}
                  >
                    {card.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </div>
      <Box sx={{ py: 6 }}>
        <div className="section-grid">
          {metrics.map((metric) => (
            <Paper key={metric.label} className="glass-card" sx={{ p: 3.2 }}>
              <Typography sx={{ fontSize: 34, fontWeight: 700, mb: 1 }}>
                {metric.value}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
                {metric.label}
              </Typography>
            </Paper>
          ))}
        </div>
      </Box>
      <div className="two-grid">
        <Paper className="glass-card" sx={{ p: 3.6 }}>
          <Typography variant="h4" sx={{ mb: 1.5 }}>
            Как это работает
          </Typography>
          <Stack spacing={2}>
            {[
              "Клиент обращается в Telegram-бота по вашей ссылке.",
              "Бот уточняет контакты и задачу клиента по вашему сценарию.",
              "Заявка автоматически попадает в кабинет и назначается менеджеру.",
              "Руководитель видит статусы обработки и прогресс команды.",
            ].map((item, index) => (
              <Box
                key={item}
                sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c5cff, #00c2ff)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    mt: 0.2,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
                  {item}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
        <Paper className="glass-card" sx={{ p: 3.6 }}>
          <Typography variant="h4" sx={{ mb: 1.5 }}>
            Подходит командам, которым важно
          </Typography>
          <Stack spacing={1.4}>
            {[
              "стабильный поток заявок без потерь на первом контакте",
              "единый стандарт обработки заявок для всех менеджеров",
              "прозрачность по статусам и качеству обработки заявок",
              "понятную экономику тарифа и загрузки команды",
            ].map((item) => (
              <Typography key={item} sx={{ color: "rgba(255,255,255,0.72)" }}>
                • {item}
              </Typography>
            ))}
          </Stack>
        </Paper>
      </div>
      <Box sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Тарифы
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.62)", mb: 3.5 }}>
          Выберите подходящий масштаб и оплачивайте удобный период в личном
          кабинете.
        </Typography>
        <div className="section-grid">
          {PLAN_LIST.map((plan, index) => (
            <Paper
              key={plan.code}
              className="glass-card"
              sx={{
                p: 3.2,
                position: "relative",
                overflow: "hidden",
                borderColor:
                  index === 1
                    ? "rgba(124, 92, 255, 0.4)"
                    : "rgba(255,255,255,0.08)",
              }}
            >
              {index === 1 && (
                <Chip
                  label="Популярный"
                  sx={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    background: "rgba(124, 92, 255, 0.14)",
                    color: "#d6dbff",
                  }}
                />
              )}
              <Typography variant="h5" sx={{ mb: 1 }}>
                {plan.name}
              </Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 700, mb: 1 }}>
                {formatRubles(plan.price)} ₽
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.62)", mb: 0.5 }}>
                {plan.monthlyLeadLimit} заявок в месяц
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.62)", mb: 3 }}>
                Сверх лимита: {formatRublesWithDecimals(getOveragePrice(plan))}{" "}
                ₽ за заявку
              </Typography>
              <Button
                fullWidth
                variant={index === 1 ? "contained" : "outlined"}
                onClick={() => handlePlanSelect(plan.code)}
              >
                Выбрать тариф
              </Button>
            </Paper>
          ))}
        </div>
      </Box>
    </Container>
  );
}
