"use client";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  label?: string;
}

export function DateTimePicker({ value, onChange, min, label }: DateTimePickerProps) {
  const dateVal = value ? value.slice(0, 16) : "";
  const minVal = min ? min.slice(0, 16) : undefined;

  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      )}
      <input
        type="datetime-local"
        value={dateVal}
        min={minVal}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
      />
    </div>
  );
}
