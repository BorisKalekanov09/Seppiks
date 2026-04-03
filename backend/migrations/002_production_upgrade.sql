-- migrations/002_production_upgrade.sql

-- ENUMS
CREATE TYPE question_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');
CREATE TYPE age_group_enum AS ENUM ('18_24', '25_34', '35_44', '45_plus');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE report_target_type AS ENUM ('question', 'comment');
CREATE TYPE trigger_type AS ENUM ('automatic', 'manual');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- ==========================================
-- ALTER EXISTING TABLES
-- ==========================================

-- QUESTIONS
ALTER TABLE public.questions DROP COLUMN IF EXISTS content_type;
ALTER TABLE public.questions ADD COLUMN author_id uuid REFERENCES public.profiles(id) DEFAULT NULL;
ALTER TABLE public.questions ADD COLUMN status question_status DEFAULT 'pending';
ALTER TABLE public.questions ADD COLUMN is_moderated boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN report_count integer DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN trending_score float DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN updated_at timestamptz DEFAULT now();

-- PREFERENCES
ALTER TABLE public.preferences DROP COLUMN IF EXISTS content_type;

-- PROFILES
ALTER TABLE public.profiles ADD COLUMN is_anonymous boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN region text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN age_group age_group_enum DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();

-- UPDATE SEED QUESTIONS
UPDATE public.questions SET status = 'approved', author_id = NULL;

-- ==========================================
-- CREATE NEW TABLES
-- ==========================================

-- REPORTS
CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type report_target_type NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL CHECK (char_length(reason) <= 200),
    created_at timestamptz DEFAULT now()
);

-- DATASETS
CREATE TABLE public.datasets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE UNIQUE,
    generated_at timestamptz DEFAULT now(),
    total_votes integer NOT NULL,
    yes_pct float NOT NULL,
    no_pct float NOT NULL,
    breakdown jsonb NOT NULL,
    is_exported boolean DEFAULT false,
    export_token uuid UNIQUE DEFAULT uuid_generate_v4(),
    triggered_by trigger_type NOT NULL
);

-- DATASET_EXPORT_QUEUE
CREATE TABLE public.dataset_export_queue (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
    status export_status DEFAULT 'pending',
    triggered_by trigger_type NOT NULL,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);

-- ADMIN_ACTIONS
CREATE TABLE public.admin_actions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    note text,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Drop old policies to replace them completely
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users read own prefs" ON public.preferences;
DROP POLICY IF EXISTS "Users insert own prefs" ON public.preferences;
DROP POLICY IF EXISTS "Users update own prefs" ON public.preferences;

DROP POLICY IF EXISTS "Public read questions" ON public.questions;

DROP POLICY IF EXISTS "Public read votes" ON public.votes;
DROP POLICY IF EXISTS "Users insert own vote" ON public.votes;
DROP POLICY IF EXISTS "Users delete own vote" ON public.votes;

DROP POLICY IF EXISTS "Public read comments" ON public.comments;
DROP POLICY IF EXISTS "Users insert own comment" ON public.comments;
DROP POLICY IF EXISTS "Users delete own comment" ON public.comments;

-- Profiles: public read, owner update only
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Preferences: owner read/insert/update only
CREATE POLICY "Users read own prefs" ON public.preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.preferences FOR UPDATE USING (auth.uid() = user_id);

-- Questions
CREATE POLICY "Public read approved questions" ON public.questions FOR SELECT USING (status = 'approved');
CREATE POLICY "Users insert own questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = author_id);
-- Admins can update questions (this goes through service role mostly or via admin role)
CREATE POLICY "Admins update questions" ON public.questions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Authors can delete pending questions" ON public.questions FOR DELETE USING (
    auth.uid() = author_id AND status = 'pending'
);

-- Votes: public read, authenticated insert with auth.uid() = user_id, owner delete only
CREATE POLICY "Public read votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Users insert own vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vote" ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- Comments: public read, authenticated insert, owner delete only
CREATE POLICY "Public read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users insert own comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comment" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Reports: insert only for authenticated users, no read for regular users, service role full access
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Datasets: no access for regular users, service role only
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- Dataset_export_queue: no access for regular users, service role only
ALTER TABLE public.dataset_export_queue ENABLE ROW LEVEL SECURITY;

-- Admin_actions: no access for regular users, service role only
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- POSTGRES FUNCTIONS & TRIGGERS
-- ==========================================

-- Approve Question
CREATE OR REPLACE FUNCTION public.approve_question(p_question_id uuid, p_admin_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.questions SET status = 'approved', updated_at = now() WHERE id = p_question_id;
    INSERT INTO public.admin_actions (admin_id, action, target_type, target_id)
    VALUES (p_admin_id, 'approved_question', 'question', p_question_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject Question
CREATE OR REPLACE FUNCTION public.reject_question(p_question_id uuid, p_admin_id uuid, p_note text)
RETURNS void AS $$
BEGIN
    UPDATE public.questions SET status = 'rejected', updated_at = now() WHERE id = p_question_id;
    INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, note)
    VALUES (p_admin_id, 'rejected_question', 'question', p_question_id, p_note);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate Trending Score
CREATE OR REPLACE FUNCTION public.calculate_trending_score()
RETURNS void AS $$
BEGIN
    WITH recent_votes AS (
        SELECT question_id, count(*) as votes_last_hour
        FROM public.votes
        WHERE created_at > now() - interval '1 hour'
        GROUP BY question_id
    )
    UPDATE public.questions q
    SET trending_score = (
        (COALESCE(rv.votes_last_hour, 0) * 2 + q.yes_count + q.no_count * 0.5) / 
        NULLIF((EXTRACT(EPOCH FROM (now() - q.created_at)) / 3600), 0) ^ 1.5
    )
    FROM recent_votes rv
    WHERE q.id = rv.question_id AND q.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-queue Dataset
CREATE OR REPLACE FUNCTION public.auto_queue_dataset()
RETURNS trigger AS $$
BEGIN
    IF (NEW.yes_count + NEW.no_count) >= 100 THEN
        IF NOT EXISTS (SELECT 1 FROM public.datasets WHERE question_id = NEW.id) THEN
            IF NOT EXISTS (SELECT 1 FROM public.dataset_export_queue WHERE question_id = NEW.id AND status = 'pending') THEN
                INSERT INTO public.dataset_export_queue (question_id, triggered_by) VALUES (NEW.id, 'automatic');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_question_vote_update
    AFTER UPDATE ON public.questions
    FOR EACH ROW
    WHEN (OLD.yes_count IS DISTINCT FROM NEW.yes_count OR OLD.no_count IS DISTINCT FROM NEW.no_count)
    EXECUTE PROCEDURE public.auto_queue_dataset();

-- Handle Report Auto-moderation
CREATE OR REPLACE FUNCTION public.handle_report()
RETURNS trigger AS $$
DECLARE
    total_reports integer;
BEGIN
    SELECT count(*) INTO total_reports FROM public.reports WHERE target_type = NEW.target_type AND target_id = NEW.target_id;
    IF total_reports >= 5 THEN
        IF NEW.target_type = 'question' THEN
            UPDATE public.questions SET is_moderated = true, report_count = total_reports WHERE id = NEW.target_id;
        END IF;
        -- Future: Handle comment moderation flagged state
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_insert
    AFTER INSERT ON public.reports
    FOR EACH ROW EXECUTE PROCEDURE public.handle_report();

-- Generic update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER on_questions_update
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- Anonymize User
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Set user_id = null on votes
    UPDATE public.votes SET user_id = NULL WHERE user_id = p_user_id;
    -- Delete comments
    DELETE FROM public.comments WHERE user_id = p_user_id;
    -- Log action
    INSERT INTO public.admin_actions (action, target_type, target_id)
    VALUES ('deleted_account', 'profile', p_user_id);
    -- Delete profile (triggers auth deletion typically handled by app but Profile deletion is safe)
    DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
