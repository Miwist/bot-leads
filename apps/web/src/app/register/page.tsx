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

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const plan = searchParams.get("plan");
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper className="glass-card" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <BrandLogo />
          <Box>
            <Typography variant="h4">Создать кабинет</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.62)", mt: 1 }}>
              Подними AI-продавца под свою компанию и настрой рабочее
              пространство для команды.
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="contained"
            size="large"
            onClick={async () => {
              try {
                const { data } = await api.post("/auth/register", {
                  email,
                  password,
                });
                setToken(data.token);
                router.push(
                  plan
                    ? `/dashboard/onboarding?plan=${plan}`
                    : "/dashboard/onboarding",
                );
              } catch (e) {
                setError(getApiErrorMessage(e, "Не удалось создать аккаунт."));
              }
            }}
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
