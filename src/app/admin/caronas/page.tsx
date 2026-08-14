import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Clock3,
  MapPin,
  Repeat2,
  Users,
} from "lucide-react";
import { todayKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const WEEKDAYS = [
  { value: 1, short: "Seg", label: "Segunda-feira" },
  { value: 2, short: "Ter", label: "Terça-feira" },
  { value: 3, short: "Qua", label: "Quarta-feira" },
  { value: 4, short: "Qui", label: "Quinta-feira" },
  { value: 5, short: "Sex", label: "Sexta-feira" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 0, short: "Dom", label: "Domingo" },
];

interface RideSummary {
  id: string;
  date: string;
  series_id: string | null;
  ride_type: "ida" | "volta";
  time_of_day: string | null;
  origin: string;
  destination: string;
  seats_total: number;
  default_price: number;
  status: "scheduled" | "cancelled";
  ride_passengers: { status: "pending" | "confirmed" | "declined" | "no_show" }[];
}

interface RideGroup {
  key: string;
  rides: RideSummary[];
}

function dayOfWeek(date: string) {
  return new Date(`${date}T12:00:00`).getDay();
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "");
}

export default async function CaronasPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const params = await searchParams;
  const requestedDay = Number(params.dia);
  const currentWeekday = dayOfWeek(todayKey());
  const selectedDay = WEEKDAYS.some((day) => day.value === requestedDay)
    ? requestedDay
    : currentWeekday;

  const supabase = await createClient();
  const [{ data }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("rides")
      .select(
        "id, date, series_id, ride_type, time_of_day, origin, destination, seats_total, default_price, status, ride_passengers(status)",
      )
      .gte("date", todayKey())
      .order("date")
      .order("time_of_day")
      .returns<RideSummary[]>(),
    supabase
      .from("ride_passengers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const rides = data ?? [];
  const countsByDay = new Map<number, number>();
  const grouped = new Map<string, RideGroup>();

  rides.forEach((ride) => {
    const weekday = dayOfWeek(ride.date);
    countsByDay.set(weekday, (countsByDay.get(weekday) ?? 0) + 1);
    if (weekday !== selectedDay) return;

    const signature = [
      ride.series_id ?? "no-series",
      ride.ride_type,
      ride.time_of_day ?? "",
      ride.origin,
      ride.destination,
    ].join("|");
    const existing = grouped.get(signature);
    if (existing) existing.rides.push(ride);
    else grouped.set(signature, { key: signature, rides: [ride] });
  });

  const groups = Array.from(grouped.values()).sort((a, b) =>
    (a.rides[0].time_of_day ?? "").localeCompare(b.rides[0].time_of_day ?? ""),
  );
  const selectedLabel = WEEKDAYS.find((day) => day.value === selectedDay)?.label;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-route">
            Rotina semanal
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Gerenciar caronas
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Veja os horários recorrentes por dia, sem navegar data por data.
          </p>
        </div>
        <Link
          href="/admin/calendario"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-bold text-ink-soft shadow-sm hover:border-route/30 hover:text-route"
        >
          <CalendarDays size={16} />
          Abrir calendário
        </Link>
      </header>

      {(pendingCount ?? 0) > 0 ? (
        <Link
          href="/admin/solicitacoes"
          className="flex items-center justify-between gap-4 rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3.5 hover:border-warn/40 sm:px-5"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warn text-white">
              <Users size={16} />
            </span>
            <span>
              <strong className="block text-sm text-ink">
                {pendingCount} {pendingCount === 1 ? "pedido aguardando" : "pedidos aguardando"}
              </strong>
              <span className="text-xs text-ink-soft">Há vagas que precisam da sua decisão.</span>
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-warn" />
        </Link>
      ) : null}

      <nav aria-label="Dias da semana" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {WEEKDAYS.map((day) => {
          const active = day.value === selectedDay;
          const count = countsByDay.get(day.value) ?? 0;
          return (
            <Link
              key={day.value}
              href={`/admin/caronas?dia=${day.value}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center ${active ? "border-route bg-route text-white shadow-lg shadow-route/20" : "border-white/80 bg-card text-ink-soft hover:border-route/25 hover:text-route"}`}
            >
              <span className="text-sm font-bold">{day.short}</span>
              <span className={`mt-0.5 text-[10px] ${active ? "text-white/70" : "text-ink-faint"}`}>
                {count} {count === 1 ? "carona" : "caronas"}
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">Programação</p>
            <h2 className="mt-1 text-xl font-bold text-ink">{selectedLabel}</h2>
          </div>
          <span className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink-soft">
            {groups.length} {groups.length === 1 ? "horário" : "horários"}
          </span>
        </div>

        {groups.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {groups.map((group) => {
              const first = group.rides[0];
              const activeRides = group.rides.filter((ride) => ride.status === "scheduled");
              const nextRide = activeRides[0] ?? first;
              const confirmed = nextRide.ride_passengers.filter(
                (passenger) => passenger.status === "confirmed",
              ).length;
              const pending = nextRide.ride_passengers.filter(
                (passenger) => passenger.status === "pending",
              ).length;

              return (
                <article key={group.key} className="overflow-hidden rounded-3xl border border-white/85 bg-card shadow-[0_12px_35px_rgb(15_23_42/0.07)]">
                  <div className={`h-1.5 ${first.ride_type === "volta" ? "bg-accent" : "bg-route"}`} />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${first.ride_type === "volta" ? "bg-accent-soft text-accent-dark" : "bg-route-soft text-route"}`}>
                          {first.ride_type === "volta" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {first.ride_type}
                        </span>
                        <div className="mt-3 flex items-center gap-2">
                          <Clock3 size={18} className="text-ink-faint" />
                          <span className="font-mono text-2xl font-bold text-ink">
                            {first.time_of_day?.slice(0, 5) ?? "—"}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-pop-soft px-2.5 py-1.5 text-xs font-bold text-pop">
                        <Repeat2 size={13} />
                        {group.rides.length} datas
                      </span>
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-paper/60 p-3.5 text-sm text-ink">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-route" />
                      <span><strong>{first.origin}</strong> <span className="mx-1 text-ink-faint">→</span> <strong>{first.destination}</strong></span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line/70 bg-white/40 py-3 text-center">
                      <div className="px-2">
                        <p className="text-[10px] font-bold uppercase text-ink-faint">Próxima</p>
                        <p className="mt-1 text-sm font-bold text-ink">{shortDate(nextRide.date)}</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[10px] font-bold uppercase text-ink-faint">Passageiros</p>
                        <p className="mt-1 text-sm font-bold text-route">{confirmed}/{nextRide.seats_total}</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[10px] font-bold uppercase text-ink-faint">Valor</p>
                        <p className="mt-1 font-mono text-sm font-bold text-ink">{formatBRL(first.default_price)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={`text-xs font-semibold ${pending > 0 ? "text-warn" : "text-ink-faint"}`}>
                        {pending > 0 ? `${pending} aguardando aprovação` : "Nenhum pedido pendente"}
                      </span>
                      <Link
                        href={`/admin/calendario?date=${nextRide.date}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-route px-3.5 py-2 text-xs font-bold text-white hover:bg-route-dark"
                      >
                        Gerenciar
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-card px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-route-soft text-route">
              <CarFront size={21} />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">Nenhuma carona neste dia</h3>
            <p className="mt-1 text-sm text-ink-soft">Use o calendário para cadastrar um novo horário.</p>
            <Link href="/admin/calendario" className="mt-4 text-sm font-bold text-route hover:text-route-dark">
              Abrir calendário
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
