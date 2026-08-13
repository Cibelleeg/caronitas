"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const RIDE_PERIOD = "única";

async function ensureRide(date: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("rides")
    .select("id")
    .eq("date", date)
    .eq("period", RIDE_PERIOD)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("rides")
    .insert({ date, period: RIDE_PERIOD })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Não foi possível criar a carona.");
  }
  return created.id;
}

export async function addPassengerToRide(formData: FormData) {
  const date = String(formData.get("date"));
  const passengerId = String(formData.get("passenger_id"));
  const price = Number(formData.get("price"));

  const supabase = await createClient();
  const rideId = await ensureRide(date);

  const { error } = await supabase.from("ride_passengers").upsert(
    {
      ride_id: rideId,
      passenger_id: passengerId,
      price,
      status: "confirmed",
      source: "manual",
    },
    { onConflict: "ride_id,passenger_id" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
}

export async function updateParticipationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("ride_passengers")
    .update({ status: status as "confirmed" | "declined" | "no_show" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
}

export async function removeParticipation(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("ride_passengers").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
}

export async function toggleRideStatus(formData: FormData) {
  const rideId = String(formData.get("ride_id"));
  const nextStatus = String(formData.get("next_status"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("rides")
    .update({ status: nextStatus as "scheduled" | "cancelled" })
    .eq("id", rideId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
}
