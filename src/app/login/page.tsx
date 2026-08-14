"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Logo from "@/components/Logo";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#f4f5f8] px-4 py-8 sm:px-6 lg:py-12">
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-route/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-pop/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_80px_rgba(30,41,59,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
          <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-route/35 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-pop/25 blur-3xl" />

          <div className="relative">
            <Logo tone="inverse" />
            <div className="mt-20 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
                <ShieldCheck size={14} />
                Área exclusiva da motorista (aka eu, cibelle)
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-[-0.04em]">
                Sim, uma planilha resolveria, mas isso aqui é mais divertido
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
                Nunca deixe sua preguiça de organizar suas caronas atrapalhar, construa um site para isso ;)
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col p-6 sm:p-10 lg:min-h-[620px] lg:p-12">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo />
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft hover:text-route"
            >
              <ArrowLeft size={14} />
              Ver caronas
            </Link>
          </div>

          <div className="my-auto py-10">
            <div className="mb-8">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-route-soft text-route lg:hidden">
                <ShieldCheck size={21} />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-route">
                Painel da cici
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
                Boas-vindas de volta, Cibs
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Entre com suas credenciais para gerenciar o Caronitas.
              </p>
            </div>

            <form action={formAction} className="space-y-5">
              <label className="block" htmlFor="email">
                <span className="text-sm font-semibold text-ink">E-mail</span>
                <div className="relative mt-2">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-12 w-full rounded-xl border border-line bg-paper pl-11 pr-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-route focus:bg-white focus:ring-4 focus:ring-route/10"
                  />
                </div>
              </label>

              <label className="block" htmlFor="password">
                <span className="text-sm font-semibold text-ink">Senha</span>
                <div className="relative mt-2">
                  <Lock
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="h-12 w-full rounded-xl border border-line bg-paper pl-11 pr-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-route focus:bg-white focus:ring-4 focus:ring-route/10"
                  />
                </div>
              </label>

              {error ? (
                <p role="alert" className="rounded-xl border border-stop/10 bg-stop-soft px-4 py-3 text-sm font-medium text-stop">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-route px-4 text-sm font-bold text-white shadow-lg shadow-route/20 hover:bg-route-dark disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? "Acessando painel..." : "Acessar painel"}
                {!pending ? <ArrowRight size={17} /> : null}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-faint">
              <Lock size={12} />
              Acesso privado e protegido
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
