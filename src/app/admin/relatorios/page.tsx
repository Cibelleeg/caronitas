import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  FileText,
  MessageCircle,
  Megaphone,
  UsersRound,
} from "lucide-react";
import { dateKey, todayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import CopyReportButton from "./CopyReportButton";

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

interface ReportRide {
  id: string;
  date: string;
  ride_type: "ida" | "volta";
  time_of_day: string | null;
  seats_total: number;
  ride_passengers: {
    status: "pending" | "confirmed" | "declined" | "no_show";
  }[];
}

interface ConfirmationRide {
  id: string;
  date: string;
  ride_type: "ida" | "volta";
  time_of_day: string | null;
  origin: string;
  destination: string;
  seats_total: number;
  ride_passengers: {
    status: "pending" | "confirmed" | "declined" | "no_show";
    passengers: { full_name: string } | null;
  }[];
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function nextWeekStart() {
  const today = new Date(`${todayKey()}T12:00:00`);
  const daysUntilMonday = today.getDay() === 0 ? 1 : 8 - today.getDay();
  return addDays(today, daysUntilMonday);
}

function formatTime(time: string | null) {
  if (!time) return "Sem horário";
  const [hour, minute] = time.slice(0, 5).split(":");
  return minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}

function periodLabel(start: Date, end: Date) {
  const startLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(end);
  return `${startLabel} a ${endLabel}`.replaceAll(".", "");
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; template?: string }>;
}) {
  const params = await searchParams;
  const selectedTemplate = ["semana", "confirmacao", "divulgacao"].includes(
    params.template ?? "",
  )
    ? params.template!
    : "semana";
  const confirmationDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : todayKey();
  const start = nextWeekStart();
  const end = addDays(start, 6);
  const supabase = await createClient();
  const [{ data }, { data: confirmationData }] = await Promise.all([
    supabase
      .from("rides")
      .select("id, date, ride_type, time_of_day, seats_total, ride_passengers(status)")
      .eq("status", "scheduled")
      .gte("date", dateKey(start))
      .lte("date", dateKey(end))
      .order("date")
      .order("time_of_day")
      .returns<ReportRide[]>(),
    supabase
      .from("rides")
      .select(
        "id, date, ride_type, time_of_day, origin, destination, seats_total, ride_passengers(status, passengers(full_name))",
      )
      .eq("status", "scheduled")
      .eq("date", confirmationDate)
      .order("time_of_day")
      .returns<ConfirmationRide[]>(),
  ]);

  const rides = (data ?? []).map((ride) => {
    const confirmed = ride.ride_passengers.filter(
      (passenger) => passenger.status === "confirmed",
    ).length;
    return { ...ride, available: Math.max(ride.seats_total - confirmed, 0) };
  });
  const ridesByDate = new Map<string, typeof rides>();
  rides.forEach((ride) => {
    const list = ridesByDate.get(ride.date) ?? [];
    list.push(ride);
    ridesByDate.set(ride.date, list);
  });

  const messageLines = ["Tenho vagas para carona fixa:", ""];
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(start, index);
    const dayRides = (ridesByDate.get(dateKey(date)) ?? []).filter(
      (ride) => ride.available > 0,
    );
    if (dayRides.length === 0) continue;
    messageLines.push(`${WEEKDAYS[date.getDay()]}:`);
    dayRides.forEach((ride) => {
      const type = ride.ride_type === "ida" ? "Ida" : "Volta";
      const vacancy = ride.available === 1 ? "vaga" : "vagas";
      messageLines.push(`- ${type}: ${formatTime(ride.time_of_day)} - ${ride.available} ${vacancy}`);
    });
    messageLines.push("");
  }
  const totalAvailable = rides.reduce((total, ride) => total + ride.available, 0);
  if (totalAvailable === 0) {
    messageLines.push("Não há vagas disponíveis para a próxima semana no momento.");
  }
  const message = messageLines.join("\n").trim();
  const confirmationRides = (confirmationData ?? []).map((ride) => {
    const passengers = ride.ride_passengers
      .filter((participation) => participation.status === "confirmed")
      .map((participation) => participation.passengers?.full_name)
      .filter((name): name is string => Boolean(name));
    const type = ride.ride_type === "ida" ? "ida" : "volta";
    const mentions = passengers.map((name) => `@${name}`).join(" ");
    const confirmationMessage = [
      `Oii gente, passando para confirmar a ${type} de hoje às ${formatTime(ride.time_of_day)}.`,
      "",
      `Vocês vão?${mentions ? ` ${mentions}` : ""}`,
    ].join("\n");
    const confirmedCount = ride.ride_passengers.filter(
      (participation) => participation.status === "confirmed",
    ).length;
    const available = Math.max(ride.seats_total - confirmedCount, 0);
    const vacancy = available === 1 ? "vaga" : "vagas";
    const availabilityMessage = `Ofereço ${available} ${vacancy} para ${type} hoje ${ride.origin} -> ${ride.destination} às ${formatTime(ride.time_of_day)}`;
    return {
      ...ride,
      passengers,
      available,
      message: confirmationMessage,
      availabilityMessage,
    };
  });
  const confirmationDateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${confirmationDate}T12:00:00`));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-route">
          Comunicação
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
          Relatórios e mensagens
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Divulgue as vagas disponíveis sem montar a mensagem manualmente.
        </p>
      </header>

      <nav aria-label="Selecionar template" className="grid gap-3 sm:grid-cols-3">
        {[
          {
            value: "semana",
            label: "Vagas da semana",
            description: "Resumo de todos os dias",
            icon: CalendarDays,
          },
          {
            value: "confirmacao",
            label: "Confirmar passageiros",
            description: "Perguntar quem vai hoje",
            icon: UsersRound,
          },
          {
            value: "divulgacao",
            label: "Divulgar carona",
            description: "Anunciar vagas do dia",
            icon: Megaphone,
          },
        ].map((template) => {
          const Icon = template.icon;
          const active = selectedTemplate === template.value;
          const query = new URLSearchParams({ template: template.value });
          if (template.value !== "semana") query.set("date", confirmationDate);
          return (
            <Link
              key={template.value}
              href={`/admin/relatorios?${query.toString()}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${active ? "border-route bg-gradient-to-br from-route to-pop text-white shadow-lg shadow-route/20" : "border-white/85 bg-card text-ink hover:border-route/25"}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/15 text-white" : "bg-route-soft text-route"}`}>
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{template.label}</span>
                <span className={`mt-0.5 block truncate text-[11px] ${active ? "text-white/70" : "text-ink-faint"}`}>{template.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {selectedTemplate === "semana" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-3xl border border-white/85 bg-card shadow-[0_12px_35px_rgb(15_23_42/0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#199b49]">
                <MessageCircle size={19} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">Vagas da próxima semana</span>
                <span className="block text-xs capitalize text-ink-soft">{periodLabel(start, end)}</span>
              </span>
            </span>
            <span className="rounded-full bg-go-soft px-3 py-1 text-xs font-bold text-go-dark">
              {totalAvailable} {totalAvailable === 1 ? "vaga disponível" : "vagas disponíveis"}
            </span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-line/70 bg-paper/70 p-4 sm:p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-ink">{message}</pre>
            </div>
            <div className="mt-4">
              <CopyReportButton message={message} />
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-3xl border border-white/85 bg-card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-route-soft text-route">
              <FileText size={18} />
            </span>
            <h2 className="mt-4 text-sm font-bold text-ink">Como é calculado</h2>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              As vagas são o total de assentos de cada carona menos os passageiros já confirmados.
            </p>
          </div>
          <div className="rounded-3xl border border-white/85 bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <CalendarDays size={16} className="text-route" />
              Próxima semana
            </div>
            <div className="mt-4 space-y-2 text-xs text-ink-soft">
              <p className="flex items-center gap-2"><ArrowUpRight size={14} className="text-route" /> Idas e horários disponíveis</p>
              <p className="flex items-center gap-2"><ArrowDownLeft size={14} className="text-accent" /> Voltas e horários disponíveis</p>
            </div>
          </div>
        </aside>
      </div> : null}

      {selectedTemplate !== "semana" ? <section className="space-y-4 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-4 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              {selectedTemplate === "confirmacao" ? "Confirmação diária" : "Divulgação diária"}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink">
              {selectedTemplate === "confirmacao" ? "Confirmar ida e volta" : "Divulgar vagas do dia"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {selectedTemplate === "confirmacao"
                ? "Gere uma mensagem com os passageiros confirmados de cada carona."
                : "Anuncie rapidamente as vagas disponíveis em cada horário."}
            </p>
          </div>
          <form method="get" className="flex items-end gap-2 rounded-2xl border border-white/85 bg-card p-2 shadow-sm">
            <input type="hidden" name="template" value={selectedTemplate} />
            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
              Data da carona
              <input
                type="date"
                name="date"
                defaultValue={confirmationDate}
                className="mt-1 block rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink outline-none focus:border-route"
              />
            </label>
            <button className="h-10 rounded-xl bg-ink px-4 text-xs font-bold text-white hover:bg-ink/90">
              Carregar
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/85 bg-white/45 px-4 py-3 text-sm font-semibold capitalize text-ink-soft backdrop-blur-xl">
          <CalendarDays size={15} className="mr-2 inline text-route" />
          {confirmationDateLabel}
        </div>

        {confirmationRides.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {confirmationRides.map((ride) => {
              const isReturn = ride.ride_type === "volta";
              return (
                <article key={ride.id} className="overflow-hidden rounded-3xl border border-white/85 bg-card shadow-[0_12px_35px_rgb(15_23_42/0.07)]">
                  <div className={`h-1.5 ${isReturn ? "bg-accent" : "bg-route"}`} />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${isReturn ? "bg-accent-soft text-accent-dark" : "bg-route-soft text-route"}`}>
                        {isReturn ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {ride.ride_type}
                      </span>
                      <span className="font-mono text-lg font-bold text-ink">
                        {formatTime(ride.time_of_day)}
                      </span>
                    </div>
                    {selectedTemplate === "confirmacao" ? (
                      <>
                        <div className="mt-4 rounded-2xl border border-line/70 bg-paper/70 p-4">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink">{ride.message}</pre>
                        </div>
                        <p className="my-3 text-xs text-ink-soft">
                          {ride.passengers.length > 0
                            ? `${ride.passengers.length} ${ride.passengers.length === 1 ? "passageiro citado" : "passageiros citados"}`
                            : "Nenhum passageiro confirmado nesta carona"}
                        </p>
                        <CopyReportButton message={ride.message} />
                      </>
                    ) : (
                      <>
                        <p className="mt-4 text-xs text-ink-soft">
                          {ride.available > 0
                            ? `${ride.available} ${ride.available === 1 ? "vaga disponível" : "vagas disponíveis"}`
                            : "Esta carona está lotada"}
                        </p>
                        <div className="mt-3 rounded-2xl border border-go/15 bg-go-soft/60 p-4">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink">{ride.availabilityMessage}</pre>
                        </div>
                        {ride.available > 0 ? <div className="mt-3"><CopyReportButton message={ride.availabilityMessage} /></div> : null}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Nenhuma carona nessa data</p>
            <p className="mt-1 text-xs text-ink-soft">Escolha outro dia para montar as confirmações.</p>
          </div>
        )}
      </section> : null}
    </div>
  );
}
