export type AdminDashboardMetrics = {
  activeMatches: number;
  pendingMatches: number;
  flaggedMembers: number;
  flaggedMessages: number;
};

export function mapAdminDashboardMetrics(values: Partial<AdminDashboardMetrics>): AdminDashboardMetrics {
  return {
    activeMatches: values.activeMatches ?? 0,
    pendingMatches: values.pendingMatches ?? 0,
    flaggedMembers: values.flaggedMembers ?? 0,
    flaggedMessages: values.flaggedMessages ?? 0,
  };
}
