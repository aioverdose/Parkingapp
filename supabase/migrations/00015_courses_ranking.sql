-- Course-based ranking system

-- 1. Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  quiz_questions JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 100,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read courses"
  ON public.courses FOR SELECT
  USING (true);

-- 2. User course progress
CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'passed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own course progress"
  ON public.user_course_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course progress"
  ON public.user_course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course progress"
  ON public.user_course_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_course_progress_user ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course ON public.user_course_progress(course_id);

-- 3. User ranking
CREATE TABLE IF NOT EXISTS public.user_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rank_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (rank_tier IN ('bronze', 'silver', 'gold', 'community_partner')),
  rank_points INTEGER NOT NULL DEFAULT 0,
  trust_score NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  courses_completed INTEGER NOT NULL DEFAULT 0,
  successful_handoffs INTEGER NOT NULL DEFAULT 0,
  flags_received INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_ranking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_ranking"
  ON public.user_ranking FOR SELECT
  USING (true);

CREATE POLICY "Users can update own ranking"
  ON public.user_ranking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_ranking_tier ON public.user_ranking(rank_tier);
CREATE INDEX IF NOT EXISTS idx_user_ranking_points ON public.user_ranking(rank_points DESC);

-- 4. Function to calculate rank tier based on courses, handoffs, flags
CREATE OR REPLACE FUNCTION public.calculate_rank_tier(
  p_courses_completed INTEGER,
  p_trust_score NUMERIC,
  p_flags_received INTEGER
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_courses_completed >= 4 AND p_trust_score >= 4.0 AND p_flags_received <= 1 THEN
    RETURN 'community_partner';
  ELSIF p_courses_completed >= 4 THEN
    RETURN 'gold';
  ELSIF p_courses_completed >= 2 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;

-- 5. Function to update user_ranking when course is passed
CREATE OR REPLACE FUNCTION public.update_ranking_on_course_pass()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_courses_completed INTEGER;
  v_total_points INTEGER;
  v_trust_score NUMERIC(3,2);
  v_flags_received INTEGER;
  v_handoffs INTEGER;
  v_tier TEXT;
BEGIN
  -- Count courses completed
  SELECT COUNT(*) INTO v_courses_completed
  FROM public.user_course_progress
  WHERE user_id = NEW.user_id AND status = 'passed';

  -- Sum points from completed courses
  SELECT COALESCE(SUM(c.points), 0) INTO v_total_points
  FROM public.user_course_progress ucp
  JOIN public.courses c ON c.id = ucp.course_id
  WHERE ucp.user_id = NEW.user_id AND ucp.status = 'passed';

  -- Get existing ranking data
  SELECT COALESCE(trust_score, 5.0), COALESCE(flags_received, 0), COALESCE(successful_handoffs, 0)
  INTO v_trust_score, v_flags_received, v_handoffs
  FROM public.user_ranking
  WHERE user_id = NEW.user_id;

  -- Calculate trust score: starts at 5.0, -0.5 per flag, +0.1 per handoff (max 5.0)
  v_trust_score := LEAST(5.0, GREATEST(0.0, 5.0 - (v_flags_received * 0.5) + (v_handoffs * 0.1)));

  -- Determine tier
  v_tier := public.calculate_rank_tier(v_courses_completed, v_trust_score, v_flags_received);

  -- Upsert ranking
  INSERT INTO public.user_ranking (user_id, rank_tier, rank_points, trust_score, courses_completed, successful_handoffs, flags_received, updated_at)
  VALUES (NEW.user_id, v_tier, v_total_points, v_trust_score, v_courses_completed, v_handoffs, v_flags_received, now())
  ON CONFLICT (user_id) DO UPDATE SET
    rank_tier = EXCLUDED.rank_tier,
    rank_points = EXCLUDED.rank_points,
    trust_score = EXCLUDED.trust_score,
    courses_completed = EXCLUDED.courses_completed,
    successful_handoffs = EXCLUDED.successful_handoffs,
    flags_received = EXCLUDED.flags_received,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_on_course_pass ON public.user_course_progress;
CREATE TRIGGER trg_ranking_on_course_pass
  AFTER INSERT OR UPDATE OF status ON public.user_course_progress
  FOR EACH ROW
  WHEN (NEW.status = 'passed')
  EXECUTE FUNCTION public.update_ranking_on_course_pass();

-- 6. Function to update ranking on handoff (spot claimed)
CREATE OR REPLACE FUNCTION public.update_ranking_on_handoff()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ranking RECORD;
  v_trust_score NUMERIC(3,2);
  v_tier TEXT;
  v_total_points INTEGER;
  v_courses_completed INTEGER;
BEGIN
  -- Only on successful claim
  IF NEW.status = 'taken' AND OLD.status = 'active' AND NEW.claimed_by IS DISTINCT FROM NULL THEN
    -- Get or create ranking for the spot owner
    INSERT INTO public.user_ranking (user_id, rank_points, trust_score, courses_completed, successful_handoffs, flags_received)
    VALUES (OLD.user_id, 0, 5.0, 0, 1, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      successful_handoffs = user_ranking.successful_handoffs + 1,
      rank_points = user_ranking.rank_points + 10,
      updated_at = now()
    RETURNING * INTO v_ranking;

    -- Recalc trust score
    v_trust_score := LEAST(5.0, GREATEST(0.0, 5.0 - (v_ranking.flags_received * 0.5) + ((v_ranking.successful_handoffs + 1) * 0.1)));

    -- Get courses completed
    SELECT COUNT(*) INTO v_courses_completed
    FROM public.user_course_progress
    WHERE user_id = OLD.user_id AND status = 'passed';

    -- Get total points
    SELECT COALESCE(SUM(c.points), 0) + ((v_ranking.successful_handoffs + 1) * 10) INTO v_total_points
    FROM public.user_course_progress ucp
    JOIN public.courses c ON c.id = ucp.course_id
    WHERE ucp.user_id = OLD.user_id AND ucp.status = 'passed';

    -- Determine tier
    v_tier := public.calculate_rank_tier(v_courses_completed, v_trust_score, v_ranking.flags_received);

    UPDATE public.user_ranking
    SET rank_tier = v_tier,
        rank_points = v_total_points,
        trust_score = v_trust_score,
        updated_at = now()
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_on_handoff ON public.parking_spots;
CREATE TRIGGER trg_ranking_on_handoff
  AFTER UPDATE OF status ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ranking_on_handoff();

-- 7. Function to update ranking on flag
CREATE OR REPLACE FUNCTION public.update_ranking_on_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_spot_owner_id UUID;
  v_ranking RECORD;
  v_trust_score NUMERIC(3,2);
  v_tier TEXT;
  v_total_points INTEGER;
  v_courses_completed INTEGER;
  v_flags INTEGER;
BEGIN
  -- Get spot owner
  SELECT user_id INTO v_spot_owner_id FROM public.parking_spots WHERE id = NEW.spot_id;

  -- Get or create ranking
  INSERT INTO public.user_ranking (user_id, rank_points, trust_score, courses_completed, successful_handoffs, flags_received)
  VALUES (v_spot_owner_id, 0, 5.0, 0, 0, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    flags_received = user_ranking.flags_received + 1,
    rank_points = GREATEST(0, user_ranking.rank_points - 20),
    updated_at = now()
  RETURNING * INTO v_ranking;

  -- Recalc trust score
  v_flags := v_ranking.flags_received + 1;
  v_trust_score := LEAST(5.0, GREATEST(0.0, 5.0 - (v_flags * 0.5) + (v_ranking.successful_handoffs * 0.1)));

  -- Get courses completed
  SELECT COUNT(*) INTO v_courses_completed
  FROM public.user_course_progress
  WHERE user_id = v_spot_owner_id AND status = 'passed';

  -- Get total points
  SELECT COALESCE(SUM(c.points), 0) + (v_ranking.successful_handoffs * 10) - (v_flags * 20) INTO v_total_points
  FROM public.user_course_progress ucp
  JOIN public.courses c ON c.id = ucp.course_id
  WHERE ucp.user_id = v_spot_owner_id AND ucp.status = 'passed';
  v_total_points := GREATEST(0, v_total_points);

  -- Determine tier
  v_tier := public.calculate_rank_tier(v_courses_completed, v_trust_score, v_flags);

  UPDATE public.user_ranking
  SET rank_tier = v_tier,
      rank_points = v_total_points,
      trust_score = v_trust_score,
      flags_received = v_flags,
      updated_at = now()
  WHERE user_id = v_spot_owner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_on_flag ON public.spot_flags;
CREATE TRIGGER trg_ranking_on_flag
  AFTER INSERT ON public.spot_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ranking_on_flag();

-- 8. Seed courses
INSERT INTO public.courses (title, description, content, quiz_questions, points, required) VALUES
(
  'Street Parking Law & City Rules',
  'Learn the legal basics of street parking and how this app works within the law.',
  E'## Street Parking Law & City Rules\n\n### Public Street Parking\nPublic street parking spaces are **public property**. They cannot be bought, sold, or reserved. Anyone has the right to park in an empty public space on a first-come, first-served basis.\n\n### What This App Is (And Is Not)\nThis app is an **imminent departure alert** system. It lets you notify others when you are about to leave a parking spot. It is **not** a reservation system, a spot-selling platform, or a way to hold spots.\n\n### Rules You Must Follow\n- You may only post an alert when you are actually parked in the spot and about to leave\n- You cannot post alerts for spots you do not occupy\n- You cannot accept money or payment for a parking space\n- Alerts are limited to 15 minutes maximum to prevent early-arrival behavior\n- Your alert expires after the lead time and is automatically removed\n\n### Why These Rules Matter\nThese rules keep parking fair for everyone. When people treat public spaces as private property, it creates conflict and undermines community trust.',
  '[{"question":"Can you legally sell a public street parking space?","options":["Yes, if you parked there first","No, public street parking cannot be bought or sold","Yes, with a permit from the city","Only during street sweeping hours"],"correct":1},{"question":"What is this app designed for?","options":["Reserving parking spots in advance","Buying and selling parking spaces","Imminent departure alerts","Reporting parking violations"],"correct":2},{"question":"What is the maximum lead time for a departure alert?","options":["5 minutes","15 minutes","30 minutes","60 minutes"],"correct":1},{"question":"Can you post an alert for a spot you do not occupy?","options":["Yes, if I know someone is leaving","Yes, it helps the community","No, you must be parked in the spot","Only if I have a permit"],"correct":2}]'::jsonb,
  100,
  true
),
(
  'Community Safety & Neighbors',
  'Learn how to be a respectful and safe community member when using the app.',
  E'## Community Safety & Neighbors\n\n### Respecting Neighborhoods\nWhen you arrive to claim a spot, you are entering someone else\'s neighborhood. Your behavior reflects on the entire community of app users.\n\n### Safe Practices\n- **Do not wait near someone\'s home.** If you arrive early, park elsewhere and walk.\n- **Do not circle the block.** Repeated driving around a block looks suspicious and disturbs residents.\n- **Do not block driveways, fire hydrants, or sidewalks.** These are illegal and dangerous.\n- **Stay in your vehicle** while waiting for the spot to become free.\n- **Keep interactions brief.** A wave or a quick thank-you is enough.\n\n### Building Trust\nTrust is the foundation of this community. Users who follow these rules earn higher trust scores and ranking tiers, unlocking more features.',
  '[{"question":"What should you do if you arrive early for a spot?","options":["Park nearby and wait in your vehicle","Circle the block slowly","Wait right in front of the spot","Honk to let them know you are there"],"correct":0},{"question":"Is it okay to block a driveway while waiting for a spot?","options":["Yes, if I will only be a minute","Yes, if the spot is right next to it","No, it is illegal and dangerous","Only with the homeowner permission"],"correct":2},{"question":"What is the best way to interact with the person leaving the spot?","options":["Get out and have a conversation","A wave or quick thank-you","Follow them to their car","Ask them personal questions"],"correct":1},{"question":"Why should you not circle the block?","options":["It wastes gas","It looks suspicious and disturbs residents","It is illegal","It confuses other drivers"],"correct":1}]'::jsonb,
  100,
  true
),
(
  'App Risks & Best Practices',
  'Understand the risks of using community-driven parking apps and how to protect yourself.',
  E'## App Risks & Best Practices\n\n### Common Risks\nLike any community-driven platform, this app has risks:\n- **Fake spots:** Someone may post a spot that does not exist\n- **Stale data:** A spot may already be taken by the time you arrive\n- **Trolling:** Users may post misleading information\n- **Bad actors:** Some users may not follow the rules\n\n### How We Mitigate These Risks\n- **Short lead times (5-15 minutes):** Fresh alerts only. Old alerts expire quickly.\n- **Flag system:** You can flag misleading or dangerous spots, which reduces the poster trust score.\n- **Ranking system:** Trusted users earn higher ranks and visibility.\n- **Rate limiting:** Prevents spam and abuse.\n\n### Best Practices for You\n- Always verify the spot before claiming\n- Do not rely solely on the app — look for physical cues (car in spot, person leaving)\n- Report suspicious behavior using the flag system\n- Complete courses to earn higher trust and unlock features\n- Keep your app updated for the latest safety features',
  '[{"question":"What is a common risk of community parking apps?","options":["The app might crash","Fake or misleading spot alerts","Parking tickets","Battery drain"],"correct":1},{"question":"How does the app protect against stale data?","options":["It sends email reminders","Short lead times (5-15 minutes) with auto-expiration","It requires phone verification","It uses AI to predict availability"],"correct":1},{"question":"What should you do if you see a suspicious spot?","options":["Ignore it","Flag it using the report system","Post your own spot nearby","Leave the app"],"correct":1},{"question":"Why are short lead times important?","options":["They keep the app popular","They ensure alerts are fresh and relevant","They save server costs","They make the app faster"],"correct":1}]'::jsonb,
  100,
  false
),
(
  'Privacy & Location',
  'Learn how your data is used and how to protect your privacy while using the app.',
  E'## Privacy & Location\n\n### How Your Data Is Used\nThis app uses your location to show nearby parking spots and let you post departure alerts. Your precise location is:\n- Used only while the app is active\n- Shared at the block level (not your exact address)\n- Never sold or shared with third parties\n- Deleted when you delete your account\n\n### What Not to Share\n- **Do not share personal information** in tip messages or chat\n- **Do not share your phone number, address, or email** with other users\n- **Do not post photos** of license plates, faces, or identifying details\n\n### Privacy Best Practices\n- Use a display name that is not your real name\n- Disable location when not using the app\n- Review your data in settings periodically\n- Report any user who asks for personal information',
  '[{"question":"How is your precise location shared in the app?","options":["Your exact GPS coordinates are public","At the block level, not exact address","Only with law enforcement","It is never shared"],"correct":1},{"question":"Can you share your phone number with another user?","options":["Yes, to coordinate the handoff","No, it violates privacy guidelines","Only if they ask nicely","Yes, after completing all courses"],"correct":1},{"question":"What should you avoid including in tip messages?","options":["Your parking preferences","Personal information like your phone number or address","Directions to the spot","The vehicle type"],"correct":1}]'::jsonb,
  100,
  false
),
(
  'Street Sweeping & Legal Parking',
  'Learn about street sweeping rules in Long Beach and how to avoid tickets.',
  E'## Street Sweeping & Legal Parking\n\n### Long Beach Street Sweeping\nLong Beach has regular street sweeping on designated days. Signs are posted on each block indicating the schedule.\n\n### Common Rules\n- Street sweeping is typically once or twice per week per side of the street\n- Parking is prohibited during posted sweeping hours (usually 2-3 hour windows)\n- Violations result in fines (typically $40-$60)\n- Vehicles must be moved to the opposite side or another legal parking location\n\n### Avoiding Tickets\n- Check street sweeping signs before parking\n- Use the Street Sweeping Alert feature in this app\n- Set reminders for sweeping days in your area\n- Note that sweeping schedules change — check periodically\n\n### Legal Parking Tips\n- Always park within 18 inches of the curb\n- Do not park within 15 feet of a fire hydrant\n- Do not park in red, white, or blue zones\n- Check for time-limited parking signs\n- Residential permit parking areas require a permit during posted hours',
  '[{"question":"How often does street sweeping typically occur on each side?","options":["Once a month","Once or twice per week","Every day","Only on weekends"],"correct":1},{"question":"What is a typical fine for a street sweeping violation?","options":["$20-$30","$40-$60","$100-$150","$200-$300"],"correct":1},{"question":"How far from the curb should you park?","options":["6 inches","12 inches","18 inches","24 inches"],"correct":2},{"question":"What should you use to track street sweeping schedules?","options":["The city website only","The app Street Sweeping Alert feature","A calendar reminder","All of the above"],"correct":1}]'::jsonb,
  100,
  false
)
ON CONFLICT DO NOTHING;

-- 9. Function to create default ranking on user signup
CREATE OR REPLACE FUNCTION public.init_user_ranking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_ranking (user_id, rank_tier, rank_points, trust_score, courses_completed, successful_handoffs, flags_received)
  VALUES (NEW.id, 'bronze', 0, 5.0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_ranking ON public.users;
CREATE TRIGGER trg_init_ranking
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_ranking();
