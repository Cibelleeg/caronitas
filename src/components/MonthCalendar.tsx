import type { ReactNode } from "react";
import Link from "next/link";
import {
  WEEKDAY_SHORT_LABELS,
  dateKey,
  monthGrid,
  monthLabel,
  nextMonthKey,
  previousMonthKey,
} from "@/lib/dates";

interface MonthCalendarProps {
  monthAnchor: Date;
  baseHref: string;
  monthParamName?: string;
  renderDay: (date: Date, key: string, inMonth: boolean) => ReactNode;
}

export default function MonthCalendar({
  monthAnchor,
  baseHref,
  monthParamName = "month",
  renderDay,
}: MonthCalendarProps) {
  const weeks = monthGrid(monthAnchor);
  const month = monthAnchor.getMonth();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <Link
          href={`${baseHref}?${monthParamName}=${previousMonthKey(monthAnchor)}`}
          className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          ← Anterior
        </Link>
        <h2 className="text-sm font-semibold text-neutral-900">
          {monthLabel(monthAnchor)}
        </h2>
        <Link
          href={`${baseHref}?${monthParamName}=${nextMonthKey(monthAnchor)}`}
          className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          Próximo →
        </Link>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-100 text-center text-xs font-medium text-neutral-400">
        {WEEKDAY_SHORT_LABELS.map((label, i) => (
          <div key={i} className="py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flatMap((week) =>
          week.map((day) => {
            const key = dateKey(day);
            const inMonth = day.getMonth() === month;
            return (
              <div
                key={key}
                className="min-h-20 border-b border-r border-neutral-100 p-1 last:border-r-0"
              >
                {renderDay(day, key, inMonth)}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
