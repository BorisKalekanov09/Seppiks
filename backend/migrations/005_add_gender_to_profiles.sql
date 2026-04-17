-- migrations/005_add_gender_to_profiles.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;
