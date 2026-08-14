"use client";

import { useActionState } from "react";
import { Check, LoaderCircle, Phone, UserPlus, UserRound } from "lucide-react";
import { addQuickPassengerToRide } from "./actions";

export default function QuickPassengerForm({
  rideId,
  defaultPrice,
}: {
  rideId: string;
  defaultPrice: number;
}) {
  const [state, formAction, pending] = useActionState(addQuickPassengerToRide, {
    status: "idle" as const,
  });

  return (
    <details className="group/quick mt-3 overflow-hidden rounded-2xl border border-dashed border-route/25 bg-route-soft/35">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-route marker:hidden hover:bg-route-soft/60">
        <span className="flex items-center gap-2"><UserPlus size={15} /> Adicionar pessoa não cadastrada</span>
        <span className="text-lg font-normal transition-transform group-open/quick:rotate-45">+</span>
      </summary>
      <form action={formAction} className="grid gap-3 border-t border-route/10 p-4 sm:grid-cols-2">
        <input type="hidden" name="ride_id" value={rideId} />
        <label className="text-xs font-semibold text-ink-soft">
          Nome completo
          <span className="relative mt-1 block">
            <UserRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input name="full_name" required placeholder="Nome do passageiro" className="w-full rounded-xl border border-line bg-white py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-route" />
          </span>
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Celular com DDD
          <span className="relative mt-1 block">
            <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input type="tel" name="phone" required placeholder="(12) 99999-9999" className="w-full rounded-xl border border-line bg-white py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-route" />
          </span>
        </label>
        <label className="text-xs font-semibold text-ink-soft sm:col-span-1">
          Valor da carona
          <input type="number" name="price" min="0" step="0.01" defaultValue={defaultPrice} required className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-route" />
        </label>
        <button type="submit" disabled={pending} className="flex h-10 items-center justify-center gap-2 self-end rounded-xl bg-route px-4 text-xs font-bold text-white hover:bg-route-dark disabled:opacity-60">
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : state.status === "success" ? <Check size={14} /> : <UserPlus size={14} />}
          {pending ? "Adicionando..." : state.status === "success" ? "Adicionado" : "Cadastrar e adicionar"}
        </button>
        {state.message ? <p className={`rounded-xl px-3 py-2 text-xs font-medium sm:col-span-2 ${state.status === "success" ? "bg-go-soft text-go-dark" : "bg-stop-soft text-stop"}`}>{state.message}</p> : null}
      </form>
    </details>
  );
}
