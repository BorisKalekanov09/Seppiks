-- migrations/004_vote_dataset.sql
-- Captures every individual vote as a rich dataset row for ML training.
-- No user_id is stored — demographics are snapshotted at vote time to protect privacy
-- while still being useful for building preference-prediction models.

-- ==========================================
-- ADD gender COLUMN TO profiles
-- ==========================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;

-- ==========================================
-- TABLE: vote_dataset
-- ==========================================

CREATE TABLE IF NOT EXISTS public.vote_dataset (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Question context
  question_id          uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_text        text NOT NULL,
  category             text NOT NULL,

  -- The answer
  vote                 smallint NOT NULL CHECK (vote IN (0, 1)),  -- 0 = NO, 1 = YES

  -- Person characteristics (snapshotted at vote time, no user_id stored)
  age_group            age_group_enum,           -- '18_24' | '25_34' | '35_44' | '45_plus'
  gender               text,                     -- 'male' | 'female' | 'other'
  region               text,                     -- user's self-reported region
  is_verified          boolean DEFAULT false,    -- verified account flag
  account_age_days     integer,                  -- days since the account was created at vote time
  preferred_categories text[],                   -- categories selected during onboarding

  -- Metadata
  voted_at             timestamptz DEFAULT now()
);

-- Indexes for efficient ML queries and filtering
CREATE INDEX IF NOT EXISTS idx_vote_dataset_category    ON public.vote_dataset (category);
CREATE INDEX IF NOT EXISTS idx_vote_dataset_voted_at    ON public.vote_dataset (voted_at DESC);
CREATE INDEX IF NOT EXISTS idx_vote_dataset_question_id ON public.vote_dataset (question_id);
CREATE INDEX IF NOT EXISTS idx_vote_dataset_age_group   ON public.vote_dataset (age_group);

-- ==========================================
-- TRIGGER FUNCTION: record_vote_dataset
-- Fires after every INSERT on public.votes.
-- Looks up question + user profile, then writes one row into vote_dataset.
-- SECURITY DEFINER so it can read profiles regardless of RLS.
-- ==========================================

CREATE OR REPLACE FUNCTION public.record_vote_dataset()
RETURNS trigger AS $$
DECLARE
  v_question_text        text;
  v_category             text;
  v_age_group            age_group_enum;
  v_gender               text;
  v_region               text;
  v_is_verified          boolean;
  v_account_age          integer;
  v_preferred_categories text[];
BEGIN
  -- Look up question details
  SELECT text, category
  INTO   v_question_text, v_category
  FROM   public.questions
  WHERE  id = NEW.question_id;

  -- Look up user demographics (only if we have a real user_id)
  IF NEW.user_id IS NOT NULL THEN
    SELECT
      p.age_group,
      p.gender,
      p.region,
      COALESCE(p.is_verified, false),
      EXTRACT(DAY FROM (now() - p.created_at))::integer,
      COALESCE(pr.categories, '{}')
    INTO
      v_age_group,
      v_gender,
      v_region,
      v_is_verified,
      v_account_age,
      v_preferred_categories
    FROM  public.profiles p
    LEFT JOIN public.preferences pr ON pr.user_id = p.id
    WHERE p.id = NEW.user_id;
  END IF;

  -- Insert the dataset row
  INSERT INTO public.vote_dataset (
    question_id,
    question_text,
    category,
    vote,
    age_group,
    gender,
    region,
    is_verified,
    account_age_days,
    preferred_categories,
    voted_at
  ) VALUES (
    NEW.question_id,
    COALESCE(v_question_text, ''),
    COALESCE(v_category, 'unknown'),
    NEW.vote,
    v_age_group,
    v_gender,
    v_region,
    COALESCE(v_is_verified, false),
    v_account_age,
    COALESCE(v_preferred_categories, '{}'),
    NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to votes table
DROP TRIGGER IF EXISTS on_vote_record_dataset ON public.votes;
CREATE TRIGGER on_vote_record_dataset
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.record_vote_dataset();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.vote_dataset ENABLE ROW LEVEL SECURITY;

-- Only admins can read — no anonymous or regular-user access
CREATE POLICY "Admins read vote_dataset" ON public.vote_dataset
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No direct INSERT/UPDATE/DELETE from the API — only via the trigger
-- (The trigger runs as SECURITY DEFINER and bypasses RLS entirely)

-- ==========================================
-- ML EXPORT VIEW
-- Flattens the dataset into a clean, labeled format ready for pandas / ML pipelines.
-- ==========================================

CREATE OR REPLACE VIEW public.v_ml_dataset AS
SELECT
  id,
  question_id,
  category,
  question_text,
  CASE WHEN vote = 1 THEN 'YES' ELSE 'NO' END AS answer,
  vote                                         AS answer_binary,   -- 0/1 for numeric models
  age_group::text,
  gender,
  region,
  is_verified,
  account_age_days,
  preferred_categories,
  voted_at::date                               AS vote_date,
  EXTRACT(DOW  FROM voted_at)::integer         AS vote_weekday,    -- 0=Sun … 6=Sat
  EXTRACT(HOUR FROM voted_at)::integer         AS vote_hour
FROM public.vote_dataset;
