import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  WEEKDAY_SHORT_LABELS,
  dateKey,
  monthGrid,
  monthLabel,
  nextMonthKey,
  previousMonthKey,
  todayKey,
} from "@/lib/dates";

interface MonthCalendarProps {
  monthAnchor: Date;
  baseHref: string;
  monthParamName?: string;
  spacious?: boolean;
  fixedHeight?: boolean;
  renderDay: (date: Date, key: string, inMonth: boolean) => ReactNode;
}

export default function MonthCalendar({
  monthAnchor,
  baseHref,
  monthParamName = "month",
  spacious = false,
  fixedHeight = false,
  renderDay,
}: MonthCalendarProps) {
  const weeks = monthGrid(monthAnchor);
  const month = monthAnchor.getMonth();
  const today = todayKey();

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-line/80 bg-card shadow-[0_12px_40px_rgb(15_23_42/0.06)] ${
        fixedHeight ? "flex h-full flex-col" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-line/70 bg-gradient-to-r from-route-soft/80 via-white to-accent-soft/60 px-4 py-4">
        <Link
          href={`${baseHref}?${monthParamName}=${previousMonthKey(monthAnchor)}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-route hover:border-line hover:bg-white hover:shadow-sm"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </Link>
        <h2 className="font-display text-base font-bold capitalize text-ink">
          {monthLabel(monthAnchor)}
        </h2>
        <Link
          href={`${baseHref}?${monthParamName}=${nextMonthKey(monthAnchor)}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-route hover:border-line hover:bg-white hover:shadow-sm"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-7 border-b border-line/70 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {WEEKDAY_SHORT_LABELS.map((label, i) => (
          <div key={i} className="py-2">
            {label}
          </div>
        ))}
      </div>

      <div
        className={`grid grid-cols-7 ${fixedHeight ? "min-h-0 flex-1" : ""}`}
        style={
          fixedHeight
            ? { gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {weeks.flatMap((week) =>
          week.map((day) => {
            const key = dateKey(day);
            const inMonth = day.getMonth() === month;
            const isToday = key === today;
            return (
              <div
                key={key}
                className={`relative border-b border-r border-line/60 p-1 last:border-r-0 sm:p-1.5 ${
                  spacious
                    ? "min-h-20 sm:min-h-24 lg:min-h-28"
                    : "min-h-16 sm:min-h-20"
                } ${fixedHeight ? "!min-h-0" : ""}`}
              >
                {isToday ? (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                ) : null}
                {renderDay(day, key, inMonth)}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
