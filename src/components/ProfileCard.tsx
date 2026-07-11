"use client";

import type { ReactNode } from "react";

interface ProfileCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function ProfileCard({ title, icon, action, children }: ProfileCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="font-bold text-sm flex items-center gap-2">
              {icon} {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
