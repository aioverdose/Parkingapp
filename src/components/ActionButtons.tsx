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
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white text-base font-extrabold flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed disabled:shadow-none"
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
        className="w-full h-14 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 disabled:border-zinc-100 dark:disabled:border-zinc-800 disabled:opacity-50 text-zinc-800 dark:text-zinc-200 text-base font-bold flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed"
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
