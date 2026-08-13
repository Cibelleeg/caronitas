import Link from "next/link";
import MonthCalendar from "@/components/MonthCalendar";
import { createClient } from "@/lib/supabase/server";
import { dateKey, monthGrid, monthKey, parseMonthKey, todayKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { requestSeat, updateMyStatus } from "./actions";

interface RideWithMyParticipation {
  id: string;
  date: string;
  status: "scheduled" | "cancelled";
  ride_passengers: {
    id: string;
    status: "confirmed" | "declined" | "no_show";
    price: number;
  }[];
}

export default async function MinhasCaronasPage({
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

  const { data: settings } = await supabase
    .from("app_settings")
    .select("seats_per_ride, default_price")
    .single();
  const seatsPerRide = settings?.seats_per_ride ?? 4;
  const defaultPrice = settings?.default_price ?? 0;

  const { data: rides } = await supabase
    .from("rides")
    .select("id, date, status, ride_passengers(id, status, price)")
    .eq("status", "scheduled")
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .returns<RideWithMyParticipation[]>();

  const ridesByDate = new Map<string, RideWithMyParticipation>();
  (rides ?? []).forEach((r) => ridesByDate.set(r.date, r));

  const selectedRide = ridesByDate.get(selectedDateKey) ?? null;
  const myParticipation = selectedRide?.ride_passengers[0] ?? null;
  const isFuture = selectedDateKey >= today;

  let openSeats: number | null = null;
  if (selectedRide && !myParticipation && isFuture) {
    const { data: confirmedCount } = await supabase.rpc("ride_confirmed_count", {
      p_ride_id: selectedRide.id,
    });
    openSeats = seatsPerRide - (confirmedCount ?? 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Minhas caronas
        </h1>
        <p className="text-sm text-neutral-500">
          Clique num dia para confirmar ou cancelar sua presença.
        </p>
      </div>

      <MonthCalendar
        monthAnchor={monthAnchor}
        baseHref="/minhas-caronas"
        renderDay={(day, key, inMonth) => {
          const ride = ridesByDate.get(key);
          const mine = ride?.ride_passengers[0];
          const isSelected = key === selectedDateKey;

          let badge: { text: string; classes: string } | null = null;
          if (mine) {
            if (mine.status === "confirmed") {
              badge = { text: "Vou", classes: "bg-emerald-100 text-emerald-700" };
            } else if (mine.status === "declined") {
              badge = { text: "Não vou", classes: "bg-neutral-100 text-neutral-500" };
            } else {
              badge = { text: "Faltei", classes: "bg-red-100 text-red-700" };
            }
          } else if (ride && key >= today) {
            badge = { text: "Aberta", classes: "bg-sky-50 text-sky-600" };
          }

          return (
            <Link
              href={`/minhas-caronas?month=${monthKeyForLinks}&date=${key}`}
              className={`flex h-full flex-col gap-1 rounded p-1 text-xs hover:bg-neutral-50 ${
                isSelected ? "ring-2 ring-neutral-900" : ""
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span className="font-medium text-neutral-700">
                {day.getDate()}
              </span>
              {badge ? (
                <span className={`rounded px-1 py-0.5 text-[10px] ${badge.classes}`}>
                  {badge.text}
                </span>
              ) : null}
            </Link>
          );
        }}
      />

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          {selectedDateKey}
        </h2>

        {!selectedRide ? (
          <p className="mt-2 text-sm text-neutral-400">
            Sem carona marcada nesse dia.
          </p>
        ) : myParticipation ? (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-neutral-700">
              <p>Preço: {formatBRL(myParticipation.price)}</p>
              <p className="text-xs text-neutral-500">
                Status atual: {myParticipation.status}
              </p>
            </div>
            {isFuture ? (
              <form action={updateMyStatus}>
                <input type="hidden" name="id" value={myParticipation.id} />
                <input
                  type="hidden"
                  name="status"
                  value={
                    myParticipation.status === "confirmed" ? "declined" : "confirmed"
                  }
                />
                <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  {myParticipation.status === "confirmed"
                    ? "Cancelar presença"
                    : "Confirmar presença"}
                </button>
              </form>
            ) : null}
          </div>
        ) : isFuture ? (
          <div className="mt-3">
            <p className="text-sm text-neutral-600">
              {openSeats !== null && openSeats > 0
                ? `${openSeats} vaga(s) livre(s) nessa carona.`
                : "Sem vagas livres nessa carona."}
            </p>
            {openSeats !== null && openSeats > 0 ? (
              <form action={requestSeat} className="mt-2">
                <input type="hidden" name="ride_id" value={selectedRide.id} />
                <input type="hidden" name="price" value={defaultPrice} />
                <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                  Pedir vaga ({formatBRL(defaultPrice)})
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">
            Você não participou dessa carona.
          </p>
        )}
      </div>
    </div>
  );
}
