import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  LogIn,
  Search,
} from "lucide-react";
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

function timeLabel(ride: { label: string; time_of_day: string | null }) {
  return ride.time_of_day
    ? `${ride.label} · ${ride.time_of_day.slice(0, 5)}`
    : ride.label;
}

export default async function PublicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const monthAnchor = parseMonthKey(params.month);
  const selectedDateKey = params.date ?? todayKey();
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

  const ridesByDate = new Map<string, PublicRide[]>();
  (rides ?? []).forEach((r) => {
    const list = ridesByDate.get(r.date) ?? [];
    list.push(r);
    ridesByDate.set(r.date, list);
  });

  const selectedRides = ridesByDate.get(selectedDateKey) ?? [];
  const isFutureDay = selectedDateKey >= today;

  const confirmedCounts = await Promise.all(
    selectedRides.map((r) =>
      supabase
        .rpc("ride_confirmed_count", { p_ride_id: r.id })
        .then(({ data }) => [r.id, data ?? 0] as const),
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

  return (
    <div className="min-h-screen flex-1 bg-[#f5f7fb]">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[96rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Logo />
          </div>
            <div className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
              <Link
                href="/consulta"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-ink-soft hover:bg-white hover:text-ink hover:shadow-sm"
              >
                <Search size={15} />
                <span className="hidden sm:inline">Consultar saldo</span>
                <span className="sm:hidden">Saldo</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white/70 px-3 py-2 text-ink-soft shadow-sm hover:border-stone-300 hover:text-ink"
              >
                <LogIn size={15} />
                Motorista
              </Link>
            </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[96rem] px-5 py-5 pb-10 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(19rem,0.7fr)_minmax(34rem,1.3fr)] lg:gap-6">
          <section className="flex w-full flex-col rounded-[1.75rem] border border-line/70 bg-white p-3 shadow-[0_12px_40px_rgb(15_23_42/0.07)] sm:p-4 lg:sticky lg:top-6 lg:h-[46rem]">
            <div className="mb-3 flex items-end justify-between px-1 pb-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-route">
                  Agenda de caronas
                </p>
                <h2 className="mt-1 text-base font-semibold text-ink">
                  Escolha uma data
                </h2>
              </div>
              <span className="hidden items-center gap-1.5 text-xs text-ink-faint sm:flex">
                <span className="h-2 w-2 rounded-full bg-accent" /> Hoje
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <MonthCalendar
                monthAnchor={monthAnchor}
                baseHref="/"
                fixedHeight
                renderDay={(day, key, inMonth) => {
                const dayRides = ridesByDate.get(key) ?? [];
                const isSelected = key === selectedDateKey;

                return (
                  <Link
                    href={`/?month=${monthKeyForLinks}&date=${key}`}
                    className={`flex h-full flex-col gap-1 rounded-xl p-1.5 text-xs transition-colors sm:p-2 ${
                      isSelected
                        ? "bg-route text-white shadow-md shadow-route/20"
                        : "hover:bg-route-soft hover:text-route"
                    } ${inMonth ? "" : "opacity-35"}`}
                  >
                    <span className={`font-semibold ${isSelected ? "text-white" : "text-ink"}`}>
                      {day.getDate()}
                    </span>
                    {dayRides.length > 0 ? (
                      <span className="mt-auto flex flex-wrap gap-1">
                        {dayRides.slice(0, 2).map((ride) => (
                          <span
                            key={ride.id}
                            className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[8px] font-bold uppercase sm:text-[9px] ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : ride.ride_type === "volta"
                                  ? "bg-accent-soft text-accent-dark"
                                  : "bg-route-soft text-route"
                            }`}
                          >
                            {ride.ride_type === "volta" ? (
                              <ArrowDownLeft size={9} />
                            ) : (
                              <ArrowUpRight size={9} />
                            )}
                            <span className="hidden sm:inline">
                              {ride.ride_type}
                            </span>
                          </span>
                        ))}
                        {dayRides.length > 2 ? (
                          <span className="text-[9px] font-bold">+{dayRides.length - 2}</span>
                        ) : null}
                      </span>
                    ) : null}
                  </Link>
                );
                }}
              />
            </div>
          </section>

          <aside className="w-full rounded-[1.75rem] border border-line/80 bg-white p-4 shadow-[0_12px_40px_rgb(15_23_42/0.07)] sm:p-5 lg:min-h-[46rem]">
            {isFutureDay ? (
              <RequestVagaPanel
                dateKey={selectedDateKey}
                rides={selectedRides.map(
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
                )}
                action={requestSeatPublic}
              />
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-route">Data selecionada</p>
                <h2 className="mt-1 font-display text-lg font-bold text-ink">
                  {longDateLabel(selectedDateKey)}
                </h2>
                {selectedRides.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-center">
                    <p className="text-sm font-medium text-ink">Nenhuma carona nesse dia</p>
                    <p className="mt-1 text-xs text-ink-soft">Escolha outra data no calendário.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {selectedRides.map((ride) => (
                      <div key={ride.id} className="rounded-2xl border border-line bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-ink">{timeLabel(ride)}</h3>
                          <span className="font-mono text-sm font-semibold text-route">{formatBRL(ride.default_price)}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {confirmedByRide.get(ride.id) ?? 0}/{ride.seats_total} vagas ocupadas
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </aside>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-faint">
          Precisa conferir um pedido ou pagamento?
            <Link
              href="/consulta"
              className="flex items-center gap-1 font-semibold text-route hover:text-route-dark"
            >
              Consultar agora <ArrowRight size={13} />
            </Link>
        </div>
      </main>
    </div>
  );
}
