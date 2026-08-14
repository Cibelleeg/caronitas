"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dateKey } from "@/lib/dates";

export interface PublishCustomRideState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function publishCustomRides(
  _previousState: PublishCustomRideState,
  formData: FormData,
): Promise<PublishCustomRideState> {
  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const label = `${origin} → ${destination}`;
  const rideType = String(formData.get("ride_type") ?? "");
  const timeOfDay = String(formData.get("time_of_day") ?? "").trim();
  const seatsTotal = Number(formData.get("seats_total"));
  const defaultPrice = Number(formData.get("default_price"));
  const notes = String(formData.get("notes") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const repeatWeekly = formData.get("repeat_weekly") === "on";

  if (!origin || !destination) {
    return { status: "error", message: "Informe a origem e o destino." };
  }
  if (rideType !== "ida" && rideType !== "volta") {
    return { status: "error", message: "Escolha entre ida ou volta." };
  }
  if (!startDate || (repeatWeekly && !endDate)) {
    return { status: "error", message: "Informe o período da carona." };
  }
  if (!Number.isInteger(seatsTotal) || seatsTotal < 1) {
    return { status: "error", message: "Informe uma quantidade válida de vagas." };
  }
  if (!Number.isFinite(defaultPrice) || defaultPrice < 0) {
    return { status: "error", message: "Informe um preço válido." };
  }

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${repeatWeekly ? endDate : startDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return {
      status: "error",
      message: "A data final deve ser igual ou posterior à data inicial.",
    };
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 260) {
    dates.push(dateKey(cursor));
    if (!repeatWeekly) break;
    cursor.setDate(cursor.getDate() + 7);
  }
  if (cursor <= end && dates.length === 260) {
    return { status: "error", message: "O período informado é muito longo." };
  }

  const supabase = await createClient();
  let existingQuery = supabase
    .from("rides")
    .select("date")
    .in("date", dates)
    .eq("origin", origin)
    .eq("destination", destination);
  existingQuery = timeOfDay
    ? existingQuery.eq("time_of_day", timeOfDay)
    : existingQuery.is("time_of_day", null);
  const { data: existing, error: existingError } = await existingQuery;
  if (existingError) {
    return { status: "error", message: existingError.message };
  }

  const existingDates = new Set((existing ?? []).map((ride) => ride.date));
  const seriesId = repeatWeekly ? randomUUID() : null;
  const rows = dates
    .filter((date) => !existingDates.has(date))
    .map((date) => ({
      date,
      horario_id: null,
      series_id: seriesId,
      label,
      origin,
      destination,
      ride_type: rideType as "ida" | "volta",
      time_of_day: timeOfDay || null,
      seats_total: seatsTotal,
      default_price: defaultPrice,
      notes: notes || null,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("rides").insert(rows);
    if (error) return { status: "error", message: error.message };
  }

  revalidatePath("/admin/calendario");
  revalidatePath("/");

  const skipped = dates.length - rows.length;
  return {
    status: "success",
    message:
      skipped > 0
        ? `${rows.length} caronas publicadas; ${skipped} já existiam.`
        : rows.length === 1
          ? "Carona publicada com sucesso."
          : `${rows.length} caronas publicadas com sucesso.`,
  };
}

export async function addPassengerToRide(formData: FormData) {
  const rideId = String(formData.get("ride_id"));
  const passengerId = String(formData.get("passenger_id"));
  const price = Number(formData.get("price"));

  const supabase = await createClient();
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

export async function updateRideDetails(formData: FormData) {
  const rideId = String(formData.get("ride_id") ?? "");
  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const timeOfDay = String(formData.get("time_of_day") ?? "").trim();
  const seatsTotal = Number(formData.get("seats_total"));
  const defaultPrice = Number(formData.get("default_price"));

  if (!rideId || !origin || !destination) {
    throw new Error("Informe a origem e o destino da carona.");
  }
  if (!Number.isInteger(seatsTotal) || seatsTotal < 1) {
    throw new Error("Informe uma quantidade válida de vagas.");
  }
  if (!Number.isFinite(defaultPrice) || defaultPrice < 0) {
    throw new Error("Informe um preço válido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("rides")
    .update({
      origin,
      destination,
      label: `${origin} → ${destination}`,
      time_of_day: timeOfDay || null,
      seats_total: seatsTotal,
      default_price: defaultPrice,
    })
    .eq("id", rideId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
  revalidatePath("/");
}

export async function updateParticipationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const supabase = await createClient();
  const { data: participation } = await supabase
    .from("ride_passengers")
    .select(
      "passenger_id, source, status, rides(id, date, series_id, ride_type, time_of_day, origin, destination)",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<{
      passenger_id: string;
      source: "recurring" | "manual";
      status: "pending" | "confirmed" | "declined" | "no_show";
      rides: {
        id: string;
        date: string;
        series_id: string | null;
        ride_type: "ida" | "volta";
        time_of_day: string | null;
        origin: string;
        destination: string;
      } | null;
    }>();

  if (
    participation?.source === "recurring" &&
    participation.status === "pending" &&
    (status === "confirmed" || status === "declined") &&
    participation.rides
  ) {
    const ride = participation.rides;
    let ridesQuery = supabase
      .from("rides")
      .select("id, date")
      .gte("date", ride.date)
      .eq("ride_type", ride.ride_type)
      .eq("origin", ride.origin)
      .eq("destination", ride.destination);
    ridesQuery = ride.series_id
      ? ridesQuery.eq("series_id", ride.series_id)
      : ride.time_of_day
        ? ridesQuery.eq("time_of_day", ride.time_of_day)
        : ridesQuery.is("time_of_day", null);
    const { data: sequenceRides } = await ridesQuery;
    const weekday = new Date(`${ride.date}T12:00:00`).getDay();
    const sequenceRideIds = (sequenceRides ?? [])
      .filter(
        (candidate) =>
          ride.series_id ||
          new Date(`${candidate.date}T12:00:00`).getDay() === weekday,
      )
      .map((candidate) => candidate.id);

    const { error } = await supabase
      .from("ride_passengers")
      .update({ status: status as "confirmed" | "declined" })
      .eq("passenger_id", participation.passenger_id)
      .eq("source", "recurring")
      .eq("status", "pending")
      .in("ride_id", sequenceRideIds);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/calendario");
    revalidatePath("/admin/solicitacoes");
    revalidatePath("/admin/passageiros");
    revalidatePath("/consulta");
    return;
  }

  const { error } = await supabase
    .from("ride_passengers")
    .update({
      status: status as "confirmed" | "declined" | "no_show" | "pending",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/solicitacoes");
  revalidatePath("/consulta");
}

export async function removeParticipation(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("ride_passengers").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendario");
  revalidatePath("/minhas-caronas");
}

export async function markParticipationPaid(formData: FormData) {
  const participationId = String(formData.get("participation_id"));
  const supabase = await createClient();

  const { data: participation, error: participationError } = await supabase
    .from("ride_passengers")
    .select("passenger_id, price, rides(date, label)")
    .eq("id", participationId)
    .single()
    .returns<{
      passenger_id: string;
      price: number;
      rides: { date: string; label: string } | null;
    }>();

  if (participationError || !participation) {
    throw new Error("Participação não encontrada.");
  }

  const rideDescription = participation.rides
    ? `${participation.rides.label} · ${participation.rides.date}`
    : "Pagamento de carona";
  const { error } = await supabase.from("payments").insert({
    passenger_id: participation.passenger_id,
    ride_passenger_id: participationId,
    amount: participation.price,
    paid_at: new Date().toISOString().slice(0, 10),
    note: rideDescription,
  });

  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/passageiros");
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
  revalidatePath("/minhas-caronas");
}
