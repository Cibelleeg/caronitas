// Tipos escritos à mão a partir de supabase/migrations/0001_init.sql.
// Se o schema mudar, atualize este arquivo (ou gere com
// `supabase gen types typescript` quando tiver o projeto linkado).

export type UserRole = "driver" | "passenger";
export type RideStatus = "scheduled" | "cancelled";
export type ParticipationStatus = "confirmed" | "declined" | "no_show";
export type ParticipationSource = "recurring" | "manual";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: boolean;
          seats_per_ride: number;
          default_price: number;
          semester_start: string | null;
          semester_end: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Relationships: [];
      };
      recurring_patterns: {
        Row: {
          id: string;
          passenger_id: string;
          weekday: number;
          period: string;
          price: number;
          start_date: string;
          end_date: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          passenger_id: string;
          weekday: number;
          period?: string;
          price: number;
          start_date: string;
          end_date: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["recurring_patterns"]["Insert"]
        >;
        Relationships: [];
      };
      rides: {
        Row: {
          id: string;
          date: string;
          period: string;
          status: RideStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          period?: string;
          status?: RideStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rides"]["Insert"]>;
        Relationships: [];
      };
      ride_passengers: {
        Row: {
          id: string;
          ride_id: string;
          passenger_id: string;
          status: ParticipationStatus;
          price: number;
          source: ParticipationSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          passenger_id: string;
          status?: ParticipationStatus;
          price: number;
          source?: ParticipationSource;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ride_passengers"]["Insert"]
        >;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          passenger_id: string;
          amount: number;
          paid_at: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          passenger_id: string;
          amount: number;
          paid_at?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_driver: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      ride_confirmed_count: {
        Args: { p_ride_id: string };
        Returns: number;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];
export type RecurringPattern =
  Database["public"]["Tables"]["recurring_patterns"]["Row"];
export type Ride = Database["public"]["Tables"]["rides"]["Row"];
export type RidePassenger =
  Database["public"]["Tables"]["ride_passengers"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
