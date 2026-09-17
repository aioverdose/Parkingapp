DO $$ BEGIN CREATE TYPE public.experience_visibility AS ENUM ('owner','public','members','network','match_participants'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.experience_status AS ENUM ('draft','published','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.experience_theme AS ENUM ('coral','sage','navy','sand','lavender','sky'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.experience_audience AS ENUM ('everyone','members','network','local'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profile_section_configs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, label text NOT NULL, description text NOT NULL DEFAULT '', enabled boolean NOT NULL DEFAULT true,
 visible_to public.experience_visibility NOT NULL DEFAULT 'owner', sort_order integer NOT NULL DEFAULT 0, required_for_onboarding boolean NOT NULL DEFAULT false,
 show_on_mobile boolean NOT NULL DEFAULT true, show_on_desktop boolean NOT NULL DEFAULT true, status public.experience_status NOT NULL DEFAULT 'draft',
 published_at timestamptz, updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profile_appearance_configs (
 key text PRIMARY KEY DEFAULT 'default', draft jsonb NOT NULL DEFAULT '{}'::jsonb, published jsonb NOT NULL DEFAULT '{}'::jsonb,
 status public.experience_status NOT NULL DEFAULT 'draft', published_at timestamptz, updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.explore_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, name text NOT NULL, description text NOT NULL DEFAULT '', long_description text NOT NULL DEFAULT '', icon_name text NOT NULL DEFAULT 'MapPin',
 image_id uuid, theme public.experience_theme NOT NULL DEFAULT 'sage', badge text, status public.experience_status NOT NULL DEFAULT 'draft', audience public.experience_audience NOT NULL DEFAULT 'everyone',
 geographic_scope text NOT NULL DEFAULT 'global', geographic_scope_id text, featured boolean NOT NULL DEFAULT false, followable boolean NOT NULL DEFAULT false, notifications_enabled boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0, expires_at timestamptz, content_settings jsonb NOT NULL DEFAULT '{}'::jsonb, seo_title text, seo_description text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.category_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storage_path text, thumbnail_path text, alt_text text NOT NULL DEFAULT '', caption text, attribution text, attribution_url text,
 mime_type text, file_size integer, status public.experience_status NOT NULL DEFAULT 'draft', created_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'explore_categories_image_fk') THEN
  ALTER TABLE public.explore_categories ADD CONSTRAINT explore_categories_image_fk FOREIGN KEY (image_id) REFERENCES public.category_images(id) ON DELETE SET NULL;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.community_settings (
 key text PRIMARY KEY DEFAULT 'default', draft jsonb NOT NULL DEFAULT '{}'::jsonb, published jsonb NOT NULL DEFAULT '{}'::jsonb, status public.experience_status NOT NULL DEFAULT 'draft', updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.privacy_defaults (
 key text PRIMARY KEY DEFAULT 'default', draft jsonb NOT NULL DEFAULT '{}'::jsonb, published jsonb NOT NULL DEFAULT '{}'::jsonb, status public.experience_status NOT NULL DEFAULT 'draft', updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.feature_flags (
 name text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, rollout jsonb NOT NULL DEFAULT '{}'::jsonb, description text NOT NULL DEFAULT '', updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL, action text NOT NULL, target_type text NOT NULL, target_id text,
 previous_value jsonb, new_value jsonb, reason text, status text NOT NULL DEFAULT 'success', created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.profile_section_configs (key,label,description,visible_to,sort_order,required_for_onboarding,status,published_at) VALUES
 ('identity','Identity','Your name, username, and account identity.','owner',10,true,'published',now()), ('community_composer','Community composer','Share a helpful parking update with the community.','members',20,false,'published',now()),
 ('vehicle','Vehicle','Vehicle preferences used for safer matching.','match_participants',30,true,'published',now()), ('area','Parking area','A privacy-aware summary of your saved parking area.','owner',40,false,'published',now()),
 ('schedule','Schedule','Your recurring availability summary.','match_participants',50,false,'published',now()), ('core_links','Core links','Profile setup, community, and account actions.','owner',60,false,'published',now()),
 ('network','Network','Connections and contributions in your parking network.','network',70,false,'published',now())
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.profile_appearance_configs (key,draft,published,status,published_at) VALUES ('default','{"theme":"sage","accent":"#e85d3f","surface":"#f6f8f6","ink":"#17211e"}'::jsonb,'{"theme":"sage","accent":"#e85d3f","surface":"#f6f8f6","ink":"#17211e"}'::jsonb,'published',now()) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.community_settings (key,draft,published,status) VALUES ('default','{"composer_enabled":true,"require_moderation":false,"allow_media":true,"max_media_mb":10}'::jsonb,'{"composer_enabled":true,"require_moderation":false,"allow_media":true,"max_media_mb":10}'::jsonb,'published') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.privacy_defaults (key,draft,published,status) VALUES ('default','{"exact_location":"private","address":"private","recurring_schedule":"private_or_selected_networks","vehicle":"match_participants","private_network":"network_only","contact":"private"}'::jsonb,'{"exact_location":"private","address":"private","recurring_schedule":"private_or_selected_networks","vehicle":"match_participants","private_network":"network_only","contact":"private"}'::jsonb,'published') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.feature_flags (name,enabled,description) VALUES ('experience_management',true,'Enable published experience configuration.'),('explore_categories',true,'Load published Explore categories.'),('community_media',true,'Allow community media attachments.') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.explore_categories (slug,name,description,icon_name,theme,badge,status,sort_order) VALUES
 ('live-departure-signals','Live Departure Signals','Public-street coordination from members.','Wind','coral','Live','published',10),('paid-parking','Paid Parking','Separate paid listings.','CircleDollarSign','sand',NULL,'published',20),('private-commercial-parking','Private / Commercial Parking','Operator and venue listings.','Building2','sage',NULL,'published',30),('venues','Venues','Parking context near destinations.','Store','lavender',NULL,'published',40),('street-sweeping','Street Sweeping','Local timing reminders.','CalendarClock','sky','Coming soon','published',50),('parking-rules','Parking Rules','Read local guidance.','Gavel','sand',NULL,'published',60),('community','Community','Useful neighborhood context.','Users','coral',NULL,'published',70),('businesses','Businesses','Find participating operators.','Building2','sage',NULL,'published',80),('accessible-parking','Accessible Parking','Find accessibility-aware parking information.','HeartHandshake','sky',NULL,'published',90),('ev-charging','EV Charging','Explore charging-aware parking options.','Zap','sage',NULL,'published',100),('loading-zones','Loading Zones','Understand loading and pickup context.','Truck','sand',NULL,'published',110),('neighborhood-guides','Neighborhood Guides','Local parking context from the community.','Map','lavender',NULL,'published',120),('commute-planning','Commute Planning','Plan a lower-friction parking routine.','Route','sky',NULL,'published',130),('parking-events','Parking Events','Time-bound local parking updates.','CalendarDays','coral',NULL,'published',140),('safety-tips','Safety Tips','Practical guidance for safer coordination.','ShieldCheck','sage',NULL,'published',150)
ON CONFLICT (slug) DO NOTHING;

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['profile_section_configs','profile_appearance_configs','explore_categories','category_images','community_settings','privacy_defaults','feature_flags','admin_audit_logs'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated',t); END LOOP; END $$;
