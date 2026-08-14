"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

export interface AddPassengerToRideState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface BatchFixedPassengersState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface PassengerPaymentState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function addPassenger(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!fullName || phone.length < 10) {
    throw new Error("Informe nome completo e um celular válido (com DDD).");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("passengers").insert({
    full_name: fullName,
    phone,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um passageiro com esse celular.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/passageiros");
}

export async function deletePassenger(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Passageiro não encontrado.");

  const supabase = await createClient();
  const { error } = await supabase.from("passengers").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/passageiros");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/financeiro");
  revalidatePath("/");
}

export async function addPassengerToRide(
  _previousState: AddPassengerToRideState,
  formData: FormData,
): Promise<AddPassengerToRideState> {
  const passengerId = String(formData.get("passenger_id") ?? "");
  const rideId = String(formData.get("ride_id") ?? "");
  const price = Number(formData.get("price"));
  const makeRecurring = formData.get("make_recurring") === "on";
  const fixedWeekday = Number(formData.get("fixed_weekday"));
  const recurringEnd = String(formData.get("recurring_end") ?? "");

  if (!passengerId || !rideId) {
    return { status: "error", message: "Selecione uma carona." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { status: "error", message: "Informe um preço válido." };
  }

  const supabase = await createClient();
  const { data: ride } = await supabase
    .from("rides")
    .select(
      "id, date, label, time_of_day, seats_total, status, series_id, horario_id, ride_type",
    )
    .eq("id", rideId)
    .single();

  if (!ride || ride.status !== "scheduled") {
    return { status: "error", message: "Essa carona não está mais disponível." };
  }
  let candidateRides = [ride];
  if (makeRecurring) {
    if (
      !Number.isInteger(fixedWeekday) ||
      fixedWeekday < 0 ||
      fixedWeekday > 6 ||
      !recurringEnd
    ) {
      return {
        status: "error",
        message: "Escolha o dia da semana e a data final.",
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (recurringEnd < today) {
      return { status: "error", message: "A data final já passou." };
    }

    let recurringQuery = supabase
      .from("rides")
      .select(
        "id, date, label, time_of_day, seats_total, status, series_id, horario_id, ride_type",
      )
      .eq("status", "scheduled")
      .gte("date", today)
      .lte("date", recurringEnd)
      .eq("ride_type", ride.ride_type)
      .eq("label", ride.label)
      .order("date");

    recurringQuery = ride.time_of_day
      ? recurringQuery.eq("time_of_day", ride.time_of_day)
      : recurringQuery.is("time_of_day", null);

    const { data: recurringRides, error: recurringError } =
      await recurringQuery.limit(260);
    if (recurringError) {
      return { status: "error", message: recurringError.message };
    }

    candidateRides = (recurringRides ?? []).filter(
      (candidate) =>
        new Date(`${candidate.date}T12:00:00`).getDay() === fixedWeekday,
    );
  }

  const candidateIds = candidateRides.map((candidate) => candidate.id);
  const [{ data: existingParticipations }, counts] = await Promise.all([
    supabase
      .from("ride_passengers")
      .select("ride_id")
      .eq("passenger_id", passengerId)
      .in("ride_id", candidateIds),
    Promise.all(
      candidateRides.map(async (candidate) => {
        const { data } = await supabase.rpc("ride_confirmed_count", {
          p_ride_id: candidate.id,
        });
        return [candidate.id, data ?? 0] as const;
      }),
    ),
  ]);
  const existingRideIds = new Set(
    (existingParticipations ?? []).map((participation) => participation.ride_id),
  );
  const confirmedByRide = new Map(counts);
  const availableRides = candidateRides.filter(
    (candidate) =>
      !existingRideIds.has(candidate.id) &&
      (confirmedByRide.get(candidate.id) ?? 0) < candidate.seats_total,
  );

  if (availableRides.length === 0) {
    return {
      status: "error",
      message: "Não há vagas disponíveis nessas caronas.",
    };
  }

  const { error } = await supabase.from("ride_passengers").insert(
    availableRides.map((candidate) => ({
      ride_id: candidate.id,
      passenger_id: passengerId,
      price,
      status: "confirmed" as const,
      source: makeRecurring ? ("recurring" as const) : ("manual" as const),
    })),
  );

  if (error) return { status: "error", message: error.message };
  revalidatePath("/admin/passageiros");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/financeiro");
  revalidatePath("/");
  const skipped = candidateRides.length - availableRides.length;
  return {
    status: "success",
    message: makeRecurring
      ? `${availableRides.length} caronas adicionadas${skipped > 0 ? `; ${skipped} ignoradas por lotação ou vínculo existente` : ""}.`
      : "Passageiro adicionado à carona.",
  };
}

export async function addFixedPassengersBatch(
  _previousState: BatchFixedPassengersState,
  formData: FormData,
): Promise<BatchFixedPassengersState> {
  const passengerIds = formData
    .getAll("passenger_ids")
    .map(String)
    .filter(Boolean);
  const rideId = String(formData.get("ride_id") ?? "");
  const price = String(formData.get("price") ?? "");
  const fixedWeekday = String(formData.get("fixed_weekday") ?? "");
  const recurringEnd = String(formData.get("recurring_end") ?? "");

  if (!rideId || passengerIds.length === 0) {
    return {
      status: "error",
      message: "Escolha uma carona e pelo menos um passageiro.",
    };
  }

  let added = 0;
  let skipped = 0;
  for (const passengerId of passengerIds) {
    const itemData = new FormData();
    itemData.set("passenger_id", passengerId);
    itemData.set("ride_id", rideId);
    itemData.set("price", price);
    itemData.set("make_recurring", "on");
    itemData.set("fixed_weekday", fixedWeekday);
    itemData.set("recurring_end", recurringEnd);
    const result = await addPassengerToRide(
      { status: "idle" },
      itemData,
    );
    if (result.status === "success") added++;
    else skipped++;
  }

  return {
    status: added > 0 ? "success" : "error",
    message:
      added > 0
        ? `${added} ${added === 1 ? "passageiro foi definido" : "passageiros foram definidos"} como fixo${skipped > 0 ? `; ${skipped} não puderam ser adicionados` : ""}.`
        : "Nenhum passageiro pôde ser adicionado. Verifique as vagas disponíveis.",
  };
}

export async function markPassengerRidePaid(
  _previousState: PassengerPaymentState,
  formData: FormData,
): Promise<PassengerPaymentState> {
  const passengerId = String(formData.get("passenger_id") ?? "");
  const participationId = String(formData.get("participation_id") ?? "");
  if (!passengerId || !participationId) {
    return { status: "error", message: "Escolha uma carona pendente." };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: participation, error: participationError } = await supabase
    .from("ride_passengers")
    .select("id, passenger_id, price, status, rides(date, label)")
    .eq("id", participationId)
    .eq("passenger_id", passengerId)
    .single()
    .returns<{
      id: string;
      passenger_id: string;
      price: number;
      status: string;
      rides: { date: string; label: string } | null;
    }>();

  if (
    participationError ||
    !participation ||
    participation.status !== "confirmed" ||
    !participation.rides ||
    participation.rides.date >= today
  ) {
    return {
      status: "error",
      message: "Essa carona ainda não está disponível para pagamento.",
    };
  }

  const { error } = await supabase.from("payments").insert({
    passenger_id: passengerId,
    ride_passenger_id: participationId,
    amount: participation.price,
    paid_at: today,
    note: `${participation.rides.label} · ${participation.rides.date}`,
  });

  if (error?.code === "23505") {
    return { status: "error", message: "Essa carona já foi paga." };
  }
  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/passageiros");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/calendario");
  return { status: "success", message: "Pagamento confirmado." };
}

export async function addRecurringPattern(formData: FormData) {
  const passengerId = String(formData.get("passenger_id"));
  const horarioId = String(formData.get("horario_id"));
  const weekday = Number(formData.get("weekday"));
  const price = Number(formData.get("price"));
  const startDate = String(formData.get("start_date"));
  const endDate = String(formData.get("end_date"));

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_patterns").insert({
    passenger_id: passengerId,
    horario_id: horarioId,
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
