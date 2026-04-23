import Link from "next/link";
import { Container, Paper, Stack, Typography } from "@mui/material";
import BrandLogo from "@/components/BrandLogo";

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper className="glass-card" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <BrandLogo compact />
          <Link
            href="/"
            style={{ color: "rgba(255,255,255,0.82)", fontSize: 14 }}
          >
            На главную
          </Link>
        </Stack>
      </Paper>
      <Paper className="glass-card" sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Условия использования сервиса
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
            Дата обновления: 23.04.2026
          </Typography>
          <Typography>
            AI Seller предоставляет инструменты для автоматизации первичной
            обработки обращений в Telegram и управления заявками в кабинете.
          </Typography>
          <Typography>
            Пользователь самостоятельно отвечает за корректность настроек,
            соблюдение требований законодательства и содержание отправляемых
            материалов.
          </Typography>
          <Typography>
            Сервис не гарантирует коммерческий результат (рост продаж, конверсии
            и т.п.), поскольку итог зависит от качества входящего трафика,
            сценариев, менеджеров и внешних факторов.
          </Typography>
          <Typography>
            Доступность сервиса может зависеть от сторонних платформ и
            провайдеров (включая Telegram, платежные шлюзы и облачные сервисы).
          </Typography>
          <Typography>
            При нарушении правил использования оператор вправе ограничить доступ
            к сервису до устранения нарушения.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
            См. также: <Link href="/offer">публичная оферта</Link> и{" "}
            <Link href="/privacy">политика обработки данных</Link>.
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
