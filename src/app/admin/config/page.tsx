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
        <h1 className="text-xl font-semibold text-neutral-900">
          Configurações
        </h1>
        <p className="text-sm text-neutral-500">
          Vagas do carro, preço padrão e geração das caronas do semestre.
        </p>
      </div>

      <form
        action={updateSettings}
        className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Vagas por carona
          </label>
          <input
            type="number"
            min="1"
            name="seats_per_ride"
            defaultValue={settings?.seats_per_ride ?? 4}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Preço padrão da carona
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="default_price"
            defaultValue={settings?.default_price ?? 5}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Início do semestre
          </label>
          <input
            type="date"
            name="semester_start"
            defaultValue={settings?.semester_start ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Fim do semestre
          </label>
          <input
            type="date"
            name="semester_end"
            defaultValue={settings?.semester_end ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
            Salvar configurações
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          Gerar caronas a partir dos padrões fixos
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
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
