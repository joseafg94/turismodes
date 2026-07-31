import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

type AppNavProps = {
  className?: string;
};

export function AppNav({ className = "" }: AppNavProps) {
  const t = getTranslations("es");
  const links = [
    { href: "/", label: t.navigation.home },
    { href: "/mapa", label: t.navigation.map },
    { href: "/zona/demo", label: t.navigation.zone },
    { href: "/lugar/demo", label: t.navigation.place },
    { href: "/cerca", label: t.navigation.nearby },
    { href: "/buscar", label: t.navigation.search },
    { href: "/reportar", label: t.navigation.report },
    { href: "/admin", label: t.navigation.admin },
    { href: "/configuracion", label: t.navigation.settings },
  ];

  return (
    <nav
      aria-label={t.navigation.ariaLabel}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {links.map((link) => (
        <Link
          className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-primary"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
