"use client";

import { useActionState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Armchair,
  Banknote,
  Check,
  Clock3,
  Info,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react";

export interface RideSlot {
  id: string;
  label: string;
  origin: string;
  destination: string;
  time: string;
  price: number;
  rideType: "ida" | "volta";
  notes: string | null;
  seatsTotal: number;
  seatsConfirmed: number;
  passengerNames: string[];
}

export interface RequestVagaState {
  status: "idle" | "success" | "error";
  message?: string;
}

export type RequestVagaAction = (
  prevState: RequestVagaState,
  formData: FormData,
) => Promise<RequestVagaState>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function rideTone(rideType: "ida" | "volta") {
  return rideType === "volta"
    ? {
        pill: "bg-accent-soft text-accent-dark",
        dot: "border-accent bg-accent",
        button: "bg-accent hover:bg-accent-dark",
        focus: "focus:border-accent",
      }
    : {
        pill: "bg-route-soft text-route",
        dot: "border-route bg-route",
        button: "bg-route hover:bg-route-dark",
        focus: "focus:border-route",
      };
}

function RideRequestForm({
  ride,
  action,
}: {
  ride: RideSlot;
  action: RequestVagaAction;
}) {
  const [state, formAction, isPending] = useActionState(action, {
    status: "idle",
  });
  const openSeats = ride.seatsTotal - ride.seatsConfirmed;
  const tone = rideTone(ride.rideType);
  const DirectionIcon = ride.rideType === "volta" ? ArrowDownLeft : ArrowUpRight;
  const occupancy = Math.min(
    100,
    Math.round((ride.seatsConfirmed / Math.max(ride.seatsTotal, 1)) * 100),
  );

  return (
    <article className="mb-4 overflow-hidden rounded-3xl border border-line/80 bg-card shadow-[0_10px_35px_rgb(15_23_42/0.07)] transition-shadow hover:shadow-[0_16px_45px_rgb(15_23_42/0.11)]">
      <div
        className={`h-1.5 w-full ${ride.rideType === "volta" ? "bg-accent" : "bg-route"}`}
      />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone.pill}`}
          >
            <DirectionIcon size={12} />
            {ride.rideType}
          </span>
            <div className="mt-3 grid grid-cols-[1.25rem_1fr] gap-x-2 gap-y-1">
              <span className="relative flex flex-col items-center pt-1">
                <span className={`h-2.5 w-2.5 rounded-full border-2 bg-white ${ride.rideType === "volta" ? "border-accent" : "border-route"}`} />
                <span className="h-5 w-px bg-line" />
                <MapPin size={14} className={ride.rideType === "volta" ? "text-accent" : "text-route"} />
              </span>
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Saída</span>
                <strong className="block truncate text-sm text-ink">{ride.origin}</strong>
                <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Destino</span>
                <strong className="block truncate text-sm text-ink">{ride.destination}</strong>
              </span>
            </div>
        </div>
          <div className={`shrink-0 rounded-2xl px-3 py-2 text-right ${tone.pill}`}>
            <span className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
              <Clock3 size={11} /> Horário
            </span>
            <span className="mt-0.5 block font-display text-2xl font-bold leading-none">
            {ride.time || "—"}
          </span>
        </div>
      </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-paper px-3 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              <Banknote size={13} /> Valor por pessoa
            </span>
            <strong className="mt-1 block font-mono text-base text-ink">
              {currency.format(ride.price)}
            </strong>
          </div>
          <div className="rounded-2xl bg-paper px-3 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              <Armchair size={13} /> Disponibilidade
            </span>
            <strong
              className={`mt-1 block text-base ${openSeats > 0 ? "text-go-dark" : "text-stop"}`}
            >
              {openSeats > 0
                ? `${openSeats} ${openSeats === 1 ? "vaga livre" : "vagas livres"}`
                : "Lotada"}
            </strong>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-ink-soft">
            <span>Ocupação</span>
            <span className="font-medium">
              {ride.seatsConfirmed} de {ride.seatsTotal}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/70">
            <div
              className={`h-full rounded-full ${ride.rideType === "volta" ? "bg-accent" : "bg-route"}`}
              style={{ width: `${occupancy}%` }}
            />
          </div>
        </div>

        <details className="group mt-4 rounded-2xl border border-line/70 bg-paper/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 marker:hidden">
            <span className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Users size={15} className="text-route" />
              Quem já vai
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink-soft shadow-sm">
              {ride.passengerNames.length}
            </span>
          </summary>
          <div className="border-t border-line/70 px-3.5 py-3">
            {ride.passengerNames.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {ride.passengerNames.map((name, index) => (
                  <li key={`${name}-${index}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink">
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-soft">Nenhum passageiro confirmado ainda.</p>
            )}
          </div>
        </details>

        {ride.notes ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-line/70 bg-paper/70 px-3 py-2.5 text-xs leading-5 text-ink-soft">
            <Info size={14} className="mt-0.5 shrink-0 text-route" />
            <span>{ride.notes}</span>
          </div>
        ) : null}

      {openSeats <= 0 ? (
        <p className="mt-4 rounded-xl bg-paper px-3 py-2.5 text-xs font-medium text-ink-soft">
          Carona lotada — não há vagas disponíveis.
        </p>
      ) : state.status === "success" ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-go-soft px-3 py-3 text-sm font-medium text-go-dark">
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-go-soft">
            <Check size={13} strokeWidth={3} className="text-go" />
          </span>
          {state.message ?? "Pedido enviado. Aguarde a aprovação da motorista."}
        </div>
      ) : (
        <details className="group mt-5 border-t border-line pt-4">
          <summary
            className={`flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white marker:hidden ${tone.button}`}
          >
            Solicitar vaga
            <ArrowRight size={15} className="transition-transform group-open:rotate-90" />
          </summary>
          <form action={formAction} className="mt-4">
            <input type="hidden" name="ride_id" value={ride.id} />
            <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Nome</span>
              <div className="relative mt-1.5">
                <User
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  name="first_name"
                  required
                  placeholder="Cibells"
                  className={`w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none ${tone.focus}`}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Sobrenome</span>
              <div className="relative mt-1.5">
                <User
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  name="last_name"
                  required
                  placeholder="Godoy"
                  className={`w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none ${tone.focus}`}
                />
              </div>
            </label>
            </div>

            <label className="mt-2.5 block">
            <span className="text-xs font-medium text-ink-soft">
              Celular (com DDD)
            </span>
            <div className="relative mt-1.5">
              <Phone
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                name="phone"
                required
                placeholder="(12) 99103-8664"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route"
              />
            </div>
            </label>

            {state.status === "error" ? (
              <p className="mt-2.5 rounded-lg bg-stop-soft px-3 py-2 text-xs text-stop">
                {state.message ?? "Não foi possível enviar. Tente de novo."}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className={`mt-3.5 w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${tone.button}`}
            >
              {isPending ? "Enviando..." : "Confirmar solicitação"}
            </button>
          </form>
        </details>
      )}
      </div>
    </article>
  );
}

export default function RequestVagaPanel({
  dateKey,
  rides,
  action,
}: {
  dateKey: string;
  rides: RideSlot[];
  action: RequestVagaAction;
}) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const raw = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-route">
          Data selecionada
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-ink">
          {label}
        </h2>
        {rides.length > 0 ? (
          <p className="mt-1 text-xs text-ink-soft">
            {rides.length} {rides.length === 1 ? "horário disponível" : "horários disponíveis"}
          </p>
        ) : null}
      </div>
      {rides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-center">
          <p className="text-sm font-medium text-ink">Nenhuma carona nesse dia</p>
          <p className="mt-1 text-xs text-ink-soft">Escolha outra data no calendário.</p>
        </div>
      ) : (
        rides.map((ride) => (
          <RideRequestForm key={ride.id} ride={ride} action={action} />
        ))
      )}
    </div>
  );
}
