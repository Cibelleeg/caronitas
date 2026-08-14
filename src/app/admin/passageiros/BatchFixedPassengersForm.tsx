"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCheck,
  LoaderCircle,
  Search,
  UsersRound,
} from "lucide-react";
import {
  addFixedPassengersBatch,
  type BatchFixedPassengersState,
} from "./actions";
import { WEEKDAY_LABELS } from "@/lib/dates";

interface PassengerOption {
  id: string;
  name: string;
  phone: string;
}

interface RideSequenceOption {
  id: string;
  label: string;
  name: string;
  time: string | null;
  rideType: "ida" | "volta";
  price: number;
  weekday: number;
}

const initialState: BatchFixedPassengersState = { status: "idle" };

export default function BatchFixedPassengersForm({
  passengers,
  rides,
  defaultEnd,
}: {
  passengers: PassengerOption[];
  rides: RideSequenceOption[];
  defaultEnd: string;
}) {
  const [state, formAction, pending] = useActionState(
    addFixedPassengersBatch,
    initialState,
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rideId, setRideId] = useState(rides[0]?.id ?? "");
  const [rideType, setRideType] = useState<"ida" | "volta">(
    rides[0]?.rideType ?? "ida",
  );
  const [weekday, setWeekday] = useState(rides[0]?.weekday ?? 0);
  const filteredRides = useMemo(
    () =>
      rides.filter(
        (ride) => ride.rideType === rideType && ride.weekday === weekday,
      ),
    [rides, rideType, weekday],
  );
  const selectedRide =
    filteredRides.find((ride) => ride.id === rideId) ?? filteredRides[0];
  const visiblePassengers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return passengers;
    return passengers.filter(
      (passenger) =>
        passenger.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
        passenger.phone.includes(normalized),
    );
  }, [passengers, query]);
  const allVisibleSelected =
    visiblePassengers.length > 0 &&
    visiblePassengers.every((passenger) => selected.has(passenger.id));

  function togglePassenger(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      visiblePassengers.forEach((passenger) => {
        if (allVisibleSelected) next.delete(passenger.id);
        else next.add(passenger.id);
      });
      return next;
    });
  }

  function changeRideType(nextType: "ida" | "volta") {
    const nextRide =
      rides.find(
        (ride) => ride.rideType === nextType && ride.weekday === weekday,
      ) ?? rides.find((ride) => ride.rideType === nextType);
    setRideType(nextType);
    if (nextRide) {
      setWeekday(nextRide.weekday);
      setRideId(nextRide.id);
    }
  }

  function changeWeekday(nextWeekday: number) {
    const nextRide = rides.find(
      (ride) => ride.rideType === rideType && ride.weekday === nextWeekday,
    );
    setWeekday(nextWeekday);
    setRideId(nextRide?.id ?? "");
  }

  if (rides.length === 0 || passengers.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-route/20 bg-card shadow-sm">
      <div className="flex items-start gap-3 bg-gradient-to-r from-route-soft to-white px-4 py-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-route text-white">
          <UsersRound size={18} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink">Definir passageiros fixos</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Filtre por direção, dia e horário e adicione várias pessoas.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4 border-t border-line p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_11rem_minmax(12rem,1fr)_9rem_8rem]">
          <label>
            <span className="text-xs font-medium text-ink-soft">Tipo</span>
            <select
              value={rideType}
              onChange={(event) =>
                changeRideType(event.target.value as "ida" | "volta")
              }
              required
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route"
            >
              <option
                value="ida"
                disabled={!rides.some((ride) => ride.rideType === "ida")}
              >
                ↗ Ida
              </option>
              <option
                value="volta"
                disabled={!rides.some((ride) => ride.rideType === "volta")}
              >
                ↙ Volta
              </option>
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Dia da semana</span>
            <select
              name="fixed_weekday"
              value={weekday}
              onChange={(event) => changeWeekday(Number(event.target.value))}
              required
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route"
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option
                  key={label}
                  value={index}
                  disabled={
                    !rides.some(
                      (ride) =>
                        ride.rideType === rideType && ride.weekday === index,
                    )
                  }
                >
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Horário</span>
            <select
              name="ride_id"
              value={selectedRide?.id ?? ""}
              onChange={(event) => setRideId(event.target.value)}
              required
              disabled={filteredRides.length === 0}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route disabled:opacity-50"
            >
              {filteredRides.length === 0 ? (
                <option value="">Nenhuma carona disponível</option>
              ) : (
                filteredRides.map((ride) => (
                  <option key={ride.id} value={ride.id}>
                    {ride.time ?? "Sem horário"} · {ride.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Aplicar até</span>
            <input
              type="date"
              name="recurring_end"
              defaultValue={defaultEnd}
              required
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route"
            />
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Preço</span>
            <input
              key={selectedRide?.id}
              type="number"
              name="price"
              step="0.01"
              min="0"
              defaultValue={selectedRide?.price ?? 0}
              required
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route"
            />
          </label>
        </div>

        <div className="rounded-xl border border-line">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/70 p-2.5">
            <div className="relative min-w-44 flex-1">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar passageiro..."
                className="w-full rounded-lg border border-line bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-route"
              />
            </div>
            <button
              type="button"
              onClick={toggleAllVisible}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-route hover:bg-route-soft"
            >
              <CheckCheck size={14} />
              {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
            </button>
          </div>
          <div className="grid max-h-52 gap-px overflow-y-auto bg-line sm:grid-cols-2 lg:grid-cols-3">
            {visiblePassengers.map((passenger) => (
              <label
                key={passenger.id}
                className={`flex cursor-pointer items-center gap-2.5 bg-white px-3 py-2.5 hover:bg-route-soft/40 ${selected.has(passenger.id) ? "bg-route-soft/60" : ""}`}
              >
                <input
                  type="checkbox"
                  name="passenger_ids"
                  value={passenger.id}
                  checked={selected.has(passenger.id)}
                  onChange={() => togglePassenger(passenger.id)}
                  className="h-4 w-4 accent-route"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{passenger.name}</span>
                  <span className="block truncate text-[11px] text-ink-faint">{passenger.phone}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {state.message ? (
          <p role="status" className={`rounded-xl px-3 py-2.5 text-sm ${state.status === "success" ? "bg-go-soft text-go-dark" : "bg-stop-soft text-stop"}`}>
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-ink-soft">
            {selected.size} {selected.size === 1 ? "passageiro selecionado" : "passageiros selecionados"}
          </p>
          <button
            type="submit"
            disabled={pending || selected.size === 0 || !selectedRide}
            className="flex items-center gap-2 rounded-xl bg-route px-4 py-2.5 text-sm font-semibold text-white hover:bg-route-dark disabled:opacity-50"
          >
            {pending ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : rideType === "volta" ? (
              <ArrowDownLeft size={15} />
            ) : (
              <ArrowUpRight size={15} />
            )}
            {pending ? "Aplicando..." : "Definir como fixos"}
          </button>
        </div>
      </form>
    </section>
  );
}
