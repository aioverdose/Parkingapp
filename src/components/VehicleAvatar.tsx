import { Bike, Car, CarFront, Truck, Van, type LucideIcon } from "lucide-react";
import { createElement } from "react";
import type { VehicleType } from "@/lib/vehicle-types";

const vehicleIcons: Record<VehicleType, LucideIcon> = { compact: Car, sedan: Car, suv: CarFront, truck: Truck, van: Van, motorcycle: Bike };
const vehicleLabels = { compact: "Compact vehicle", sedan: "Sedan", suv: "SUV or crossover", truck: "Truck or pickup", van: "Van or minivan", motorcycle: "Motorcycle" } as const;

export function getVehicleAvatarIcon(vehicleType: string | null | undefined) {
  return vehicleIcons[vehicleType as VehicleType] ?? CarFront;
}

export function getVehicleAvatarLabel(vehicleType: string | null | undefined) {
  return vehicleLabels[vehicleType as VehicleType] ?? "Vehicle";
}

export function VehicleAvatar({ vehicleType, className = "", iconClassName = "h-5 w-5" }: { vehicleType: string | null | undefined; className?: string; iconClassName?: string }) {
  const Icon = getVehicleAvatarIcon(vehicleType);
  const label = getVehicleAvatarLabel(vehicleType);
  return <div className={`flex items-center justify-center ${className}`} role="img" aria-label={label} title={label}>{createElement(Icon, { className: iconClassName, "aria-hidden": true })}</div>;
}
