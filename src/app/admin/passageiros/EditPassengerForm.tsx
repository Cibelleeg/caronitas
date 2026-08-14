"use client";

import { useActionState } from "react";
import { Check, LoaderCircle, Pencil, Phone, UserRound } from "lucide-react";
import { updatePassenger } from "./actions";

export default function EditPassengerForm({
  passenger,
}: {
  passenger: { id: string; full_name: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(updatePassenger, {
    status: "idle" as const,
  });

  return (
    <details className="group/edit relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft marker:hidden hover:border-route/25 hover:text-route">
        <Pencil size={13} />
        Editar
      </summary>
      <div className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px]" />
      <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/90 bg-card p-5 shadow-[0_24px_80px_rgb(15_23_42/0.25)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-route">Editar cadastro</p>
            <h3 className="mt-1 text-lg font-bold text-ink">Dados do passageiro</h3>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-route-soft text-route">
            <UserRound size={18} />
          </span>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={passenger.id} />
          <label className="block text-xs font-semibold text-ink-soft">
            Nome completo
            <div className="relative mt-1.5">
              <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input name="full_name" defaultValue={passenger.full_name} required className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-route" />
            </div>
          </label>
          <label className="block text-xs font-semibold text-ink-soft">
            Celular com DDD
            <div className="relative mt-1.5">
              <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input type="tel" name="phone" defaultValue={passenger.phone} required className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-route" />
            </div>
          </label>

          {state.message ? (
            <p className={`rounded-xl px-3 py-2 text-xs font-medium ${state.status === "success" ? "bg-go-soft text-go-dark" : "bg-stop-soft text-stop"}`}>
              {state.message}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="h-10 rounded-xl border border-line text-xs font-bold text-ink-soft hover:bg-paper">
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-route text-xs font-bold text-white hover:bg-route-dark disabled:opacity-60">
              {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
              {pending ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
