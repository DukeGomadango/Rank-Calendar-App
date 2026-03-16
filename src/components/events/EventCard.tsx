import dayjs from "dayjs";
import { getEventColorClasses } from "@/lib/event-colors";
import type { EventRow } from "@/lib/data/events";

const EVENT_TYPE_LABELS: Record<string, string> = {
  ranking: "ランキング",
  achievement: "達成",
  background: "背景",
  other: "その他",
};

type Props = {
  event: EventRow;
  calendarId: string;
  deleteAction: (formData: FormData) => Promise<void>;
  /** 指定時は親が楽観的削除を行う。ボタン押下でこのコールバックを呼ぶ。 */
  onDeleteRequest?: (id: string) => void;
  isPast?: boolean;
};

export function EventCard({ event, calendarId, deleteAction, onDeleteRequest, isPast }: Props) {
  const { leftBar } = getEventColorClasses(event.color);
  const typeLabel = event.event_type ? EVENT_TYPE_LABELS[event.event_type] ?? event.event_type : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border-t border-r border-b border-zinc-200/80 bg-white py-2.5 pl-3 pr-2 dark:border-zinc-700 dark:bg-zinc-900/80 ${leftBar} ${isPast ? "opacity-75" : ""}`}
    >
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{event.name}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {event.start_date
            ? dayjs(event.start_date).format("YYYY/MM/DD")
            : "開始日未設定"}
          {" 〜 "}
          {event.end_date
            ? dayjs(event.end_date).format("YYYY/MM/DD")
            : "終了日未設定"}
        </p>
        {typeLabel && (
          <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">タグ: {typeLabel}</p>
        )}
      </div>
      {onDeleteRequest ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("このイベントを削除しますか？")) onDeleteRequest(event.id);
          }}
          className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          削除
        </button>
      ) : (
        <form action={deleteAction}>
          <input type="hidden" name="calendar_id" value={calendarId} />
          <input type="hidden" name="id" value={event.id} />
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            削除
          </button>
        </form>
      )}
    </div>
  );
}
