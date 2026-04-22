import { Suspense } from "react";
import "./globals.scss";
import MuiAppProvider from "@/components/MuiAppProvider";

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
