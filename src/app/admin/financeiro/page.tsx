import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPassengerBalances } from "@/lib/balances";
import { formatBRL } from "@/lib/money";
import { deletePayment, registerPayment } from "./actions";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ passenger?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [balances, { data: passengers }] = await Promise.all([
    getPassengerBalances(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "passenger")
      .order("full_name"),
  ]);

  const selectedId = params.passenger;
  const selected = selectedId
    ? (passengers ?? []).find((p) => p.id === selectedId)
    : null;

  let rideHistory: { date: string; price: number; status: string }[] = [];
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
        .select("price, status, rides(date)")
        .eq("passenger_id", selected.id)
        .returns<{ price: number; status: string; rides: { date: string } | null }[]>(),
      supabase
        .from("payments")
        .select("id, amount, paid_at, note")
        .eq("passenger_id", selected.id)
        .order("paid_at", { ascending: false }),
    ]);

    rideHistory = (rides ?? [])
      .filter((r) => r.rides)
      .map((r) => ({ date: r.rides!.date, price: r.price, status: r.status }))
      .sort((a, b) => b.date.localeCompare(a.date));
    paymentHistory = payments ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Financeiro</h1>
        <p className="text-sm text-neutral-500">
          Acompanhe o saldo de cada passageiro e registre pagamentos.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-2">Passageiro</th>
              <th className="px-4 py-2">Caronas</th>
              <th className="px-4 py-2">Cobrado</th>
              <th className="px-4 py-2">Pago</th>
              <th className="px-4 py-2">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {balances.map((b) => (
              <tr key={b.passengerId} className={b.passengerId === selectedId ? "bg-neutral-50" : ""}>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/financeiro?passenger=${b.passengerId}`}
                    className="font-medium text-neutral-800 hover:underline"
                  >
                    {b.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-600">{b.ridesTaken}</td>
                <td className="px-4 py-2 text-neutral-600">
                  {formatBRL(b.totalCharged)}
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {formatBRL(b.totalPaid)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      b.balance > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {formatBRL(b.balance)}
                  </span>
                </td>
              </tr>
            ))}
            {balances.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-sm text-neutral-400" colSpan={5}>
                  Nenhum passageiro cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          Registrar pagamento
        </h2>
        <form
          action={registerPayment}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-neutral-500">
              Passageiro
            </label>
            <select
              name="passenger_id"
              required
              defaultValue={selectedId ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Selecione
              </option>
              {(passengers ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-neutral-500">
              Valor
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">
              Data
            </label>
            <input
              type="date"
              name="paid_at"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-neutral-500">
              Observação
            </label>
            <input
              name="note"
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
            Registrar
          </button>
        </form>
      </div>

      {selected ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              Caronas de {selected.full_name}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {rideHistory.map((r, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {r.date} {r.status !== "confirmed" ? `(${r.status})` : ""}
                  </span>
                  <span>{formatBRL(r.price)}</span>
                </li>
              ))}
              {rideHistory.length === 0 ? (
                <li className="text-neutral-400">Sem caronas registradas.</li>
              ) : null}
            </ul>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              Pagamentos de {selected.full_name}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {paymentHistory.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>
                    {p.paid_at} {p.note ? `· ${p.note}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatBRL(p.amount)}
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs text-neutral-400 hover:text-red-600">
                        excluir
                      </button>
                    </form>
                  </span>
                </li>
              ))}
              {paymentHistory.length === 0 ? (
                <li className="text-neutral-400">Sem pagamentos registrados.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
