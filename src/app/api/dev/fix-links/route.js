import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('--- Dev Data Fix: FINAL RESTORE ---');
    const today = '2026-04-09';
    
    // 1. 오늘 날짜의 경기들 가져오기
    const { data: todayGames } = await supabase
      .from('games')
      .select('id')
      .gte('game_date', today + 'T00:00:00')
      .lte('game_date', today + 'T23:59:59');

    const gameIdsForToday = todayGames?.map(g => g.id) || [];

    // 2. 기존 관리자 글 삭제 (중복 박멸)
    await supabase.from('community_posts').delete().eq('nickname', '관리자');

    // 3. 현재 저장된 분석 결과들 가져오기 (오늘 경기와 매칭되는 것만)
    const { data: predsWithGameInfo } = await supabase
      .from('predictions')
      .select('*, games(*, home:home_team_id(name), away:away_team_id(name))')
      .in('game_id', gameIdsForToday);

    // - [x] 1. DB 제약 조건 보강 (Unique Index 설정 확인)
    // - [x] 2. `api/predict` 저장 필승 로직 구현 (에러 핸들링 강화)
    // - [x] 3. 대시보드(PredictionsPage) 데이터 매칭 최종 검수
    // - [x] 4. `fix-links` 최종 실행을 통한 데이터 일제 동기화
    // - [ ] 5. 최종 검증 및 보고

    let restoredCount = 0;
    if (predsWithGameInfo) {
      for (const p of predsWithGameInfo) {
        const game = p.games;
        if (!game) continue;
        const title = `[${today}] ${game.away?.name || '원정'} VS ${game.home?.name || '홈'} 경기 분석 리포트! ⚾️`;
        
        // 중요: game_id를 반드시 포함하여 리치 UI 렌더링 보장
        await supabase.from('community_posts').insert([{ 
          title, 
          content: '우제트 AI의 정밀 분석 데이터가 동기화된 리포트입니다.', 
          nickname: '관리자', 
          password: '0310', 
          ip_address: '127.0.*.*',
          game_id: p.game_id 
        }]);
        restoredCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      matched_and_restored_count: restoredCount,
      message: `총 ${restoredCount}개의 리포트가 최신 레이아웃으로 복구되었습니다. 이제 대시보드와 커뮤니티가 완벽히 동기화됩니다.`
    });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
