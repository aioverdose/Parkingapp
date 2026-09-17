export type OSMType = "node" | "way" | "relation";
export type GeoJSONGeometry = { type: string; coordinates: unknown };
export interface OSMElement { type: OSMType; id: number; version?: number; tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number }; geometry?: Array<{ lat: number; lon: number }>; members?: unknown[]; }
export interface OSMResponse { elements: OSMElement[]; version?: string; generator?: string; }
export interface NormalizedParkingRecord { name: string; operator: string; parking_type: string; geometry: GeoJSONGeometry; centroid_lat: number; centroid_lng: number; capacity: number | null; access: string; fee: string; opening_hours: string; vehicle_restrictions: Record<string, unknown>; amenities: Record<string, unknown>; data_confidence: "reference"; visibility: "public_reference" | "restricted_reference" | "admin_only"; source_metadata: Record<string, unknown>; }
