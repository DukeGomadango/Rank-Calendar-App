import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/** 親ディレクトリに別の lockfile があると Turbopack がルートを誤認識し、ビルド結果が不安定になることがある。 */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
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
