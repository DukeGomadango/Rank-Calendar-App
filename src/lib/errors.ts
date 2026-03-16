import * as Sentry from "@sentry/nextjs";

/**
 * データ層・サーバー側で本番時に内部詳細をユーザーに返さないためのヘルパー。
 * 本番: 汎用メッセージを throw し、詳細は Sentry に送る。
 * 開発: 元のエラーをそのまま throw する。
 */
const GENERIC_MESSAGE = "しばらくして再度お試しください。";

export function throwDataLayerError(detail: Error | string): never {
  const err = typeof detail === "string" ? new Error(detail) : detail;
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(err);
    throw new Error(GENERIC_MESSAGE);
  }
  throw err;
}
