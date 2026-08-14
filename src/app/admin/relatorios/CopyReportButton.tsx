"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

export default function CopyReportButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={copyMessage}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-route px-4 text-sm font-bold text-white shadow-lg shadow-route/20 hover:bg-route-dark"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Mensagem copiada" : "Copiar mensagem"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-lg shadow-green-600/15 hover:bg-[#1fb958]"
      >
        <MessageCircle size={16} />
        Abrir no WhatsApp
      </a>
    </div>
  );
}
