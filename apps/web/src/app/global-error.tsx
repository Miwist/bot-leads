"use client";

import { useEffect } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export default function GlobalError({
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
    <html lang="ru">
      <body>
        <Box
          sx={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            p: 2,
            background: "#f5f7fb",
          }}
        >
          <Paper className="glass-card" sx={{ p: 3, maxWidth: 600, width: "100%" }}>
            <Stack spacing={1.5}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Упс, что-то пошло не так
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
                Страница не смогла корректно загрузиться. Нажмите кнопку ниже,
                чтобы попробовать снова.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="contained" onClick={() => reset()}>
                  Перезагрузить
                </Button>
                <Button variant="outlined" href="/">
                  На главную
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </body>
    </html>
  );
}
