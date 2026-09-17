"use client";

import Link from "next/link";
import { Home, Search, Sparkles, MessageCircle, User } from "lucide-react";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const visibleOn = ["/community", "/search", "/activity", "/messages", "/profile"];
  if (!visibleOn.includes(pathname)) return null;

  const links = [
    { href: "/community", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/activity", label: "Matches", icon: Sparkles },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dce3df]/90 bg-white/95 shadow-[0_-12px_30px_-24px_rgba(23,33,30,0.8)] backdrop-blur-md md:sticky md:bottom-0 md:mx-auto md:w-full md:max-w-3xl md:rounded-2xl md:border md:shadow-lg">
      <div className="mx-auto flex h-[4.5rem] max-w-3xl items-center justify-around px-2 sm:px-4">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/community" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex h-14 min-w-[3.6rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition sm:max-w-[7rem] ${
                isActive
                  ? "bg-[#fff0eb] text-[#d94f35]"
                  : "text-[#71807b] hover:bg-[#f3f7f3] hover:text-[#17211e]"
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.08em]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
