"use client";

interface ActionButtonsProps {
  onPrimary: () => void;
  onSecondary: () => void;
  disabled: boolean;
  secondaryLabel?: string;
}

export function ActionButtons({
  onPrimary,
  onSecondary,
  disabled,
  secondaryLabel = "My Matches",
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={onPrimary}
        disabled={disabled}
        className="app-primary w-full h-14 rounded-2xl text-base font-extrabold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:bg-zinc-300 disabled:text-white disabled:cursor-not-allowed disabled:shadow-none"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="10" y1="2" x2="10" y2="18" />
          <line x1="2" y1="10" x2="18" y2="10" />
        </svg>
        LIST MY SPOT
      </button>

      <button
        onClick={onSecondary}
        disabled={disabled}
        className="w-full h-14 rounded-2xl bg-[var(--app-surface)] border-2 border-[var(--app-border)] hover:border-[var(--app-accent)] disabled:border-zinc-100 disabled:opacity-50 text-[var(--app-ink)] text-base font-bold flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8.5" cy="8.5" r="6" />
          <line x1="13" y1="13" x2="18" y2="18" />
        </svg>
        {secondaryLabel}
      </button>
    </div>
  );
}
