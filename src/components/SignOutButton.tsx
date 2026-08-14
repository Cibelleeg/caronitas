"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-stop-soft hover:text-stop"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
