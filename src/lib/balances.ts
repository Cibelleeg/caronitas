import { createClient } from "@/lib/supabase/server";

export interface PassengerBalance {
  passengerId: string;
  fullName: string;
  totalCharged: number;
  totalPaid: number;
  balance: number;
  ridesTaken: number;
}

/** Saldo = soma das caronas confirmadas (status='confirmed') menos pagamentos. */
export async function getPassengerBalances(
  passengerId?: string,
): Promise<PassengerBalance[]> {
  const supabase = await createClient();

  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "passenger")
    .order("full_name");

  if (passengerId) {
    profilesQuery = profilesQuery.eq("id", passengerId);
  }

  const { data: passengers } = await profilesQuery;
  if (!passengers) return [];

  const results = await Promise.all(
    passengers.map(async (p) => {
      const [{ data: charges }, { data: payments }] = await Promise.all([
        supabase
          .from("ride_passengers")
          .select("price")
          .eq("passenger_id", p.id)
          .eq("status", "confirmed"),
        supabase.from("payments").select("amount").eq("passenger_id", p.id),
      ]);

      const totalCharged = (charges ?? []).reduce(
        (sum, c) => sum + Number(c.price),
        0,
      );
      const totalPaid = (payments ?? []).reduce(
        (sum, pay) => sum + Number(pay.amount),
        0,
      );

      return {
        passengerId: p.id,
        fullName: p.full_name,
        totalCharged,
        totalPaid,
        balance: totalCharged - totalPaid,
        ridesTaken: (charges ?? []).length,
      };
    }),
  );

  return results;
}
