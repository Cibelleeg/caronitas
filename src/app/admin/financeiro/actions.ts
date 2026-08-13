"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registerPayment(formData: FormData) {
  const passengerId = String(formData.get("passenger_id"));
  const amount = Number(formData.get("amount"));
  const paidAt = String(formData.get("paid_at"));
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    passenger_id: passengerId,
    amount,
    paid_at: paidAt,
    note: note || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/financeiro");
  revalidatePath("/minhas-caronas/financeiro");
}

export async function deletePayment(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/financeiro");
  revalidatePath("/minhas-caronas/financeiro");
}
