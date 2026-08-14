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
    <div className="admin-portal relative flex flex-1 flex-col overflow-hidden md:grid md:grid-cols-[16.5rem_minmax(0,1fr)]">
      <div className="admin-orb admin-orb-route" />
      <div className="admin-orb admin-orb-accent" />
      <div className="admin-orb admin-orb-pop" />
      <header className="relative z-20 border-b border-white/80 bg-white/65 shadow-[0_8px_32px_rgb(31_41_90/0.09)] backdrop-blur-xl md:sticky md:top-4 md:ml-4 md:mt-4 md:flex md:h-[calc(100vh-2rem)] md:flex-col md:overflow-hidden md:rounded-[1.75rem] md:border">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:flex-1 md:flex-col md:items-stretch md:justify-start md:px-5 md:py-6">
          <div className="flex items-center gap-6 md:block">
            <Logo href="/admin/caronas" size="sm" />
            <div className="hidden md:mt-10 md:block">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Painel da motorista
              </p>
              <AdminNav />
            </div>
          </div>
          <div className="flex items-center gap-1 md:mt-auto md:flex-col md:items-stretch md:border-t md:border-white/80 md:pt-4">
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
        <div className="border-t border-white/80 px-3 py-2 md:hidden">
          <AdminNav />
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 md:py-8 lg:px-8 xl:px-10">
        {children}
      </main>
    </div>
  );
}
