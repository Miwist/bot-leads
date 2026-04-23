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
import { api, getApiErrorMessage, setToken } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const plan = searchParams.get("plan");
  const emailFromQuery = searchParams.get("email") || "";

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });
      setToken(data.token);
      router.push(plan ? `/dashboard/onboarding?plan=${plan}` : "/dashboard");
    } catch (e) {
      setError(
        getApiErrorMessage(e, "Не удалось войти. Проверьте почту и пароль."),
      );
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    const target = (email || emailFromQuery).trim();
    if (!target) {
      setError("Укажите почту и повторите отправку.");
      return;
    }
    setError("");
    setInfo("");
    try {
      await api.post("/auth/resend-verification", { email: target });
      setInfo("Письмо с подтверждением отправлено повторно.");
    } catch {
      setError("Не удалось отправить письмо. Повторите позже.");
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
            <Typography variant="h4">Вход в кабинет</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.62)", mt: 1 }}>
              Управляйте Telegram-ботом, тарифом, командой и диалогами в одном
              месте.
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
            autoComplete="current-password"
          />
          <Button
            variant="contained"
            size="large"
            type="submit"
            disabled={busy}
          >
            Войти
          </Button>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
            <Link href="/forgot-password">Забыли пароль?</Link>
            <button
              type="button"
              onClick={() => void resendVerification()}
              style={{
                border: "none",
                background: "transparent",
                color: "#8ea1ff",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Отправить подтверждение повторно
            </button>
          </Stack>
          <Typography sx={{ color: "rgba(255,255,255,0.55)" }}>
            Ещё нет аккаунта?{" "}
            <Link href={plan ? `/register?plan=${plan}` : "/register"}>
              Создать
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
