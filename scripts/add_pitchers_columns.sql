-- 이 스크립트를 Supabase SQL Editor에 복사해서 실행(RUN)해 주세요!
-- games 테이블에 선발 투수(home_pitcher, away_pitcher) 컬럼을 추가합니다.

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS home_pitcher text,
ADD COLUMN IF NOT EXISTS away_pitcher text;

-- 스키마 코멘트 추가
COMMENT ON COLUMN public.games.home_pitcher IS '홈 선발 투수';
COMMENT ON COLUMN public.games.away_pitcher IS '원정 선발 투수';
