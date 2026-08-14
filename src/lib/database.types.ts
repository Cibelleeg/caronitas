export type UserRole = "driver" | "passenger";
export type RideStatus = "scheduled" | "cancelled";
export type RideType = "ida" | "volta";
export type ParticipationStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "no_show";
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
      passengers: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["passengers"]["Insert"]>;
        Relationships: [];
      };
      horarios: {
        Row: {
          id: string;
          label: string;
          time_of_day: string | null;
          seats_total: number;
          default_price: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          time_of_day?: string | null;
          seats_total?: number;
          default_price?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["horarios"]["Insert"]>;
        Relationships: [];
      };
      recurring_patterns: {
        Row: {
          id: string;
          passenger_id: string;
          weekday: number;
          horario_id: string;
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
          horario_id: string;
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
          horario_id: string | null;
          series_id: string | null;
          ride_type: RideType;
          label: string;
          origin: string;
          destination: string;
          time_of_day: string | null;
          status: RideStatus;
          seats_total: number;
          default_price: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          horario_id?: string | null;
          series_id?: string | null;
          ride_type?: RideType;
          label: string;
          origin: string;
          destination: string;
          time_of_day?: string | null;
          status?: RideStatus;
          seats_total?: number;
          default_price?: number;
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
          ride_passenger_id: string | null;
          amount: number;
          paid_at: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          passenger_id: string;
          ride_passenger_id?: string | null;
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
      ride_passenger_names: {
        Args: { p_ride_ids: string[] };
        Returns: { ride_id: string; full_name: string }[];
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];
export type Horario = Database["public"]["Tables"]["horarios"]["Row"];
export type Passenger = Database["public"]["Tables"]["passengers"]["Row"];
export type RecurringPattern =
  Database["public"]["Tables"]["recurring_patterns"]["Row"];
export type Ride = Database["public"]["Tables"]["rides"]["Row"];
export type RidePassenger =
  Database["public"]["Tables"]["ride_passengers"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
