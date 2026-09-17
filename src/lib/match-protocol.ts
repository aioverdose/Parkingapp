export function getMatchProtocolHref(matchId: string): string {
  return `/messages?match=${encodeURIComponent(matchId)}`;
}
