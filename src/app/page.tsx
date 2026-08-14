import Link from "next/link";
import { ArrowRight, Filter, LogIn, Search, X } from "lucide-react";
import Logo from "@/components/Logo";
import MonthCalendar from "@/components/MonthCalendar";
import RequestVagaPanel, { type RideSlot } from "@/components/RequestVagaPanel";
import { createClient } from "@/lib/supabase/server";
import {
  dateKey,
  longDateLabel,
  monthGrid,
  monthKey,
  parseMonthKey,
  todayKey,
} from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { requestSeatPublic } from "./actions";

interface PublicRide {
  id: string;
  date: string;
  label: string;
  time_of_day: string | null;
  status: "scheduled" | "cancelled";
  seats_total: number;
  default_price: number;
  ride_type: "ida" | "volta";
  origin: string;
  destination: string;
  notes: string | null;
}

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    date?: string;
    dia?: string;
    tipo?: string;
    horario?: string;
  }>;
}) {
  const params = await searchParams;
  const monthAnchor = parseMonthKey(params.month);
  let selectedDateKey = params.date ?? todayKey();
  const monthKeyForLinks = monthKey(monthAnchor);
  const today = todayKey();
  const supabase = await createClient();
  const weeks = monthGrid(monthAnchor);
  const rangeStart = dateKey(weeks[0][0]);
  const rangeEnd = dateKey(weeks[weeks.length - 1][6]);

  const { data: rides } = await supabase
    .from("rides")
    .select(
      "id, date, label, origin, destination, time_of_day, status, seats_total, default_price, ride_type, notes",
    )
    .eq("status", "scheduled")
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("time_of_day", { ascending: true, nullsFirst: false })
    .returns<PublicRide[]>();

  const availableTimes = Array.from(
    new Set(
      (rides ?? []).flatMap((ride) =>
        ride.time_of_day ? [ride.time_of_day.slice(0, 5)] : [],
      ),
    ),
  ).sort();
  const filteredRides = (rides ?? []).filter((ride) => {
    const weekday = new Date(`${ride.date}T12:00:00`).getDay();
    if (params.dia && weekday !== Number(params.dia)) return false;
    if (params.tipo && ride.ride_type !== params.tipo) return false;
    if (
      params.horario &&
      ride.time_of_day?.slice(0, 5) !== params.horario
    ) {
      return false;
    }
    return true;
  });
  const ridesByDate = new Map<string, PublicRide[]>();
  filteredRides.forEach((ride) => {
    const list = ridesByDate.get(ride.date) ?? [];
    list.push(ride);
    ridesByDate.set(ride.date, list);
  });

  const hasActiveFilters = Boolean(params.dia || params.tipo || params.horario);
  if (hasActiveFilters && !ridesByDate.has(selectedDateKey)) {
    const firstMatchingRide = filteredRides.find((ride) => ride.date >= today);
    selectedDateKey = firstMatchingRide?.date ?? filteredRides[0]?.date ?? selectedDateKey;
  }

  const selectedRides = ridesByDate.get(selectedDateKey) ?? [];
  const confirmedCounts = await Promise.all(
    selectedRides.map((ride) =>
      supabase
        .rpc("ride_confirmed_count", { p_ride_id: ride.id })
        .then(({ data }) => [ride.id, data ?? 0] as const),
    ),
  );
  const confirmedByRide = new Map(confirmedCounts);
  const { data: publicPassengerNames } = selectedRides.length
    ? await supabase.rpc("ride_passenger_names", {
        p_ride_ids: selectedRides.map((ride) => ride.id),
      })
    : { data: [] };
  const passengerNamesByRide = new Map<string, string[]>();
  (publicPassengerNames ?? []).forEach((passenger) => {
    const names = passengerNamesByRide.get(passenger.ride_id) ?? [];
    names.push(passenger.full_name);
    passengerNamesByRide.set(passenger.ride_id, names);
  });
  const rideSlots = selectedRides.map(
    (ride): RideSlot => ({
      id: ride.id,
      label: ride.label,
      origin: ride.origin,
      destination: ride.destination,
      time: ride.time_of_day ? ride.time_of_day.slice(0, 5) : "",
      price: ride.default_price,
      rideType: ride.ride_type,
      notes: ride.notes,
      seatsTotal: ride.seats_total,
      seatsConfirmed: confirmedByRide.get(ride.id) ?? 0,
      passengerNames: passengerNamesByRide.get(ride.id) ?? [],
    }),
  );
  const dayHref = (date: string) => {
    const query = new URLSearchParams({ month: monthKeyForLinks, date });
    if (params.dia) query.set("dia", params.dia);
    if (params.tipo) query.set("tipo", params.tipo);
    if (params.horario) query.set("horario", params.horario);
    return `/?${query.toString()}`;
  };

  return (
    <div className="relative min-h-screen flex-1 overflow-hidden bg-[linear-gradient(155deg,#eef1ff_0%,#f6efff_48%,#fff2e9_100%)]">
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-route/20 blur-[95px]" />
      <div className="pointer-events-none absolute -right-28 top-12 h-96 w-96 rounded-full bg-accent/20 blur-[105px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-pop/15 blur-[105px]" />

      <main className="relative z-10 mx-auto w-full max-w-[45rem] px-4 py-5 pb-10 sm:py-6">
        <header className="mb-5 flex items-center justify-between gap-2 rounded-full border border-white/85 bg-white/60 p-2 pl-3 shadow-[0_8px_32px_rgb(31_41_90/0.11)] backdrop-blur-xl sm:gap-3 sm:pl-4">
          <Logo />
          <nav className="flex shrink-0 items-center gap-1 text-xs">
            <Link
              href="/consulta"
              aria-label="Consultar saldo"
              title="Consultar saldo"
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 py-2 font-medium text-ink-soft hover:bg-white/70 hover:text-ink max-[430px]:w-9 max-[430px]:px-0"
            >
              <Search size={15} />
              <span className="max-[430px]:sr-only">Saldo</span>
            </Link>
            <Link
              href="/login"
              aria-label="Acessar área da motorista"
              title="Área da motorista"
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-2 font-semibold text-white shadow-sm hover:bg-ink/90 max-[430px]:w-9 max-[430px]:px-0"
            >
              <LogIn size={15} />
              <span className="max-[430px]:sr-only">Motorista</span>
            </Link>
          </nav>
        </header>

        <form
          method="get"
          className="mb-4 rounded-[1.4rem] border border-white/85 bg-white/55 p-3 shadow-[0_8px_28px_rgb(31_41_90/0.08)] backdrop-blur-xl"
        >
          <input type="hidden" name="month" value={monthKeyForLinks} />
          <div className="flex items-center gap-2 px-1 pb-2">
            <Filter size={14} className="text-route" />
            <span className="text-xs font-semibold text-ink">Encontrar carona</span>
            {hasActiveFilters ? (
              <Link
                href={`/?month=${monthKeyForLinks}`}
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-ink-soft hover:text-route"
              >
                <X size={12} /> Limpar
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <select
              name="dia"
              defaultValue={params.dia ?? ""}
              aria-label="Dia da semana"
              className="rounded-xl border border-white/90 bg-white/70 px-3 py-2 text-xs text-ink outline-none focus:border-route"
            >
              <option value="">Todos os dias</option>
              <option value="1">Segunda-feira</option>
              <option value="2">Terça-feira</option>
              <option value="3">Quarta-feira</option>
              <option value="4">Quinta-feira</option>
              <option value="5">Sexta-feira</option>
              <option value="6">Sábado</option>
              <option value="0">Domingo</option>
            </select>
            <select
              name="tipo"
              defaultValue={params.tipo ?? ""}
              aria-label="Tipo de carona"
              className="rounded-xl border border-white/90 bg-white/70 px-3 py-2 text-xs text-ink outline-none focus:border-route"
            >
              <option value="">Ida e volta</option>
              <option value="ida">Somente ida</option>
              <option value="volta">Somente volta</option>
            </select>
            <select
              name="horario"
              defaultValue={params.horario ?? ""}
              aria-label="Horário da carona"
              className="rounded-xl border border-white/90 bg-white/70 px-3 py-2 text-xs text-ink outline-none focus:border-route"
            >
              <option value="">Todos os horários</option>
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <button className="col-span-2 rounded-xl bg-gradient-to-r from-route to-pop px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-route/15 sm:col-span-1">
              Filtrar
            </button>
          </div>
        </form>

        <section className="rounded-[1.65rem] border border-white/85 bg-white/60 p-4 shadow-[0_8px_32px_rgb(31_41_90/0.11)] backdrop-blur-xl sm:px-5 sm:py-4">
          <MonthCalendar
            monthAnchor={monthAnchor}
            baseHref="/"
            compact
            queryParams={{
              dia: params.dia,
              tipo: params.tipo,
              horario: params.horario,
            }}
            renderDay={(day, key, inMonth) => {
              const dayRides = ridesByDate.get(key) ?? [];
              const isSelected = key === selectedDateKey;
              const hasIda = dayRides.some((ride) => ride.ride_type === "ida");
              const hasVolta = dayRides.some((ride) => ride.ride_type === "volta");

              return (
                <Link
                  href={dayHref(key)}
                  className={`flex h-full flex-col items-center justify-center gap-1 rounded-xl text-xs ${
                    inMonth ? "" : "opacity-30"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                      isSelected
                        ? "bg-gradient-to-br from-route to-pop text-white shadow-[0_6px_16px_rgb(57_73_224/0.32)]"
                        : "text-ink hover:bg-white/70"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="flex min-h-1.5 gap-1">
                    {hasIda ? <span className="h-1.5 w-1.5 rounded-full bg-route" /> : null}
                    {hasVolta ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  </span>
                </Link>
              );
            }}
          />
        </section>

        <div className="mt-6">
          {selectedDateKey >= today ? (
            <RequestVagaPanel
              dateKey={selectedDateKey}
              rides={rideSlots}
              action={requestSeatPublic}
            />
          ) : (
            <section>
              <div className="mb-5 text-center">
                <h1 className="font-display text-xl font-bold text-ink">
                  {longDateLabel(selectedDateKey)}
                </h1>
                <p className="mt-1 text-xs text-ink-soft">Histórico de caronas</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedRides.map((ride) => (
                  <article key={ride.id} className="rounded-[1.65rem] border border-white/85 bg-white/65 p-5 text-center shadow-lg backdrop-blur-xl">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${ride.ride_type === "volta" ? "bg-accent-soft text-accent-dark" : "bg-route-soft text-route"}`}>
                      {ride.ride_type}
                    </span>
                    <p className="mt-4 font-display text-4xl font-bold text-ink">{ride.time_of_day?.slice(0, 5) ?? "—"}</p>
                    <p className="mt-2 text-xs text-ink-soft">{ride.origin} <ArrowRight size={12} className="inline" /> {ride.destination}</p>
                    <p className="mt-4 font-mono text-xs font-semibold text-ink-soft">{formatBRL(ride.default_price)} / pessoa</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="mt-7 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
          Precisa conferir um pedido ou pagamento?
          <Link href="/consulta" className="font-semibold text-route hover:text-route-dark">
            Consultar
          </Link>
        </footer>
      </main>
    </div>
  );
}
