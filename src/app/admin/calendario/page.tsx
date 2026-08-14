import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Armchair,
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Plus,
  Pencil,
  RotateCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import MonthCalendar from "@/components/MonthCalendar";
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
import {
  addPassengerToRide,
  removeParticipation,
  toggleRideStatus,
  updateRideDetails,
  updateParticipationStatus,
} from "./actions";
import PublishRideForm from "./PublishRideForm";

interface RideWithPassengers {
  id: string;
  date: string;
  horario_id: string | null;
  label: string;
  origin: string;
  destination: string;
  time_of_day: string | null;
  status: "scheduled" | "cancelled";
  seats_total: number;
  default_price: number;
  notes: string | null;
  ride_type: "ida" | "volta";
  ride_passengers: {
    id: string;
    passenger_id: string;
    status: "pending" | "confirmed" | "declined" | "no_show";
    price: number;
    source: "recurring" | "manual";
    passengers: { full_name: string } | null;
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

  const { data: settings } = await supabase
    .from("app_settings")
    .select("seats_per_ride, default_price, semester_end")
    .single();

  const weeks = monthGrid(monthAnchor);
  const rangeStart = dateKey(weeks[0][0]);
  const rangeEnd = dateKey(weeks[weeks.length - 1][6]);

  const { data: rides } = await supabase
    .from("rides")
    .select(
      "id, date, horario_id, label, origin, destination, time_of_day, status, seats_total, default_price, notes, ride_type, ride_passengers(id, passenger_id, status, price, source, passengers(full_name))",
    )
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("time_of_day", { ascending: true, nullsFirst: false })
    .returns<RideWithPassengers[]>();

  const ridesByDate = new Map<string, RideWithPassengers[]>();
  (rides ?? []).forEach((r) => {
    const list = ridesByDate.get(r.date) ?? [];
    list.push(r);
    ridesByDate.set(r.date, list);
  });

  const { data: passengers } = await supabase
    .from("passengers")
    .select("id, full_name")
    .order("full_name");

  const selectedRides = ridesByDate.get(selectedDateKey) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-route">
            Central da motorista
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Suas caronas
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Escolha um dia e gerencie cada carona, passageiro e pagamento.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink-soft shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Com carona
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-warn" />
            Pendente
          </span>
        </div>
      </div>

      <div className="space-y-5">
        <details className="group overflow-hidden rounded-3xl border border-white/85 bg-card" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-route to-pop text-white shadow-lg shadow-route/20">
                <CalendarDays size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">Escolher outra data</span>
                <span className="block truncate text-xs text-ink-soft">Selecionada: {longDateLabel(selectedDateKey)}</span>
              </span>
            </span>
            <ChevronDown size={17} className="shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/80 px-4 pb-5 pt-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
          <MonthCalendar
            monthAnchor={monthAnchor}
            baseHref="/admin/calendario"
            compact
            renderDay={(day, key, inMonth) => {
          const dayRides = ridesByDate.get(key) ?? [];
          const isSelected = key === selectedDateKey;
          const hasPending = dayRides.some((r) =>
            r.ride_passengers.some((rp) => rp.status === "pending"),
          );

          return (
            <Link
              href={`/admin/calendario?month=${monthKeyForLinks}&date=${key}`}
              className={`flex h-full flex-col items-center justify-center gap-1 rounded-xl p-1 text-xs transition-colors ${
                isSelected
                  ? "bg-route text-white shadow-md shadow-route/20"
                  : "hover:bg-route-soft hover:text-route"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full">
                <span
                  className={`font-medium ${isSelected ? "text-white" : "text-ink"}`}
                >
                  {day.getDate()}
                </span>
              </span>
              {dayRides.length > 0 ? (
                <span className="flex min-h-1.5 gap-1">
                  {dayRides.slice(0, 2).map((ride) => (
                    <span
                      key={ride.id}
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected
                          ? "bg-white"
                          : ride.ride_type === "volta"
                            ? "bg-accent"
                            : "bg-route"
                      }`}
                    />
                  ))}
                  {hasPending ? <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-warn" /> : null}
                </span>
              ) : null}
            </Link>
          );
        }}
            />
            </div>
          </div>
        </details>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-route">
              Caronas do dia
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink">
              {longDateLabel(selectedDateKey)}
            </h2>
            </div>
            <span className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm">
              {selectedRides.length} {selectedRides.length === 1 ? "carona" : "caronas"}
            </span>
          </div>

        {selectedRides.map((ride) => {
          const pending = ride.ride_passengers.filter(
            (rp) => rp.status === "pending",
          );
          const others = ride.ride_passengers.filter(
            (rp) => rp.status !== "pending",
          );
          const confirmedCount = ride.ride_passengers.filter(
            (rp) => rp.status === "confirmed",
          ).length;
          const availableSeats = Math.max(ride.seats_total - confirmedCount, 0);
          const passengersOnRide = new Set(
            ride.ride_passengers.map((rp) => rp.passenger_id),
          );
          const availablePassengers = (passengers ?? []).filter(
            (p) => !passengersOnRide.has(p.id),
          );

          return (
            <div
              key={ride.id}
              className={`overflow-hidden rounded-3xl border bg-card shadow-[0_12px_35px_rgb(15_23_42/0.07)] transition-shadow hover:shadow-[0_18px_45px_rgb(15_23_42/0.11)] ${ride.status === "cancelled" ? "border-stop/30 opacity-75" : "border-line"}`}
            >
              <div className={`h-1.5 ${ride.status === "cancelled" ? "bg-stop" : ride.ride_type === "volta" ? "bg-accent" : "bg-route"}`} />
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line/70 px-5 py-5 sm:px-6 sm:py-6">
                <div className="min-w-0 flex-1">
                  <span
                    className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      ride.ride_type === "volta"
                        ? "bg-accent-soft text-accent-dark"
                        : "bg-route-soft text-route"
                    }`}
                  >
                    {ride.ride_type === "volta" ? (
                      <ArrowDownLeft size={11} />
                    ) : (
                      <ArrowUpRight size={11} />
                    )}
                    {ride.ride_type}
                  </span>
                  <div className="mt-1 grid grid-cols-[1.5rem_1fr] gap-x-2">
                    <span className="flex flex-col items-center pt-1">
                      <span className="h-3 w-3 rounded-full border-[3px] border-route bg-white" />
                      <span className="h-7 w-px bg-line" />
                      <MapPin size={16} className="text-accent" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Saída</p>
                      <h3 className="truncate text-base font-bold text-ink">{ride.origin}</h3>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint">Destino</p>
                      <p className="truncate text-base font-bold text-ink">{ride.destination}</p>
                    </div>
                  </div>
                  {ride.notes ? (
                    <p className="mt-2 text-xs text-ink-soft">{ride.notes}</p>
                  ) : null}
                </div>
                <form action={toggleRideStatus}>
                  <input type="hidden" name="ride_id" value={ride.id} />
                  <input
                    type="hidden"
                    name="next_status"
                    value={
                      ride.status === "cancelled" ? "scheduled" : "cancelled"
                    }
                  />
                  <button className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${ride.status === "cancelled" ? "border-go/30 text-go-dark hover:bg-go-soft" : "border-stop/20 text-stop hover:bg-stop-soft"}`}>
                    {ride.status === "cancelled"
                      ? <><RotateCcw size={13} /> Reativar carona</>
                      : <><Ban size={13} /> Cancelar carona</>}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-3 border-b border-line/70 bg-paper/60">
                <div className="border-r border-line/70 px-4 py-4 sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    <Clock3 size={12} className="mr-1 inline" /> Horário
                  </p>
                  <p className="mt-1 text-lg font-bold text-ink">{ride.time_of_day?.slice(0, 5) ?? "—"}</p>
                </div>
                <div className="border-r border-line/70 px-4 py-4 sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    <Armchair size={12} className="mr-1 inline" /> Vagas
                  </p>
                  <p className="mt-1 text-lg font-bold text-route">{availableSeats} <span className="text-xs font-normal text-ink-faint">livres</span></p>
                </div>
                <div className="px-4 py-4 sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    Valor por pessoa
                  </p>
                  <p className="mt-1 font-mono text-base font-bold text-ink">{formatBRL(ride.default_price)}</p>
                </div>
              </div>

              <details className="group border-b border-line/70">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-ink-soft marker:hidden hover:bg-paper hover:text-route sm:px-6">
                  <span className="flex items-center gap-2"><Pencil size={14} /> Editar detalhes da carona</span>
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <form action={updateRideDetails} className="grid gap-4 bg-paper/60 px-5 pb-5 pt-3 sm:grid-cols-6 sm:px-6">
                  <input type="hidden" name="ride_id" value={ride.id} />
                  <label className="text-xs font-medium text-ink-soft sm:col-span-3">
                    Sair de
                    <input name="origin" defaultValue={ride.origin} required className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-route" />
                  </label>
                  <label className="text-xs font-medium text-ink-soft sm:col-span-3">
                    Ir até
                    <input name="destination" defaultValue={ride.destination} required className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-route" />
                  </label>
                  <div className="grid gap-3 sm:col-span-6 sm:grid-cols-3">
                    <label className="text-xs font-medium text-ink-soft">Horário<input type="time" name="time_of_day" defaultValue={ride.time_of_day?.slice(0, 5)} className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm text-ink" /></label>
                    <label className="text-xs font-medium text-ink-soft">Vagas<input type="number" min="1" name="seats_total" defaultValue={ride.seats_total} required className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm text-ink" /></label>
                    <label className="text-xs font-medium text-ink-soft">Preço<input type="number" min="0" step="0.01" name="default_price" defaultValue={ride.default_price} required className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm text-ink" /></label>
                  </div>
                  <div className="flex justify-end sm:col-span-6">
                    <button className="w-full rounded-xl bg-route px-5 py-2.5 text-sm font-semibold text-white hover:bg-route-dark sm:w-auto">Salvar alterações</button>
                  </div>
                </form>
              </details>

              <div className="px-5 pb-6 sm:px-6">

              {pending.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-warn/15 bg-warn-soft p-4">
                  <p className="text-sm font-semibold text-warn">
                    Solicitações pendentes
                  </p>
                  <ul className="mt-2 space-y-2">
                    {pending.map((rp) => (
                      <li
                        key={rp.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/55 p-3 text-sm"
                      >
                        <span className="text-ink">
                          <span className="font-semibold">{rp.passengers?.full_name ?? "—"}</span> ·{" "}
                          <span className="font-mono">
                            {formatBRL(rp.price)}
                          </span>
                          {rp.source === "recurring" ? (
                            <span className="ml-2 rounded-full bg-route-soft px-2 py-0.5 text-[10px] font-bold text-route">Pedido fixo</span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-2">
                          <form action={updateParticipationStatus}>
                            <input type="hidden" name="id" value={rp.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="confirmed"
                            />
                            <button className="flex items-center gap-1.5 rounded-xl bg-go px-3 py-2 text-xs font-semibold text-white hover:bg-go-dark">
                              <Check size={12} />
                              Aprovar
                            </button>
                          </form>
                          <form action={updateParticipationStatus}>
                            <input type="hidden" name="id" value={rp.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="declined"
                            />
                            <button className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-paper">
                              <X size={12} />
                              Recusar
                            </button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-bold text-ink"><Users size={16} className="text-route" /> Passageiros <span className="rounded-full bg-route-soft px-2 py-0.5 text-[10px] text-route">{confirmedCount}/{ride.seats_total}</span></h4>
              </div>
              <ul className="mt-2 divide-y divide-line/70">
                {others.map((rp) => (
                  <li
                    key={rp.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {rp.passengers?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-ink-soft">
                        <span className="font-mono">
                          {formatBRL(rp.price)}
                        </span>{" "}
                        · {rp.source === "recurring" ? "fixo" : "avulso"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white/45 p-1">
                      <form action={updateParticipationStatus}>
                        <input type="hidden" name="id" value={rp.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            rp.status === "confirmed"
                              ? "bg-go-soft text-go-dark"
                              : "text-ink-faint hover:bg-paper"
                          }`}
                        >
                          Confirmado
                        </button>
                      </form>
                      <form action={updateParticipationStatus}>
                        <input type="hidden" name="id" value={rp.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <button
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            rp.status === "no_show"
                              ? "bg-stop-soft text-stop"
                              : "text-ink-faint hover:bg-paper"
                          }`}
                        >
                          Não veio
                        </button>
                      </form>
                      <form action={removeParticipation}>
                        <input type="hidden" name="id" value={rp.id} />
                        <button className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-ink-faint hover:bg-stop-soft hover:text-stop">
                          <Trash2 size={12} />
                          Remover
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
                {ride.ride_passengers.length === 0 ? (
                  <li className="py-2 text-sm text-ink-faint">
                    Ninguém nesse horário ainda.
                  </li>
                ) : null}
              </ul>

              {availablePassengers.length > 0 ? (
                <form
                  action={addPassengerToRide}
                  className="mt-5 grid items-end gap-3 rounded-2xl border border-white/80 bg-white/35 p-4 sm:grid-cols-[minmax(14rem,1fr)_8rem_auto]"
                >
                  <input type="hidden" name="ride_id" value={ride.id} />
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-ink-soft">
                      Adicionar passageiro fixo
                    </label>
                    <select
                      name="passenger_id"
                      required
                      className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
                    >
                      {availablePassengers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-soft">
                      Preço
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="price"
                      defaultValue={ride.default_price}
                      required
                      className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
                    />
                  </div>
                  <button className="flex items-center justify-center gap-1.5 rounded-xl bg-route px-4 py-2.5 text-sm font-semibold text-white hover:bg-route-dark">
                    <Plus size={14} />
                    Adicionar
                  </button>
                </form>
              ) : null}
              </div>
            </div>
          );
        })}

        {selectedRides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-7 text-center">
            <p className="text-sm text-ink-faint">
              Nenhum horário aberto nesse dia ainda.
            </p>
          </div>
        ) : null}

        <PublishRideForm
          key={selectedDateKey}
          selectedDate={selectedDateKey}
          defaultSeats={settings?.seats_per_ride ?? 4}
          defaultPrice={settings?.default_price ?? 5}
          defaultEnd={
            settings?.semester_end && settings.semester_end >= selectedDateKey
              ? settings.semester_end
              : selectedDateKey
          }
        />
        </section>
      </div>
    </div>
  );
}
