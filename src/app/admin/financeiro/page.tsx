import Link from "next/link";
import {
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  TrendingUp,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPassengerBalances } from "@/lib/balances";
import { formatBRL } from "@/lib/money";
import { deletePayment } from "./actions";

interface RideCharge {
  id: string;
  price: number;
  status: string;
  rides: {
    date: string;
    label: string;
    time_of_day: string | null;
    ride_type: "ida" | "volta";
  } | null;
}

interface RevenueCharge {
  id: string;
  price: number;
  rides: { date: string } | null;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ passenger?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    balances,
    { data: passengers },
    { data: revenueCharges },
    { data: revenuePayments },
    { data: settings },
  ] = await Promise.all([
    getPassengerBalances(),
    supabase.from("passengers").select("id, full_name").order("full_name"),
    supabase
      .from("ride_passengers")
      .select("id, price, rides(date)")
      .eq("status", "confirmed")
      .returns<RevenueCharge[]>(),
    supabase
      .from("payments")
      .select("amount, ride_passenger_id"),
    supabase
      .from("app_settings")
      .select("semester_start, semester_end")
      .single(),
  ]);

  const semesterEnd = settings?.semester_end ?? "9999-12-31";
  const semesterCharges = (revenueCharges ?? []).filter(
    (charge) => charge.rides && charge.rides.date <= semesterEnd,
  );
  const paidParticipationIds = new Set(
    (revenuePayments ?? []).flatMap((payment) =>
      payment.ride_passenger_id ? [payment.ride_passenger_id] : [],
    ),
  );
  const billedRevenue = (revenuePayments ?? []).reduce(
    (total, payment) => total + Number(payment.amount),
    0,
  );
  const openRevenue = semesterCharges
    .filter(
      (charge) =>
        charge.rides!.date < today && !paidParticipationIds.has(charge.id),
    )
    .reduce((total, charge) => total + Number(charge.price), 0);
  const futureRevenue = semesterCharges
    .filter((charge) => charge.rides!.date >= today)
    .reduce((total, charge) => total + Number(charge.price), 0);
  const monthlyRevenue = buildMonthlyRevenue(
    semesterCharges,
    paidParticipationIds,
    settings?.semester_start ?? null,
    settings?.semester_end ?? null,
    today,
  );

  const selectedId = params.passenger;
  const selected = selectedId
    ? (passengers ?? []).find((passenger) => passenger.id === selectedId)
    : null;
  const selectedBalance = balances.find(
    (balance) => balance.passengerId === selectedId,
  );

  let pastRides: RideCharge[] = [];
  let futureRides: RideCharge[] = [];
  let paymentHistory: {
    id: string;
    amount: number;
    paid_at: string;
    note: string | null;
  }[] = [];

  if (selected) {
    const [{ data: rides }, { data: payments }] = await Promise.all([
      supabase
        .from("ride_passengers")
        .select(
          "id, price, status, rides(date, label, time_of_day, ride_type)",
        )
        .eq("passenger_id", selected.id)
        .eq("status", "confirmed")
        .returns<RideCharge[]>(),
      supabase
        .from("payments")
        .select("id, amount, paid_at, note")
        .eq("passenger_id", selected.id)
        .order("paid_at", { ascending: false }),
    ]);

    pastRides = (rides ?? [])
      .filter((charge) => charge.rides && charge.rides.date < today)
      .sort((a, b) => b.rides!.date.localeCompare(a.rides!.date));
    futureRides = (rides ?? [])
      .filter((charge) => charge.rides && charge.rides.date >= today)
      .sort((a, b) => a.rides!.date.localeCompare(b.rides!.date));
    paymentHistory = payments ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-route">
          Visão consolidada
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">
          Financeiro
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Compare o que já foi pago, o valor total projetado e o que está em
          aberto nas caronas já realizadas.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Faturado"
            value={billedRevenue}
            helper="Pagamentos confirmados"
            icon={<Banknote size={18} />}
            tone="go"
          />
          <MetricCard
            label="Em aberto"
            value={openRevenue}
            helper="Realizadas ainda não pagas"
            icon={<CircleDollarSign size={18} />}
            tone="accent"
          />
          <MetricCard
            label="A faturar"
            value={futureRevenue}
            helper="Confirmadas até o fim do semestre"
            icon={<TrendingUp size={18} />}
            tone="route"
          />
          <MetricCard
            label="Previsão do semestre"
            value={billedRevenue + openRevenue + futureRevenue}
            helper="Faturado + aberto + futuro"
            icon={<BarChart3 size={18} />}
            tone="neutral"
          />
        </div>

        <RevenueChart months={monthlyRevenue} />
      </section>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-paper text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Passageiro</th>
              <th className="px-4 py-3">Realizadas</th>
              <th className="px-4 py-3">Faturado</th>
              <th className="px-4 py-3">Futuras</th>
              <th className="px-4 py-3">Projetado</th>
              <th className="px-4 py-3">Em aberto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {balances.map((balance) => (
              <tr
                key={balance.passengerId}
                className={
                  balance.passengerId === selectedId
                    ? "bg-route-soft/50"
                    : "hover:bg-paper/60"
                }
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/financeiro?passenger=${balance.passengerId}`}
                    className="font-semibold text-ink hover:text-route"
                  >
                    {balance.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {balance.ridesTaken}
                </td>
                <td className="px-4 py-3 font-mono text-go-dark">
                  {formatBRL(balance.totalPaid)}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {balance.futureRides}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-route-soft px-2.5 py-1 font-mono text-xs font-semibold text-route">
                    {formatBRL(balance.projectedAmount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
                      balance.openAmount > 0
                        ? "bg-warn-soft text-warn"
                        : "bg-go-soft text-go-dark"
                    }`}
                  >
                    {formatBRL(balance.openAmount)}
                  </span>
                </td>
              </tr>
            ))}
            {balances.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-ink-faint" colSpan={6}>
                  Nenhum passageiro cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {!selected ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-center">
          <CircleDollarSign size={22} className="mx-auto text-ink-faint" />
          <p className="mt-2 text-sm font-medium text-ink">
            Selecione um passageiro na tabela
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Você verá separadamente caronas realizadas, futuras e pagamentos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">{selected.full_name}</h2>
              <p className="text-xs text-ink-soft">Detalhamento financeiro</p>
            </div>
            {selectedBalance ? (
              <div className="flex gap-2">
                <span className="rounded-xl bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
                  Em aberto: {formatBRL(selectedBalance.openAmount)}
                </span>
                <span className="rounded-xl bg-route-soft px-3 py-2 text-xs font-semibold text-route">
                  Projetado: {formatBRL(selectedBalance.projectedAmount)}
                </span>
                <span className="rounded-xl bg-go-soft px-3 py-2 text-xs font-semibold text-go-dark">
                  Faturado: {formatBRL(selectedBalance.totalPaid)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <HistoryCard
              title="Caronas realizadas"
              icon={<CalendarCheck size={16} className="text-go" />}
              rides={pastRides}
              empty="Nenhuma carona realizada."
            />
            <HistoryCard
              title="Caronas futuras"
              icon={<CalendarClock size={16} className="text-route" />}
              rides={futureRides}
              empty="Nenhuma carona futura."
            />
            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ReceiptText size={16} className="text-accent" /> Pagamentos
              </h3>
              <ul className="mt-3 divide-y divide-line/70 text-sm">
                {paymentHistory.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-ink-soft">{payment.paid_at}</p>
                      {payment.note ? (
                        <p className="truncate text-xs text-ink-faint">
                          {payment.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono font-semibold text-go-dark">
                        {formatBRL(payment.amount)}
                      </span>
                      <form action={deletePayment}>
                        <input type="hidden" name="id" value={payment.id} />
                        <button
                          className="rounded-lg p-1.5 text-ink-faint hover:bg-stop-soft hover:text-stop"
                          aria-label="Excluir pagamento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
                {paymentHistory.length === 0 ? (
                  <li className="py-3 text-xs text-ink-faint">
                    Nenhum pagamento registrado.
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryCard({
  title,
  icon,
  rides,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rides: RideCharge[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon} {title}
      </h3>
      <ul className="mt-3 divide-y divide-line/70 text-sm">
        {rides.map((charge) => (
          <li key={charge.id} className="flex justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">
                {charge.rides?.ride_type === "volta" ? "Volta" : "Ida"} ·{" "}
                {charge.rides?.label}
                {charge.rides?.time_of_day
                  ? ` ${charge.rides.time_of_day.slice(0, 5)}`
                  : ""}
              </p>
              <p className="text-xs text-ink-faint">{charge.rides?.date}</p>
            </div>
            <span className="shrink-0 font-mono text-xs font-semibold text-ink-soft">
              {formatBRL(charge.price)}
            </span>
          </li>
        ))}
        {rides.length === 0 ? (
          <li className="py-3 text-xs text-ink-faint">{empty}</li>
        ) : null}
      </ul>
    </div>
  );
}

interface RevenueMonth {
  key: string;
  label: string;
  billed: number;
  open: number;
  future: number;
}

function buildMonthlyRevenue(
  charges: RevenueCharge[],
  paidParticipationIds: Set<string>,
  semesterStart: string | null,
  semesterEnd: string | null,
  today: string,
): RevenueMonth[] {
  const validDates = charges.flatMap((charge) =>
    charge.rides ? [charge.rides.date] : [],
  );
  const startKey = (semesterStart ?? validDates.sort()[0] ?? today).slice(0, 7);
  const endKey = (
    semesterEnd ??
    validDates.sort().at(-1) ??
    today
  ).slice(0, 7);
  const [startYear, startMonth] = startKey.split("-").map(Number);
  const [endYear, endMonth] = endKey.split("-").map(Number);
  const cursor = new Date(startYear, startMonth - 1, 1);
  const end = new Date(endYear, endMonth - 1, 1);
  const months: RevenueMonth[] = [];

  while (cursor <= end && months.length < 24) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
    })
      .format(cursor)
      .replace(" de ", " ");
    months.push({ key, label, billed: 0, open: 0, future: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const byKey = new Map(months.map((month) => [month.key, month]));
  charges.forEach((charge) => {
    if (!charge.rides) return;
    const month = byKey.get(charge.rides.date.slice(0, 7));
    if (!month) return;
    if (paidParticipationIds.has(charge.id)) {
      month.billed += Number(charge.price);
    } else if (charge.rides.date < today) {
      month.open += Number(charge.price);
    } else {
      month.future += Number(charge.price);
    }
  });
  return months;
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  tone: "go" | "route" | "accent" | "neutral";
}) {
  const tones = {
    go: "bg-go-soft text-go-dark",
    route: "bg-route-soft text-route",
    accent: "bg-accent-soft text-accent-dark",
    neutral: "bg-paper text-ink-soft",
  };
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
        {formatBRL(value)}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{helper}</p>
    </div>
  );
}

function RevenueChart({ months }: { months: RevenueMonth[] }) {
  const maximum = Math.max(
    1,
    ...months.map((month) => month.billed + month.open + month.future),
  );

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <BarChart3 size={16} className="text-route" /> Faturamento por mês
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Valores das caronas confirmadas no semestre.
          </p>
        </div>
        <div className="flex gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-go" /> Faturado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Em aberto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-route" /> Futuro
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div
          className="grid min-w-[34rem] items-end gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(months.length, 1)}, minmax(3.5rem, 1fr))` }}
        >
          {months.map((month) => {
            const total = month.billed + month.open + month.future;
            const totalHeight = Math.max(4, (total / maximum) * 176);
            const billedHeight = total
              ? (month.billed / total) * totalHeight
              : 0;
            const openHeight = total ? (month.open / total) * totalHeight : 0;
            const futureHeight = Math.max(
              0,
              totalHeight - billedHeight - openHeight,
            );
            return (
              <div key={month.key} className="flex flex-col items-center">
                <span className="mb-2 font-mono text-[10px] font-semibold text-ink-soft">
                  {formatBRL(total)}
                </span>
                <div
                  className="flex w-9 flex-col-reverse overflow-hidden rounded-t-lg bg-paper sm:w-11"
                  style={{ height: `${totalHeight}px` }}
                  title={`${month.label}: ${formatBRL(total)}`}
                >
                  {billedHeight > 0 ? (
                    <div className="w-full bg-go" style={{ height: `${billedHeight}px` }} />
                  ) : null}
                  {openHeight > 0 ? (
                    <div className="w-full bg-accent" style={{ height: `${openHeight}px` }} />
                  ) : null}
                  {futureHeight > 0 && month.future > 0 ? (
                    <div className="w-full bg-route" style={{ height: `${futureHeight}px` }} />
                  ) : null}
                </div>
                <span className="mt-2 text-[10px] font-medium capitalize text-ink-faint">
                  {month.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
