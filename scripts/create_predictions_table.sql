-- predictions 테이블 생성 스크립트
CREATE TABLE IF NOT EXISTS public.predictions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
    situation text NOT NULL,
    starter_pitcher text NOT NULL,
    bullpen text NOT NULL,
    batting text NOT NULL,
    conclusion text NOT NULL,
    pick_1 text,
    pick_2 text,
    pick_3 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(game_id)
);

COMMENT ON TABLE public.predictions IS 'AI 게임 분석 및 예측 결과 저장 (토큰 절약용 캐시)';
