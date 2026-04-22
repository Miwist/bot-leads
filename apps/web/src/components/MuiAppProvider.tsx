"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#05060a",
      paper: "#0b1020",
    },
    primary: {
      main: "#7c5cff",
    },
    secondary: {
      main: "#00c2ff",
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
          color: "rgba(255,255,255,0.72)",
        },
        shrink: {
          transform: "translate(14px, -9px) scale(0.75)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "rgba(255,255,255,0.03)",
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
          color: "rgba(255,255,255,0.58)",
        },
      },
    },
  },
});

export default function MuiAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
