import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SpotMatch",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-zinc-500">Last updated: June 2026</p>
      </header>
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
{`PRIVACY POLICY — PARKINGSHARE

Effective Date: June 2026

1. DATA WE COLLECT
We collect the following data to operate the SpotMatch app:

- Location data (GPS coordinates) — used to show nearby parking spots and match seekers with posters
- Phone number — used for identity verification and to prevent abuse
- Email address — used for account creation
- Timestamps of app usage and interactions
- User ratings and reports submitted by other users

2. HOW WE USE YOUR DATA
- To connect people who are leaving a parking spot with those looking for one
- To verify user identity and prevent fraudulent activity
- To calculate user ratings and trust scores
- To display street sweeping alerts based on your location
- To improve the app experience

3. DATA SHARING
We do NOT sell your personal data to third parties.
We do NOT share your precise location with other users — only approximate block-level information is shared during active spot handoffs.
We may share data if required by law enforcement with a valid legal request.

4. DATA RETENTION
- Location data: retained only during active sessions; not stored long-term
- Phone number: retained until account deletion
- Ratings and flags: retained for trust and safety purposes
- Chat messages: auto-deleted after 24-48 hours

5. YOUR RIGHTS (CCPA COMPLIANCE)
If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA):

- Right to Know: You may request details about the personal data we collect and how it is used
- Right to Delete: You may request deletion of your personal data
- Right to Opt-Out: We do not sell data, so no opt-out is needed
- Right to Non-Discrimination: We will not discriminate against you for exercising your CCPA rights

To exercise your rights, email: privacy@spotmatch.app

6. DATA SECURITY
We use industry-standard encryption (HTTPS) for all data in transit.
We use Supabase's built-in Row Level Security to ensure users can only access their own data.

7. CHILDREN'S PRIVACY
SpotMatch is not intended for users under 13. We do not knowingly collect data from children.

8. CHANGES TO THIS POLICY
We may update this policy. Material changes will be notified via the app.

9. CONTACT
Privacy questions: privacy@spotmatch.app
Data deletion requests: privacy@spotmatch.app
`}
        </pre>
      </div>
    </div>
  );
}
