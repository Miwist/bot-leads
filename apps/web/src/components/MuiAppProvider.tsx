"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getStoredThemeMode, resolveThemeMode } from "@/lib/ui";

function buildTheme(mode: "light" | "dark") {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      background: {
        default: dark ? "#05060a" : "#f6f7fb",
        paper: dark ? "#0b1020" : "#ffffff",
      },
      primary: {
        main: "#7c5cff",
      },
      secondary: {
        main: "#00c2ff",
      },
      text: {
        primary: dark ? "#f5f7fb" : "#111827",
        secondary: dark ? "rgba(245,247,251,0.66)" : "rgba(17,24,39,0.64)",
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 700, letterSpacing: "-0.05em" },
      h2: { fontWeight: 700, letterSpacing: "-0.04em" },
      h3: { fontWeight: 650, letterSpacing: "-0.03em" },
      h4: { fontWeight: 650, letterSpacing: "-0.03em" },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 14,
            fontWeight: 600,
          },
          contained: {
            color: "#ffffff",
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
          variant: "outlined",
          InputLabelProps: {
            shrink: true,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: dark ? "rgba(255,255,255,0.72)" : "rgba(17,24,39,0.72)",
          },
          shrink: {
            transform: "translate(14px, -9px) scale(0.75)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            background: dark ? "rgba(255,255,255,0.03)" : "rgba(17,24,39,0.03)",
            minHeight: 52,
          },
        },
      },
      MuiSelect: {
        defaultProps: {
          fullWidth: true,
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            color: dark ? "rgba(255,255,255,0.58)" : "rgba(17,24,39,0.58)",
          },
        },
      },
    },
  });
}

export const APP_THEME_MODE_KEY = "dashboard-theme-mode";

export function setThemeMode(mode: "light" | "dark" | "system") {
  if (typeof window === "undefined") return;
  localStorage.setItem(APP_THEME_MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent("theme-mode-changed"));
}

export function getThemeMode() {
  return getStoredThemeMode(APP_THEME_MODE_KEY);
}

export default function MuiAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  React.useEffect(() => {
    const sync = () => {
      const resolved = resolveThemeMode(getStoredThemeMode(APP_THEME_MODE_KEY));
      setMode(resolved);
      document.documentElement.setAttribute("data-app-theme", resolved);
    };
    sync();
    window.addEventListener("theme-mode-changed", sync);
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", sync);
    return () => {
      window.removeEventListener("theme-mode-changed", sync);
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", sync);
    };
  }, []);
  const theme = React.useMemo(() => buildTheme(mode), [mode]);
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
