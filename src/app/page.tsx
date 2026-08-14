import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ListFilter, LogIn, Search } from "lucide-react";
import Logo from "@/components/Logo";
import MonthCalendar from "@/components/MonthCalendar";
import RequestVagaPanel, { type RideSlot } from "@/components/RequestVagaPanel";
import { createClient } from "@/lib/supabase/server";
import { dateKey, monthGrid, monthKey, parseMonthKey, todayKey } from "@/lib/dates";
import { requestSeatPublic } from "./actions";

const WEEKDAYS = [
  { value: 1, short: "Seg", label: "Segunda-feira" },
  { value: 2, short: "Ter", label: "Terça-feira" },
  { value: 3, short: "Qua", label: "Quarta-feira" },
  { value: 4, short: "Qui", label: "Quinta-feira" },
  { value: 5, short: "Sex", label: "Sexta-feira" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 0, short: "Dom", label: "Domingo" },
];

interface PublicRide {
  id: string;
  date: string;
  series_id: string | null;
  label: string;
  time_of_day: string | null;
  seats_total: number;
  default_price: number;
  ride_type: "ida" | "volta";
  origin: string;
  destination: string;
  notes: string | null;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  return result;
}

function weekRangeLabel(start: Date, end: Date) {
  const startDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric" }).format(start);
  const endLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(end);
  return `${startDay} a ${endLabel}`;
}

export default async function PublicRidesPage({ searchParams }: {
  searchParams: Promise<{ view?: string; month?: string; date?: string; week?: string; tipo?: string }>;
}) {
  const params = await searchParams;
  const calendarView = params.view === "calendario";
  const today = todayKey();
  const monthAnchor = parseMonthKey(params.month);
  const monthKeyForLinks = monthKey(monthAnchor);
  const weeks = monthGrid(monthAnchor);
  const weekAnchor = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
    ? new Date(`${params.week}T12:00:00`)
    : new Date(`${today}T12:00:00`);
  const weekStart = startOfWeek(weekAnchor);
  const weekEnd = addDays(weekStart, 6);
  const weekStartKey = dateKey(weekStart);
  const weekEndKey = dateKey(weekEnd);
  const weekDays = WEEKDAYS.map((day, index) => ({ ...day, date: addDays(weekStart, index) }));
  const requestedDate = params.date;
  const defaultWeekDate = today >= weekStartKey && today <= weekEndKey ? today : weekStartKey;
  const selectedDate = requestedDate && requestedDate >= weekStartKey && requestedDate <= weekEndKey
    ? requestedDate
    : defaultWeekDate;
  const supabase = await createClient();

  let query = supabase
    .from("rides")
    .select("id, date, series_id, label, origin, destination, time_of_day, seats_total, default_price, ride_type, notes")
    .eq("status", "scheduled")
    .order("date")
    .order("time_of_day", { ascending: true, nullsFirst: false });
  query = calendarView
    ? query.gte("date", dateKey(weeks[0][0])).lte("date", dateKey(weeks[weeks.length - 1][6]))
    : query.gte("date", weekStartKey).lte("date", weekEndKey);
  const { data } = await query.returns<PublicRide[]>();
  const rides = data ?? [];

  const ridesByDate = new Map<string, PublicRide[]>();
  rides.forEach((ride) => {
    const dateRides = ridesByDate.get(ride.date) ?? [];
    dateRides.push(ride);
    ridesByDate.set(ride.date, dateRides);
  });

  let displayedRides: PublicRide[];
  if (calendarView) {
    displayedRides = selectedDate < today
      ? []
      : (ridesByDate.get(selectedDate) ?? []).filter(
          (ride) => !params.tipo || ride.ride_type === params.tipo,
        );
  } else {
    displayedRides = selectedDate < today
      ? []
      : (ridesByDate.get(selectedDate) ?? []).filter(
          (ride) => !params.tipo || ride.ride_type === params.tipo,
        );
  }

  const confirmedCounts = await Promise.all(
    displayedRides.map((ride) =>
      supabase.rpc("ride_confirmed_count", { p_ride_id: ride.id }).then(({ data: count }) => [ride.id, count ?? 0] as const),
    ),
  );
  const confirmedByRide = new Map(confirmedCounts);
  const { data: publicNames } = displayedRides.length
    ? await supabase.rpc("ride_passenger_names", { p_ride_ids: displayedRides.map((ride) => ride.id) })
    : { data: [] };
  const namesByRide = new Map<string, string[]>();
  (publicNames ?? []).forEach((passenger) => {
    const names = namesByRide.get(passenger.ride_id) ?? [];
    names.push(passenger.full_name);
    namesByRide.set(passenger.ride_id, names);
  });
  const rideSlots = displayedRides.map((ride): RideSlot => ({
    id: ride.id,
    label: ride.label,
    origin: ride.origin,
    destination: ride.destination,
    time: ride.time_of_day?.slice(0, 5) ?? "",
    price: ride.default_price,
    rideType: ride.ride_type,
    notes: ride.notes,
    seatsTotal: ride.seats_total,
    seatsConfirmed: confirmedByRide.get(ride.id) ?? 0,
    passengerNames: namesByRide.get(ride.id) ?? [],
  }));

  return (
    <div className="relative min-h-screen flex-1 overflow-hidden bg-[linear-gradient(155deg,#eef1ff_0%,#f6efff_48%,#fff2e9_100%)]">
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-route/20 blur-[95px]" />
      <div className="pointer-events-none absolute -right-28 top-12 h-96 w-96 rounded-full bg-accent/20 blur-[105px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-pop/15 blur-[105px]" />
      <main className="relative z-10 mx-auto w-full max-w-[52rem] px-4 py-5 pb-10 sm:py-6">
        <header className="mb-5 flex items-center justify-between gap-2 rounded-full border border-white/85 bg-white/60 p-2 pl-3 shadow-[0_8px_32px_rgb(31_41_90/0.11)] backdrop-blur-xl sm:pl-4">
          <Logo />
          <nav className="flex shrink-0 items-center gap-1 text-xs">
            <Link href="/consulta" aria-label="Consultar caronas" title="Consultar caronas" className="flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 py-2 font-medium text-ink-soft hover:bg-white/70 hover:text-ink max-[430px]:w-9 max-[430px]:px-0">
              <Search size={15} /><span className="max-[430px]:sr-only">Consultar</span>
            </Link>
            <Link href="/login" aria-label="Área da motorista" title="Área da motorista" className="flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-2 font-semibold text-white max-[430px]:w-9 max-[430px]:px-0">
              <LogIn size={15} /><span className="max-[430px]:sr-only">Motorista</span>
            </Link>
          </nav>
        </header>

        <section className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-route">Encontre sua carona</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{calendarView ? "Caronas por data" : `Semana de ${weekRangeLabel(weekStart, weekEnd)}`}</h1>
            <p className="mt-1 text-sm text-ink-soft">{calendarView ? "Escolha uma data para conferir os horários." : "Escolha um dia e solicite uma vaga avulsa ou fixa."}</p>
          </div>
          <Link href={calendarView ? "/" : `/?view=calendario&month=${monthKeyForLinks}&date=${today}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/90 bg-white/65 px-3.5 text-xs font-bold text-ink-soft shadow-sm backdrop-blur-xl hover:text-route">
            {calendarView ? <ListFilter size={15} /> : <CalendarDays size={15} />}
            {calendarView ? "Visão semanal" : "Ver calendário"}
          </Link>
        </section>

        {!calendarView ? (
          <>
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/85 bg-white/45 p-1.5 backdrop-blur-xl">
              <Link
                href={`/?week=${dateKey(addDays(weekStart, -7))}`}
                aria-label="Semana anterior"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-white hover:text-route"
              >
                <ChevronLeft size={18} />
              </Link>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Semana</p>
                <p className="text-sm font-bold capitalize text-ink">{weekRangeLabel(weekStart, weekEnd)}</p>
              </div>
              <Link
                href={`/?week=${dateKey(addDays(weekStart, 7))}`}
                aria-label="Próxima semana"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-white hover:text-route"
              >
                <ChevronRight size={18} />
              </Link>
            </div>
            <nav aria-label="Dias da semana" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {weekDays.map((day) => {
                const key = dateKey(day.date);
                const active = key === selectedDate;
                const count = ridesByDate.get(key)?.length ?? 0;
                const nextParams = new URLSearchParams({ week: weekStartKey, date: key });
                if (params.tipo) nextParams.set("tipo", params.tipo);
                return (
                  <Link key={key} href={`/?${nextParams.toString()}`} aria-current={active ? "page" : undefined} className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-2 py-2 ${active ? "border-route bg-gradient-to-br from-route to-pop text-white shadow-lg shadow-route/20" : "border-white/85 bg-white/60 text-ink-soft backdrop-blur-xl hover:border-route/25 hover:text-route"}`}>
                    <span className="text-sm font-bold">{day.short}</span>
                    <span className={`text-lg font-bold leading-5 ${active ? "text-white" : "text-ink"}`}>{day.date.getDate()}</span>
                    <span className={`mt-0.5 text-[9px] ${active ? "text-white/70" : "text-ink-faint"}`}>{count} {count === 1 ? "carona" : "caronas"}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-white/85 bg-white/45 p-1.5 backdrop-blur-xl">
              {[{ value: "", label: "Ida e volta" }, { value: "ida", label: "Ida" }, { value: "volta", label: "Volta" }].map((type) => {
                const active = (params.tipo ?? "") === type.value;
                const nextParams = new URLSearchParams({ week: weekStartKey, date: selectedDate });
                if (type.value) nextParams.set("tipo", type.value);
                return <Link key={type.value} href={`/?${nextParams.toString()}`} className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${active ? "bg-white text-route shadow-sm" : "text-ink-soft hover:text-ink"}`}>{type.label}</Link>;
              })}
            </div>
          </>
        ) : (
          <section className="rounded-[1.65rem] border border-white/85 bg-white/60 p-4 shadow-[0_8px_32px_rgb(31_41_90/0.11)] backdrop-blur-xl sm:px-5 sm:py-4">
            <MonthCalendar monthAnchor={monthAnchor} baseHref="/" compact queryParams={{ view: "calendario" }} renderDay={(day, key, inMonth) => {
              const dayRides = ridesByDate.get(key) ?? [];
              const active = key === selectedDate;
              return <Link href={`/?view=calendario&month=${monthKeyForLinks}&date=${key}`} className={`flex h-full flex-col items-center justify-center gap-1 rounded-xl text-xs ${inMonth ? "" : "opacity-30"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${active ? "bg-gradient-to-br from-route to-pop text-white shadow-md" : "text-ink hover:bg-white/70"}`}>{day.getDate()}</span>
                <span className="flex min-h-1.5 gap-1">
                  {dayRides.some((ride) => ride.ride_type === "ida") ? <span className="h-1.5 w-1.5 rounded-full bg-route" /> : null}
                  {dayRides.some((ride) => ride.ride_type === "volta") ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                </span>
              </Link>;
            }} />
          </section>
        )}

        <div className="mt-6">
          <RequestVagaPanel dateKey={selectedDate} rides={rideSlots} action={requestSeatPublic} />
        </div>
        <footer className="mt-7 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
          Precisa conferir um pedido ou pagamento?
          <Link href="/consulta" className="font-semibold text-route hover:text-route-dark">Consultar</Link>
        </footer>
      </main>
    </div>
  );
}
