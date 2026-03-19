import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      // 品質ゲートの精度を上げるため、重要ロジック中心に閾値を評価する
      //（未テストになりがちなページ/一部の補助モジュールは対象から外す）
      include: [
        "src/lib/auth/**/*.{ts,tsx}",
        "src/lib/domain/**/*.{ts,tsx}",
        "src/lib/validations/**/*.{ts,tsx}",
        "src/lib/errors.ts",
        "src/lib/plus-options.ts",
        "src/lib/rank-styles.ts",
        "src/lib/data-range.ts",
        "src/lib/event-colors.ts",
        "src/lib/border-constants.ts"
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "e2e/**",
        "**/*.d.ts",
        "**/types/**",
        // domain 内で未テストのことが多い予測ロジックはまず段階導入から
        "src/lib/domain/*prediction*.ts",
        "src/lib/domain/*prediction*.tsx"
      ],
      thresholds: {
        // まずは重要ロジックに対して段階的に引き上げる（品質ゲート化）
        lines: 60,
        functions: 60,
        branches: 45,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

