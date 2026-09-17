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
    <div className="app-card p-5 mb-4 surface-lift">
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
