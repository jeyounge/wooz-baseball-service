-- Update standings table policy to allow anonymous inserts from our scraping script
DROP POLICY IF EXISTS "Allow service role all access on standings" ON public.standings;

CREATE POLICY "Allow anon all access on standings"
ON public.standings FOR ALL
USING (true)
WITH CHECK (true);
