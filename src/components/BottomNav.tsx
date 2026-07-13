"use client";

import { Home, BookOpen, User } from "lucide-react";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="relative z-50 w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full rounded-xl transition ${
                isActive
                  ? "text-blue-600"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
