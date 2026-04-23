"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { api, getApiErrorMessage } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!token) {
      setError("Ссылка восстановления некорректна.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setMessage("Пароль обновлён. Перенаправляем на вход...");
      setTimeout(() => router.push("/login"), 900);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось обновить пароль."));
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
          <Typography variant="h4">Новый пароль</Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
            Задайте новый пароль для входа в кабинет.
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Новый пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button variant="contained" type="submit" disabled={busy}>
            Сохранить пароль
          </Button>
          <Typography sx={{ color: "rgba(255,255,255,0.55)" }}>
            <Link href="/login">Вернуться ко входу</Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
