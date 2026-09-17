const SYNTHETIC_EMAIL_DOMAIN = "@parkingmeeters.test";

/** Reserved identities used by the synthetic-device test harness. */
export function isSyntheticAccount(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(SYNTHETIC_EMAIL_DOMAIN);
}
