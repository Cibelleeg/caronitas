"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import Logo from "@/components/Logo";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-route-soft via-white to-accent-soft px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-sm">
        <Logo />
        <p className="mt-3 text-sm text-ink-soft">
          Entre para ver suas caronas e pagamentos.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">E-mail</span>
            <div className="relative mt-1.5">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Senha</span>
            <div className="relative mt-1.5">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-route"
              />
            </div>
          </label>

          {error ? (
            <p className="rounded-lg bg-stop-soft px-3 py-2 text-sm text-stop">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-route py-2.5 text-sm font-semibold text-white transition-colors hover:bg-route-dark disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-xs text-ink-faint">
          Sem conta ainda? Peça para a motorista te convidar.
        </p>

        <Link
          href="/"
          className="mt-4 flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-route"
        >
          <ArrowLeft size={13} />
          Voltar pro calendário público
        </Link>
      </div>
    </div>
  );
}
