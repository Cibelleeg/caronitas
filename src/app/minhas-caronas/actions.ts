"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMyStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("ride_passengers")
    .update({ status: status as "confirmed" | "declined" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/minhas-caronas");
}

export async function requestSeat(formData: FormData) {
  const rideId = String(formData.get("ride_id"));
  const price = Number(formData.get("price"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("ride_passengers").insert({
    ride_id: rideId,
    passenger_id: user.id,
    price,
    status: "confirmed",
    source: "manual",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/minhas-caronas");
}
