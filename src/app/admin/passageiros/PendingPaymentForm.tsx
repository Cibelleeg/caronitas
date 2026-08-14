"use client";

import { useActionState, useState } from "react";
import { Check, CircleDollarSign, LoaderCircle } from "lucide-react";
import { formatBRL } from "@/lib/money";
import {
  markPassengerRidePaid,
  type PassengerPaymentState,
} from "./actions";

export interface PendingRidePayment {
  id: string;
  label: string;
  amount: number;
}

const initialState: PassengerPaymentState = { status: "idle" };

export default function PendingPaymentForm({
  passengerId,
  rides,
}: {
  passengerId: string;
  rides: PendingRidePayment[];
}) {
  const [state, formAction, pending] = useActionState(
    markPassengerRidePaid,
    initialState,
  );
  const [participationId, setParticipationId] = useState(rides[0]?.id ?? "");
  const selected = rides.find((ride) => ride.id === participationId);

  if (rides.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-go-soft px-3 py-2.5 text-xs font-medium text-go-dark">
        <Check size={14} /> Nenhum pagamento pendente
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="passenger_id" value={passengerId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="text-xs font-medium text-ink-soft">
            Caronas pendentes de pagamento
          </span>
          <select
            name="participation_id"
            value={participationId}
            onChange={(event) => setParticipationId(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-route"
          >
            {rides.map((ride) => (
              <option key={ride.id} value={ride.id}>
                {ride.label} · {formatBRL(ride.amount)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-go px-4 py-2.5 text-sm font-semibold text-white hover:bg-go-dark disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <CircleDollarSign size={15} />
          )}
          {pending ? "Confirmando..." : `Confirmar ${formatBRL(selected?.amount ?? 0)}`}
        </button>
      </div>
      {state.message ? (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-xs ${
            state.status === "success"
              ? "bg-go-soft text-go-dark"
              : "bg-stop-soft text-stop"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
