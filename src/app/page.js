import DashboardGrid from '@/components/layout/DashboardGrid';
import Link from 'next/link';
import { Award, TrendingUp, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parse } from 'node-html-parser';

export const dynamic = 'force-dynamic';

function getTodayString() {
  const d = new Date();
  // Get YYYY-MM-DD reliably in KST
  const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

async function updatePitchersIfMissing(games) {
  // Lazy API fetch to populate starting pitchers via KBO Official API
  if (games.some(g => g.status === 'scheduled' && (!g.home_pitcher || !g.away_pitcher || g.home_pitcher === '미정'))) {
    try {
      const d = new Date();
      const dateStr = d.getFullYear() + 
                      String(d.getMonth() + 1).padStart(2, '0') + 
                      String(d.getDate()).padStart(2, '0');
      
      const params = new URLSearchParams({
        leId: "1",
        srId: "0,1,3,4,5,6,7,8,9",
        date: dateStr
      });

      const res = await fetch('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const json = await res.json();
      
      const apiPitchers = []; 
      if (json.game) {
        json.game.forEach(g => {
          apiPitchers.push({
            away: g.AWAY_NM,
            home: g.HOME_NM,
            awayPitcher: g.T_PIT_P_NM || '미정',
            homePitcher: g.B_PIT_P_NM || '미정'
          });
        });
      }

      const updates = [];
      games.forEach(g => {
        if (g.status === 'scheduled' && (!g.home_pitcher || !g.away_pitcher || g.home_pitcher === '미정')) {
          const fullHome = g.home?.name || "";
          const fullAway = g.away?.name || "";
          
          let hPitcher = '미정';
          let aPitcher = '미정';
          
          // Match using includes (e.g. "KIA 타이거즈" includes "KIA")
          const found = apiPitchers.find(p => fullHome.includes(p.home) && fullAway.includes(p.away));
          if (found) {
            hPitcher = found.homePitcher;
            aPitcher = found.awayPitcher;
          }
          
          if (hPitcher !== '미정' && hPitcher !== '') {
            g.home_pitcher = hPitcher;
            g.away_pitcher = aPitcher;
            updates.push({ id: g.id, home_pitcher: hPitcher, away_pitcher: aPitcher });
          }
        }
      });

    if (updates.length > 0) {
      // Wait for it so we don't render before DB updates (and potentially cause flickering locally)
      // Use .update() instead of .upsert() to avoid NOT NULL constraint errors for partial objects
      await Promise.all(updates.map(async (u) => {
        const { error } = await supabase.from('games').update({
          home_pitcher: u.home_pitcher,
          away_pitcher: u.away_pitcher
        }).eq('id', u.id);
        
        if (error) console.error("Pitcher Update error:", error);
      }));
    }
  } catch (err) {
    console.error("Failed to fetch pitchers:", err);
  }
  }
  
  return games;
}

async function getTodayGames() {
  const todayStr = getTodayString();
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select(`
      id, game_date, stadium, status, cancel_reason, home_score, away_score, home_pitcher, away_pitcher,
      home:teams!home_team_id (name),
      away:teams!away_team_id (name)
    `)
    .gte('game_date', `${todayStr}T00:00:00+09:00`)
    .lte('game_date', `${todayStr}T23:59:59+09:00`)
    .order('game_date', { ascending: true });

  if (gamesErr) {
    console.error(gamesErr);
    return [];
  }
  return updatePitchersIfMissing(games || []);
}

export default async function Home() {
  const todayGames = await getTodayGames();
  const todayStr = getTodayString();

  return (
    <DashboardGrid>
      <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">오늘의 주요 경기</h1>
        <p className="text-gray-400">AI가 예측한 오늘의 KBO 승부 결과를 확인하세요.</p>
      </div>

      {/* Today's Games List */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 xl:col-span-4 bg-[#1A1E24] rounded-xl border border-gray-800 p-6 shadow-lg min-h-64">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="text-blue-400" />
            {todayStr} KBO 매치업
          </h3>
        </div>

        {todayGames.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            오늘은 예정된 프로야구 경기가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {todayGames.map((game) => (
              <div key={game.id} className="bg-[#13161A] border border-gray-800 rounded-lg p-5 flex flex-col hover:border-gray-600 transition-colors shadow-sm gap-4">
                
                {/* Matchup Header */}
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <MapPin size={12} /> {game.stadium}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${game.status === 'canceled' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-300'}`}>
                    {game.status === 'canceled' ? '경기취소' : new Date(game.game_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                  </span>
                </div>
                
                {/* Matchup Body */}
                <div className="flex items-center justify-between w-full py-2">
                  {/* Away Team */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-2xl font-black text-gray-200">{game.away?.name.split(' ')[0]}</span>
                    {game.status === 'scheduled' && (
                       <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full mt-2 ${game.away_pitcher && game.away_pitcher !== '미정' ? 'bg-[#1A237E]/30 text-blue-300' : 'bg-gray-800 text-gray-500'}`}>
                          선발: {game.away_pitcher || '미정'}
                       </span>
                    )}
                  </div>
                  
                  {/* VS block */}
                  <div className="flex flex-col items-center justify-center px-4">
                     <span className="text-sm text-gray-600 font-black tracking-widest">VS</span>
                  </div>
                  
                  {/* Home Team */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-2xl font-black text-gray-200">{game.home?.name.split(' ')[0]}</span>
                    {game.status === 'scheduled' && (
                       <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full mt-2 ${game.home_pitcher && game.home_pitcher !== '미정' ? 'bg-[#D32F2F]/30 text-red-300' : 'bg-gray-800 text-gray-500'}`}>
                          선발: {game.home_pitcher || '미정'}
                       </span>
                    )}
                  </div>
                </div>
                
                {/* AI Prediction Button - Full Width */}
                {game.status !== 'canceled' && (
                  <Link href={`/predictions/${game.id}`} className="mt-2 w-full py-3.5 bg-gradient-to-r from-blue-900/50 to-purple-900/50 hover:from-blue-700/60 hover:to-purple-700/60 border border-blue-500/30 text-blue-200 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-2 group shadow-lg">
                    <Award className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="tracking-wide">Wooz AI 승부 예측하기</span>
                  </Link>
                )}
                
                {game.status === 'canceled' && game.cancel_reason && (
                  <div className="text-center text-sm text-red-500 font-bold bg-red-900/10 py-2 rounded-lg mt-2 border border-red-900/50">
                    {game.cancel_reason}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standings Widget (Expanded Full Width since Wooz Pick Widget is removed) */}
      <Link href="/standings" className="col-span-1 md:col-span-2 lg:col-span-4 bg-[#1E1E1E] hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-gray-600 p-6 flex flex-col items-center justify-center h-24 md:h-32 shadow-lg transition-all mt-2">
        <h3 className="text-xl font-bold text-white mb-2">2026 KBO 정규시즌 팀 스탯 및 순위표</h3>
        <p className="text-gray-400">팀별 실시간 순위, 타율, 홈런, 방어율 보러가기 →</p>
      </Link>

      {/* AI Architecture Section - Authority & SEO */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 bg-[#1A1E24] rounded-xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Award size={120} className="text-blue-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <TrendingUp className="text-blue-400" />
          WooZ AI: Algol-1 모델 아키텍처
        </h2>
        
        <div className="prose prose-invert max-w-none text-gray-400 space-y-4">
          <p>
            WooZ Baseball 서비스의 핵심인 <span className="text-blue-200 font-semibold text-lg">Algol-1</span> 예측 엔진은 단순한 승률 계산을 넘어선 다중 레이어 구조의 딥러닝 모델입니다. 
            매 경기 수천 가지의 변수를 실시간으로 처리하여 사용자에게 가장 객관적인 데이터를 제공하는 것을 목표로 합니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="bg-[#13161A] p-5 rounded-lg border border-gray-800/50">
              <h4 className="text-blue-300 font-bold mb-3">1. 다차원 데이터 통합 (ELO & Statcast)</h4>
              <p className="text-sm leading-relaxed">
                전통적인 세이버메트릭스 데이터뿐만 아니라, 팀 간의 상대적 전력을 평가하는 **ELO rating 시스템**을 KBO 리그 특성에 맞춰 커스텀하여 반영합니다. 
                여기에 고도화된 선수별 컨디션 지표와 최근 10경기 추세 데이터를 결합하여 가중치를 부여합니다.
              </p>
            </div>
            
            <div className="bg-[#13161A] p-5 rounded-lg border border-gray-800/50">
              <h4 className="text-purple-300 font-bold mb-3">2. 환경 변수 보정 (Park Factor)</h4>
              <p className="text-sm leading-relaxed">
                KBO 각 구장의 특성(파크 팩터)과 당일의 기상 상태(풍향, 습도)를 변수로 산입합니다. 
                특히 장타 허용률이 높은 고척이나 문학 경기와 같은 구장별 특수성을 시뮬레이션에 반영하여 예측 정확도를 높입니다.
              </p>
            </div>
          </div>

          <p className="mt-6 pt-6 border-t border-gray-800 italic text-sm">
            *모든 예측 데이터는 통계적 확률을 기반으로 하며, 실제 경기 결과와는 차이가 있을 수 있습니다. WooZ AI는 지속적인 학습을 통해 모델의 오차율을 줄여나가고 있습니다.
          </p>
        </div>
      </div>
    </DashboardGrid>
  );
}
