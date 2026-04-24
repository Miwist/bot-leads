"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
    title: "Единый сценарий первого контакта",
    text: "Бот задает базовые вопросы и собирает контактные данные в одном формате для всех обращений.",
  },
  {
    title: "Автоматическое назначение",
    text: "Новые заявки распределяются между менеджерами по очереди, чтобы снизить ручную нагрузку.",
  },
  {
    title: "Прозрачная работа в кабинете",
    text: "В карточке доступны статус, история диалога и ответственный менеджер.",
  },
];
const metrics = [
  { value: "Telegram", label: "основной канал обработки входящих" },
  {
    value: "100 / 300 / 1000+",
    label: "лимит новых заявок в месяц по тарифам",
  },
  { value: "1 кабинет", label: "бот, менеджеры, заявки и диалоги" },
];
const faqItems = [
  {
    q: "Почему выбрать сервис, а не разрабатывать своего бота?",
    a: "Собственная разработка Telegram-бота обычно требует бюджета на создание и регулярные расходы на поддержку: инфраструктура, обновления, исправления и контроль стабильности. Ventaria дает готовое решение с кабинетом, статусами и сценариями работы с заявками. Обработку можно выстроить гибко: сначала ИИ, при необходимости — подключение менеджера в диалог.",
  },
  {
    q: "Сложно ли запустить сервис?",
    a: "Базовая настройка обычно занимает 10-15 минут: создание компании, подключение бота и заполнение сценария.",
  },
  {
    q: "Нужен ли собственный Telegram-бот?",
    a: "Можно использовать общий бот или подключить собственный токен в личном кабинете.",
  },
  {
    q: "Куда попадают обращения клиентов?",
    a: "В раздел заявок: с контактами, статусом, ответственным менеджером и историей диалога.",
  },
  {
    q: "Может ли бот отправлять материалы клиенту?",
    a: "Да, поддерживается отправка фото, видео и файлов, добавленных в настройках компании.",
  },
  {
    q: "Что происходит при исчерпании лимита тарифа?",
    a: "Дальнейшие заявки учитываются как сверхлимитные в соответствии с тарифом, выбранным в кабинете.",
  },
];

export default function Home() {
  const router = useRouter();
  const isAuthed = Boolean(getToken());
  const handlePlanSelect = (planCode: string) => {
    if (isAuthed) {
      router.push(`/dashboard/billing?plan=${planCode}`);
      return;
    }
    router.push(`/login?plan=${planCode}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Script
        id="ld-json-faq"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
              },
            })),
          }),
        }}
      />
      <Paper className="glass-card" sx={{ p: { xs: 3, md: 3.5 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <BrandLogo />
          <Stack direction="row" spacing={1.2} flexWrap="wrap">
            {!isAuthed && (
              <Button component={Link} href="/login" color="inherit">
                Войти
              </Button>
            )}
            <Button
              component={Link}
              href={isAuthed ? "/dashboard" : "/register"}
              variant="contained"
              sx={{
                background:
                  "linear-gradient(135deg, #7c5cff 0%, #5b8cff 50%, #00c2ff 100%)",
              }}
            >
              {isAuthed ? "Перейти в кабинет" : "Создать аккаунт"}
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
                color: "primary.main",
                background: "action.selected",
                border: "1px solid",
                borderColor: "primary.light",
              }}
            />
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: 40, md: 64 }, lineHeight: 1.05 }}
            >
              <span className="gradient-text">AI Seller</span>
              <br />
              для обработки заявок из Telegram в одном кабинете.
            </Typography>
            <Typography
              sx={{
                fontSize: 18,
                color: "text.secondary",
                maxWidth: 760,
                lineHeight: 1.6,
              }}
            >
              Решение для малого и среднего бизнеса, где обращения приходят в
              Telegram. Бот уточняет запрос, собирает контакты, создает заявку и
              передает ее в работу менеджеру.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                component={Link}
                href={isAuthed ? "/dashboard" : "/register"}
                size="large"
                variant="contained"
                sx={{
                  px: 3,
                  py: 1.4,
                  background:
                    "linear-gradient(135deg, #7c5cff 0%, #5b8cff 50%, #00c2ff 100%)",
                }}
              >
                {isAuthed ? "Перейти в кабинет" : "Создать аккаунт"}
              </Button>
              {!isAuthed && (
                <Button
                  component={Link}
                  href="/login"
                  size="large"
                  color="inherit"
                >
                  У меня уже есть аккаунт
                </Button>
              )}
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
                    background: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontWeight: 600, mb: 0.8 }}>
                    {card.title}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>
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
              <Typography sx={{ color: "text.secondary" }}>
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
              "Бот уточняет контактные данные и задачу клиента по вашему сценарию.",
              "Заявка появляется в кабинете и назначается менеджеру.",
              "Команда отслеживает статус обработки в едином интерфейсе.",
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
                <Typography sx={{ color: "text.secondary" }}>
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
              "работать с обращениями из Telegram в структурированном формате",
              "соблюдать единый стандарт первичной квалификации заявок",
              "снижать ручные действия при распределении заявок",
              "видеть статус и историю коммуникации по каждому обращению",
            ].map((item) => (
              <Typography key={item} sx={{ color: "text.secondary" }}>
                • {item}
              </Typography>
            ))}
          </Stack>
        </Paper>
      </div>
      <Box sx={{ py: 4 }}>
        <Paper className="glass-card" sx={{ p: { xs: 3, md: 3.6 } }}>
          <Stack spacing={1.4}>
            <Typography variant="h4">
              Как создать Telegram-бота для продаж без разработки с нуля
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>
              Если вы ищете, как создать Telegram-бота для бизнеса, обычно есть два
              пути: запускать долгую кастомную разработку или использовать готовый
              сервис. Ventaria закрывает типовые задачи продаж и обработки входящих
              заявок: бот собирает данные клиента, ИИ помогает с первичным диалогом,
              а менеджер подключается, когда это нужно по процессу.
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>
              Такой подход помогает быстрее стартовать, снизить технические риски и
              не держать отдельную команду на постоянную поддержку бота.
            </Typography>
          </Stack>
        </Paper>
      </Box>
      <Box id="plans" sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Тарифы
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 3.5 }}>
          Функции продукта едины для всех планов, в тарифах отличается в первую
          очередь лимит заявок в месяц.
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
                    : "divider",
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
                    color: "primary.main",
                  }}
                />
              )}
              <Typography variant="h5" sx={{ mb: 1 }}>
                {plan.name}
              </Typography>
              <Typography sx={{ fontSize: 34, fontWeight: 700, mb: 1 }}>
                {formatRubles(plan.price)} ₽
              </Typography>
              <Typography sx={{ color: "text.secondary", mb: 0.5 }}>
                {plan.monthlyLeadLimit} заявок в месяц
              </Typography>
              <Typography sx={{ color: "text.secondary", mb: 3 }}>
                Сверх лимита: {formatRublesWithDecimals(getOveragePrice(plan))}{" "}
                ₽ за заявку
              </Typography>
              <Box
                component="ul"
                sx={{
                  m: 0,
                  mb: 2.5,
                  pl: 2.2,
                  minHeight: 108,
                  "& li": {
                    color: "text.secondary",
                    fontSize: 13,
                    lineHeight: 1.45,
                    mb: 0.45,
                  },
                }}
              >
                {plan.features.slice(0, 3).map((feature) => (
                  <Typography key={feature} component="li" variant="caption">
                    {feature}
                  </Typography>
                ))}
              </Box>
              <Button
                fullWidth
                variant={index === 1 ? "contained" : "outlined"}
                onClick={() => handlePlanSelect(plan.code)}
              >
                {index === 0
                  ? "Начать с Basic"
                  : index === 1
                    ? "Выбрать Business"
                    : "Выбрать Pro"}
              </Button>
            </Paper>
          ))}
        </div>
        <Typography
          sx={{ color: "text.secondary", mt: 2, fontSize: 13 }}
        >
          Оплата производится в личном кабинете. Стоимость сверх лимита
          рассчитывается по условиям выбранного тарифа.
        </Typography>
        <Paper className="glass-card" sx={{ p: { xs: 1.2, md: 1.6 }, mt: 2 }}>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="plans-compare-content"
              id="plans-compare-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Сравнить все условия тарифов
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div className="section-grid">
                {PLAN_LIST.map((plan) => (
                  <Paper
                    key={`compare-${plan.code}`}
                    className="glass-card"
                    sx={{ p: 2.2, background: "action.hover" }}
                  >
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                      {plan.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        mb: 1,
                      }}
                    >
                      {plan.monthlyLeadLimit} заявок / мес ·{" "}
                      {formatRubles(plan.price)} ₽
                    </Typography>
                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        pl: 2,
                        "& li": {
                          color: "text.secondary",
                          fontSize: 12.5,
                          lineHeight: 1.45,
                          mb: 0.4,
                        },
                      }}
                    >
                      {plan.features.map((feature) => (
                        <Typography
                          key={`${plan.code}-${feature}`}
                          component="li"
                          variant="caption"
                        >
                          {feature}
                        </Typography>
                      ))}
                    </Box>
                  </Paper>
                ))}
              </div>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </Box>
      <Box sx={{ pb: 6 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Частые вопросы
        </Typography>
        <Paper className="glass-card" sx={{ p: { xs: 1.2, md: 1.6 } }}>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-0-content"
              id="faq-0-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Почему выбрать сервис, а не разрабатывать своего бота?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                Собственная разработка Telegram-бота обычно требует бюджета на
                создание и регулярные расходы на поддержку: инфраструктура,
                обновления, исправления и контроль стабильности. Ventaria дает
                готовое решение с кабинетом, статусами и сценариями работы с
                заявками. Обработку можно выстроить гибко: сначала ИИ, при
                необходимости — подключение менеджера в диалог.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-1-content"
              id="faq-1-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Сложно ли запустить сервис?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                Базовая настройка обычно занимает 10-15 минут: создание
                компании, подключение бота и заполнение сценария.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-2-content"
              id="faq-2-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Нужен ли собственный Telegram-бот?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                Можно использовать общий бот или подключить собственный токен в
                личном кабинете.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-3-content"
              id="faq-3-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Куда попадают обращения клиентов?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                В раздел заявок: с контактами, статусом, ответственным
                менеджером и историей диалога.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-4-content"
              id="faq-4-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Может ли бот отправлять материалы клиенту?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                Да, поддерживается отправка фото, видео и файлов, добавленных в
                настройках компании.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-5-content"
              id="faq-5-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Что происходит при исчерпании лимита тарифа?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                Дальнейшие заявки учитываются как сверхлимитные в соответствии с
                тарифом, выбранным в кабинете.
              </Typography>
            </AccordionDetails>
          </Accordion>
          <Accordion
            disableGutters
            sx={{ background: "transparent", boxShadow: "none" }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: "text.secondary" }} />
              }
              aria-controls="faq-6-content"
              id="faq-6-header"
            >
              <Typography sx={{ fontWeight: 600 }}>
                Где посмотреть юридические документы сервиса?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "text.secondary" }}>
                На сайте доступны документы:{" "}
                <Link href="/offer">публичная оферта</Link>,{" "}
                <Link href="/terms">условия использования</Link> и{" "}
                <Link href="/privacy">
                  политика обработки персональных данных
                </Link>
                .
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </Box>
      <Paper className="glass-card" sx={{ p: 2, mb: 4 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
            Используя сервис, вы соглашаетесь с юридическими документами.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button component={Link} href="/offer" color="inherit" size="small">
              Оферта
            </Button>
            <Button component={Link} href="/terms" color="inherit" size="small">
              Условия
            </Button>
            <Button
              component={Link}
              href="/privacy"
              color="inherit"
              size="small"
            >
              Политика данных
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
