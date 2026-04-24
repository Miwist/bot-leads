"use client";

import { useEffect } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper className="glass-card" sx={{ p: 3, maxWidth: 560, width: "100%" }}>
        <Stack spacing={1.5}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Не удалось загрузить страницу
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            Произошла временная ошибка. Попробуйте обновить страницу или
            вернуться на главную.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={() => reset()}>
              Обновить страницу
            </Button>
            <Button variant="outlined" href="/">
              На главную
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
