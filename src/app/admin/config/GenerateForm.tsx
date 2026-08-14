"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateSemesterRides } from "./actions";

export default function GenerateForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const [message, formAction, pending] = useActionState(
    generateSemesterRides,
    null,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-ink-soft">
          Início
        </label>
        <input
          type="date"
          name="start_date"
          required
          defaultValue={defaultStart}
          className="mt-1 rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">
          Fim
        </label>
        <input
          type="date"
          name="end_date"
          required
          defaultValue={defaultEnd}
          className="mt-1 rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
      >
        <Sparkles size={14} />
        {pending ? "Gerando..." : "Gerar caronas do período"}
      </button>
      {message ? (
        <p className="w-full rounded-lg bg-go-soft px-3 py-2 text-sm text-go-dark">
          {message}
        </p>
      ) : null}
    </form>
  );
}
