export type NeutralWindowRole = "arriving" | "departing";
export type NeutralMatchStatus = "potential" | "accepted_by_arriving" | "accepted_by_departing" | "mutually_accepted" | "declined" | "expired" | "cancelled";

export interface MatchingWindow {
  id: string;
  user_id: string;
  role: NeutralWindowRole;
  day_of_week: number;
  window_start: string;
  window_end: string;
  time_zone: string;
  area_latitude: number;
  area_longitude: number;
  vehicle_type: string | null;
  matching_enabled: boolean;
  active: boolean;
  expires_at: string | null;
}

export interface PotentialMatch {
  id: string;
  arriving_user_id: string;
  departing_user_id: string;
  arriving_window_id: string;
  departing_window_id: string;
  status: NeutralMatchStatus;
  distance_meters: number;
  time_overlap_minutes: number;
  vehicle_compatible: boolean;
  match_confidence: number | null;
  expires_at: string;
}
