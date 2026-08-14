"use client";

import { useActionState, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarPlus,
  Clock3,
  LoaderCircle,
  Repeat2,
  MapPin,
  StickyNote,
} from "lucide-react";
import {
  publishCustomRides,
  type PublishCustomRideState,
} from "./actions";

const initialState: PublishCustomRideState = { status: "idle" };

export default function PublishRideForm({
  selectedDate,
  defaultSeats,
  defaultPrice,
  defaultEnd,
}: {
  selectedDate: string;
  defaultSeats: number;
  defaultPrice: number;
  defaultEnd: string;
}) {
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [state, formAction, pending] = useActionState(
    publishCustomRides,
    initialState,
  );

  return (
    <details className="group overflow-hidden rounded-2xl border border-route/20 bg-card shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gradient-to-r from-route-soft to-white px-4 py-4 marker:hidden sm:px-5">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-route text-white shadow-sm">
            <CalendarPlus size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">
              Publicar nova carona
            </span>
            <span className="block text-xs font-normal text-ink-soft">
              Personalize horário, vagas, preço e repetição
            </span>
          </span>
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-route shadow-sm group-open:hidden">
          Criar
        </span>
      </summary>

      <form action={formAction} className="space-y-4 border-t border-line p-4 sm:p-5">
        <fieldset>
          <legend className="text-xs font-medium text-ink-soft">
            Tipo de carona
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className="cursor-pointer">
              <input
                type="radio"
                name="ride_type"
                value="ida"
                defaultChecked
                className="peer sr-only"
              />
              <span className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink-soft peer-checked:border-route peer-checked:bg-route-soft peer-checked:text-route">
                <ArrowUpRight size={16} /> Ida
              </span>
            </label>
            <label className="cursor-pointer">
              <input
                type="radio"
                name="ride_type"
                value="volta"
                className="peer sr-only"
              />
              <span className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink-soft peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent-dark">
                <ArrowDownLeft size={16} /> Volta
              </span>
            </label>
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-xs font-medium text-ink-soft">
              Sair de
            </span>
            <div className="relative mt-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-route" size={15} />
              <input name="origin" required placeholder="Ex: Centro" className="w-full rounded-xl border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route focus:bg-white" />
            </div>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Ir até</span>
            <div className="relative mt-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent" size={15} />
              <input name="destination" required placeholder="Ex: Universidade" className="w-full rounded-xl border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route focus:bg-white" />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label>
            <span className="text-xs font-medium text-ink-soft">Horário</span>
            <div className="relative mt-1">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={15} />
              <input type="time" name="time_of_day" required className="w-full rounded-xl border border-line bg-paper py-2 pl-9 pr-2 text-sm text-ink outline-none focus:border-route focus:bg-white" />
            </div>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Vagas</span>
            <input
              type="number"
              min="1"
              name="seats_total"
              defaultValue={defaultSeats}
              required
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route focus:bg-white"
            />
          </label>
          <label>
            <span className="text-xs font-medium text-ink-soft">Preço (R$)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="default_price"
              defaultValue={defaultPrice}
              required
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route focus:bg-white"
            />
          </label>
        </div>

        <label>
          <span className="text-xs font-medium text-ink-soft">
            Observação <span className="font-normal text-ink-faint">(opcional)</span>
          </span>
          <div className="relative mt-1">
            <StickyNote className="pointer-events-none absolute left-3 top-3 text-ink-faint" size={15} />
            <input
              name="notes"
              placeholder="Ex: saída pelo portão principal"
              className="w-full rounded-xl border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route focus:bg-white"
            />
          </div>
        </label>

        <div className="rounded-xl border border-line bg-paper p-3">
          <input type="hidden" name="start_date" value={selectedDate} />
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="repeat_weekly"
              checked={repeatWeekly}
              onChange={(event) => setRepeatWeekly(event.target.checked)}
              className="h-4 w-4 accent-route"
            />
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <Repeat2 size={15} className="text-route" />
              Repetir semanalmente
            </span>
          </label>
          <p className="ml-7 mt-1 text-xs text-ink-soft">
            Primeira carona em {selectedDate}.
          </p>
          {repeatWeekly ? (
            <label className="ml-7 mt-3 block max-w-xs">
              <span className="text-xs font-medium text-ink-soft">
                Repetir até
              </span>
              <input
                type="date"
                name="end_date"
                min={selectedDate}
                defaultValue={defaultEnd}
                required
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-route"
              />
            </label>
          ) : null}
        </div>

        {state.message ? (
          <p
            role="status"
            className={`rounded-xl px-3 py-2.5 text-sm ${
              state.status === "success"
                ? "bg-go-soft text-go-dark"
                : "bg-stop-soft text-stop"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-route px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-route-dark disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
          {pending
            ? "Publicando..."
            : repeatWeekly
              ? "Publicar caronas recorrentes"
              : "Publicar carona"}
        </button>
      </form>
    </details>
  );
}
