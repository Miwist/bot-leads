"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import BrandLogo from "@/components/BrandLogo";
import { api, setToken } from "@/lib/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Подтверждаем почту...");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setMessage("");
        setError("Ссылка подтверждения некорректна.");
        return;
      }
      try {
        const { data } = await api.post("/auth/verify-email", { token });
        if (data?.token) {
          setToken(data.token);
          setMessage("Почта подтверждена. Перенаправляем в кабинет...");
          setTimeout(() => router.push("/dashboard/onboarding"), 900);
          return;
        }
        setMessage("Почта подтверждена. Теперь можно войти в кабинет.");
      } catch {
        setMessage("");
        setError("Не удалось подтвердить почту. Запросите новую ссылку.");
      }
    };
    void run();
  }, [router, token]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper className="glass-card" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <BrandLogo />
          <Typography variant="h4">Подтверждение почты</Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Button component={Link} href="/login" variant="outlined">
            Перейти ко входу
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
