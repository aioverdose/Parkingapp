import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  ChevronRight,
  Clock3,
  Handshake,
  Menu,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const pilotHref = "mailto:hello@spotmatch.app?subject=Book a 30-day SpotMatch pilot";

const painPoints = [
  {
    number: "01",
    title: "Customers circle, then leave",
    description: "Ten or fifteen minutes looking for a space can turn a planned visit into a missed table, appointment, or sale.",
  },
  {
    number: "02",
    title: "Parking shows up in reviews",
    description: "Even when the experience inside is excellent, a difficult arrival is often the part customers remember online.",
  },
  {
    number: "03",
    title: "Your people compete for space",
    description: "Staff and regulars need reliable arrivals too, but informal handoffs are hard to coordinate at the curb.",
  },
];

const steps = [
  { number: "01", title: "Someone is heading out", description: "A driver in your private network signals that they are leaving a nearby spot." },
  { number: "02", title: "One person gets the offer", description: "SpotMatch offers the opening to exactly one nearby person who needs it." },
  { number: "03", title: "They head to the spot", description: "The next driver accepts and gets simple directions to the handoff." },
  { number: "04", title: "Arrival feels easier", description: "Your customer spends less time circling and more time at your business." },
];

const benefits = [
  { icon: Users, title: "A network that stays private", description: "Build a neighborhood network for your customers, staff, or trusted regulars." },
  { icon: BarChart3, title: "A clear view of activity", description: "See basic handoff activity and useful patterns without adding another complicated system." },
  { icon: Handshake, title: "Prioritize your people", description: "Choose whether regulars, staff, or a shared neighborhood group gets access first." },
  { icon: Sparkles, title: "A calm customer experience", description: "Add light branding so the experience feels like a thoughtful extension of your business." },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{children}</p>;
}

function PilotButton({ dark = false }: { dark?: boolean }) {
  return (
    <a
      href={pilotHref}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
        dark ? "bg-white text-zinc-950 hover:bg-blue-50" : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
      }`}
    >
      Book a 30-day pilot <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-zinc-900">
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-2 text-lg font-bold tracking-tight" aria-label="SpotMatch home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
            Spot<span className="text-blue-600">Match</span>
          </a>
          <div className="hidden items-center gap-7 text-sm font-medium text-zinc-500 md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-zinc-950">How it works</a>
            <a href="#businesses" className="transition-colors hover:text-zinc-950">For businesses</a>
            <a href="#pricing" className="transition-colors hover:text-zinc-950">Pricing</a>
            <a href={pilotHref} className="transition-colors hover:text-zinc-950">Contact</a>
          </div>
          <details className="relative ml-auto mr-3 md:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 [&::-webkit-details-marker]:hidden">
              <Menu className="h-4 w-4" aria-hidden="true" /> Menu
            </summary>
            <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
              <a href="#how-it-works" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">How it works</a>
              <a href="#businesses" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">For businesses</a>
              <a href="#pricing" className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Pricing</a>
              <a href={pilotHref} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Contact</a>
            </div>
          </details>
          <div className="flex items-center gap-4">
            <a href="/auth/login" className="text-sm font-semibold text-zinc-600 transition-colors hover:text-blue-600">Log in</a>
            <a href={pilotHref} className="hidden rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:inline-flex">Book a pilot</a>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="relative border-b border-zinc-200 bg-zinc-50">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-8 lg:py-28">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Built for Belmont Shore businesses</div>
              <h1 className="text-5xl font-bold leading-[1.04] tracking-[-0.04em] text-zinc-950 sm:text-6xl lg:text-7xl">Fewer customers lost to parking.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600">A private coordination tool that quietly connects a departing driver with the next person who needs the spot, one at a time.</p>
              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <PilotButton />
                <a href="/marketing/how-it-works" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:text-blue-600">Watch 90-second demo <ChevronRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs font-medium text-zinc-500"><ShieldCheck className="h-4 w-4 text-blue-600" aria-hidden="true" /> No valet. No parking sales. Just better arrivals.</p>
            </div>

            <div className="relative mx-auto w-full max-w-[480px] lg:mr-2">
              <div className="absolute -inset-8 rounded-full bg-blue-200/30 blur-3xl" aria-hidden="true" />
              <div className="relative rounded-[2rem] border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-300/40">
                <div className="rounded-[1.5rem] bg-zinc-950 px-5 pb-6 pt-5 text-white">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold">SpotMatch for your block</span><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live</span></div>
                  <div className="mt-8 rounded-2xl bg-white p-5 text-zinc-950 shadow-xl">
                    <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Exclusive handoff</p><p className="mt-2 text-xl font-bold">A spot is opening nearby</p></div><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><BellRing className="h-5 w-5" aria-hidden="true" /></div></div>
                    <div className="mt-5 flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-3 text-sm"><Clock3 className="h-4 w-4 text-zinc-400" aria-hidden="true" /><span className="font-medium">Departing in about 4 minutes</span></div>
                    <button type="button" className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">Offer sent to 1 driver</button>
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-400"><span>Private network</span><span>2nd Street · Belmont Shore</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="problem-title">
          <div className="max-w-2xl"><SectionLabel>The arrival problem</SectionLabel><h2 id="problem-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Parking friction is a business problem.</h2><p className="mt-4 text-lg leading-8 text-zinc-600">On busy evenings, the curb outside your business can shape the entire customer experience before they walk through the door.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{painPoints.map((point) => <article key={point.number} className="rounded-2xl border border-zinc-200 bg-white p-7"><p className="text-sm font-bold text-blue-600">{point.number}</p><h3 className="mt-10 text-xl font-bold tracking-tight">{point.title}</h3><p className="mt-3 leading-7 text-zinc-600">{point.description}</p></article>)}</div>
        </section>

        <section id="how-it-works" className="bg-zinc-950 text-white" aria-labelledby="how-title">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="max-w-2xl"><SectionLabel>How it works</SectionLabel><h2 id="how-title" className="text-3xl font-bold tracking-tight sm:text-4xl">One opening. One driver. No scramble.</h2><p className="mt-4 text-lg leading-8 text-zinc-400">SpotMatch keeps the handoff focused and fair. It never broadcasts a spot to a crowd.</p></div><div className="mt-14 grid gap-8 md:grid-cols-4">{steps.map((step, index) => <div key={step.number} className="relative"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-400/50 text-xs font-bold text-blue-300">{step.number}</span>{index < steps.length - 1 && <span className="hidden h-px flex-1 bg-zinc-800 md:block" />}</div><h3 className="text-lg font-bold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{step.description}</p></div>)}</div><div className="mt-14 flex items-start gap-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" /><p><strong className="font-bold text-white">The exclusive single-driver rule:</strong> every opening goes to one person at a time. That means less noise, fewer false expectations, and a more considerate neighborhood experience.</p></div></div>
        </section>

        <section id="businesses" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="benefits-title">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1fr] lg:gap-24"><div><SectionLabel>For your business</SectionLabel><h2 id="benefits-title" className="text-3xl font-bold tracking-tight sm:text-4xl">A small operational layer with a real customer impact.</h2><p className="mt-5 leading-7 text-zinc-600">Give your team a simple way to make arrivals more predictable without hiring a valet or changing how your business runs.</p><a href={pilotHref} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">Talk through your block <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div><div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">{benefits.map(({ icon: Icon, title, description }) => <article key={title}><Icon className="h-6 w-6 text-blue-600" aria-hidden="true" /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p></article>)}</div></div>
        </section>

        <section className="border-y border-blue-100 bg-blue-50/70" aria-label="Trust and legal positioning"><div className="mx-auto flex max-w-4xl gap-4 px-5 py-10 lg:px-8"><ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" /><p className="text-sm leading-7 text-zinc-700"><strong className="font-bold text-zinc-950">A coordination tool, not a parking marketplace.</strong> We never sell or rent parking spots. SpotMatch only helps coordinate between drivers who are already leaving. All street rules, time limits, and sweeping restrictions still apply.</p></div></section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24" aria-labelledby="local-title"><div className="rounded-3xl bg-zinc-100 p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12"><div className="max-w-2xl"><SectionLabel>A local starting point</SectionLabel><h2 id="local-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Designed for the pressure on 2nd Street.</h2><p className="mt-4 leading-7 text-zinc-600">SpotMatch is being shaped around the restaurants, bars, and operators who know how much a better arrival matters on a busy Belmont Shore evening.</p></div><div className="mt-8 flex shrink-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:mt-0"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Handshake className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-sm font-bold">Founding partner pricing</p><p className="mt-1 text-xs text-zinc-500">For early 2nd Street businesses</p></div></div></div></section>

        <section id="pricing" className="border-t border-zinc-200 bg-zinc-50" aria-labelledby="pricing-title"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24"><div className="max-w-xl"><SectionLabel>Simple pricing</SectionLabel><h2 id="pricing-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Start with a pilot. Keep it straightforward.</h2><p className="mt-4 leading-7 text-zinc-600">Simple monthly plans, a 30-day pilot, and special terms for founding 2nd Street partners. We will recommend the right setup after a short conversation.</p></div><div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-zinc-700"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600" /> 30-day pilot available</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600" /> No valet required</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600" /> Founding partner terms</span></div><div className="mt-9"><PilotButton /></div></div></section>

        <section className="bg-blue-600 text-white" aria-labelledby="final-cta-title"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-20 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:py-24"><div><h2 id="final-cta-title" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Make the next arrival easier.</h2><p className="mt-3 max-w-xl text-blue-100">Tell us about your business and the block you serve. We will show you what a 30-day pilot could look like.</p></div><PilotButton dark /></div></section>
      </main>

      <footer className="bg-zinc-950 text-zinc-400"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8"><p className="font-semibold text-white">Spot<span className="text-blue-400">Match</span></p><p>Private parking coordination for better business arrivals.</p><a href="/auth/login" className="font-semibold hover:text-white">Business admin login <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></a></div></footer>
    </div>
  );
}
