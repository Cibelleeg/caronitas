"use client";

import { useActionState } from "react";
import { invitePassenger } from "./actions";

export default function InviteForm() {
  const [error, formAction, pending] = useActionState(invitePassenger, null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="flex-1 min-w-40">
        <label className="block text-xs font-medium text-neutral-500">
          Nome
        </label>
        <input
          name="full_name"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-neutral-500">
          E-mail
        </label>
        <input
          type="email"
          name="email"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Convidando..." : "Convidar passageiro"}
      </button>
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
