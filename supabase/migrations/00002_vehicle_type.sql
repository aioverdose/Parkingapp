-- Add vehicle_type to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('compact', 'sedan', 'suv', 'truck', 'van', 'motorcycle'));

-- Add vehicle_type to parking_spots (what vehicle type the spot can fit, NULL = any)
ALTER TABLE public.parking_spots
ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('compact', 'sedan', 'suv', 'truck', 'van', 'motorcycle'));
