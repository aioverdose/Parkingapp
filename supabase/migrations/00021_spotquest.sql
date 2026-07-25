-- SpotQuest Game Layer
-- Adds gamification: XP, levels, badges, quests, leaderboards, and mini-game rewards.
-- All data is privacy-first: no extra collection, just fun stats from real app usage.

-- ============================================================
-- 1. USER GAME PROFILE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_game_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_handoff_date DATE,
  perfect_parks INTEGER NOT NULL DEFAULT 0,
  total_handoffs_xp INTEGER NOT NULL DEFAULT 0,
  total_bonus_xp INTEGER NOT NULL DEFAULT 0,
  onboarding_seen BOOLEAN NOT NULL DEFAULT false,
  game_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_game_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game profile"
  ON public.user_game_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game profile"
  ON public.user_game_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game profile"
  ON public.user_game_profile FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_game_profile_user ON public.user_game_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_game_profile_xp ON public.user_game_profile(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_game_profile_level ON public.user_game_profile(level DESC);

-- ============================================================
-- 2. XP TRANSACTIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  xp_type TEXT NOT NULL CHECK (xp_type IN (
    'handoff_base', 'handoff_speed', 'handoff_streak', 'handoff_reliable',
    'perfect_park', 'quest_complete', 'badge_earn', 'daily_login'
  )),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.game_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.game_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.game_transactions FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_game_tx_user ON public.game_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_tx_type ON public.game_transactions(xp_type);
CREATE INDEX IF NOT EXISTS idx_game_tx_created ON public.game_transactions(created_at DESC);

-- ============================================================
-- 3. BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT '🏅',
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'handoff', 'streak', 'community', 'special', 'quest', 'perfect_park'
  )),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'legendary')),
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read badges"
  ON public.badges FOR SELECT
  USING (true);

-- User earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  seen BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own badges"
  ON public.user_badges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges(badge_id);

-- ============================================================
-- 4. QUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'milestone')),
  icon_emoji TEXT NOT NULL DEFAULT '📋',
  target_count INTEGER NOT NULL DEFAULT 1,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'complete_handoff', 'claim_spot', 'post_spot', 'rate_user',
    'perfect_park', 'chat_sent', 'help_driver'
  )),
  xp_reward INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quests"
  ON public.quests FOR SELECT
  USING (true);

-- User quest progress
CREATE TABLE IF NOT EXISTS public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  target_count INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, quest_id, period_start)
);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quests"
  ON public.user_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quests"
  ON public.user_quests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert quests"
  ON public.user_quests FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON public.user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_period ON public.user_quests(period_start, period_end);

-- ============================================================
-- 5. LEADERBOARD VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.spotquest_leaderboard AS
SELECT
  ugp.user_id,
  u.name AS display_name,
  u.avatar_url,
  ugp.total_xp,
  ugp.level,
  ugp.current_streak,
  ugp.longest_streak,
  ugp.perfect_parks,
  ur.rank_tier,
  ur.successful_handoffs,
  RANK() OVER (ORDER BY ugp.total_xp DESC) AS rank_position
FROM public.user_game_profile ugp
JOIN public.users u ON u.id = ugp.user_id
LEFT JOIN public.user_ranking ur ON ur.user_id = ugp.user_id
WHERE ugp.game_mode_enabled = true
ORDER BY ugp.total_xp DESC
LIMIT 100;

-- ============================================================
-- 6. GAME FUNCTIONS
-- ============================================================

-- Calculate level from total XP (logarithmic curve: harder to level up)
CREATE OR REPLACE FUNCTION public.calculate_game_level(p_total_xp INTEGER)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_level INTEGER := 1;
  v_xp_needed INTEGER := 100;
  v_accumulated INTEGER := 0;
BEGIN
  WHILE p_total_xp >= v_accumulated + v_xp_needed LOOP
    v_accumulated := v_accumulated + v_xp_needed;
    v_level := v_level + 1;
    -- Each level needs 15% more XP than the previous
    v_xp_needed := GREATEST(100, FLOOR(v_xp_needed * 1.15));
  END LOOP;
  RETURN v_level;
END;
$$;

-- XP needed to reach next level from current level
CREATE OR REPLACE FUNCTION public.xp_to_next_level(p_total_xp INTEGER)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_level INTEGER := 1;
  v_xp_needed INTEGER := 100;
  v_accumulated INTEGER := 0;
BEGIN
  WHILE p_total_xp >= v_accumulated + v_xp_needed LOOP
    v_accumulated := v_accumulated + v_xp_needed;
    v_level := v_level + 1;
    v_xp_needed := GREATEST(100, FLOOR(v_xp_needed * 1.15));
  END LOOP;
  RETURN v_xp_needed - (p_total_xp - v_accumulated);
END;
$$;

-- XP needed for current level start
CREATE OR REPLACE FUNCTION public.xp_for_current_level(p_total_xp INTEGER)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_level INTEGER := 1;
  v_xp_needed INTEGER := 100;
  v_accumulated INTEGER := 0;
BEGIN
  WHILE p_total_xp >= v_accumulated + v_xp_needed LOOP
    v_accumulated := v_accumulated + v_xp_needed;
    v_level := v_level + 1;
    v_xp_needed := GREATEST(100, FLOOR(v_xp_needed * 1.15));
  END LOOP;
  RETURN v_accumulated;
END;
$$;

-- Main function: Award XP for a handoff event
CREATE OR REPLACE FUNCTION public.award_handoff_xp(
  p_user_id UUID,
  p_match_id UUID,
  p_is_owner BOOLEAN,
  p_speed_minutes INTEGER DEFAULT NULL,
  p_reliability_rating NUMERIC DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_base_xp INTEGER := 50;
  v_speed_bonus INTEGER := 0;
  v_streak_bonus INTEGER := 0;
  v_reliable_bonus INTEGER := 0;
  v_total_xp INTEGER;
  v_new_level INTEGER;
  v_old_level INTEGER;
  v_old_xp INTEGER;
  v_profile RECORD;
  v_today DATE := CURRENT_DATE;
  v_new_streak INTEGER;
BEGIN
  -- Get or create game profile
  INSERT INTO public.user_game_profile (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_profile
  FROM public.user_game_profile
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_old_xp := v_profile.total_xp;
  v_old_level := v_profile.level;

  -- Speed bonus: under 5 min = +30, under 10 min = +15
  IF p_speed_minutes IS NOT NULL THEN
    IF p_speed_minutes <= 5 THEN
      v_speed_bonus := 30;
    ELSIF p_speed_minutes <= 10 THEN
      v_speed_bonus := 15;
    END IF;
  END IF;

  -- Streak bonus: +10 per consecutive day, up to +50 max
  IF v_profile.last_handoff_date IS NOT NULL
     AND v_profile.last_handoff_date = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_handoff_date = v_today THEN
    v_new_streak := v_profile.current_streak;
  ELSE
    v_new_streak := 1;
  END IF;
  v_streak_bonus := LEAST(v_new_streak * 10, 50);

  -- Reliability bonus: 5-star rating = +20
  IF p_reliability_rating IS NOT NULL AND p_reliability_rating >= 4.5 THEN
    v_reliable_bonus := 20;
  END IF;

  v_total_xp := v_base_xp + v_speed_bonus + v_streak_bonus + v_reliable_bonus;

  -- Update profile
  v_new_level := public.calculate_game_level(v_old_xp + v_total_xp);

  UPDATE public.user_game_profile SET
    total_xp = total_xp + v_total_xp,
    level = v_new_level,
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_handoff_date = v_today,
    total_handoffs_xp = total_handoffs_xp + v_base_xp,
    total_bonus_xp = total_bonus_xp + (v_speed_bonus + v_streak_bonus + v_reliable_bonus),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO public.game_transactions (user_id, xp_amount, xp_type, description, metadata)
  VALUES (p_user_id, v_total_xp, 'handoff_base',
    format('Handoff completed! +%s XP', v_total_xp),
    jsonb_build_object(
      'base', v_base_xp,
      'speed_bonus', v_speed_bonus,
      'streak_bonus', v_streak_bonus,
      'reliable_bonus', v_reliable_bonus,
      'match_id', p_match_id,
      'is_owner', p_is_owner
    ));

  -- Return result
  RETURN jsonb_build_object(
    'xp_awarded', v_total_xp,
    'base_xp', v_base_xp,
    'speed_bonus', v_speed_bonus,
    'streak_bonus', v_streak_bonus,
    'reliable_bonus', v_reliable_bonus,
    'new_total_xp', v_old_xp + v_total_xp,
    'new_level', v_new_level,
    'old_level', v_old_level,
    'level_up', v_new_level > v_old_level,
    'new_streak', v_new_streak
  );
END;
$$;

-- Award perfect park bonus XP
CREATE OR REPLACE FUNCTION public.award_perfect_park(
  p_user_id UUID,
  p_score INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp INTEGER;
  v_new_level INTEGER;
  v_old_xp INTEGER;
  v_old_level INTEGER;
BEGIN
  -- Score 80-100: +25 XP, 60-79: +15 XP, below 60: +5 XP
  IF p_score >= 80 THEN v_xp := 25;
  ELSIF p_score >= 60 THEN v_xp := 15;
  ELSE v_xp := 5;
  END IF;

  SELECT total_xp, level INTO v_old_xp, v_old_level
  FROM public.user_game_profile WHERE user_id = p_user_id FOR UPDATE;

  v_new_level := public.calculate_game_level(v_old_xp + v_xp);

  UPDATE public.user_game_profile SET
    total_xp = total_xp + v_xp,
    level = v_new_level,
    perfect_parks = perfect_parks + 1,
    total_bonus_xp = total_bonus_xp + v_xp,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.game_transactions (user_id, xp_amount, xp_type, description, metadata)
  VALUES (p_user_id, v_xp, 'perfect_park',
    format('Perfect Park! Score: %s, +%s XP', p_score, v_xp),
    jsonb_build_object('score', p_score));

  RETURN jsonb_build_object(
    'xp_awarded', v_xp,
    'score', p_score,
    'new_total_xp', v_old_xp + v_xp,
    'new_level', v_new_level,
    'old_level', v_old_level,
    'level_up', v_new_level > v_old_level
  );
END;
$$;

-- Check and award badges after an action
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile RECORD;
  v_ranking RECORD;
  v_new_badges JSONB := '[]'::jsonb;
  v_badge RECORD;
BEGIN
  SELECT * INTO v_profile FROM public.user_game_profile WHERE user_id = p_user_id;
  SELECT * INTO v_ranking FROM public.user_ranking WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN RETURN '[]'::jsonb; END IF;

  -- Badge: First Handoff
  IF v_profile.total_handoffs_xp > 0 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'first_handoff')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "first_handoff"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Streak Master (7 day streak)
  IF v_profile.current_streak >= 7 OR v_profile.longest_streak >= 7 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'streak_master')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "streak_master"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Speed Demon (10+ speed bonuses)
  IF (SELECT COUNT(*) FROM public.game_transactions
      WHERE user_id = p_user_id AND xp_type = 'handoff_speed') >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'speed_demon')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "speed_demon"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Perfect Parker (5 perfect parks)
  IF v_profile.perfect_parks >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'perfect_parker')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "perfect_parker"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Belmont Shore Hero (25+ handoffs)
  IF v_ranking IS NOT NULL AND v_ranking.successful_handoffs >= 25 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'belmont_hero')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "belmont_hero"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Level 10
  IF v_profile.level >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'level_10')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "level_10"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Level 25
  IF v_profile.level >= 25 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'level_25')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "level_25"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Community Legend (community_partner rank)
  IF v_ranking IS NOT NULL AND v_ranking.rank_tier = 'community_partner' THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'community_legend')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "community_legend"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Helping Hand (5 handoffs as seeker)
  IF (SELECT COUNT(*) FROM public.game_transactions
      WHERE user_id = p_user_id AND xp_type = 'handoff_base'
      AND metadata->>'is_owner' = 'false') >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'helping_hand')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "helping_hand"}'::jsonb;
    END IF;
  END IF;

  -- Badge: Questioneer (complete 10 quests)
  IF (SELECT COUNT(*) FROM public.user_quests
      WHERE user_id = p_user_id AND completed = true) >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'questioneer')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_new_badges := v_new_badges || '{"id": "questioneer"}'::jsonb;
    END IF;
  END IF;

  -- Award XP for badge discoveries (50 XP each, one-time)
  IF jsonb_array_length(v_new_badges) > 0 THEN
    FOR v_badge IN SELECT value->>'id' AS bid FROM jsonb_array_elements(v_new_badges)
    LOOP
      INSERT INTO public.game_transactions (user_id, xp_amount, xp_type, description, metadata)
      SELECT p_user_id, b.xp_reward, 'badge_earn', 'Badge earned: ' || b.name,
             jsonb_build_object('badge_id', b.id)
      FROM public.badges b WHERE b.id = v_badge.bid;

      UPDATE public.user_game_profile SET
        total_xp = total_xp + (SELECT xp_reward FROM public.badges WHERE id = v_badge.bid),
        level = public.calculate_game_level(total_xp + (SELECT xp_reward FROM public.badges WHERE id = v_badge.bid)),
        updated_at = now()
      WHERE user_id = p_user_id;
    END LOOP;
  END IF;

  RETURN v_new_badges;
END;
$$;

-- Progress quests for a given action type
CREATE OR REPLACE FUNCTION public.progress_quest(
  p_user_id UUID,
  p_action_type TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quest RECORD;
  v_completed_quests JSONB := '[]'::jsonb;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Activate daily quests if needed
  PERFORM public.ensure_daily_quests(p_user_id);

  -- Activate milestone quests that haven't been started yet
  INSERT INTO public.user_quests (user_id, quest_id, target_count, period_start, period_end)
  SELECT p_user_id, q.id, q.target_count, v_today, v_today + INTERVAL '365 days'
  FROM public.quests q
  WHERE q.quest_type = 'milestone'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_quests uq
      WHERE uq.user_id = p_user_id AND uq.quest_id = q.id
    )
  ON CONFLICT DO NOTHING;

  FOR v_quest IN
    SELECT q.id, q.name, q.xp_reward, uq.id AS uq_id, uq.current_count, uq.target_count, uq.completed
    FROM public.quests q
    JOIN public.user_quests uq ON uq.quest_id = q.id
    WHERE uq.user_id = p_user_id
      AND uq.completed = false
      AND q.action_type = p_action_type
      AND v_today BETWEEN uq.period_start AND uq.period_end
  LOOP
    UPDATE public.user_quests SET
      current_count = current_count + 1
    WHERE id = v_quest.uq_id AND current_count < target_count
    RETURNING current_count INTO v_quest.current_count;

    IF v_quest.current_count >= v_quest.target_count THEN
      UPDATE public.user_quests SET
        completed = true,
        completed_at = now()
      WHERE id = v_quest.uq_id;

      -- Award quest XP
      INSERT INTO public.game_transactions (user_id, xp_amount, xp_type, description, metadata)
      VALUES (p_user_id, v_quest.xp_reward, 'quest_complete',
              'Quest complete: ' || v_quest.name,
              jsonb_build_object('quest_id', v_quest.id));

      UPDATE public.user_game_profile SET
        total_xp = total_xp + v_quest.xp_reward,
        level = public.calculate_game_level(total_xp + v_quest.xp_reward),
        updated_at = now()
      WHERE user_id = p_user_id;

      v_completed_quests := v_completed_quests || jsonb_build_object(
        'quest_id', v_quest.id,
        'name', v_quest.name,
        'xp_awarded', v_quest.xp_reward
      );
    END IF;
  END LOOP;

  RETURN v_completed_quests;
END;
$$;

-- Ensure daily quests exist for today
CREATE OR REPLACE FUNCTION public.ensure_daily_quests(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_end_of_day DATE := v_today;
  v_quest RECORD;
BEGIN
  FOR v_quest IN SELECT * FROM public.quests WHERE quest_type = 'daily' LOOP
    INSERT INTO public.user_quests (user_id, quest_id, target_count, period_start, period_end)
    VALUES (p_user_id, v_quest.id, v_quest.target_count, v_today, v_end_of_day)
    ON CONFLICT (user_id, quest_id, period_start) DO NOTHING;
  END LOOP;
END;
$$;

-- Get full game state for a user (single query)
CREATE OR REPLACE FUNCTION public.get_game_state(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile RECORD;
  v_badges JSONB;
  v_quests JSONB;
  v_recent_tx JSONB;
  v_rank INTEGER;
BEGIN
  -- Get or create profile
  INSERT INTO public.user_game_profile (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_profile FROM public.user_game_profile WHERE user_id = p_user_id;

  -- Get earned badges
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'description', b.description,
    'icon_emoji', b.icon_emoji, 'category', b.category, 'tier', b.tier,
    'earned_at', ub.earned_at, 'seen', ub.seen
  )), '[]'::jsonb) INTO v_badges
  FROM public.user_badges ub
  JOIN public.badges b ON b.id = ub.badge_id
  WHERE ub.user_id = p_user_id;

  -- Get active quests
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id, 'name', q.name, 'description', q.description,
    'icon_emoji', q.icon_emoji, 'quest_type', q.quest_type,
    'target_count', uq.target_count, 'current_count', uq.current_count,
    'completed', uq.completed, 'xp_reward', q.xp_reward,
    'period_end', uq.period_end
  )), '[]'::jsonb) INTO v_quests
  FROM public.user_quests uq
  JOIN public.quests q ON q.id = uq.quest_id
  WHERE uq.user_id = p_user_id
    AND CURRENT_DATE BETWEEN uq.period_start AND uq.period_end;

  -- Get recent transactions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'xp_amount', xp_amount, 'xp_type', xp_type,
    'description', description, 'created_at', created_at
  )), '[]'::jsonb) INTO v_recent_tx
  FROM (SELECT * FROM public.game_transactions WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 10) sub;

  -- Get leaderboard rank
  SELECT rank_position INTO v_rank
  FROM public.spotquest_leaderboard
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'total_xp', v_profile.total_xp,
      'level', v_profile.level,
      'current_streak', v_profile.current_streak,
      'longest_streak', v_profile.longest_streak,
      'perfect_parks', v_profile.perfect_parks,
      'onboarding_seen', v_profile.onboarding_seen,
      'game_mode_enabled', v_profile.game_mode_enabled,
      'vehicle_type', v_profile.vehicle_type,
      'xp_to_next_level', public.xp_to_next_level(v_profile.total_xp),
      'xp_for_current_level', public.xp_for_current_level(v_profile.total_xp)
    ),
    'badges', v_badges,
    'quests', v_quests,
    'recent_transactions', v_recent_tx,
    'leaderboard_rank', COALESCE(v_rank, 0)
  );
END;
$$;

-- ============================================================
-- 7. SEED BADGES
-- ============================================================
INSERT INTO public.badges (id, name, description, icon_emoji, category, tier, xp_reward) VALUES
  ('first_handoff',      'First Handoff',       'Complete your very first parking handoff',                          '🚗', 'handoff',     'bronze',    50),
  ('streak_master',      'Streak Master',       'Maintain a 7-day handoff streak',                                   '🔥', 'streak',      'silver',   100),
  ('speed_demon',        'Speed Demon',         'Complete 10 handoffs with speed bonuses',                           '⚡', 'handoff',     'silver',    75),
  ('perfect_parker',     'Perfect Parker',      'Score 5 perfect parks in the mini-game',                            '🎯', 'perfect_park','silver',   100),
  ('belmont_hero',       'Belmont Shore Hero',  'Complete 25 handoffs in Belmont Shore',                             '🦸', 'community',   'gold',     150),
  ('level_10',           'Rising Star',         'Reach player level 10',                                             '⭐', 'special',     'silver',    75),
  ('level_25',           'Parking Pro',         'Reach player level 25',                                             '💎', 'special',     'gold',     150),
  ('community_legend',   'Community Legend',     'Earn the Community Partner rank tier',                              '👑', 'community',   'legendary',200),
  ('helping_hand',       'Helping Hand',        'Complete 5 handoffs as a seeker',                                   '🤝', 'community',   'bronze',    50),
  ('questioneer',        'Questioneer',         'Complete 10 quests',                                                '📋', 'quest',       'silver',   100)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. SEED QUESTS (Daily)
-- ============================================================
INSERT INTO public.quests (id, name, description, quest_type, icon_emoji, target_count, action_type, xp_reward) VALUES
  ('daily_handoff',      'Daily Driver',       'Complete 1 handoff today',                'daily', '🚗', 1, 'complete_handoff', 30),
  ('daily_spot_post',    'Spot Sharer',        'Post 1 parking spot today',              'daily', '📍', 1, 'post_spot',        20),
  ('daily_rate',         'Feedback Friend',    'Rate a handoff partner today',           'daily', '⭐', 1, 'rate_user',        15),
  ('daily_chat',         'Social Butterfly',   'Send 2 chat messages today',             'daily', '💬', 2, 'chat_sent',        10),
  ('daily_perfect_park', 'Park Precision',     'Play the Perfect Park mini-game',        'daily', '🎯', 1, 'perfect_park',     15)
ON CONFLICT (id) DO NOTHING;

-- Weekly quests
INSERT INTO public.quests (id, name, description, quest_type, icon_emoji, target_count, action_type, xp_reward) VALUES
  ('weekly_handoffs',    'Weekly Warrior',     'Complete 3 handoffs this week',           'weekly','🗓️', 3, 'complete_handoff', 100),
  ('weekly_help',        'Community Champion', 'Help 5 drivers this week',               'weekly','💪', 5, 'help_driver',      75),
  ('weekly_perfect',     'Precision Master',   'Score 3 perfect parks this week',         'weekly','🎯', 3, 'perfect_park',     60)
ON CONFLICT (id) DO NOTHING;

-- Milestone quests
INSERT INTO public.quests (id, name, description, quest_type, icon_emoji, target_count, action_type, xp_reward) VALUES
  ('milestone_10_handoffs',  'Getting Started',    'Complete 10 total handoffs',    'milestone','🏁', 10, 'complete_handoff', 200),
  ('milestone_50_handoffs',  'Parking Legend',      'Complete 50 total handoffs',    'milestone','🏆', 50, 'complete_handoff', 500),
  ('milestone_100_handoffs', 'SpotMatch Champion', 'Complete 100 total handoffs',   'milestone','🥇',100, 'complete_handoff',1000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. AUTO-INIT GAME PROFILE ON USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.init_game_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_game_profile (user_id, game_mode_enabled)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_game_profile ON public.users;
CREATE TRIGGER trg_init_game_profile
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_game_profile();

-- ============================================================
-- 10. CLEANUP: Delete expired daily quest progress older than 7 days
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_game_quests()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.user_quests
  WHERE period_end < CURRENT_DATE - INTERVAL '7 days';
$$;
