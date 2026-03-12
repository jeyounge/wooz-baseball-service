-- 1. Add 'cancel_reason' column to the 'games' table (Note: Table name is 'games', not 'game')
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS cancel_reason text;

-- 2. Add helpful comments
COMMENT ON COLUMN public.games.status IS 'Status of the game: scheduled, live, finished, or canceled';
COMMENT ON COLUMN public.games.cancel_reason IS 'Reason for cancellation: 우천취소, 미세먼지취소, 폭염취소, 그라운드사정, 기타 등';
