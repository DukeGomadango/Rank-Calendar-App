import type { Metadata } from "next";
import { Montserrat, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";

import { JsonLdWebSite } from "@/components/landing/JsonLd";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

/** 初回描画前に html に .dark を付与し、フラッシュを防ぐ */
const THEME_INIT_SCRIPT = `
(function(){
  var t = localStorage.getItem('iriam-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
  else if (t === 'light') document.documentElement.classList.remove('dark');
  else document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
})();
`;

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_NAME = "IRIAM だんごスケジュール";
const DESCRIPTION =
  "IRIAMライバー向けの非公式ランク管理ツール。デイリーランクの目標+・実績+、ボーダー、スキップパスを日別に記録し、カレンダーとデータ表で一元管理できます。";

const SITE_URL = "https://dango-schedule.vercel.app";
const OGP_IMAGE_URL = `${SITE_URL}/ogp.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IRIAM だんごスケジュール | デイリーランク・スケジュールを一元管理",
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: ["IRIAM", "ランク管理", "デイリーランク", "スケジュール", "ライバー", "非公式"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: "IRIAM だんごスケジュール | デイリーランク・スケジュールを一元管理",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: OGP_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "IRIAM だんごスケジュール",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IRIAM だんごスケジュール | デイリーランク・スケジュールを一元管理",
    description: DESCRIPTION,
    images: [OGP_IMAGE_URL],
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon.png",
  },
  verification: {
    google: "7fPwEgVdd4XychUawn3dhUgNBMjppQA8NRHLVBVs__I",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${notoSansJP.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ThemeProvider>
          <JsonLdWebSite />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
