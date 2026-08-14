"use client";

import { useActionState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Info,
  Phone,
  Repeat2,
  User,
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
  const isReturn = ride.rideType === "volta";
  const openSeats = Math.max(ride.seatsTotal - ride.seatsConfirmed, 0);
  const occupancy = Math.min(
    100,
    Math.round((ride.seatsConfirmed / Math.max(ride.seatsTotal, 1)) * 100),
  );
  const DirectionIcon = isReturn ? ArrowDownLeft : ArrowUpRight;

  return (
    <article className="flex flex-col rounded-[1.65rem] border border-white/85 bg-white/65 p-5 shadow-[0_10px_35px_rgb(31_41_90/0.11)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgb(31_41_90/0.15)]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white shadow-lg ${
            isReturn
              ? "bg-gradient-to-r from-accent to-orange-400 shadow-accent/20"
              : "bg-gradient-to-r from-route to-pop shadow-route/20"
          }`}
        >
          <DirectionIcon size={12} strokeWidth={3} />
          {ride.rideType}
        </span>
        <span className="font-mono text-xs font-semibold text-ink-soft">
          {currency.format(ride.price)} / pessoa
        </span>
      </div>

      <div className="py-5 text-center">
        <p
          className={`bg-clip-text font-display text-4xl font-bold leading-none text-transparent ${
            isReturn
              ? "bg-gradient-to-r from-accent to-orange-400"
              : "bg-gradient-to-r from-route to-pop"
          }`}
        >
          {ride.time || "—"}
        </p>
        <p className="mt-2 truncate text-xs text-ink-soft">
          <strong className="font-semibold text-ink">{ride.origin}</strong>
          <ArrowRight size={12} className="mx-1 inline text-ink-faint" />
          <strong className="font-semibold text-ink">{ride.destination}</strong>
        </p>
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-ink/8">
          <div
            className={`h-full rounded-full ${
              isReturn
                ? "bg-gradient-to-r from-accent to-orange-400"
                : "bg-gradient-to-r from-route to-pop"
            }`}
            style={{ width: `${occupancy}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[11px]">
          <span className="text-ink-soft">
            {ride.seatsConfirmed} de {ride.seatsTotal} ocupadas
          </span>
          <strong className={openSeats > 0 ? "text-go-dark" : "text-ink-faint"}>
            {openSeats > 0
              ? `${openSeats} ${openSeats === 1 ? "vaga livre" : "vagas livres"}`
              : "Lotada"}
          </strong>
        </div>
      </div>

      <div className="my-4 h-px bg-line/80" />

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 marker:hidden">
          {ride.passengerNames.length > 0 ? (
            <span className="flex shrink-0">
              {ride.passengerNames.slice(0, 4).map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${
                    isReturn
                      ? "bg-accent-soft text-accent-dark"
                      : "bg-route-soft text-route"
                  } ${index > 0 ? "-ml-2" : ""}`}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              ))}
            </span>
          ) : null}
          <span className="min-w-0 truncate text-xs text-ink-soft">
            {ride.passengerNames.length > 0
              ? ride.passengerNames.join(", ")
              : "Ninguém confirmado ainda"}
          </span>
        </summary>
        {ride.passengerNames.length > 0 ? (
          <ul className="mt-3 grid gap-1.5 rounded-xl bg-white/60 p-3 text-xs text-ink-soft">
            {ride.passengerNames.map((name, index) => (
              <li key={`${name}-full-${index}`}>{name}</li>
            ))}
          </ul>
        ) : null}
      </details>

      {ride.notes ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/55 px-3 py-2 text-xs leading-5 text-ink-soft">
          <Info size={13} className={`mt-1 shrink-0 ${isReturn ? "text-accent" : "text-route"}`} />
          {ride.notes}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        {openSeats <= 0 ? (
          <p className="text-center text-xs font-medium text-ink-soft">
            Sem vagas disponíveis nesse horário.
          </p>
        ) : state.status === "success" ? (
          <p className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-go-dark">
            <Check size={14} /> Pedido enviado — aguardando aprovação.
          </p>
        ) : (
          <details className="group/request">
            <summary
              className={`flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white marker:hidden shadow-lg ${
                isReturn
                  ? "bg-gradient-to-r from-accent to-orange-400 shadow-accent/20"
                  : "bg-gradient-to-r from-route to-pop shadow-route/20"
              }`}
            >
              Solicitar vaga
              <ArrowRight size={14} className="transition group-open/request:rotate-90" />
            </summary>
            <form action={formAction} className="mt-4 space-y-2.5">
              <input type="hidden" name="ride_id" value={ride.id} />
              <div className="grid grid-cols-2 gap-2">
                <Field icon={User} name="first_name" label="Nome" placeholder="Maria" />
                <Field icon={User} name="last_name" label="Sobrenome" placeholder="Silva" />
              </div>
              <Field icon={Phone} name="phone" label="Celular com DDD" placeholder="(12) 99999-9999" />
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/90 bg-white/55 p-3">
                <input
                  type="checkbox"
                  name="request_fixed"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-route"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Repeat2 size={13} className={isReturn ? "text-accent" : "text-route"} />
                    Quero essa carona toda semana
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-ink-soft">
                    Deixe desmarcado para pedir apenas esta data. Marque para solicitar este dia e horário até o fim do semestre.
                  </span>
                </span>
              </label>
              {state.status === "error" ? (
                <p className="rounded-lg bg-stop-soft px-3 py-2 text-xs text-stop">
                  {state.message ?? "Não foi possível enviar."}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isPending}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                  isReturn ? "bg-accent" : "bg-route"
                }`}
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

function Field({
  icon: Icon,
  name,
  label,
  placeholder,
}: {
  icon: typeof User;
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="block text-[11px] font-medium text-ink-soft">
      {label}
      <span className="relative mt-1 block">
        <Icon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          name={name}
          required
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/90 bg-white/70 py-2 pl-8 pr-2 text-xs text-ink outline-none focus:border-route"
        />
      </span>
    </label>
  );
}

export default function RequestVagaPanel({
  dateKey,
  title,
  rides,
  action,
}: {
  dateKey: string;
  title?: string;
  rides: RideSlot[];
  action: RequestVagaAction;
}) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const label = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const route = rides[0]
    ? `${rides[0].origin} ↔ ${rides[0].destination}`
    : null;

  return (
    <section>
      <div className="mb-5 text-center">
        <h2 className="font-display text-xl font-bold capitalize text-ink">{title ?? label}</h2>
        <p className="mt-1 text-xs text-ink-soft">
          {rides.length > 0
            ? `${rides.length} ${rides.length === 1 ? "horário disponível" : "horários disponíveis"}`
            : "Nenhum horário nesse dia"}
          {route ? ` · ${route}` : ""}
        </p>
      </div>
      {rides.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {rides.map((ride) => (
            <RideRequestForm key={ride.id} ride={ride} action={action} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.65rem] border border-white/80 bg-white/60 px-5 py-9 text-center text-sm text-ink-soft shadow-lg backdrop-blur-xl">
          Sem caronas agendadas nesse dia.
        </div>
      )}
    </section>
  );
}
