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
  compact?: boolean;
  queryParams?: Record<string, string | undefined>;
  renderDay: (date: Date, key: string, inMonth: boolean) => ReactNode;
}

export default function MonthCalendar({
  monthAnchor,
  baseHref,
  monthParamName = "month",
  spacious = false,
  fixedHeight = false,
  compact = false,
  queryParams = {},
  renderDay,
}: MonthCalendarProps) {
  const weeks = monthGrid(monthAnchor);
  const month = monthAnchor.getMonth();
  const today = todayKey();
  const monthHref = (value: string) => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, paramValue]) => {
      if (paramValue) params.set(key, paramValue);
    });
    params.set(monthParamName, value);
    return `${baseHref}?${params.toString()}`;
  };

  return (
    <div
      className={`overflow-hidden rounded-3xl ${compact ? "" : "border border-line/80 bg-card shadow-[0_12px_40px_rgb(15_23_42/0.06)]"} ${
        fixedHeight ? "flex h-full flex-col" : ""
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? "px-1 pb-3" : "border-b border-line/70 bg-gradient-to-r from-route-soft/80 via-white to-accent-soft/60 px-4 py-4"}`}>
        <Link
          href={monthHref(previousMonthKey(monthAnchor))}
          className={`flex items-center justify-center text-route hover:bg-white/70 ${compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl border border-transparent hover:border-line hover:shadow-sm"}`}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </Link>
        <h2 className="font-display text-base font-bold capitalize text-ink">
          {monthLabel(monthAnchor)}
        </h2>
        <Link
          href={monthHref(nextMonthKey(monthAnchor))}
          className={`flex items-center justify-center text-route hover:bg-white/70 ${compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl border border-transparent hover:border-line hover:shadow-sm"}`}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className={`grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint ${compact ? "" : "border-b border-line/70"}`}>
        {WEEKDAY_SHORT_LABELS.map((label, i) => (
          <div key={i} className={compact ? "pb-2" : "py-2"}>
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
                className={`relative ${compact ? "p-0.5" : "border-b border-r border-line/60 p-1 last:border-r-0 sm:p-1.5"} ${
                  compact
                    ? "min-h-12"
                    : spacious
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
