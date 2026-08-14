import Link from "next/link";
import { ArrowLeft, CalendarCheck, Receipt, Search, Wallet } from "lucide-react";
import Logo from "@/components/Logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPassengerBalances } from "@/lib/balances";
import { formatBRL } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";

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
  let rideHistory: { date: string; price: number; status: string }[] = [];
  let paymentHistory: {
    id: string;
    amount: number;
    paid_at: string;
    note: string | null;
  }[] = [];
  let balance: Awaited<ReturnType<typeof getPassengerBalances>>[number] | null =
    null;

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
      const [balances, { data: rides }, { data: payments }] = await Promise.all([
        getPassengerBalances(passenger.id),
        supabase
          .from("ride_passengers")
          .select("price, status, rides(date)")
          .eq("passenger_id", passenger.id)
          .returns<
            { price: number; status: string; rides: { date: string } | null }[]
          >(),
        supabase
          .from("payments")
          .select("id, amount, paid_at, note")
          .eq("passenger_id", passenger.id)
          .order("paid_at", { ascending: false }),
      ]);

      balance = balances[0] ?? null;
      rideHistory = (rides ?? [])
        .filter((r) => r.rides)
        .map((r) => ({ date: r.rides!.date, price: r.price, status: r.status }))
        .sort((a, b) => b.date.localeCompare(a.date));
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
          Digite o celular que você usou pra pedir carona pra ver seu saldo e
          histórico.
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

        {balance ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-bold text-ink">
                {fullName}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div>
                  <CalendarCheck
                    size={16}
                    className="mx-auto text-route"
                  />
                  <p className="mt-1 text-xs text-ink-soft">
                    Caronas realizadas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {balance.ridesTaken}
                  </p>
                </div>
                <div>
                  <Receipt size={16} className="mx-auto text-go" />
                  <p className="mt-1 text-xs text-ink-soft">Pago</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {formatBRL(balance.totalPaid)}
                  </p>
                </div>
                <div>
                  <Wallet
                    size={16}
                    className={`mx-auto ${balance.openAmount > 0 ? "text-warn" : "text-go"}`}
                  />
                  <p className="mt-1 text-xs text-ink-soft">Em aberto</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      balance.openAmount > 0 ? "text-warn" : "text-go"
                    }`}
                  >
                    {formatBRL(balance.openAmount)}
                  </p>
                </div>
                <div>
                  <CalendarCheck size={16} className="mx-auto text-route" />
                  <p className="mt-1 text-xs text-ink-soft">Projetado</p>
                  <p className="mt-1 text-lg font-semibold text-route">
                    {formatBRL(balance.projectedAmount)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">
                    +{balance.futureRides} futuras
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">
                  Histórico de caronas
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {rideHistory.map((r, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {r.date} {r.status !== "confirmed" ? `(${r.status})` : ""}
                      </span>
                      <span className="font-mono">{formatBRL(r.price)}</span>
                    </li>
                  ))}
                  {rideHistory.length === 0 ? (
                    <li className="text-ink-faint">Nenhuma carona ainda.</li>
                  ) : null}
                </ul>
              </div>
              <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">
                  Pagamentos registrados
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {paymentHistory.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span>
                        {p.paid_at} {p.note ? `· ${p.note}` : ""}
                      </span>
                      <span className="font-mono">{formatBRL(p.amount)}</span>
                    </li>
                  ))}
                  {paymentHistory.length === 0 ? (
                    <li className="text-ink-faint">Nenhum pagamento ainda.</li>
                  ) : null}
                </ul>
              </div>
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
