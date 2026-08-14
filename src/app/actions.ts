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
  const requestFixed = formData.get("request_fixed") === "on";

  if (!firstName || !lastName) {
    return { status: "error", message: "Informe nome e sobrenome." };
  }
  if (phone.length < 10) {
    return { status: "error", message: "Informe um celular válido (com DDD)." };
  }

  const supabase = createAdminClient();

  const { data: ride } = await supabase
    .from("rides")
    .select(
      "id, date, status, default_price, series_id, ride_type, time_of_day, origin, destination",
    )
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

  let targetRides = [{ id: ride.id, default_price: ride.default_price }];

  if (requestFixed) {
    let recurringQuery = supabase
      .from("rides")
      .select("id, date, default_price, time_of_day")
      .eq("status", "scheduled")
      .gte("date", ride.date)
      .eq("ride_type", ride.ride_type)
      .eq("origin", ride.origin)
      .eq("destination", ride.destination)
      .order("date");

    if (ride.series_id) {
      recurringQuery = recurringQuery.eq("series_id", ride.series_id);
    } else {
      recurringQuery = ride.time_of_day
        ? recurringQuery.eq("time_of_day", ride.time_of_day)
        : recurringQuery.is("time_of_day", null);
    }

    const { data: recurringRides, error: recurringError } =
      await recurringQuery;
    if (recurringError) {
      return { status: "error", message: "Não foi possível localizar a sequência de caronas." };
    }

    const selectedWeekday = new Date(`${ride.date}T12:00:00`).getDay();
    targetRides = (recurringRides ?? [])
      .filter(
        (candidate) =>
          ride.series_id ||
          new Date(`${candidate.date}T12:00:00`).getDay() === selectedWeekday,
      )
      .map((candidate) => ({
        id: candidate.id,
        default_price: candidate.default_price,
      }));
  }

  const targetRideIds = targetRides.map((target) => target.id);
  const { data: existingParticipations } = await supabase
    .from("ride_passengers")
    .select("ride_id")
    .eq("passenger_id", passengerId)
    .in("ride_id", targetRideIds);
  const existingRideIds = new Set(
    (existingParticipations ?? []).map((participation) => participation.ride_id),
  );
  const rows = targetRides
    .filter((target) => !existingRideIds.has(target.id))
    .map((target) => ({
      ride_id: target.id,
      passenger_id: passengerId,
      price: target.default_price,
      status: "pending" as const,
      source: requestFixed ? ("recurring" as const) : ("manual" as const),
    }));

  if (rows.length === 0) {
    return {
      status: "error",
      message: requestFixed
        ? "Você já está inscrito nessa sequência de caronas."
        : "Você já pediu vaga nesse horário.",
    };
  }

  const { error: insertError } = await supabase
    .from("ride_passengers")
    .insert(rows);

  if (insertError) {
    return { status: "error", message: "Não foi possível enviar a solicitação." };
  }

  revalidatePath("/");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/caronas");
  revalidatePath("/admin/solicitacoes");

  return {
    status: "success",
    message: requestFixed
      ? `${rows.length} caronas solicitadas. Aguarde a aprovação da motorista.`
      : "Solicitação enviada! Aguarde a aprovação da motorista.",
  };
}
