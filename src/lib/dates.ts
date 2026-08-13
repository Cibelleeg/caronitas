import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const WEEKDAY_SHORT_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Grade de semanas (cada uma com 7 dias) cobrindo o mês inteiro do `monthAnchor`. */
export function monthGrid(monthAnchor: Date): Date[][] {
  const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function monthLabel(monthAnchor: Date): string {
  const label = format(monthAnchor, "MMMM yyyy");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthKey(monthAnchor: Date): string {
  return format(monthAnchor, "yyyy-MM");
}

export function nextMonthKey(monthAnchor: Date): string {
  return format(addMonths(monthAnchor, 1), "yyyy-MM");
}

export function previousMonthKey(monthAnchor: Date): string {
  return format(subMonths(monthAnchor, 1), "yyyy-MM");
}

export function parseMonthKey(key: string | undefined): Date {
  if (!key) return startOfMonth(new Date());
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Todas as datas com o `weekday` informado (0=domingo) dentro do intervalo, inclusive. */
export function datesForWeekdayInRange(
  weekday: number,
  startDate: Date,
  endDate: Date,
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(startDate);
  while (cursor.getDay() !== weekday) {
    cursor = addDays(cursor, 1);
  }
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return dates;
}
