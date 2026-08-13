import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getPassengerBalances } from "@/lib/balances";
import { formatBRL } from "@/lib/money";

export default async function MinhasCaronasFinanceiroPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [balances, { data: rides }, { data: payments }] = await Promise.all([
    getPassengerBalances(profile.id),
    supabase
      .from("ride_passengers")
      .select("price, status, rides(date)")
      .eq("passenger_id", profile.id)
      .returns<{ price: number; status: string; rides: { date: string } | null }[]>(),
    supabase
      .from("payments")
      .select("id, amount, paid_at, note")
      .eq("passenger_id", profile.id)
      .order("paid_at", { ascending: false }),
  ]);

  const balance = balances[0];
  const rideHistory = (rides ?? [])
    .filter((r) => r.rides)
    .map((r) => ({ date: r.rides!.date, price: r.price, status: r.status }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Financeiro</h1>
        <p className="text-sm text-neutral-500">
          Seu saldo com a motorista neste semestre.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-neutral-500">Caronas confirmadas</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {balance?.ridesTaken ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Total cobrado</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {formatBRL(balance?.totalCharged ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Saldo devedor</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                (balance?.balance ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {formatBRL(balance?.balance ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Histórico de caronas
          </h2>
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
              <li className="text-neutral-400">Nenhuma carona ainda.</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Pagamentos registrados
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {(payments ?? []).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {p.paid_at} {p.note ? `· ${p.note}` : ""}
                </span>
                <span>{formatBRL(p.amount)}</span>
              </li>
            ))}
            {(payments ?? []).length === 0 ? (
              <li className="text-neutral-400">Nenhum pagamento ainda.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
