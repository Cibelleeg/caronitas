import Link from "next/link";
import { CarFront } from "lucide-react";

export default function Logo({
  href = "/",
  size = "md",
  tone = "default",
}: {
  href?: string;
  size?: "sm" | "md";
  tone?: "default" | "inverse";
}) {
  const badge = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? 15 : 17;
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <Link href={href} className="flex items-center gap-2 shrink-0">
      <span
        className={`flex ${badge} items-center justify-center rounded-xl bg-gradient-to-br from-route to-accent text-white shadow-sm`}
      >
        <CarFront size={icon} strokeWidth={2.25} />
      </span>
      <span
        className={`font-display ${text} font-bold ${tone === "inverse" ? "text-white" : "text-ink"}`}
      >
        Caronitas
      </span>
    </Link>
  );
}
