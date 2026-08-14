import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Hand,
  MapPin,
  Repeat2,
  UserRound,
  X,
} from "lucide-react";
import { updateParticipationStatus } from "@/app/admin/calendario/actions";
import { longDateLabel } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

interface PendingRequest {
  id: string;
  passenger_id: string;
  source: "recurring" | "manual";
  passengers: { full_name: string } | null;
  rides: {
    id: string;
    date: string;
    ride_type: "ida" | "volta";
    time_of_day: string | null;
    origin: string;
    destination: string;
    series_id: string | null;
  } | null;
}

interface RequestGroup {
  key: string;
  representative: PendingRequest;
  requests: PendingRequest[];
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export default async function SolicitacoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ride_passengers")
    .select(
      "id, passenger_id, source, passengers(full_name), rides(id, date, ride_type, time_of_day, origin, destination, series_id)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingRequest[]>();

  const pending = (data ?? [])
    .filter((request) => request.rides)
    .sort((a, b) =>
      (a.rides?.date ?? "").localeCompare(b.rides?.date ?? ""),
    );
  const groups = new Map<string, RequestGroup>();

  pending.forEach((request) => {
    const ride = request.rides!;
    const weekday = new Date(`${ride.date}T12:00:00`).getDay();
    const key =
      request.source === "recurring"
        ? [
            request.passenger_id,
            ride.series_id ?? `${ride.ride_type}-${ride.time_of_day}-${weekday}`,
            ride.origin,
            ride.destination,
          ].join("|")
        : request.id;
    const group = groups.get(key);
    if (group) {
      group.requests.push(request);
    } else {
      groups.set(key, { key, representative: request, requests: [request] });
    }
  });

  const requestGroups = Array.from(groups.values()).sort((a, b) =>
    (a.representative.rides?.date ?? "").localeCompare(
      b.representative.rides?.date ?? "",
    ),
  );
  const passengerCount = new Set(pending.map((request) => request.passenger_id)).size;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-route">
            Controle de vagas
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Solicitações de passageiros
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Aprove ou recuse os pedidos antes de confirmar uma vaga.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-xl border border-white/80 bg-card px-3 py-2 text-xs font-semibold text-ink-soft">
            <strong className="text-ink">{requestGroups.length}</strong> pedidos
          </span>
          <span className="rounded-xl border border-white/80 bg-card px-3 py-2 text-xs font-semibold text-ink-soft">
            <strong className="text-ink">{passengerCount}</strong> passageiros
          </span>
        </div>
      </header>

      {requestGroups.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {requestGroups.map((group) => {
            const request = group.representative;
            const ride = request.rides!;
            const isRecurring = request.source === "recurring";

            return (
              <article
                key={group.key}
                className="overflow-hidden rounded-3xl border border-white/85 bg-card shadow-[0_12px_35px_rgb(15_23_42/0.07)]"
              >
                <div className={`h-1.5 ${ride.ride_type === "volta" ? "bg-accent" : "bg-route"}`} />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-route-soft text-route">
                        <UserRound size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-ink">
                          {request.passengers?.full_name ?? "Passageiro"}
                        </h2>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          Solicitou {isRecurring ? "uma vaga fixa" : "uma vaga avulsa"}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isRecurring ? "bg-pop-soft text-pop" : "bg-warn-soft text-warn"}`}>
                      {isRecurring ? <Repeat2 size={12} /> : <Hand size={12} />}
                      {isRecurring ? `${group.requests.length} caronas` : "Avulsa"}
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-line/70 bg-paper/60 p-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft">
                      <span className={`inline-flex items-center gap-1 ${ride.ride_type === "volta" ? "text-accent-dark" : "text-route"}`}>
                        {ride.ride_type === "volta" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {ride.ride_type === "volta" ? "Volta" : "Ida"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} />
                        {ride.time_of_day?.slice(0, 5) ?? "Sem horário"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 capitalize">
                        <CalendarDays size={13} />
                        {isRecurring ? weekdayLabel(ride.date) : longDateLabel(ride.date)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-sm text-ink">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-route" />
                      <span>
                        <strong>{ride.origin}</strong>
                        <span className="mx-1.5 text-ink-faint">→</span>
                        <strong>{ride.destination}</strong>
                      </span>
                    </div>
                    {isRecurring ? (
                      <p className="mt-3 text-xs text-ink-soft">
                        Ao decidir, a ação será aplicada às {group.requests.length} caronas futuras deste pedido fixo.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <form action={updateParticipationStatus}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="status" value="declined" />
                      <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-bold text-ink-soft hover:border-stop/25 hover:bg-stop-soft hover:text-stop">
                        <X size={16} />
                        Recusar
                      </button>
                    </form>
                    <form action={updateParticipationStatus}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-go text-sm font-bold text-white shadow-lg shadow-go/15 hover:bg-go-dark">
                        <Check size={16} />
                        Aprovar vaga
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-card px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-go-soft text-go-dark">
            <Check size={24} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">Tudo em dia</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            Não há solicitações aguardando sua decisão neste momento.
          </p>
          <Link href="/admin/caronas" className="mt-5 text-sm font-bold text-route hover:text-route-dark">
            Voltar para as caronas
          </Link>
        </section>
      )}
    </div>
  );
}
