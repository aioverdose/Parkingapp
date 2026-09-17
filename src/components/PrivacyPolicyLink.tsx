export function PrivacyPolicyLink({ className }: { className?: string }) {
  return (
    <span className={`text-xs text-zinc-400 ${className || ""}`}>
      <a href="/privacy-policy" className="underline hover:text-zinc-600" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      <span className="mx-2">·</span>
      <a href="/tos/latest" className="underline hover:text-zinc-600" target="_blank" rel="noopener noreferrer">Terms of Service</a>
    </span>
  );
}
