import Link from "next/link";
import { Container, Paper, Stack, Typography } from "@mui/material";
import BrandLogo from "@/components/BrandLogo";

export default function OfferPage() {
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
            Публичная оферта
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
            Дата обновления: 23.04.2026
          </Typography>
          <Typography>
            Настоящий документ является предложением заключить договор на
            использование сервиса AI Seller на изложенных ниже условиях.
          </Typography>
          <Typography>
            Акцепт оферты осуществляется путем регистрации в сервисе и/или
            оплаты выбранного тарифа. С момента акцепта договор считается
            заключенным.
          </Typography>
          <Typography>
            Предмет договора: предоставление доступа к функциональности сервиса
            (обработка заявок, работа с ботами, диалогами и платежным модулем) в
            пределах выбранного тарифного плана.
          </Typography>
          <Typography>
            Стоимость и лимиты указываются в интерфейсе тарифа. При превышении
            лимитов может применяться сверхлимитная тарификация согласно
            условиям выбранного плана.
          </Typography>
          <Typography>
            Пользователь обязуется предоставлять достоверные данные, соблюдать
            применимое законодательство и не использовать сервис для незаконной
            обработки персональных данных.
          </Typography>
          <Typography>
            Оператор сервиса вправе обновлять оферту. Актуальная версия
            публикуется на данной странице.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
            См. также: <Link href="/privacy">политика обработки данных</Link> и{" "}
            <Link href="/terms">условия использования</Link>.
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
