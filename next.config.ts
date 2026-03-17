import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/sitemap.xml", destination: "/sitemap" }];
  },
};

const useSentry =
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export default useSentry
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG ?? "",
      project: process.env.SENTRY_PROJECT ?? "",
      silent: !process.env.CI,
    })
  : nextConfig;
