import { Save, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "./actions";
import GenerateForm from "./GenerateForm";

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .single();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">
          Configurações
        </h1>
        <p className="text-sm text-ink-soft">
          Vagas do carro, preço padrão e geração das caronas do semestre.
        </p>
      </div>

      <form
        action={updateSettings}
        className="grid gap-3 rounded-2xl border border-line bg-card p-5 shadow-sm sm:grid-cols-2"
      >
        <div>
          <label className="block text-xs font-medium text-ink-soft">
            Vagas por carona
          </label>
          <input
            type="number"
            min="1"
            name="seats_per_ride"
            defaultValue={settings?.seats_per_ride ?? 4}
            required
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">
            Preço padrão da carona
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="default_price"
            defaultValue={settings?.default_price ?? 5}
            required
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">
            Início do semestre
          </label>
          <input
            type="date"
            name="semester_start"
            defaultValue={settings?.semester_start ?? ""}
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">
            Fim do semestre
          </label>
          <input
            type="date"
            name="semester_end"
            defaultValue={settings?.semester_end ?? ""}
            className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-route"
          />
        </div>
        <div className="sm:col-span-2">
          <button className="flex items-center gap-1.5 rounded-lg bg-route px-3 py-1.5 text-sm font-medium text-white hover:bg-route-dark">
            <Save size={14} />
            Salvar configurações
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles size={15} className="text-accent" />
          Gerar caronas a partir dos padrões fixos
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Expande os padrões recorrentes ativos (cadastrados em Passageiros)
          em caronas concretas no calendário, para o período escolhido. Pode
          rodar de novo sem duplicar o que já existe.
        </p>
        <GenerateForm
          defaultStart={settings?.semester_start ?? today}
          defaultEnd={settings?.semester_end ?? today}
        />
      </div>
    </div>
  );
}
