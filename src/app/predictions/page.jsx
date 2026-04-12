import { supabase } from '@/lib/supabase';
import { Award, TrendingUp, AlertCircle, Percent, MapPin, Clock, Bot, ChevronRight, Zap, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getTodayString() {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export default async function PredictionsPage() {
  const todayStr = getTodayString();
  
  // 1. Fetch Today's Games
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select(`
      *,
      home:home_team_id (name),
      away:away_team_id (name)
    `)
    .gte('game_date', `${todayStr}T00:00:00+09:00`)
    .lte('game_date', `${todayStr}T23:59:59+09:00`)
    .order('game_date', { ascending: true });

  if (gamesErr) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          경기 데이터를 불러오는 데 실패했습니다. ({gamesErr.message})
        </div>
      </div>
    );
  }

  // 2. Fetch all predictions for these games
  const gameIds = games?.map(g => g.id) || [];
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .in('game_id', gameIds);

  // 3. Merge games and predictions in JS (Robust matching)
  const gamesWithPicks = games?.map(game => {
    const pred = predictions?.find(p => {
      const pId = p.game_id ? String(p.game_id) : '';
      const gId = game.id ? String(game.id) : '';
      return pId === gId && pId !== '';
    });
    
    return { 
      ...game, 
      matchedPrediction: pred || null,
      hasAnalysed: !!pred 
    };
  }) || [];

  // 4. Calculate Combinations (추천 조합)
  const analyzedGames = gamesWithPicks.filter(g => g.hasAnalysed);
  
  // Sort by confidence (descending)
  const sortedGames = [...analyzedGames].sort((a, b) => {
    const confA = parseInt(a.matchedPrediction?.recommendations?.priority_1?.confidence || a.matchedPrediction?.analysis_report?.confidence || 0);
    const confB = parseInt(b.matchedPrediction?.recommendations?.priority_1?.confidence || b.matchedPrediction?.analysis_report?.confidence || 0);
    return confB - confA;
  });

  // 안전 조합 (Top 3)
  const safeCombo = sortedGames.slice(0, 3);
  
  // 고배당 조합 (4~5 games) - 역순으로 정렬하여 신뢰도가 상대적으로 낮은(배당이 높은) 경기들 위주로 5경기 픽 후 시간순 정렬
  let highYieldCombo = [];
  if (sortedGames.length >= 4) {
    highYieldCombo = [...sortedGames].reverse().slice(0, 5).sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
  } else {
    highYieldCombo = [...sortedGames]; // 3경기 이하면 있는 그대로 가져감
  }

  // Helper: Get pick color
  const getPickColor = (pick) => {
    if (pick?.includes('승')) return 'text-blue-400';
    if (pick?.includes('패')) return 'text-red-400';
    if (pick?.includes('오버')) return 'text-orange-400';
    if (pick?.includes('언더')) return 'text-emerald-400';
    return 'text-indigo-300';
  };

  const GamePickCard = ({ game }) => {
    const pred = game.matchedPrediction;
    const hasAnalysis = !!pred;
    
    return (
      <div className={`relative group bg-[#1A1E24] rounded-2xl border ${hasAnalysis ? 'border-indigo-500/30 shadow-indigo-500/5' : 'border-slate-800'} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10`}>
        {/* Card Header (Time & Stadium) */}
        <div className="flex justify-between items-center p-4 bg-slate-900/50 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-tighter">
            <Clock size={14} className="text-indigo-400" />
            {new Date(game.game_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
             <MapPin size={12}/> {game.stadium}
          </div>
        </div>

        {/* Matchup Body */}
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex flex-col items-center flex-1 text-center">
               <span className="text-2xl font-black text-white tracking-tighter">{game.away?.name?.split(' ')[0]}</span>
               <span className="text-[10px] text-slate-500 mt-1">선발: {game.away_pitcher || '미정'}</span>
            </div>
            <div className="flex flex-col items-center">
               <span className="text-xs font-black text-slate-700 italic">VS</span>
            </div>
            <div className="flex flex-col items-center flex-1 text-center">
               <span className="text-2xl font-black text-white tracking-tighter">{game.home?.name?.split(' ')[0]}</span>
               <span className="text-[10px] text-slate-500 mt-1">선발: {game.home_pitcher || '미정'}</span>
            </div>
          </div>

          {/* Conditional Analysis Content */}
          {hasAnalysis ? (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                 <span className="flex items-center gap-1"><Zap size={12} className="text-yellow-500"/> 우제트 픽</span>
                 <span className="text-indigo-400">신뢰도 {pred.recommendations?.priority_1?.confidence || pred.analysis_report?.confidence || '--'}%</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/50 rounded-lg p-2 border border-blue-500/10 text-center">
                  <div className="text-[9px] text-slate-500 mb-1">1순위</div>
                  <div className={`text-xs font-bold truncate ${getPickColor(pred.pick_1)}`}>{pred.pick_1}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2 border border-purple-500/10 text-center">
                  <div className="text-[9px] text-slate-500 mb-1">2순위</div>
                  <div className={`text-xs font-bold truncate ${getPickColor(pred.pick_2)}`}>{pred.pick_2}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 text-center">
                  <div className="text-[9px] text-slate-500 mb-1">3순위</div>
                  <div className={`text-xs font-bold truncate ${getPickColor(pred.pick_3)}`}>{pred.pick_3}</div>
                </div>
              </div>

              <Link href={`/predictions/${game.id}`} className="mt-4 flex items-center justify-center gap-1 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 group">
                상세 분석 리포트 보기 <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            <div className="pt-4 border-t border-dashed border-white/10 flex flex-col items-center text-center">
              <Bot size={32} className="text-slate-600 mb-3 opacity-50" />
              <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">아직 우제트 AI의 심층 분석이<br/>수행되지 않은 매치업입니다.</p>
              <Link href={`/predictions/${game.id}`} className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 hover:from-indigo-500/40 hover:to-blue-500/40 border border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-xl transition-all group">
                <Zap size={14} className="group-hover:scale-125 transition-transform" /> AI 분석 시작하기
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CombinationSection = () => {
    if (safeCombo.length === 0) return null;

    return (
      <div className="mt-20 space-y-8 animate-fade-in-up">
        <div className="text-center mb-10">
           <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter flex items-center justify-center gap-3">
             우제트 <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">RECOMMENDED</span> 조합
           </h2>
           <p className="text-slate-400 mt-2">AI 분석 신뢰도를 바탕으로 산출된 추천 폴더입니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Safe Combo */}
          <div className="bg-gradient-to-b from-blue-900/40 to-[#1A1E24] rounded-3xl p-[1px] shadow-2xl shadow-blue-900/20 group hover:shadow-blue-600/30 transition-all duration-300">
             <div className="bg-[#1A1E24] rounded-[23px] p-6 sm:p-8 h-full border border-blue-500/10 group-hover:border-blue-500/30 transition-colors">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Award size={28}/></div>
                 <div>
                   <h3 className="text-xl sm:text-2xl font-black text-white">첫 번째: 안전 조합 <span className="text-blue-400 opacity-80">(3폴더)</span></h3>
                   <p className="text-sm text-blue-400/80 mt-1">당첨 확률을 극대화한 가장 유력한 픽</p>
                 </div>
               </div>
               <div className="space-y-3">
                 {safeCombo.map((game, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:bg-slate-800/80 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1">{game.away?.name?.split(' ')[0]} <span className="text-[10px]">vs</span> {game.home?.name?.split(' ')[0]}</span>
                        <span className={`text-sm sm:text-base font-bold ${getPickColor(game.matchedPrediction?.pick_1)}`}>
                          {game.matchedPrediction?.pick_1}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] sm:text-xs text-slate-500 block mb-1">AI 신뢰도</span>
                        <span className="text-sm sm:text-base font-black text-white">{game.matchedPrediction?.recommendations?.priority_1?.confidence || game.matchedPrediction?.analysis_report?.confidence}%</span>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>

          {/* High Yield Combo */}
          <div className="bg-gradient-to-b from-orange-900/40 to-[#1A1E24] rounded-3xl p-[1px] shadow-2xl shadow-orange-900/20 group hover:shadow-orange-600/30 transition-all duration-300">
             <div className="bg-[#1A1E24] rounded-[23px] p-6 sm:p-8 h-full border border-orange-500/10 group-hover:border-orange-500/30 transition-colors">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400"><Zap size={28}/></div>
                 <div>
                   <h3 className="text-xl sm:text-2xl font-black text-white">두 번째: 고배당 조합 <span className="text-orange-400 opacity-80">({highYieldCombo.length}폴더)</span></h3>
                   <p className="text-sm text-orange-400/80 mt-1">큰 배당과 수익성을 노리는 추천 리스키 픽</p>
                 </div>
               </div>
               <div className="space-y-3">
                 {highYieldCombo.map((game, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:bg-slate-800/80 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 mb-1">{game.away?.name?.split(' ')[0]} <span className="text-[10px]">vs</span> {game.home?.name?.split(' ')[0]}</span>
                        <span className={`text-sm sm:text-base font-bold ${getPickColor(game.matchedPrediction?.pick_1)}`}>
                          {game.matchedPrediction?.pick_1}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] sm:text-xs text-slate-500 block mb-1">AI 신뢰도</span>
                        <span className="text-sm sm:text-base font-black text-white">{game.matchedPrediction?.recommendations?.priority_1?.confidence || game.matchedPrediction?.analysis_report?.confidence}%</span>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Page Header */}
      <div className="mb-12 relative">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 overflow-hidden">
          <div className="space-y-3">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] md:text-xs font-extrabold tracking-widest uppercase">
                Premium Predictions
             </div>
             <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter flex items-center gap-3">
               우제트 픽 <span className="bg-gradient-to-r from-indigo-500 to-blue-600 bg-clip-text text-transparent italic">DASHBOARD</span>
             </h1>
             <p className="text-slate-400 font-medium max-w-xl leading-relaxed text-sm md:text-base">
               전 세계 프로야구 데이터를 학습한 우제트 AI가 오늘의 KBO 매치업을 정밀 분석합니다. 
             </p>
          </div>
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-end gap-1 border-l-4 md:border-l-0 md:border-r-4 border-indigo-500 pl-4 md:pl-0 md:pr-4">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KST Local Date</span>
             <span className="text-xl md:text-2xl font-black text-white italic">{todayStr.replace(/-/g, '. ')}</span>
          </div>
        </div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full -z-10"></div>
      </div>

      {/* Matchups Grid */}
      {gamesWithPicks.length === 0 ? (
        <div className="bg-[#1A1E24] rounded-3xl border border-dashed border-slate-700 p-20 flex flex-col items-center justify-center text-center">
           <CalendarIcon size={48} className="text-slate-700 mb-6" />
           <h3 className="text-xl font-bold text-slate-400 mb-1">오늘은 예정된 경기가 없습니다.</h3>
           <p className="text-slate-600 text-sm">내일 다시 찾아뵙겠습니다.</p>
        </div>
      ) : (
        <>
          <div className="col-span-1 md:col-span-2 lg:col-span-4 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2 italic">오늘의 주요 경기</h1>
            <p className="text-sm md:text-base text-gray-400">AI가 예측한 오늘의 KBO 승부 결과를 확인하세요.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
             {gamesWithPicks.map(game => (
               <GamePickCard key={game.id} game={game} />
             ))}
          </div>

          {/* Recommended Combinations Section */}
          <CombinationSection />
        </>
      )}

      {/* Bottom Support Banner */}
      <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-indigo-900/30 to-slate-900/30 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
               <TrendingUp size={24} />
            </div>
            <div>
               <h4 className="text-lg font-bold text-white">더 정밀한 데이터를 원하시나요?</h4>
               <p className="text-slate-400 text-sm">팀별 상세 스탯은 전용 아카이브에서 확인하실 수 있습니다.</p>
            </div>
         </div>
         <Link href="/standings" className="px-6 py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95">
            데이터 아카이브 가기
         </Link>
      </div>
    </div>
  );
}
