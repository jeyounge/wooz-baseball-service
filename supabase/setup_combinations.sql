-- 1. daily_combinations 테이블 생성
CREATE TABLE IF NOT EXISTS public.daily_combinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_date DATE UNIQUE NOT NULL,
    safe_combo JSONB DEFAULT '[]'::jsonb,
    high_yield_combo JSONB DEFAULT '[]'::jsonb,
    is_evaluated BOOLEAN DEFAULT false,
    retro_report TEXT,
    hit_rate FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Row Level Security 정책 적용
ALTER TABLE public.daily_combinations ENABLE ROW LEVEL SECURITY;

-- 조회 권한 (전체 허용)
CREATE POLICY "Enable read access for all users" 
ON public.daily_combinations FOR SELECT USING (true);

-- 수정/생성 권한 (익명 포함 전체 임시 허용)
CREATE POLICY "Enable all access for anon" 
ON public.daily_combinations FOR ALL USING (true);
