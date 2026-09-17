import type { Metadata } from "next";
import { Checklist, DocCard, DocSection, PublicDocShell } from "@/components/PublicDocShell";

export const metadata: Metadata = { title: "Schedules Guide | Parking Meeters", description: "Use recurring schedules, date ranges, and specific dates for parking coordination." };

export default function SchedulesGuide() { return <PublicDocShell title="Schedules" eyebrow="Support guide" intro="Schedules tell the network when a departure or arrival may be relevant. Accurate dates and times help avoid missed or stale signals.">
  <div className="grid gap-4 sm:grid-cols-2"><DocCard title="Recurring schedules">Use a weekly pattern for a predictable commute or routine. Review it when holidays, time off, or a route change makes the pattern inaccurate.</DocCard><DocCard title="Long-range date ranges">Set a start and end date for a temporary routine. The range limits when the schedule can be considered.</DocCard><DocCard title="Specific dates">Use a one-off date when a recurring pattern would be too broad. Specific dates are useful for events or unusual trips.</DocCard><DocCard title="Multiple vehicles">Keep vehicle entries distinct when you regularly use more than one vehicle. Select the vehicle that applies to each schedule or request.</DocCard></div>
  <DocSection title="Privacy and editing"><p>Schedules are used for matching and coordination, not published as a public calendar. Share only what is needed, and use general areas rather than a precise home address. Open the schedule editor to change times, dates, location, or vehicle, or remove a schedule that no longer applies. An update can change or end a potential match.</p></DocSection>
  <DocSection title="Before you save"><Checklist items={["Check the departure versus arrival meaning.", "Confirm the date range and days of week.", "Use local time and realistic windows.", "Remove old schedules instead of leaving them active."]} /></DocSection>
</PublicDocShell>; }
