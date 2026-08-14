"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LoaderCircle, Pencil, Phone, UserRound, X } from "lucide-react";
import { updatePassenger } from "./actions";

export default function EditPassengerForm({ passenger }: {
  passenger: { id: string; full_name: string; phone: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updatePassenger, {
    status: "idle" as const,
  });

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:border-route/25 hover:text-route">
        <Pencil size={13} /> Editar
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button type="button" aria-label="Fechar edição" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[3px]" />
              <section role="dialog" aria-modal="true" aria-labelledby={`edit-passenger-${passenger.id}`} className="relative z-10 w-full max-w-md rounded-3xl border border-white/90 bg-white p-5 shadow-[0_24px_80px_rgb(15_23_42/0.28)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-route">Editar cadastro</p>
                    <h3 id={`edit-passenger-${passenger.id}`} className="mt-1 text-lg font-bold text-ink">Dados do passageiro</h3>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper text-ink-soft hover:bg-stop-soft hover:text-stop">
                    <X size={17} />
                  </button>
                </div>

                <form action={formAction} className="mt-5 space-y-4">
                  <input type="hidden" name="id" value={passenger.id} />
                  <label className="block text-xs font-semibold text-ink-soft">
                    Nome completo
                    <span className="relative mt-1.5 block">
                      <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input autoFocus name="full_name" defaultValue={passenger.full_name} required className="w-full rounded-xl border border-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-route focus:bg-white" />
                    </span>
                  </label>
                  <label className="block text-xs font-semibold text-ink-soft">
                    Celular com DDD
                    <span className="relative mt-1.5 block">
                      <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input type="tel" name="phone" defaultValue={passenger.phone} required className="w-full rounded-xl border border-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-route focus:bg-white" />
                    </span>
                  </label>

                  {state.message ? <p className={`rounded-xl px-3 py-2 text-xs font-medium ${state.status === "success" ? "bg-go-soft text-go-dark" : "bg-stop-soft text-stop"}`}>{state.message}</p> : null}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-line text-xs font-bold text-ink-soft hover:bg-paper">Cancelar</button>
                    <button type="submit" disabled={pending} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-route text-xs font-bold text-white hover:bg-route-dark disabled:opacity-60">
                      {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                      {pending ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
