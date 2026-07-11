export const VEHICLE_TYPES = [
  { value: "compact", label: "Compact / Subcompact" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV / Crossover" },
  { value: "truck", label: "Truck / Pickup" },
  { value: "van", label: "Van / Minivan" },
  { value: "motorcycle", label: "Motorcycle" },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number]["value"];

export function getVehicleTypeLabel(value: string | null): string {
  if (!value) return "Any Vehicle";
  return VEHICLE_TYPES.find((t) => t.value === value)?.label ?? value;
}
