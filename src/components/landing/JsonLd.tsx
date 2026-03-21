const SITE_NAME = "IRIAM だんごスケジュール";
const DESCRIPTION =
  "IRIAMライバー向けの非公式ランク管理ツール。デイリーランクの目標+・実績+、ボーダー、スキップパスを日別に記録し、カレンダーとデータ表で一元管理できます。";

function getBaseUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "https://dango-schedule.vercel.app";
}

export function JsonLdWebSite() {
  const baseUrl = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: DESCRIPTION,
    url: baseUrl,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
