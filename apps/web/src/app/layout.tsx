import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.scss";
import MuiAppProvider from "@/components/MuiAppProvider";

const defaultTitle = "Ventaria — AI Seller для заявок из Telegram";
const defaultDescription =
  "Решение для малого и среднего бизнеса, где обращения приходят в Telegram. Бот уточняет запрос, собирает контакты, создает заявку и передает ее в работу менеджеру.";

function resolveMetadataBase(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      // ignore invalid URL
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

const shareImage = {
  url: "/icon.svg",
  width: 1536,
  height: 1024,
  alt: "Ventaria",
  type: "image/png",
} as const;

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  applicationName: "Ventaria",
  title: {
    default: defaultTitle,
    template: "%s — Ventaria",
  },
  description: defaultDescription,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Ventaria",
    title: defaultTitle,
    description: defaultDescription,
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [shareImage.url],
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
