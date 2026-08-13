import Link from "next/link";
import MonthCalendar from "@/components/MonthCalendar";
import { createClient } from "@/lib/supabase/server";
import { dateKey, monthGrid, monthKey, parseMonthKey, todayKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import {
  addPassengerToRide,
  removeParticipation,
  toggleRideStatus,
  updateParticipationStatus,
} from "./actions";

interface RideWithPassengers {
  id: string;
  date: string;
  status: "scheduled" | "cancelled";
  ride_passengers: {
    id: string;
    passenger_id: string;
    status: "confirmed" | "declined" | "no_show";
    price: number;
    source: "recurring" | "manual";
    profiles: { full_name: string } | null;
  }[];
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const monthAnchor = parseMonthKey(params.month);
  const selectedDateKey = params.date ?? todayKey();
  const monthKeyForLinks = monthKey(monthAnchor);

  const supabase = await createClient();

  const weeks = monthGrid(monthAnchor);
  const rangeStart = dateKey(weeks[0][0]);
  const rangeEnd = dateKey(weeks[weeks.length - 1][6]);

  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .single();
  const seatsPerRide = settings?.seats_per_ride ?? 4;
  const defaultPrice = settings?.default_price ?? 0;

  const { data: rides } = await supabase
    .from("rides")
    .select(
      "id, date, status, ride_passengers(id, passenger_id, status, price, source, profiles(full_name))",
    )
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .returns<RideWithPassengers[]>();

  const ridesByDate = new Map<string, RideWithPassengers>();
  (rides ?? []).forEach((r) => ridesByDate.set(r.date, r));

  const { data: passengers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "passenger")
    .order("full_name");

  const selectedRide = ridesByDate.get(selectedDateKey) ?? null;
  const passengersOnRide = new Set(
    (selectedRide?.ride_passengers ?? []).map((rp) => rp.passenger_id),
  );
  const availablePassengers = (passengers ?? []).filter(
    (p) => !passengersOnRide.has(p.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Calendário</h1>
        <p className="text-sm text-neutral-500">
          Clique num dia para ver e gerenciar quem vai naquela carona.
        </p>
      </div>

      <MonthCalendar
        monthAnchor={monthAnchor}
        baseHref="/admin/calendario"
        renderDay={(day, key, inMonth) => {
          const ride = ridesByDate.get(key);
          const confirmed =
            ride?.ride_passengers.filter((rp) => rp.status === "confirmed")
              .length ?? 0;
          const isSelected = key === selectedDateKey;
          const isCancelled = ride?.status === "cancelled";

          let badgeClasses = "bg-neutral-100 text-neutral-500";
          if (confirmed >= seatsPerRide) {
            badgeClasses = "bg-emerald-100 text-emerald-700";
          } else if (confirmed > 0) {
            badgeClasses = "bg-amber-100 text-amber-700";
          }

          return (
            <Link
              href={`/admin/calendario?month=${monthKeyForLinks}&date=${key}`}
              className={`flex h-full flex-col gap-1 rounded p-1 text-xs hover:bg-neutral-50 ${
                isSelected ? "ring-2 ring-neutral-900" : ""
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span className="font-medium text-neutral-700">
                {day.getDate()}
              </span>
              {ride ? (
                isCancelled ? (
                  <span className="rounded bg-red-50 px-1 py-0.5 text-[10px] text-red-500 line-through">
                    Cancelada
                  </span>
                ) : (
                  <span className={`rounded px-1 py-0.5 text-[10px] ${badgeClasses}`}>
                    {confirmed}/{seatsPerRide}
                  </span>
                )
              ) : null}
            </Link>
          );
        }}
      />

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            {selectedDateKey}
          </h2>
          {selectedRide ? (
            <form action={toggleRideStatus}>
              <input type="hidden" name="ride_id" value={selectedRide.id} />
              <input
                type="hidden"
                name="next_status"
                value={
                  selectedRide.status === "cancelled" ? "scheduled" : "cancelled"
                }
              />
              <button className="text-xs text-neutral-500 underline hover:text-neutral-800">
                {selectedRide.status === "cancelled"
                  ? "Reativar carona"
                  : "Cancelar carona"}
              </button>
            </form>
          ) : null}
        </div>

        <ul className="mt-4 divide-y divide-neutral-100">
          {(selectedRide?.ride_passengers ?? []).map((rp) => (
            <li
              key={rp.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <p className="font-medium text-neutral-800">
                  {rp.profiles?.full_name ?? "—"}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatBRL(rp.price)} ·{" "}
                  {rp.source === "recurring" ? "fixo" : "avulso"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={updateParticipationStatus}>
                  <input type="hidden" name="id" value={rp.id} />
                  <input type="hidden" name="status" value="confirmed" />
                  <button
                    className={`rounded px-2 py-1 text-xs ${
                      rp.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-neutral-400 hover:bg-neutral-100"
                    }`}
                  >
                    Confirmado
                  </button>
                </form>
                <form action={updateParticipationStatus}>
                  <input type="hidden" name="id" value={rp.id} />
                  <input type="hidden" name="status" value="no_show" />
                  <button
                    className={`rounded px-2 py-1 text-xs ${
                      rp.status === "no_show"
                        ? "bg-red-100 text-red-700"
                        : "text-neutral-400 hover:bg-neutral-100"
                    }`}
                  >
                    Não veio
                  </button>
                </form>
                <form action={removeParticipation}>
                  <input type="hidden" name="id" value={rp.id} />
                  <button className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600">
                    Remover
                  </button>
                </form>
              </div>
            </li>
          ))}
          {(selectedRide?.ride_passengers ?? []).length === 0 ? (
            <li className="py-2 text-sm text-neutral-400">
              Ninguém nessa carona ainda.
            </li>
          ) : null}
        </ul>

        {availablePassengers.length > 0 ? (
          <form
            action={addPassengerToRide}
            className="mt-4 flex items-end gap-2 border-t border-neutral-100 pt-4"
          >
            <input type="hidden" name="date" value={selectedDateKey} />
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500">
                Adicionar passageiro
              </label>
              <select
                name="passenger_id"
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {availablePassengers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-neutral-500">
                Preço
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                defaultValue={defaultPrice}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
              Adicionar
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
