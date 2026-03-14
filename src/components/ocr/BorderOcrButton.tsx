'use client';

import { useCallback, useRef, useState } from "react";

type Props = {
  /** +2, +4, +6 ボーダー入力への参照 */
  border2Ref: React.RefObject<HTMLInputElement | null>;
  border4Ref: React.RefObject<HTMLInputElement | null>;
  border6Ref: React.RefObject<HTMLInputElement | null>;
};

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

/**
 * ライバーレポートのスクショから +2/+4/+6 ボーダー候補を読み取り、
 * 入力欄に反映するボタン。画像はブラウザ内のみで処理し、サーバーには送信しない。
 */
export function BorderOcrButton({
  border2Ref,
  border4Ref,
  border6Ref,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const handleClick = useCallback(() => {
    setStatus({ type: "idle" });
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setStatus({ type: "loading" });
    try {
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context unavailable");
      }
      ctx.drawImage(imageBitmap, 0, 0);
      imageBitmap.close();

      const width = canvas.width;
      const height = canvas.height;

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1);

      /**
       * 与えられた領域（キャンバス座標比率）から 5〜6 桁の最大値を 1 つ抽出する。
       * IRIAM ライバーレポートのレイアウトを前提に、「ボーダー表示行」の中だけを読む。
       */
      const recognizeBorderFromRegion = async (
        xRatioStart: number,
        xRatioEnd: number,
        yRatioStart: number,
        yRatioEnd: number
      ): Promise<number | null> => {
        const sx = Math.max(0, Math.floor(width * xRatioStart));
        const ex = Math.min(width, Math.ceil(width * xRatioEnd));
        const sy = Math.max(0, Math.floor(height * yRatioStart));
        const ey = Math.min(height, Math.ceil(height * yRatioEnd));

        const regionWidth = ex - sx;
        const regionHeight = ey - sy;
        if (regionWidth <= 0 || regionHeight <= 0) return null;

        const regionCanvas = document.createElement("canvas");
        regionCanvas.width = regionWidth;
        regionCanvas.height = regionHeight;
        const rctx = regionCanvas.getContext("2d");
        if (!rctx) return null;

        rctx.drawImage(canvas, sx, sy, regionWidth, regionHeight, 0, 0, regionWidth, regionHeight);
        const dataUrl = regionCanvas.toDataURL("image/png");

        const {
          data: { text },
        } = await worker.recognize(dataUrl);

        const matches = text.match(/\d{1,3}(?:,\d{3})*/g) ?? [];
        if (matches.length === 0) return null;

        const BORDER_MIN = 10_000;
        const BORDER_MAX = 999_999;
        const candidates = Array.from(
          new Set(
            matches
              .map((m) => m.replace(/,/g, ""))
              .map((m) => Number.parseInt(m, 10))
              .filter((n) => Number.isFinite(n) && n >= BORDER_MIN && n <= BORDER_MAX)
          )
        );
        if (candidates.length === 0) return null;

        return candidates.reduce((max, n) => (n > max ? n : max), candidates[0]);
      };

      // レイアウト前提の領域（縦: ボーダー行全体、横: 左/中央/右）を決め打ちで読む
      // 縦方向は 0.55〜0.72 あたりを想定（スクショ比率によって多少ズレても拾えるよう広め）
      const rowTopRatio = 0.55;
      const rowBottomRatio = 0.72;

      const [n2, n4, n6] = await Promise.all([
        recognizeBorderFromRegion(0 / 3, 1 / 3, rowTopRatio, rowBottomRatio),
        recognizeBorderFromRegion(1 / 3, 2 / 3, rowTopRatio, rowBottomRatio),
        recognizeBorderFromRegion(2 / 3, 3 / 3, rowTopRatio, rowBottomRatio),
      ]);

      if (n2 != null && n4 != null && n6 != null) {
        if (border2Ref.current) {
          border2Ref.current.value = String(n2);
        }
        if (border4Ref.current) {
          border4Ref.current.value = String(n4);
        }
        if (border6Ref.current) {
          border6Ref.current.value = String(n6);
        }

        setStatus({
          type: "success",
          message:
            "+2 / +4 / +6 ボーダーをライバーレポートのボーダー行から読み取りました。保存前に値を確認してください。",
        });

        await worker.terminate();
        return;
      }

      // 領域別でうまく読めなかった場合のフォールバック: 画像全体から 5〜6 桁の数値3つを抽出
      const fullDataUrl = canvas.toDataURL("image/png");
      const {
        data: { text: fullText },
      } = await worker.recognize(fullDataUrl);

      const fullMatches = fullText.match(/\d{1,3}(?:,\d{3})*/g) ?? [];
      if (fullMatches.length === 0) {
        await worker.terminate();
        setStatus({
          type: "error",
          message:
            "画像から数値を読み取れませんでした。明るさや解像度、「デイリーランクスコア」部分が写っているか確認してください。",
        });
        return;
      }

      const allNumbers = fullMatches
        .map((m) => m.replace(/,/g, ""))
        .map((m) => Number.parseInt(m, 10))
        .filter((n) => Number.isFinite(n) && n > 0);

      const BORDER_MIN = 10_000;
      const BORDER_MAX = 999_999;
      const borderCandidates = Array.from(new Set(allNumbers))
        .filter((n) => n >= BORDER_MIN && n <= BORDER_MAX)
        .sort((a, b) => a - b);

      if (borderCandidates.length === 0) {
        await worker.terminate();
        setStatus({
          type: "error",
          message:
            "5〜6桁のボーダー数値が見つかりませんでした。画像の明るさや「デイリーランクスコア」部分が写っているか確認してください。",
        });
        return;
      }

      const [fb2, fb4, fb6] = [
        borderCandidates[0] ?? null,
        borderCandidates[1] ?? null,
        borderCandidates[2] ?? null,
      ];
      if (fb2 != null && border2Ref.current) {
        border2Ref.current.value = String(fb2);
      }
      if (fb4 != null && border4Ref.current) {
        border4Ref.current.value = String(fb4);
      }
      if (fb6 != null && border6Ref.current) {
        border6Ref.current.value = String(fb6);
      }

      setStatus({
        type: "success",
        message:
          borderCandidates.length >= 3
            ? "+2 / +4 / +6 ボーダーを画像全体から推定しました。保存前に値を確認してください。"
            : "一部のボーダーのみ読み取りました。残りは手入力してください。保存前に値を確認してください。",
      });

      await worker.terminate();
    } catch (err) {
      console.error("[OCR] border parse failed:", err);
      setStatus({
        type: "error",
        message:
          "画像の読み取りに失敗しました。スクショの解像度や明るさを確認し、もう一度お試しください。",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [border2Ref, border4Ref, border6Ref]);

  const cameraIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent-400 bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:border-accent-600 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 focus:ring-offset-zinc-50 dark:border-accent-500 dark:bg-accent-600 dark:hover:bg-accent-500 dark:focus:ring-offset-zinc-900"
        >
          {cameraIcon}
          スクショを読み込む
        </button>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          画像はブラウザ内だけで処理され、サーバーには送信・保存されません。
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {status.type === "loading" && (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          画像を解析中です… 数秒お待ちください。
        </p>
      )}
      {status.type === "success" && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
          {status.message}
        </p>
      )}
      {status.type === "error" && (
        <p className="text-[10px] text-red-500 dark:text-red-400">
          {status.message}
        </p>
      )}
    </div>
  );
}

