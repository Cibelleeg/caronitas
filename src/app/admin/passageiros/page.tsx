import { createClient } from "@/lib/supabase/server";
import { getPassengerBalances } from "@/lib/balances";
import { formatBRL } from "@/lib/money";
import { WEEKDAY_LABELS } from "@/lib/dates";
import InviteForm from "./InviteForm";
import {
  addRecurringPattern,
  deletePattern,
  togglePatternActive,
} from "./actions";

export default async function PassageirosPage() {
  const supabase = await createClient();

  const [{ data: passengers }, { data: patterns }, { data: settings }, balances] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "passenger")
        .order("full_name"),
      supabase
        .from("recurring_patterns")
        .select("*")
        .order("weekday"),
      supabase.from("app_settings").select("default_price").single(),
      getPassengerBalances(),
    ]);

  const balanceByPassenger = new Map(balances.map((b) => [b.passengerId, b]));
  const patternsByPassenger = new Map<string, typeof patterns>();
  (patterns ?? []).forEach((pattern) => {
    const list = patternsByPassenger.get(pattern.passenger_id) ?? [];
    list.push(pattern);
    patternsByPassenger.set(pattern.passenger_id, list);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Passageiros</h1>
        <p className="text-sm text-neutral-500">
          Convide passageiros e defina os padrões fixos de carona de cada um.
        </p>
      </div>

      <InviteForm />

      <div className="space-y-4">
        {(passengers ?? []).map((passenger) => {
          const balance = balanceByPassenger.get(passenger.id);
          const patterns = patternsByPassenger.get(passenger.id) ?? [];

          return (
            <div
              key={passenger.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {passenger.full_name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {passenger.phone ?? "sem telefone cadastrado"}
                  </p>
                </div>
                {balance ? (
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      balance.balance > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    Saldo: {formatBRL(balance.balance)}
                  </span>
                ) : null}
              </div>

              <ul className="mt-3 space-y-1">
                {patterns.map((pattern) => (
                  <li
                    key={pattern.id}
                    className="flex items-center justify-between text-sm text-neutral-600"
                  >
                    <span>
                      {WEEKDAY_LABELS[pattern.weekday]} · {formatBRL(pattern.price)}{" "}
                      · {pattern.start_date} a {pattern.end_date}
                    </span>
                    <span className="flex items-center gap-2">
                      <form action={togglePatternActive}>
                        <input type="hidden" name="id" value={pattern.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={(!pattern.active).toString()}
                        />
                        <button className="text-xs text-neutral-400 underline hover:text-neutral-700">
                          {pattern.active ? "Pausar" : "Reativar"}
                        </button>
                      </form>
                      <form action={deletePattern}>
                        <input type="hidden" name="id" value={pattern.id} />
                        <button className="text-xs text-neutral-400 hover:text-red-600">
                          Excluir
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
                {patterns.length === 0 ? (
                  <li className="text-sm text-neutral-400">
                    Sem padrão fixo cadastrado.
                  </li>
                ) : null}
              </ul>

              <form
                action={addRecurringPattern}
                className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3"
              >
                <input type="hidden" name="passenger_id" value={passenger.id} />
                <div>
                  <label className="block text-xs font-medium text-neutral-500">
                    Dia da semana
                  </label>
                  <select
                    name="weekday"
                    required
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  >
                    {WEEKDAY_LABELS.map((label, i) => (
                      <option key={i} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-neutral-500">
                    Preço
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    defaultValue={settings?.default_price ?? 0}
                    required
                    className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500">
                    Início
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500">
                    Fim
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Adicionar padrão
                </button>
              </form>
            </div>
          );
        })}
        {(passengers ?? []).length === 0 ? (
          <p className="text-sm text-neutral-400">
            Nenhum passageiro convidado ainda.
          </p>
        ) : null}
      </div>
    </div>
  );
}
