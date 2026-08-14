"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dateKey, datesForWeekdayInRange } from "@/lib/dates";

export async function updateSettings(formData: FormData) {
  const seatsPerRide = Number(formData.get("seats_per_ride"));
  const defaultPrice = Number(formData.get("default_price"));
  const semesterStart = String(formData.get("semester_start") || "") || null;
  const semesterEnd = String(formData.get("semester_end") || "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      seats_per_ride: seatsPerRide,
      default_price: defaultPrice,
      semester_start: semesterStart,
      semester_end: semesterEnd,
    })
    .eq("id", true);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/config");
}

export async function generateSemesterRides(
  _prevState: string | null,
  formData: FormData,
): Promise<string> {
  const startDate = String(formData.get("start_date"));
  const endDate = String(formData.get("end_date"));

  if (!startDate || !endDate) {
    return "Informe o início e o fim do período.";
  }

  const supabase = await createClient();
  const { data: patterns } = await supabase
    .from("recurring_patterns")
    .select("*")
    .eq("active", true);

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  let ridesCreated = 0;
  let participantsAdded = 0;
  const horarioCache = new Map<
    string,
    {
      label: string;
      time_of_day: string | null;
      seats_total: number;
      default_price: number;
    }
  >();

  for (const pattern of patterns ?? []) {
    const patternStart = new Date(`${pattern.start_date}T00:00:00`);
    const patternEnd = new Date(`${pattern.end_date}T00:00:00`);
    const effectiveStart = start > patternStart ? start : patternStart;
    const effectiveEnd = end < patternEnd ? end : patternEnd;
    if (effectiveStart > effectiveEnd) continue;

    let horario = horarioCache.get(pattern.horario_id);
    if (!horario) {
      const { data: horarioRow } = await supabase
        .from("horarios")
        .select("label, time_of_day, seats_total, default_price")
        .eq("id", pattern.horario_id)
        .single();
      if (!horarioRow) continue;
      horario = horarioRow;
      horarioCache.set(pattern.horario_id, horario);
    }

    const dates = datesForWeekdayInRange(
      pattern.weekday,
      effectiveStart,
      effectiveEnd,
    );

    for (const date of dates) {
      const key = dateKey(date);

      let rideId: string;
      const { data: existingRide } = await supabase
        .from("rides")
        .select("id")
        .eq("date", key)
        .eq("horario_id", pattern.horario_id)
        .maybeSingle();

      if (existingRide) {
        rideId = existingRide.id;
      } else {
        const { data: created, error } = await supabase
          .from("rides")
          .insert({
            date: key,
            horario_id: pattern.horario_id,
            label: horario.label,
            origin: horario.label,
            destination: "Destino não informado",
            ride_type: horario.label.trim().toLowerCase().startsWith("volta")
              ? "volta"
              : "ida",
            time_of_day: horario.time_of_day,
            seats_total: horario.seats_total,
            default_price: horario.default_price,
          })
          .select("id")
          .single();
        if (error || !created) continue;
        rideId = created.id;
        ridesCreated++;
      }

      const { error: insertError } = await supabase
        .from("ride_passengers")
        .upsert(
          {
            ride_id: rideId,
            passenger_id: pattern.passenger_id,
            price: pattern.price,
            status: "confirmed",
            source: "recurring",
          },
          { onConflict: "ride_id,passenger_id", ignoreDuplicates: true },
        );
      if (!insertError) participantsAdded++;
    }
  }

  revalidatePath("/admin/calendario");
  revalidatePath("/admin/financeiro");
  revalidatePath("/minhas-caronas");

  return `Prontinho: ${ridesCreated} caronas novas criadas e ${participantsAdded} participações adicionadas/confirmadas.`;
}
