export const DEFAULT_MATCH_RADIUS_FEET = 300;
export const DEFAULT_MATCH_RADIUS_METERS = DEFAULT_MATCH_RADIUS_FEET * 0.3048;
export const MINIMUM_TIME_OVERLAP_MINUTES = 5;
export const MATCH_EXPIRY_MINUTES = 20;

export const NEUTRAL_MATCHING_FLAG = "neutral_matching_v1";

export type NeutralMatchStatus =
  | "potential"
  | "accepted_by_arriving"
  | "accepted_by_departing"
  | "mutually_accepted"
  | "declined"
  | "expired"
  | "cancelled";
