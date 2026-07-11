export function PrivacyPolicyLink({ className }: { className?: string }) {
  return (
    <a
      href="/privacy-policy"
      className={`text-xs text-zinc-400 hover:text-zinc-600 underline ${className || ""}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Privacy Policy
    </a>
  );
}
