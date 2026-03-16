"use client";

import { useCallback, useRef, useState } from "react";

type ParsedEventCandidate = {
  id: string;
  name: string;
  rawLine: string;
  startDate: string | null;
  endDate: string | null;
  selected: boolean;
};

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type Props = {
  calendarId: string;
  createAction: (formData: FormData) => Promise<void>;
};

function parseCalendarText(rawText: string): ParsedEventCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const skipKeywords = [
    "IRIAM Event Calendar",
    "イベント内容は予告なく変更",
    "※本イベントカレンダーは参考用です",
    "本イベントカレンダーは参考",
    "イベントの一部を抜粋してご紹介しています",
    "スケジュールは変更の可能性があります",
  ];

  // イベント名の本体が始まりやすいキーワード一覧。
  // OCR 結果から見える代表的なパターンだけを列挙し、最初に見つかったものから右側を表示名とする。
  const anchorKeywords = [
    "Enjoy IRIAM",
    "IRIAM ",
    "FAN BADGE",
    "Birthday",
    "Half Year Anniversary",
    "#RIAM",
    "Live2D",
    "MUSIC",
    "STYLE COLLECTION",
    "illustration for you",
    "えき ポス",
    "プチ ギフ フェ スタ",
    "背景 フェ スタ",
    "選 べ る ギフ ト",
  ];

  const eventLines: string[] = [];

  for (const line of lines) {
    if (skipKeywords.some((kw) => line.includes(kw))) continue;

    // 注意書き（※〜）はすべて除外
    if (line.startsWith("※")) continue;

    // 週ヘッダーのような日付レンジ行はスキップ
    if (/\d{1,2}\/\d{1,2}.*[～~〜].*\d{1,2}\/\d{1,2}/.test(line)) continue;

    // ランク帯や記号を含む左側はざっくり捨てて、最初の日本語/英数ブロック以降をイベント名として扱う
    const nameMatch = line.match(/[ぁ-んァ-ン一-龥A-Za-z0-9].*$/);
    let cleaned = nameMatch ? nameMatch[0].trim() : "";

    if (!cleaned) continue;

    // 本体らしいキーワードがあれば、その位置から後ろだけを採用する
    for (const kw of anchorKeywords) {
      const idx = cleaned.indexOf(kw);
      if (idx >= 0) {
        cleaned = cleaned.slice(idx).trim();
        break;
      }
    }

    // ひらがな・カタカナ・漢字・英数がある程度含まれている行のみ採用
    const contentChars = (cleaned.match(/[ぁ-んァ-ン一-龥A-Za-z0-9]/g) ?? []).length;
    if (contentChars < 6) continue;

    eventLines.push(cleaned);
  }

  return eventLines.map((name, idx) => ({
    id: `ev-${idx}-${name.slice(0, 8)}`,
    name,
    rawLine: name,
    startDate: null,
    endDate: null,
    selected: true,
  }));
}

export function EventCalendarOcrImporter({ calendarId, createAction }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [candidates, setCandidates] = useState<ParsedEventCandidate[]>([]);
  const [rawLines, setRawLines] = useState<string[] | null>(null);

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

      const dataUrl = canvas.toDataURL("image/png");

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("jpn", 1);
      const {
        data: { text },
      } = await worker.recognize(dataUrl);
      await worker.terminate();

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      setRawLines(lines);

      const parsed = parseCalendarText(text);
      if (parsed.length === 0) {
        setStatus({
          type: "error",
          message: "イベント名らしき行を画像から検出できませんでした。画像の解像度やトリミングを確認してください。",
        });
        setCandidates([]);
      } else {
        setCandidates(parsed);
        setStatus({
          type: "success",
          message: `${parsed.length}件のイベント候補を読み取りました。内容を確認して追加してください。`,
        });
      }
    } catch (err) {
      console.error("[OCR] event calendar parse failed:", err);
      setStatus({
        type: "error",
        message: "画像の読み取りに失敗しました。スクショの解像度や明るさを確認し、もう一度お試しください。",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const handleToggle = (id: string) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const handleNameChange = (id: string, name: string) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const handleBulkCreate = async () => {
    const targets = candidates.filter((c) => c.selected && c.name.trim().length > 0);
    if (targets.length === 0) {
      setStatus({ type: "error", message: "追加対象のイベントが選択されていません。" });
      return;
    }

    setStatus({ type: "loading" });
    let success = 0;
    let failed = 0;
    for (const c of targets) {
      const fd = new FormData();
      fd.set("calendar_id", calendarId);
      fd.set("name", c.name.trim());
      if (c.startDate) fd.set("start_date", c.startDate);
      if (c.endDate) fd.set("end_date", c.endDate);
      try {
        await createAction(fd);
        success += 1;
      } catch {
        failed += 1;
      }
    }

    if (failed === 0) {
      setStatus({ type: "success", message: `${success}件のイベントを追加しました。` });
    } else {
      setStatus({
        type: "error",
        message: `${success}件のイベントを追加しましたが、${failed}件でエラーが発生しました。`,
      });
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">IRIAM公式カレンダー画像から読み込む</h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          IRIAM公式のイベントカレンダー画像（Xに掲載されているものなど）を読み込み、イベント名を候補として抽出します。
          画像はブラウザ内だけで処理され、サーバーには送信・保存されません。
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent-400 bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:border-accent-600 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 dark:focus:ring-offset-zinc-900"
        >
          画像ファイルを選択して読み込む
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {status.type === "loading" && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">画像を解析中です… 数秒お待ちください。</p>
        )}
        {status.type === "success" && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{status.message}</p>
        )}
        {status.type === "error" && (
          <p className="text-[10px] text-red-500 dark:text-red-400">{status.message}</p>
        )}
      </div>

      {candidates.length > 0 && (
        <div className="space-y-2 border-t border-dashed border-zinc-200 pt-3 text-[11px] dark:border-zinc-700">
          <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            読み取り結果（チェックした行をイベントとして追加します）
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/60 p-2 text-[11px] dark:border-zinc-700 dark:bg-zinc-900/40">
            {candidates.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={c.selected}
                  onChange={() => handleToggle(c.id)}
                />
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => handleNameChange(c.id, e.target.value)}
                  className="flex-1 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[11px] text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleBulkCreate}
              className="inline-flex items-center gap-1 rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 dark:focus:ring-offset-zinc-900"
            >
              選択したイベントを追加する
            </button>
          </div>
        </div>
      )}

      {rawLines && rawLines.length > 0 && (
        <details className="mt-2 space-y-1 rounded-md border border-dashed border-zinc-300 bg-zinc-50/60 p-2 text-[10px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          <summary className="cursor-pointer list-none text-[10px] font-medium text-zinc-500 dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
            OCR生テキスト（デバッグ用・イベント候補判定前）
          </summary>
          <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
            {rawLines.map((line, idx) => (
              <div key={`${idx}-${line.slice(0, 10)}`} className="whitespace-pre-wrap break-all">
                {idx + 1}. {line}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

