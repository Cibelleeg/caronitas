import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import Logo from "@/components/Logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";

interface PassengerRide {
  date: string;
  status: string;
  label: string;
  origin: string;
  destination: string;
  time: string | null;
  rideType: "ida" | "volta";
  seriesId: string | null;
  participationId: string;
  isPaid: boolean;
}

interface RideGroup {
  key: string;
  rideType: "ida" | "volta";
  origin: string;
  destination: string;
  time: string | null;
  weekday: string;
  rides: PassengerRide[];
}

export default async function ConsultaPage({
  searchParams,
}: {
  searchParams: Promise<{ telefone?: string }>;
}) {
  const params = await searchParams;
  const phoneInput = params.telefone ?? "";
  const phone = normalizePhone(phoneInput);

  let notFound = false;
  let fullName: string | null = null;
  let futureRides: PassengerRide[] = [];
  let completedRides: PassengerRide[] = [];
  let paymentHistory: {
    id: string;
    amount: number;
    paid_at: string;
    note: string | null;
    ride_passenger_id: string | null;
  }[] = [];
  let openAmount = 0;

  if (phone) {
    const supabase = createAdminClient();
    const { data: passenger } = await supabase
      .from("passengers")
      .select("id, full_name")
      .eq("phone", phone)
      .maybeSingle();

    if (!passenger) {
      notFound = true;
    } else {
      fullName = passenger.full_name;
      const [{ data: rides }, { data: payments }] = await Promise.all([
        supabase
          .from("ride_passengers")
          .select(
            "id, price, status, rides(date, label, origin, destination, time_of_day, ride_type, series_id)",
          )
          .eq("passenger_id", passenger.id)
          .returns<
            {
              id: string;
              price: number;
              status: string;
              rides: {
                date: string;
                label: string;
                origin: string;
                destination: string;
                time_of_day: string | null;
                ride_type: "ida" | "volta";
                series_id: string | null;
              } | null;
            }[]
          >(),
        supabase
          .from("payments")
          .select("id, amount, paid_at, note, ride_passenger_id")
          .eq("passenger_id", passenger.id)
          .order("paid_at", { ascending: false }),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const paidParticipationIds = new Set(
        (payments ?? []).flatMap((payment) =>
          payment.ride_passenger_id ? [payment.ride_passenger_id] : [],
        ),
      );
      const passengerRides = (rides ?? [])
        .filter((participation) => participation.rides)
        .map((participation) => ({
          date: participation.rides!.date,
          status: participation.status,
          label: participation.rides!.label,
          origin: participation.rides!.origin,
          destination: participation.rides!.destination,
          time: participation.rides!.time_of_day,
          rideType: participation.rides!.ride_type,
          seriesId: participation.rides!.series_id,
          participationId: participation.id,
          isPaid: paidParticipationIds.has(participation.id),
        }));
      futureRides = passengerRides
        .filter(
          (ride) =>
            ride.date >= today &&
            ride.status !== "declined" &&
            ride.status !== "no_show",
        )
        .sort((a, b) => a.date.localeCompare(b.date));
      completedRides = passengerRides
        .filter((ride) => ride.date < today && ride.status === "confirmed")
        .sort((a, b) => b.date.localeCompare(a.date));
      openAmount = (rides ?? [])
        .filter(
          (participation) =>
            participation.rides &&
            participation.rides.date < today &&
            participation.status === "confirmed" &&
            !paidParticipationIds.has(participation.id),
        )
        .reduce(
          (total, participation) => total + Number(participation.price),
          0,
        );
      paymentHistory = payments ?? [];
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-route-soft via-white to-accent-soft">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Logo />
        <h1 className="mt-4 font-display text-xl font-bold text-ink">
          Consultar minhas caronas
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Digite o celular usado no pedido para consultar suas caronas e seus
          pagamentos.
        </p>

        <form
          method="get"
          className="mt-4 flex gap-2 rounded-2xl border border-line bg-card p-2 shadow-sm"
        >
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="tel"
              name="telefone"
              defaultValue={phoneInput}
              required
              placeholder="(11) 91234-5678"
              className="w-full rounded-xl border-0 bg-transparent py-2 pl-9 pr-3 text-sm text-ink outline-none"
            />
          </div>
          <button className="rounded-xl bg-route px-4 py-2 text-sm font-semibold text-white hover:bg-route-dark">
            Consultar
          </button>
        </form>

        {notFound ? (
          <p className="mt-6 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            Nenhuma solicitação encontrada com esse celular.
          </p>
        ) : null}

        {fullName ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-bold text-ink">
                {fullName}
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <CalendarCheck
                    size={16}
                    className="mx-auto text-route"
                  />
                  <p className="mt-1 text-xs text-ink-soft">
                    Caronas realizadas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {completedRides.length}
                  </p>
                </div>
                <div>
                  <CalendarClock size={16} className="mx-auto text-accent" />
                  <p className="mt-1 text-xs text-ink-soft">Caronas futuras</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {futureRides.length}
                  </p>
                </div>
                <div>
                  <Wallet
                    size={16}
                    className={`mx-auto ${openAmount > 0 ? "text-warn" : "text-go"}`}
                  />
                  <p className="mt-1 text-xs text-ink-soft">Em aberto</p>
                  <p
                    className={`mt-1 font-mono text-base font-semibold sm:text-lg ${
                      openAmount > 0 ? "text-warn" : "text-go-dark"
                    }`}
                  >
                    {formatBRL(openAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FutureRideGroups rides={futureRides} />
              <CompletedRideGroups rides={completedRides} />
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Receipt size={15} className="text-go" />
                Pagamentos realizados
              </h3>
              <ul className="mt-3 divide-y divide-line/70 text-sm text-ink-soft">
                {paymentHistory.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <span>
                      {formatDate(payment.paid_at)}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </span>
                    <span className="font-mono font-semibold text-go-dark">
                      {formatBRL(payment.amount)}
                    </span>
                  </li>
                ))}
                {paymentHistory.length === 0 ? (
                  <li className="py-2 text-ink-faint">Nenhum pagamento realizado.</li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-route"
        >
          <ArrowLeft size={13} />
          Voltar pro calendário público
        </Link>
      </div>
    </div>
  );
}

function CompletedRideGroups({ rides }: { rides: PassengerRide[] }) {
  const groups = groupRides(rides, "desc");

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <CalendarCheck size={15} className="text-route" />
        Caronas realizadas
      </h3>
      <div className="mt-3 space-y-3">
        {groups.map((group) => {
          const paidCount = group.rides.filter((ride) => ride.isPaid).length;
          const openCount = group.rides.length - paidCount;
          const firstRide = group.rides[group.rides.length - 1];
          const lastRide = group.rides[0];

          return (
            <details key={group.key} className="overflow-hidden rounded-xl border border-line/80 bg-white/45">
              <summary className="cursor-pointer list-none p-3 marker:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-ink">
                      Toda {group.weekday} · {group.time?.slice(0, 5) ?? "sem horário"}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {group.origin}
                      <ArrowRight size={11} className="mx-1 inline text-ink-faint" />
                      {group.destination}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${group.rideType === "volta" ? "bg-accent-soft text-accent-dark" : "bg-route-soft text-route"}`}>
                    {group.rideType}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-ink-faint">
                  {formatDate(firstRide.date)} até {formatDate(lastRide.date)} · {group.rides.length} {group.rides.length === 1 ? "carona" : "caronas"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {paidCount > 0 ? (
                    <span className="rounded-full bg-go-soft px-2 py-1 text-[10px] font-bold text-go-dark">
                      {paidCount} {paidCount === 1 ? "paga" : "pagas"}
                    </span>
                  ) : null}
                  {openCount > 0 ? (
                    <span className="rounded-full bg-warn-soft px-2 py-1 text-[10px] font-bold text-warn">
                      {openCount} em aberto
                    </span>
                  ) : null}
                </div>
              </summary>
              <ul className="border-t border-line/70 bg-white/35 px-3 py-2">
                {group.rides.map((ride) => (
                  <li key={ride.participationId} className="flex items-center justify-between gap-3 border-b border-line/60 py-2 text-xs last:border-0">
                    <span className="text-ink-soft">{formatDate(ride.date)}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${ride.isPaid ? "bg-go-soft text-go-dark" : "bg-warn-soft text-warn"}`}>
                      {ride.isPaid ? "Paga" : "Em aberto"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
        {groups.length === 0 ? (
          <p className="py-2 text-sm text-ink-faint">Nenhuma carona.</p>
        ) : null}
      </div>
    </section>
  );
}

function FutureRideGroups({ rides }: { rides: PassengerRide[] }) {
  const groups = groupRides(rides, "asc");

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <CalendarClock size={15} className="text-accent" />
        Caronas futuras
      </h3>
      <div className="mt-3 space-y-3">
        {groups.map((group) => {
          const firstRide = group.rides[0];
          const lastRide = group.rides[group.rides.length - 1];
          const pendingCount = group.rides.filter(
            (ride) => ride.status === "pending",
          ).length;

          return (
            <details
              key={group.key}
              className="group overflow-hidden rounded-xl border border-line/80 bg-white/45"
            >
              <summary className="cursor-pointer list-none p-3 marker:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-ink">
                      Toda {group.weekday} · {group.time?.slice(0, 5) ?? "sem horário"}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {group.origin}
                      <ArrowRight size={11} className="mx-1 inline text-ink-faint" />
                      {group.destination}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${group.rideType === "volta" ? "bg-accent-soft text-accent-dark" : "bg-route-soft text-route"}`}>
                    {group.rideType}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-faint">
                  <span>
                    {formatDate(firstRide.date)} até {formatDate(lastRide.date)}
                  </span>
                  <strong className="text-ink-soft">
                    {group.rides.length} {group.rides.length === 1 ? "carona" : "caronas"}
                  </strong>
                </div>
                {pendingCount > 0 ? (
                  <p className="mt-2 text-[11px] font-semibold text-warn">
                    {pendingCount} aguardando aprovação
                  </p>
                ) : null}
              </summary>
              <ul className="border-t border-line/70 bg-white/35 px-3 py-2">
                {group.rides.map((ride, index) => (
                  <li
                    key={`${ride.date}-${index}`}
                    className="flex items-center justify-between gap-3 border-b border-line/60 py-2 text-xs last:border-0"
                  >
                    <span className="text-ink-soft">{formatDate(ride.date)}</span>
                    <span
                      className={
                        ride.status === "pending"
                          ? "font-semibold text-warn"
                          : "font-semibold text-go-dark"
                      }
                    >
                      {ride.status === "pending" ? "Aguardando" : "Confirmada"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
        {groups.length === 0 ? (
          <p className="py-2 text-sm text-ink-faint">Nenhuma carona.</p>
        ) : null}
      </div>
    </section>
  );
}

function groupRides(
  rides: PassengerRide[],
  order: "asc" | "desc",
): RideGroup[] {
  const groups = new Map<string, RideGroup>();

  rides.forEach((ride) => {
    const date = new Date(`${ride.date}T12:00:00`);
    const weekdayIndex = date.getDay();
    const weekday = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
    }).format(date);
    const key = ride.seriesId
      ? `series:${ride.seriesId}`
      : [
          ride.rideType,
          weekdayIndex,
          ride.time ?? "",
          ride.origin,
          ride.destination,
        ].join(":");
    const existing = groups.get(key);

    if (existing) {
      existing.rides.push(ride);
      return;
    }

    groups.set(key, {
      key,
      rideType: ride.rideType,
      origin: ride.origin,
      destination: ride.destination,
      time: ride.time,
      weekday,
      rides: [ride],
    });
  });

  const result = Array.from(groups.values());
  result.forEach((group) =>
    group.rides.sort((a, b) =>
      order === "asc"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
    ),
  );
  return result.sort((a, b) =>
    order === "asc"
      ? a.rides[0].date.localeCompare(b.rides[0].date)
      : b.rides[0].date.localeCompare(a.rides[0].date),
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
