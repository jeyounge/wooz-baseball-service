-- 이 스크립트를 Supabase SQL Editor에 복사해서 실행(RUN)해 주세요!
-- standings 테이블에 팀 타율, 팀 방어율, 팀 홈런 컬럼을 추가합니다.

ALTER TABLE public.standings 
ADD COLUMN IF NOT EXISTS team_avg FLOAT DEFAULT 0.000,
ADD COLUMN IF NOT EXISTS team_era FLOAT DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS team_hr INT DEFAULT 0;

-- 스키마 코멘트 추가
COMMENT ON COLUMN public.standings.team_avg IS '팀 타율 (Team Batting Average)';
COMMENT ON COLUMN public.standings.team_era IS '팀 방어율 (Team Earned Run Average)';
COMMENT ON COLUMN public.standings.team_hr IS '팀 홈런 개수 (Team Home Runs)';
