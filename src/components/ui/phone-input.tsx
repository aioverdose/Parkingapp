"use client";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const US_REGIONS = [
  { code: "+1", label: "US/CA (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+81", label: "Japan (+81)" },
];

export function PhoneInput({
  value,
  onChange,
  placeholder = "Phone number",
  disabled,
  className = "",
}: PhoneInputProps) {
  const selectedRegion = US_REGIONS.find((r) => value.startsWith(r.code));
  const prefix = selectedRegion?.code ?? "+1";
  const numberPart = selectedRegion ? value.slice(prefix.length) : value.replace(/^\+\d+/, "");

  const handlePrefixChange = (newPrefix: string) => {
    onChange(newPrefix + numberPart);
  };

  const handleNumberChange = (num: string) => {
    const digits = num.replace(/\D/g, "").slice(0, 15);
    onChange(prefix + digits);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        value={prefix}
        onChange={(e) => handlePrefixChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
      >
        {US_REGIONS.map((r) => (
          <option key={r.code} value={r.code}>{r.label}</option>
        ))}
      </select>
      <input
        type="tel"
        value={numberPart}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
      />
    </div>
  );
}
