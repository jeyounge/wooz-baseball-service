-- 1. Drop the existing constraint that restricts 'status'
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_status_check;

-- 2. Add the new constraint including 'canceled'
ALTER TABLE public.games ADD CONSTRAINT games_status_check CHECK (status IN ('scheduled', 'live', 'finished', 'canceled'));
