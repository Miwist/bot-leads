import { Suspense } from "react";
import type { Metadata } from "next";
import Script from "next/script";
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
  verification: {
    yandex: "9c79e5c13ce94b18",
    google: "x0aHY2-UD5zoFXGbW7zs4kOIbdeDb5mgeoKXA3MsMUw",
  },
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
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108748898','ym');ym(108748898,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/108748898"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <MuiAppProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </MuiAppProvider>
      </body>
    </html>
  );
}
