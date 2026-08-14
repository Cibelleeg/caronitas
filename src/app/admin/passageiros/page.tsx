import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPassengerBalances } from "@/lib/balances";
import { formatBRL } from "@/lib/money";
import { addPassenger } from "./actions";
import DeletePassengerButton from "./DeletePassengerButton";
import BatchFixedPassengersForm from "./BatchFixedPassengersForm";
import PendingPaymentForm, {
  type PendingRidePayment,
} from "./PendingPaymentForm";

interface UpcomingRide {
  id: string;
  date: string;
  label: string;
  time_of_day: string | null;
  default_price: number;
  seats_total: number;
  series_id: string | null;
  horario_id: string | null;
  ride_type: "ida" | "volta";
  ride_passengers: {
    passenger_id: string;
    status: "pending" | "confirmed" | "declined" | "no_show";
  }[];
}

interface PastConfirmedParticipation {
  id: string;
  passenger_id: string;
  price: number;
  rides: {
    date: string;
    label: string;
    time_of_day: string | null;
    ride_type: "ida" | "volta";
  } | null;
}

interface TodayParticipation {
  passenger_id: string;
  rides: { date: string } | null;
}

interface PassengerFilters {
  nome?: string;
  financeiro?: string;
  hoje?: string;
}

export default async function PassageirosPage({
  searchParams,
}: {
  searchParams: Promise<PassengerFilters>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: passengers },
    { data: settings },
    { data: upcomingRides },
    { data: pastParticipations },
    { data: linkedPayments },
    { data: todayParticipations },
    balances,
  ] = await Promise.all([
    supabase.from("passengers").select("id, full_name, phone").order("full_name"),
    supabase
      .from("app_settings")
      .select("default_price, semester_end")
      .single(),
    supabase
      .from("rides")
      .select(
        "id, date, label, time_of_day, default_price, seats_total, series_id, horario_id, ride_type, ride_passengers(passenger_id, status)",
      )
      .eq("status", "scheduled")
      .gte("date", today)
      .order("date")
      .order("time_of_day", { ascending: true, nullsFirst: false })
      .limit(80)
      .returns<UpcomingRide[]>(),
    supabase
      .from("ride_passengers")
      .select(
        "id, passenger_id, price, rides(date, label, time_of_day, ride_type)",
      )
      .eq("status", "confirmed")
      .lt("rides.date", today)
      .returns<PastConfirmedParticipation[]>(),
    supabase
      .from("payments")
      .select("ride_passenger_id")
      .not("ride_passenger_id", "is", null),
    supabase
      .from("ride_passengers")
      .select("passenger_id, rides!inner(date)")
      .eq("status", "confirmed")
      .eq("rides.date", today)
      .returns<TodayParticipation[]>(),
    getPassengerBalances(),
  ]);

  const balanceByPassenger = new Map(balances.map((b) => [b.passengerId, b]));
  const paidParticipationIds = new Set(
    (linkedPayments ?? []).flatMap((payment) =>
      payment.ride_passenger_id ? [payment.ride_passenger_id] : [],
    ),
  );
  const pendingPaymentsByPassenger = new Map<string, PendingRidePayment[]>();
  (pastParticipations ?? []).forEach((participation) => {
    if (!participation.rides || paidParticipationIds.has(participation.id)) return;
    const ride = participation.rides;
    const dateLabel = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${ride.date}T12:00:00`));
    const list = pendingPaymentsByPassenger.get(participation.passenger_id) ?? [];
    list.push({
      id: participation.id,
      amount: Number(participation.price),
      label: `${dateLabel} · ${ride.ride_type === "volta" ? "Volta" : "Ida"} · ${ride.label}${ride.time_of_day ? ` ${ride.time_of_day.slice(0, 5)}` : ""}`,
    });
    pendingPaymentsByPassenger.set(participation.passenger_id, list);
  });
  const passengersWithRideToday = new Set(
    (todayParticipations ?? []).map(
      (participation) => participation.passenger_id,
    ),
  );
  const normalizedName = filters.nome?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const filteredPassengers = (passengers ?? []).filter((passenger) => {
    const balance = balanceByPassenger.get(passenger.id);
    const isDebtor = (balance?.openAmount ?? 0) > 0;
    const hasRideToday = passengersWithRideToday.has(passenger.id);

    if (
      normalizedName &&
      !passenger.full_name.toLocaleLowerCase("pt-BR").includes(normalizedName)
    ) {
      return false;
    }
    if (filters.financeiro === "devedor" && !isDebtor) return false;
    if (filters.financeiro === "em_dia" && isDebtor) return false;
    if (filters.hoje === "com_carona" && !hasRideToday) return false;
    if (filters.hoje === "sem_carona" && hasRideToday) return false;
    return true;
  });
  const seenSequences = new Set<string>();
  const rideSequences = (upcomingRides ?? []).flatMap((ride) => {
    const weekday = new Date(`${ride.date}T12:00:00`).getDay();
    const sequenceKey = ride.series_id
      ? `series:${ride.series_id}`
      : ride.horario_id
        ? `horario:${ride.horario_id}`
        : `${ride.ride_type}:${ride.label}:${ride.time_of_day ?? ""}:${weekday}`;
    if (seenSequences.has(sequenceKey)) return [];
    seenSequences.add(sequenceKey);
    const dateLabel = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(`${ride.date}T12:00:00`));
    return [
      {
        id: ride.id,
        label: `${ride.ride_type === "volta" ? "Volta" : "Ida"} · ${ride.label}${ride.time_of_day ? ` ${ride.time_of_day.slice(0, 5)}` : ""} · a partir de ${dateLabel}`,
        name: ride.label,
        time: ride.time_of_day ? ride.time_of_day.slice(0, 5) : null,
        rideType: ride.ride_type,
        price: Number(ride.default_price),
        weekday,
      },
    ];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Passageiros</h1>
        <p className="text-sm text-ink-soft">
          Passageiros aparecem aqui automaticamente quando pedem uma vaga
          pelo site público (identificados pelo celular). Você também pode
          cadastrar alguém manualmente pra ele já entrar como fixo.
        </p>
      </div>

      <form
        action={addPassenger}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-card p-4 shadow-sm"
      >
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-ink-soft">
            Nome completo
          </label>
          <input
            name="full_name"
            required
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-ink-soft">
            Celular (com DDD)
          </label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="(11) 91234-5678"
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
          />
        </div>
        <button className="flex items-center gap-1 rounded-lg bg-route px-3 py-1.5 text-sm font-medium text-white hover:bg-route-dark">
          <UserPlus size={14} />
          Adicionar passageiro
        </button>
      </form>

      <BatchFixedPassengersForm
        passengers={(passengers ?? []).map((passenger) => ({
          id: passenger.id,
          name: passenger.full_name,
          phone: passenger.phone,
        }))}
        rides={rideSequences}
        defaultEnd={
          settings?.semester_end && settings.semester_end >= today
            ? settings.semester_end
            : today
        }
      />

      <form
        method="get"
        className="rounded-2xl border border-line bg-card p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-[2]">
            <label
              htmlFor="passenger-name-filter"
              className="block text-xs font-medium text-ink-soft"
            >
              Buscar passageiro
            </label>
            <div className="relative mt-1">
              <Search
                aria-hidden="true"
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                id="passenger-name-filter"
                name="nome"
                defaultValue={filters.nome ?? ""}
                placeholder="Digite o nome"
                className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route"
              />
            </div>
          </div>
          <div className="min-w-44 flex-1">
            <label
              htmlFor="financial-filter"
              className="block text-xs font-medium text-ink-soft"
            >
              Situação financeira
            </label>
            <select
              id="financial-filter"
              name="financeiro"
              defaultValue={filters.financeiro ?? "todos"}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-route"
            >
              <option value="todos">Todos</option>
              <option value="devedor">Com valor em aberto</option>
              <option value="em_dia">Sem valor em aberto</option>
            </select>
          </div>
          <div className="min-w-44 flex-1">
            <label
              htmlFor="today-ride-filter"
              className="block text-xs font-medium text-ink-soft"
            >
              Carona hoje
            </label>
            <select
              id="today-ride-filter"
              name="hoje"
              defaultValue={filters.hoje ?? "todos"}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-route"
            >
              <option value="todos">Todos</option>
              <option value="com_carona">Com carona hoje</option>
              <option value="sem_carona">Sem carona hoje</option>
            </select>
          </div>
          <button className="rounded-lg bg-route px-4 py-2 text-sm font-semibold text-white hover:bg-route-dark">
            Filtrar
          </button>
          <Link
            href="/admin/passageiros"
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface"
          >
            Limpar
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          {filteredPassengers.length} de {(passengers ?? []).length}{" "}
          passageiros encontrados
        </p>
      </form>

      <div className="space-y-4">
        {filteredPassengers.map((passenger) => {
          const balance = balanceByPassenger.get(passenger.id);
          const pendingPayments =
            pendingPaymentsByPassenger.get(passenger.id) ?? [];

          return (
            <div
              key={passenger.id}
              className="rounded-2xl border border-line bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {passenger.full_name}
                  </h3>
                  <p className="text-xs text-ink-soft">{passenger.phone}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {balance ? (
                    <>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          balance.openAmount > 0
                            ? "bg-warn-soft text-warn"
                            : "bg-go-soft text-go-dark"
                        }`}
                        title="Caronas realizadas que ainda não foram pagas"
                      >
                        Em aberto: {formatBRL(balance.openAmount)}
                      </span>
                      <span
                        className="rounded-full bg-route-soft px-2.5 py-1 text-xs font-medium text-route"
                        title="Valor total das caronas confirmadas, realizadas e futuras"
                      >
                        Projetado: {formatBRL(balance.projectedAmount)}
                      </span>
                    </>
                  ) : null}
                  <DeletePassengerButton
                    passengerId={passenger.id}
                    passengerName={passenger.full_name}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-line/70 pt-4">
                <PendingPaymentForm
                  passengerId={passenger.id}
                  rides={pendingPayments}
                />
              </div>
            </div>
          );
        })}
        {(passengers ?? []).length === 0 ? (
          <p className="text-sm text-ink-faint">
            Nenhum passageiro cadastrado ainda.
          </p>
        ) : filteredPassengers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-center">
            <p className="text-sm font-medium text-ink">
              Nenhum passageiro corresponde aos filtros.
            </p>
            <Link
              href="/admin/passageiros"
              className="mt-2 inline-block text-sm font-semibold text-route hover:text-route-dark"
            >
              Limpar filtros
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
