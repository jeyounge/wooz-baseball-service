-- ============================================================
-- WooZ Baseball - AI 복기 시스템 DB 설계
-- 실행 순서대로 Supabase SQL Editor에서 실행해주세요.
-- ============================================================


-- 1. game_box_scores 테이블 (경기별 실제 박스스코어 원본 저장)
--    * 한 번 저장 후 재활용 → API 비용 절감
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_box_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id BIGINT UNIQUE NOT NULL,
    game_date DATE NOT NULL,

    -- 실제 스코어
    home_score INT,
    away_score INT,

    -- 선발 투수 실제 기록 (홈/원정 각각)
    home_starter_stats JSONB DEFAULT '{}'::jsonb,
    -- 예: { "name": "고영표", "innings": 6.2, "pitches": 102, "hits": 5,
    --       "hr": 1, "bb": 2, "so": 7, "era": 2.45, "result": "승" }

    away_starter_stats JSONB DEFAULT '{}'::jsonb,

    -- 계투진 기록 (홈/원정)
    home_bullpen_stats JSONB DEFAULT '[]'::jsonb,
    -- 예: [{ "name": "김택형", "innings": 1.1, "hits": 0, "bb": 1, "so": 2 }]

    away_bullpen_stats JSONB DEFAULT '[]'::jsonb,

    -- 타선 주요 기록 (홈/원정)
    home_batting_stats JSONB DEFAULT '{}'::jsonb,
    -- 예: { "team_avg": 0.278, "risp_avg": 0.200, "hr": 2,
    --       "so": 8, "dp": 1, "lob": 7, "scoring_chance": 5 }

    away_batting_stats JSONB DEFAULT '{}'::jsonb,

    -- 원문 요약 (Gemini가 쓴 박스스코어 설명 전문)
    raw_summary TEXT,

    -- 검색 기반 데이터 출처 시점
    data_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_game_box_scores_game_id ON public.game_box_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_game_box_scores_game_date ON public.game_box_scores(game_date);


-- 2. predictions_feedback 테이블 수정
--    * 기존 테이블에 세부 컬럼 추가
--    * 없다면 신규 생성
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.predictions_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id BIGINT UNIQUE NOT NULL,

    -- 예측 적중 여부
    is_correct BOOLEAN,

    -- 픽 적중 상세 (pick_1, pick_2 각각 적중 여부)
    pick_1_correct BOOLEAN,
    pick_2_correct BOOLEAN,
    pick_3_correct BOOLEAN,

    -- 실제 경기 결과 요약
    actual_result TEXT,          -- "홈팀 7 : 원정팀 3 홈팀 승"

    -- Gemini가 생성한 상세 복기 분석 리포트 (한글)
    feedback_content TEXT,

    -- 핵심 학습 포인트 (다음 분석에 활용)
    learning_points JSONB DEFAULT '{}'::jsonb,
    -- 예: {
    --   "pitching": "선발 이닝 소화력 과대평가됨. 실제 4이닝만 소화.",
    --   "batting": "득점권 타율이 예측보다 낮아 기회를 살리지 못함.",
    --   "bullpen": "불펜이 예상외로 안정적이었음.",
    --   "general": "우천 관련 컨디션 변수가 있었음."
    -- }

    -- 신뢰도 점수 (복기 결과 기반으로 자동 계산 향후 활용)
    confidence_score FLOAT,      -- 0~100

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_predictions_feedback_game_id ON public.predictions_feedback(game_id);
CREATE INDEX IF NOT EXISTS idx_predictions_feedback_created ON public.predictions_feedback(created_at DESC);

-- 기존 predictions_feedback에 컬럼이 없을 경우만 추가 (실행해도 이미 있으면 오류 → 무시)
ALTER TABLE public.predictions_feedback ADD COLUMN IF NOT EXISTS pick_1_correct BOOLEAN;
ALTER TABLE public.predictions_feedback ADD COLUMN IF NOT EXISTS pick_2_correct BOOLEAN;
ALTER TABLE public.predictions_feedback ADD COLUMN IF NOT EXISTS pick_3_correct BOOLEAN;
ALTER TABLE public.predictions_feedback ADD COLUMN IF NOT EXISTS actual_result TEXT;
ALTER TABLE public.predictions_feedback ADD COLUMN IF NOT EXISTS confidence_score FLOAT;


-- 3. RLS 정책 설정
-- (재실행 안전: DROP IF EXISTS 후 CREATE)
-- ------------------------------------------------------------
ALTER TABLE public.game_box_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON public.game_box_scores;
DROP POLICY IF EXISTS "Allow all for anon (temp)" ON public.game_box_scores;

CREATE POLICY "Allow read for all" ON public.game_box_scores
    FOR SELECT USING (true);

CREATE POLICY "Allow all for anon (temp)" ON public.game_box_scores
    FOR ALL USING (true);

ALTER TABLE public.predictions_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON public.predictions_feedback;
DROP POLICY IF EXISTS "Allow all for anon (temp)" ON public.predictions_feedback;

CREATE POLICY "Allow read for all" ON public.predictions_feedback
    FOR SELECT USING (true);

CREATE POLICY "Allow all for anon (temp)" ON public.predictions_feedback
    FOR ALL USING (true);


-- 4. 검증 쿼리 (실행 후 확인용)
-- ------------------------------------------------------------
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('game_box_scores', 'predictions_feedback', 'games', 'predictions');
