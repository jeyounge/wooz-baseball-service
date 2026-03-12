-- Create the standings table to store historical KBO rankings
CREATE TABLE public.standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL,
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    rank INT NOT NULL,
    games INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    win_rate FLOAT NOT NULL DEFAULT 0.000,
    game_behind FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year, team_id) -- A team can only have one ranking record per year
);

-- Add comments for better understanding in Supabase dashboard
COMMENT ON TABLE public.standings IS 'Historical KBO team standings by year';
COMMENT ON COLUMN public.standings.year IS 'The season year (e.g., 2024)';
COMMENT ON COLUMN public.standings.win_rate IS 'Winning percentage (wins / (wins + losses))';
COMMENT ON COLUMN public.standings.game_behind IS 'Games behind the 1st place team';

-- Enable Row Level Security (RLS) if you plan on using frontend queries directly
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access on standings"
ON public.standings FOR SELECT
USING (true);

-- Allow service role to do everything (inserts from python script)
CREATE POLICY "Allow service role all access on standings"
ON public.standings FOR ALL
USING (auth.role() = 'service_role');
