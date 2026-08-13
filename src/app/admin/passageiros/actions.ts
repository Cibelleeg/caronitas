"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function invitePassenger(
  _prevState: string | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !fullName) {
    return "Preencha nome e e-mail.";
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (error) {
    return error.message;
  }

  revalidatePath("/admin/passageiros");
  return null;
}

export async function addRecurringPattern(formData: FormData) {
  const passengerId = String(formData.get("passenger_id"));
  const weekday = Number(formData.get("weekday"));
  const price = Number(formData.get("price"));
  const startDate = String(formData.get("start_date"));
  const endDate = String(formData.get("end_date"));

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_patterns").insert({
    passenger_id: passengerId,
    weekday,
    price,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/passageiros");
}

export async function togglePatternActive(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_patterns")
    .update({ active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/passageiros");
}

export async function deletePattern(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_patterns")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/passageiros");
}
