export function vehiclesCompatible(arriving: string | null | undefined, departing: string | null | undefined): boolean {
  if (!arriving || !departing || arriving === "any" || departing === "any") return true;
  return arriving.toLowerCase() === departing.toLowerCase();
}
