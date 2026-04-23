import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.scss";
import MuiAppProvider from "@/components/MuiAppProvider";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <MuiAppProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </MuiAppProvider>
      </body>
    </html>
  );
}
