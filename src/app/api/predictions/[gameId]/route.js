import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, context) {
  try {
    const params = await context.params; // Next.js 15+ 대응
    const { gameId } = params;
    
    if (!gameId) {
      return NextResponse.json({ error: 'gameId가 필요합니다.' }, { status: 400 });
    }

    const gameIdNum = Number(gameId); // 확실하게 숫자로 변환

    // 오직 DB에서 이미 생성된 분석 결과만 조회 (무거운 AI 로직 배제)
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '분석 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ data });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
