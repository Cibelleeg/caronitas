"use client";

import { useActionState } from "react";
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
        <label className="block text-xs font-medium text-neutral-500">
          Início
        </label>
        <input
          type="date"
          name="start_date"
          required
          defaultValue={defaultStart}
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">
          Fim
        </label>
        <input
          type="date"
          name="end_date"
          required
          defaultValue={defaultEnd}
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Gerando..." : "Gerar caronas do período"}
      </button>
      {message ? (
        <p className="w-full text-sm text-neutral-600">{message}</p>
      ) : null}
    </form>
  );
}
