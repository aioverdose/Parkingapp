import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AppPageShell({
  title,
  backHref = "/",
  eyebrow = "Parking Meeters",
  intro,
  children,
}: {
  title: string;
  backHref?: string;
  eyebrow?: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="app-page public-shell pb-24 md:pb-6">
      <div className="app-container">
        <header className="public-header">
          <Link href={backHref} className="public-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Parking Meeters</span>
          </Link>
          <p className="public-eyebrow">{eyebrow}</p>
          <h1 className="public-title">{title}</h1>
          {intro && <p className="public-intro">{intro}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}
