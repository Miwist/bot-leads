"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BrandLogo from "@/components/BrandLogo";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/auth/forgot-password", { email });
      setMessage(
        "Если аккаунт найден, мы отправили ссылку для восстановления пароля.",
      );
    } catch {
      setError("Не удалось отправить письмо. Повторите позже.");
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
          <Typography variant="h4">Восстановление пароля</Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
            Укажите почту. Отправим ссылку для смены пароля.
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Button variant="contained" type="submit" disabled={busy}>
            Отправить ссылку
          </Button>
          <Typography sx={{ color: "rgba(255,255,255,0.55)" }}>
            Вспомнили пароль? <Link href="/login">Вернуться ко входу</Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
