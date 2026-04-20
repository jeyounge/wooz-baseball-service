-- ============================================================
-- WooZ Baseball - 주간 분석(위클리 리포트) 시스템 DB 설계
-- 실행 순서대로 Supabase SQL Editor에서 실행해주세요.
-- ============================================================

-- 1. weekly_reports 테이블 (주간 정리 리포트 저장용)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_date DATE NOT NULL,   -- 해당 주차 화요일
    end_date DATE NOT NULL,     -- 해당 주차 일요일
    year_week TEXT UNIQUE NOT NULL, -- "2026-W16" 형태 (연도-주차)
    
    -- Gemini가 생성한 JSON 구조의 주간 분석 결과
    report_content JSONB DEFAULT '{}'::jsonb,
    -- 예상 필드:
    -- {
    --   "title": "4월 3주차 KBO 주간 결산",
    --   "team_rankings": [ { "team": "KIA", "rank": 1, "trend": "+1", "summary": "..." } ],
    --   "hot_hitters": [ { "name": "김도영", "team": "KIA", "stats": "...", "reason": "..." } ],
    --   "hot_pitchers": [ { "name": "원태인", "team": "삼성", "stats": "...", "reason": "..." } ],
    --   "weekly_issues": [ { "issue": "SSG 부상자 속출", "description": "..." } ]
    -- }

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_weekly_reports_year_week ON public.weekly_reports(year_week);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created ON public.weekly_reports(created_at DESC);


-- 2. RLS 정책 설정
-- ------------------------------------------------------------
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON public.weekly_reports;
DROP POLICY IF EXISTS "Allow all for anon (temp)" ON public.weekly_reports;

CREATE POLICY "Allow read for all" ON public.weekly_reports
    FOR SELECT USING (true);

-- (주의) 실제 프로덕션에서는 로그인한 관리자만 작성/수정 가능하도록 설정해야 하나, 
-- 현재 프로젝트 임시 정책 구조와 동일하게 전부 허용으로 잡습니다.
CREATE POLICY "Allow all for anon (temp)" ON public.weekly_reports
    FOR ALL USING (true);
