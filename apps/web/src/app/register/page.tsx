"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, getApiErrorMessage } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const plan = searchParams.get("plan");

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await api.post("/auth/register", {
        email,
        password,
      });
      setInfo("Проверьте почту: мы отправили ссылку для подтверждения.");
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось создать аккаунт."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper className="glass-card" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack
          spacing={2.5}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <BrandLogo />
          <Box>
            <Typography variant="h4">Создать кабинет</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.62)", mt: 1 }}>
              Подними AI-продавца под свою компанию и настрой рабочее
              пространство для команды.
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}
          <TextField
            label="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button
            variant="contained"
            size="large"
            type="submit"
            disabled={busy}
          >
            Зарегистрироваться
          </Button>
          <Typography sx={{ color: "rgba(255,255,255,0.55)" }}>
            Уже есть аккаунт?{" "}
            <Link href={plan ? `/login?plan=${plan}` : "/login"}>Войти</Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
