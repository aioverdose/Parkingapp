export const TOS_VERSION = "1.0";

export const TOS_CONTENT = `TERMS OF SERVICE — NEIGHBOR PARKING HANDOFF (v1.0)

1. Acceptance
By accessing or using Neighbor Parking Handoff, you agree to these Terms. If you do not agree, do not use the app.

2. No Street Parking Violations
You must not use this app to violate any local laws, ordinances, or parking regulations. This app is for community coordination only and does not authorize illegal parking, spot occupation, or waiting on sidewalks.

3. No Handoff Payments or Tips
You may not offer, request, or accept money, tips, gifts, or compensation for parking spot handoffs. All handoffs are voluntary and non-commercial. Violation may result in immediate account termination.

4. Safety and Conduct
You must not harass, threaten, intimidate, or endanger others. You must not encourage waiting on sidewalks, blocking driveways, or creating traffic conflicts. Violation will result in immediate termination.

5. Privacy and Anonymity
You will not share your home address, full name, phone number, or other sensitive personal information in chats or posts. The app uses pseudonyms and block-level location only.

6. Ephemeral Content
All chats and posts are ephemeral and may be deleted automatically after 24-48 hours or after handoff completion. You acknowledge that content may not be permanently stored.

7. Account Termination
We may terminate or suspend your account immediately for any violation of these Terms, without prior notice.

8. Disclaimers
You use this app at your own risk. We do not guarantee spot availability, accuracy of alerts, or safety of handoffs.

9. Limitation of Liability
We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising from your use of the app.

10. Changes to Terms
We may update these Terms. You will be re-presented with updated Terms on major version changes. Continued use after acceptance constitutes agreement.

11. Contact
For questions: legal@neighborparking.example
`;

export async function hashTos(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
