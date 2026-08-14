import { createAdminClient } from "@/lib/supabase/admin";

export interface PassengerBalance {
  passengerId: string;
  fullName: string;
  totalPaid: number;
  ridesTaken: number;
  futureRides: number;
  projectedAmount: number;
  openAmount: number;
}

export async function getPassengerBalances(
  passengerId?: string,
): Promise<PassengerBalance[]> {
  const supabase = createAdminClient();

  let passengersQuery = supabase
    .from("passengers")
    .select("id, full_name")
    .order("full_name");

  if (passengerId) {
    passengersQuery = passengersQuery.eq("id", passengerId);
  }

  const { data: passengers } = await passengersQuery;
  if (!passengers) return [];

  const results = await Promise.all(
    passengers.map(async (p) => {
      const [{ data: charges }, { data: payments }] = await Promise.all([
        supabase
          .from("ride_passengers")
          .select("id, price, rides(date)")
          .eq("passenger_id", p.id)
          .eq("status", "confirmed")
          .returns<
            { id: string; price: number; rides: { date: string } | null }[]
          >(),
        supabase
          .from("payments")
          .select("amount, ride_passenger_id")
          .eq("passenger_id", p.id),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const pastCharges = (charges ?? []).filter(
        (charge) => charge.rides && charge.rides.date < today,
      );
      const futureCharges = (charges ?? []).filter(
        (charge) => charge.rides && charge.rides.date >= today,
      );
      const paidParticipationIds = new Set(
        (payments ?? []).flatMap((payment) =>
          payment.ride_passenger_id ? [payment.ride_passenger_id] : [],
        ),
      );
      const openAmount = pastCharges
        .filter((charge) => !paidParticipationIds.has(charge.id))
        .reduce((sum, charge) => sum + Number(charge.price), 0);
      const futureCharged = futureCharges.reduce(
        (sum, charge) => sum + Number(charge.price),
        0,
      );
      const totalPaid = (payments ?? []).reduce(
        (sum, pay) => sum + Number(pay.amount),
        0,
      );

      return {
        passengerId: p.id,
        fullName: p.full_name,
        totalPaid,
        ridesTaken: pastCharges.length,
        futureRides: futureCharges.length,
        projectedAmount:
          pastCharges.reduce(
            (sum, charge) => sum + Number(charge.price),
            0,
          ) + futureCharged,
        openAmount,
      };
    }),
  );

  return results;
}
