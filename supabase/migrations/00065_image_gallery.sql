ALTER TABLE public.category_images
  ADD COLUMN IF NOT EXISTS filename TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS photographer_name TEXT,
  ADD COLUMN IF NOT EXISTS photographer_url TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS usage_tags TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO public.category_images (id, filename, image_url, thumbnail_url, alt_text, source, source_url, photographer_name, photographer_url, license_name, license_url, attribution_required, width, height, aspect_ratio, usage_tags, status)
VALUES
  ('00000000-0000-0000-0000-000000000651', 'parking-garage.jpg', 'https://upload.wikimedia.org/wikipedia/commons/7/75/Parking_Garage.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Parking_Garage.jpg/1280px-Parking_Garage.jpg', 'Parking garage under a shopping mall', 'wikimedia', 'https://commons.wikimedia.org/wiki/File:Parking_Garage.jpg', 'RandompersonSWE', 'https://commons.wikimedia.org/wiki/User:RandompersonSWE', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', true, 4000, 3000, 1.3333, ARRAY['parking', 'garage', 'explore', 'hero'], 'published'),
  ('00000000-0000-0000-0000-000000000652', 'free-parking-garage.jpg', 'https://upload.wikimedia.org/wikipedia/commons/9/92/Free_Parking.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Free_Parking.jpg/1280px-Free_Parking.jpg', 'Parking garage with free-parking sign', 'wikimedia', 'https://commons.wikimedia.org/wiki/File:Free_Parking.jpg', 'Jan Tik', 'https://www.flickr.com/photos/15363357@N00/', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/', true, 2048, 1536, 1.3333, ARRAY['parking', 'garage', 'community', 'tips'], 'published'),
  ('00000000-0000-0000-0000-000000000653', 'parking-meter-austin.jpg', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Parking_Meter_Austin_Texas_a.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Parking_Meter_Austin_Texas_a.jpg/1280px-Parking_Meter_Austin_Texas_a.jpg', 'Parking meter near the Texas State Capitol', 'wikimedia', 'https://commons.wikimedia.org/wiki/File:Parking_Meter_Austin_Texas_a.jpg', 'Larry D. Moore', 'https://commons.wikimedia.org/wiki/User:Nv8200pa', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', true, 2251, 1500, 1.5007, ARRAY['parking-meter', 'street-parking', 'rules', 'hero'], 'published'),
  ('00000000-0000-0000-0000-000000000654', 'electric-car-wireless-charge.jpg', 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Electric_car_wireless_parking_charge_closeup.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Electric_car_wireless_parking_charge_closeup.jpg/1280px-Electric_car_wireless_parking_charge_closeup.jpg', 'Electric car wireless charging demonstration during parking', 'wikimedia', 'https://commons.wikimedia.org/wiki/File:Electric_car_wireless_parking_charge_closeup.jpg', 'NJo', 'https://commons.wikimedia.org/wiki/User:NJo', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', true, 3456, 2304, 1.5000, ARRAY['ev-charging', 'electric-vehicle', 'parking'], 'published'),
  ('00000000-0000-0000-0000-000000000655', 'several-cars.jpg', 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Several_cars.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Several_cars.jpg/1280px-Several_cars.jpg', 'Several cars in a parking area', 'wikimedia', 'https://commons.wikimedia.org/wiki/File:Several_cars.jpg', 'Zhousiyuan', 'https://commons.wikimedia.org/wiki/User:Zhousiyuan', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', true, 2816, 1950, 1.4441, ARRAY['cars', 'parking', 'neighborhoods', 'explore'], 'published')
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, thumbnail_url = EXCLUDED.thumbnail_url, alt_text = EXCLUDED.alt_text, source_url = EXCLUDED.source_url, photographer_name = EXCLUDED.photographer_name, photographer_url = EXCLUDED.photographer_url, license_name = EXCLUDED.license_name, license_url = EXCLUDED.license_url, width = EXCLUDED.width, height = EXCLUDED.height, aspect_ratio = EXCLUDED.aspect_ratio, usage_tags = EXCLUDED.usage_tags, status = EXCLUDED.status;

UPDATE public.explore_categories SET image_id = '00000000-0000-0000-0000-000000000651' WHERE slug = 'private-commercial-parking';
UPDATE public.explore_categories SET image_id = '00000000-0000-0000-0000-000000000653' WHERE slug = 'street-sweeping';
UPDATE public.explore_categories SET image_id = '00000000-0000-0000-0000-000000000654' WHERE slug = 'ev-charging';
UPDATE public.explore_categories SET image_id = '00000000-0000-0000-0000-000000000655' WHERE slug = 'neighborhood-guides';
