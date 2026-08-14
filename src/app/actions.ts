"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { todayKey } from "@/lib/dates";

export type RequestSeatState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function requestSeatPublic(
  _prevState: RequestSeatState,
  formData: FormData,
): Promise<RequestSeatState> {
  const rideId = String(formData.get("ride_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!firstName || !lastName) {
    return { status: "error", message: "Informe nome e sobrenome." };
  }
  if (phone.length < 10) {
    return { status: "error", message: "Informe um celular válido (com DDD)." };
  }

  const supabase = createAdminClient();

  const { data: ride } = await supabase
    .from("rides")
    .select("id, date, status, default_price")
    .eq("id", rideId)
    .maybeSingle();

  if (!ride || ride.status !== "scheduled" || ride.date < todayKey()) {
    return { status: "error", message: "Esse horário não está mais disponível." };
  }

  let passengerId: string;
  const { data: existingPassenger } = await supabase
    .from("passengers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingPassenger) {
    passengerId = existingPassenger.id;
  } else {
    const { data: created, error } = await supabase
      .from("passengers")
      .insert({ full_name: `${firstName} ${lastName}`, phone })
      .select("id")
      .single();
    if (error || !created) {
      return { status: "error", message: "Não foi possível registrar seu celular." };
    }
    passengerId = created.id;
  }

  const { error: insertError } = await supabase.from("ride_passengers").insert({
    ride_id: rideId,
    passenger_id: passengerId,
    price: ride.default_price,
    status: "pending",
    source: "manual",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { status: "error", message: "Você já pediu vaga nesse horário." };
    }
    return { status: "error", message: "Não foi possível enviar a solicitação." };
  }

  revalidatePath("/");
  revalidatePath("/admin/calendario");

  return {
    status: "success",
    message: "Solicitação enviada! Aguarde a aprovação da motorista.",
  };
}
