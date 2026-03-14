import type { Metadata } from "next";
import { Montserrat, Noto_Sans_JP } from "next/font/google";

import { JsonLdWebSite } from "@/components/landing/JsonLd";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_NAME = "IRIAM rank planner";
const DESCRIPTION =
  "IRIAMライバー向けの非公式ランク管理ツール。デイリーランクの目標+・実績+、ボーダー、スキップパスを日別に記録し、カレンダーとデータ表で一元管理できます。";

export const metadata: Metadata = {
  title: {
    default: "IRIAM ランク管理ツール | デイリーランク・スケジュールを一元管理",
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: ["IRIAM", "ランク管理", "デイリーランク", "スケジュール", "ライバー", "非公式"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: "IRIAM ランク管理ツール | デイリーランク・スケジュールを一元管理",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "IRIAM ランク管理ツール | デイリーランク・スケジュールを一元管理",
    description: DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${montserrat.variable} ${notoSansJP.variable} antialiased bg-background text-foreground font-sans`}
      >
        <JsonLdWebSite />
        {children}
      </body>
    </html>
  );
}
