import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SpotMatch",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <a href="/" className="text-sm text-blue-600 hover:underline mb-1 inline-block">&larr; Back to App</a>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-zinc-500">Last updated: June 2026</p>
      </header>
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-bold mb-2">1. Data We Collect</h2>
          <p className="mb-1">We collect the following data to operate the SpotMatch app:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Location data (GPS coordinates)</strong> — used to show nearby parking spots and match seekers with posters</li>
            <li><strong>Live GPS location (optional)</strong> — shared in real time with your matched driver during a confirmed handoff, only when you explicitly consent</li>
            <li><strong>Phone number</strong> — used for identity verification and to prevent abuse</li>
            <li><strong>Email address</strong> — used for account creation</li>
            <li>Timestamps of app usage and interactions</li>
            <li>User ratings and reports submitted by other users</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">2. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To connect people who are leaving a parking spot with those looking for one</li>
            <li>To verify user identity and prevent fraudulent activity</li>
            <li>To calculate user ratings and trust scores</li>
            <li>To display street sweeping alerts based on your location</li>
            <li>To enable real-time location sharing during confirmed handoffs (optional, requires explicit consent)</li>
            <li>To improve the app experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">3. Live Location Sharing</h2>
          <p className="mb-2">SpotMatch offers an optional real-time location sharing feature. When you enable this feature:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your precise GPS coordinates are shared <strong>only</strong> with your matched driver for the active handoff</li>
            <li>Location updates are sent approximately every 20 seconds</li>
            <li>Location sharing automatically stops when the handoff completes, either party stops sharing, or after 45 minutes</li>
            <li>All GPS records are <strong>automatically deleted within 1 hour</strong> of creation</li>
            <li>No live location data is retained after the session ends</li>
            <li>You may stop sharing at any time with a single tap</li>
            <li>You may decline to share entirely — this feature is optional</li>
          </ul>
          <p className="mt-2">Legal basis: Your explicit consent, obtained via the in-app consent dialog before any location sharing begins. You may withdraw consent at any time by tapping &quot;Stop Sharing.&quot;</p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">4. Data Sharing</h2>
          <p className="mb-1">We do <strong>not</strong> sell your personal data to third parties.</p>
          <p className="mb-1">We do <strong>not</strong> share your precise location with other users — only approximate block-level information is shared during active spot handoffs.</p>
          <p className="mb-1">During an active handoff where you have consented to live location sharing, your GPS coordinates are shared exclusively with your matched partner via encrypted Supabase Realtime connections. No third parties have access.</p>
          <p>We may share data if required by law enforcement with a valid legal request.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">5. Data Retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Location data:</strong> retained only during active sessions; not stored long-term</li>
            <li><strong>Live GPS location records:</strong> auto-deleted within 1 hour of creation</li>
            <li><strong>Phone number:</strong> retained until account deletion</li>
            <li><strong>Ratings and flags:</strong> retained for trust and safety purposes</li>
            <li><strong>Chat messages:</strong> auto-deleted after 24-48 hours</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">6. Your Rights (CCPA Compliance)</h2>
          <p className="mb-1">If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Right to Know:</strong> You may request details about the personal data we collect and how it is used</li>
            <li><strong>Right to Delete:</strong> You may request deletion of your personal data</li>
            <li><strong>Right to Opt-Out:</strong> We do not sell data, so no opt-out is needed. You may opt out of live location sharing at any time by tapping &quot;Stop Sharing&quot; in the app</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
          </ul>
          <p className="mt-2">To exercise your rights, email: <a href="mailto:privacy@spotmatch.app" className="text-blue-600 hover:underline">privacy@spotmatch.app</a></p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">7. Data Security</h2>
          <p>We use industry-standard encryption (HTTPS) for all data in transit. We use Supabase&apos;s built-in Row Level Security to ensure users can only access their own data. Live location data is encrypted in transit and at rest, and is access-controlled via database policies that restrict visibility to confirmed match participants only.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">8. Children&apos;s Privacy</h2>
          <p>SpotMatch is not intended for users under 13. We do not knowingly collect data from children.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">9. Changes to This Policy</h2>
          <p>We may update this policy. Material changes will be notified via the app.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">10. Contact</h2>
          <p>Privacy questions: <a href="mailto:privacy@spotmatch.app" className="text-blue-600 hover:underline">privacy@spotmatch.app</a></p>
          <p>Data deletion requests: <a href="mailto:privacy@spotmatch.app" className="text-blue-600 hover:underline">privacy@spotmatch.app</a></p>
        </section>
      </div>
    </div>
  );
}
