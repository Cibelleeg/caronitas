import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import Logo from "@/components/Logo";
import AdminNav from "@/components/AdminNav";
import SignOutButton from "@/components/SignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "driver") redirect("/");

  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <header className="border-b border-line/80 bg-card/90 backdrop-blur-xl md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:flex-1 md:flex-col md:items-stretch md:justify-start md:px-5 md:py-6">
          <div className="flex items-center gap-6 md:block">
            <Logo href="/admin/calendario" size="sm" />
            <div className="hidden md:mt-8 md:block">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Painel da motorista
              </p>
              <AdminNav />
            </div>
          </div>
          <div className="flex items-center gap-1 md:mt-auto md:flex-col md:items-stretch md:border-t md:border-line md:pt-4">
            <Link
              href="/"
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-route-soft hover:text-route"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">Site público</span>
            </Link>
            <div className="hidden px-3 py-2 md:block">
              <p className="text-xs text-ink-faint">Conectada como</p>
              <p className="truncate text-sm font-semibold text-ink">{profile.full_name}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <div className="border-t border-line px-3 py-2 md:hidden">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
