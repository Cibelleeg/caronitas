"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePassenger } from "./actions";

export default function DeletePassengerButton({
  passengerId,
  passengerName,
}: {
  passengerId: string;
  passengerName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const confirmed = window.confirm(
          `Excluir ${passengerName}?\n\nAs caronas, os pagamentos e os padrões vinculados a esse passageiro também serão removidos. Esta ação não pode ser desfeita.`,
        );
        if (!confirmed) return;

        const formData = new FormData();
        formData.set("id", passengerId);
        startTransition(async () => {
          await deletePassenger(formData);
        });
      }}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink-faint hover:bg-stop-soft hover:text-stop disabled:opacity-50"
      aria-label={`Excluir ${passengerName}`}
    >
      <Trash2 size={12} />
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
