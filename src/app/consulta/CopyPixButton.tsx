"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyPixButton({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPix() {
    await navigator.clipboard.writeText(pixKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copyPix}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-route px-4 text-xs font-bold text-white shadow-lg shadow-route/15 hover:bg-route-dark sm:w-auto"
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "PIX copiado" : "Copiar chave PIX"}
    </button>
  );
}
