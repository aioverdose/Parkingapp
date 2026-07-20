export const TOS_VERSION = "1.1";

export const TOS_CONTENT = `TERMS OF SERVICE — SPOTMATCH (v1.1)

1. Acceptance
By accessing or using SpotMatch, you agree to these Terms. If you do not agree, do not use the app.

2. No Street Parking Violations
You must not use this app to violate any local laws, ordinances, or parking regulations. This app is for community coordination only and does not authorize illegal parking, spot occupation, or waiting on sidewalks. Public street parking spaces cannot be bought, sold, or reserved. Violation may result in immediate account termination.

3. No Handoff Payments or Tips
You may not offer, request, or accept money, tips, gifts, or compensation for parking spot handoffs. All handoffs are voluntary and non-commercial. Violation may result in immediate account termination.

4. Safety and Conduct
You must not harass, threaten, intimidate, or endanger others. You must not encourage waiting on sidewalks, blocking driveways, or creating traffic conflicts. Violation will result in immediate termination.

5. Privacy and Anonymity
You will not share your home address, full name, phone number, or other sensitive personal information in chats or posts. The app uses pseudonyms and block-level location only.

6. Ephemeral Content
All chats and posts are ephemeral and may be deleted automatically after 24-48 hours or after handoff completion. You acknowledge that content may not be permanently stored.

7. Live Location Sharing
SpotMatch offers an optional real-time location sharing feature for confirmed matches. By enabling this feature, you expressly consent to the following:

a) What is shared: Your precise GPS coordinates (latitude and longitude), heading, and speed are shared in real time with your matched driver for the specific handoff only.

b) Who can see it: Only your matched partner for the active handoff. No other users, third parties, or the public can access your live location.

c) Duration: Location sharing lasts only for the duration of the active handoff session. Sharing automatically stops when the handoff is completed, either party stops sharing, or after 45 minutes (whichever comes first).

d) Data retention: All GPS location records are automatically deleted within 1 hour of creation. No live location data is retained after the session ends.

e) Your rights: You may stop sharing your location at any time with a single tap. Stopping sharing does not affect your match or your ability to coordinate via chat. You may decline to share your location entirely — this feature is optional and does not affect your ability to use the app.

f) Accuracy: Location accuracy depends on your device GPS and network conditions. SpotMatch does not guarantee the accuracy of shared locations.

g) Privacy policy: For full details, see our Privacy Policy at /privacy-policy.

By tapping "Share Location" in the app, you provide explicit, informed consent for real-time GPS sharing as described above.

8. Account Termination
We may terminate or suspend your account immediately for any violation of these Terms, without prior notice.

9. Disclaimers
You use this app at your own risk. We do not guarantee spot availability, accuracy of alerts, or safety of handoffs. SpotMatch is not responsible for any accidents, damages, or injuries that may occur during a parking spot handoff.

10. Limitation of Liability
We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising from your use of the app.

11. Changes to Terms
We may update these Terms. You will be re-presented with updated Terms on major version changes. Continued use after acceptance constitutes agreement.

12. Contact
For questions: legal@spotmatch.app
`;

export async function hashTos(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
