import Link from "next/link";
import { Container, Paper, Stack, Typography } from "@mui/material";
import BrandLogo from "@/components/BrandLogo";

export default function PrivacyPage() {
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
            Политика обработки персональных данных
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
            Дата обновления: 23.04.2026
          </Typography>
          <Typography>
            Настоящая политика описывает порядок обработки персональных данных
            пользователей сервиса AI Seller.
          </Typography>
          <Typography>
            Мы обрабатываем только данные, необходимые для работы сервиса и
            обратной связи по заявкам: имя, телефон, переписка с ботом и иные
            сведения, которые пользователь передает добровольно.
          </Typography>
          <Typography>
            Цели обработки: регистрация и обслуживание аккаунта, обработка
            обращений, создание и сопровождение заявок, техническая поддержка,
            исполнение требований законодательства.
          </Typography>
          <Typography>
            Основания обработки: согласие субъекта персональных данных и/или
            необходимость исполнения договора (оферты) при использовании
            сервиса.
          </Typography>
          <Typography>
            Данные хранятся в течение срока, необходимого для достижения целей
            обработки, либо в срок, установленный законом. Доступ к данным имеют
            только уполномоченные сотрудники и подрядчики в пределах их задач.
          </Typography>
          <Typography>
            Пользователь вправе запросить уточнение, ограничение обработки,
            удаление данных, а также отозвать согласие, направив обращение
            оператору.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
            См. также: <Link href="/offer">публичная оферта</Link> и{" "}
            <Link href="/terms">условия использования</Link>.
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
