import { supabase } from '@/lib/supabase';
import {
  CheckCircle, XCircle, Minus, BookOpen, TrendingUp, AlertCircle,
  CalendarDays, Target, BarChart2, Zap, ChevronRight, Star
} from 'lucide-react';
import Link from 'next/link';
import ReviewTrigger from '@/components/review/ReviewTrigger';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '우제트 AI 복기 아카이브 | WooZ Baseball',
  description: '우제트 AI의 경기 예측과 실제 결과를 대조한 복기 리포트 및 자기 학습 데이터를 확인하세요.',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul'
  }).replace(/\. /g, '.').replace('.', '년 ').replace('.', '월 ').replace('.', '일');
}

function PickBadge({ pick, correct }) {
  if (correct === null || correct === undefined) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300">{pick || '-'}</span>;
  }
  if (correct) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle size={10} /> {pick}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
      <XCircle size={10} /> {pick}
    </span>
  );
}

function StatRow({ label, value, unit = '', highlight = false }) {
  return (
    <div className={`flex justify-between items-center py-1.5 border-b border-white/5 last:border-0 ${highlight ? 'text-yellow-400' : ''}`}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value !== undefined && value !== null ? `${value}${unit}` : '-'}</span>
    </div>
  );
}

function BoxScoreCard({ title, starterStats, bullpenStats, battingStats, accentColor = 'blue' }) {
  const colors = {
    blue: { border: 'border-blue-500/20', label: 'text-blue-400', bg: 'bg-blue-500/10' },
    rose: { border: 'border-rose-500/20', label: 'text-rose-400', bg: 'bg-rose-500/10' }
  };
  const c = colors[accentColor];

  return (
    <div className={`bg-[#111418] rounded-2xl border ${c.border} p-4 space-y-4`}>
      <h4 className={`text-xs font-extrabold uppercase tracking-widest ${c.label}`}>{title}</h4>

      {/* 선발 투수 */}
      {starterStats && (
        <div>
          <div className={`text-[10px] font-bold ${c.label} mb-2 flex items-center gap-1`}>
            <Target size={10} /> 선발 투수: {starterStats.name || '-'}
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-black ${starterStats.result === '승' ? 'bg-emerald-500/20 text-emerald-400' : starterStats.result === '패' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
              {starterStats.result || '-'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: '이닝', value: starterStats.innings },
              { label: '투구수', value: starterStats.pitches },
              { label: '피안타', value: starterStats.hits },
              { label: '피홈런', value: starterStats.hr },
              { label: '사사구', value: starterStats.bb },
              { label: '자책', value: starterStats.earned_runs },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/60 rounded-lg p-2 text-center">
                <div className="text-[9px] text-slate-500">{s.label}</div>
                <div className="text-xs font-bold text-white mt-0.5">{s.value ?? '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 타선 */}
      {battingStats && (
        <div>
          <div className={`text-[10px] font-bold ${c.label} mb-2 flex items-center gap-1`}>
            <BarChart2 size={10} /> 타선
          </div>
          <div className={`rounded-xl border ${c.border} p-3 space-y-0`}>
            <StatRow label="득점권 타율" value={battingStats.risp_avg ? (battingStats.risp_avg * 100).toFixed(1) : null} unit="%" />
            <StatRow label="홈런" value={battingStats.hr} />
            <StatRow label="삼진" value={battingStats.so} />
            <StatRow label="병살" value={battingStats.dp} highlight={battingStats.dp >= 2} />
            <StatRow label="잔루" value={battingStats.lob} />
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ReviewPage() {
  // 1단계: predictions_feedback 단독 조회 (FK 조인 없이)
  const { data: feedbacks, error } = await supabase
    .from('predictions_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={18} /> 복기 데이터를 불러오는 데 실패했습니다. ({error.message})
        </div>
      </div>
    );
  }

  // 2단계: game_id 목록으로 games / predictions / boxScores 병렬 조회
  const gameIds = feedbacks?.map(f => f.game_id) || [];

  const [{ data: games }, { data: predictions }, { data: boxScores }] = await Promise.all([
    supabase
      .from('games')
      .select(`id, game_date, home_score, away_score, home_pitcher, away_pitcher, status,
        home:teams!home_team_id(name), away:teams!away_team_id(name)`)
      .in('id', gameIds),
    supabase.from('predictions').select('*').in('game_id', gameIds.map(String)),
    supabase.from('game_box_scores').select('*').in('game_id', gameIds)
  ]);

  // 3단계: JS에서 머지
  const gameMap = {};
  (games || []).forEach(g => { gameMap[g.id] = g; });
  const predMap = {};
  (predictions || []).forEach(p => { predMap[p.game_id] = p; });
  const boxMap = {};
  (boxScores || []).forEach(b => { boxMap[b.game_id] = b; });

  // 통계 계산
  const totalReviews = feedbacks?.length || 0;
  const correctCount = feedbacks?.filter(f => f.is_correct).length || 0;
  const pick1HitCount = feedbacks?.filter(f => f.pick_1_correct).length || 0;
  const hitRate = totalReviews > 0 ? Math.round((correctCount / totalReviews) * 100) : 0;
  const pick1Rate = totalReviews > 0 ? Math.round((pick1HitCount / totalReviews) * 100) : 0;
  const avgConfidence = totalReviews > 0
    ? Math.round(feedbacks.reduce((s, f) => s + (f.confidence_score || 0), 0) / totalReviews)
    : 0;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">

      {/* 페이지 헤더 */}
      <div className="mb-12 relative">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-600/10 blur-[120px] rounded-full -z-10" />
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-extrabold tracking-widest uppercase mb-4">
          AI Self-Learning Archive
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter flex items-center gap-3 mb-3">
          <BookOpen size={36} className="text-emerald-400" />
          우제트 AI <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent italic">복기 아카이브</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl">
          AI가 예측한 내용과 실제 경기 결과(선발 투수 퍼포먼스, 타선 기록 등)를 대조하여 스스로 학습합니다.
        </p>
      </div>

      {/* 복기 실행 패널 (관리자용 트리거) */}
      <ReviewTrigger />

      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: '누적 복기', value: `${totalReviews}`, unit: '경기', icon: <CalendarDays size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '전체 적중률', value: `${hitRate}`, unit: '%', icon: <Target size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '1순위 픽 적중', value: `${pick1Rate}`, unit: '%', icon: <Star size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: '평균 신뢰도', value: `${avgConfidence}`, unit: '점', icon: <TrendingUp size={20} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1A1E24] rounded-2xl p-5 border border-white/5 flex flex-col gap-3">
            <div className={`inline-flex p-2 rounded-xl w-fit ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-white">
                {stat.value}<span className="text-sm text-slate-500 ml-1">{stat.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 복기 리스트 */}
      {!feedbacks || feedbacks.length === 0 ? (
        <div className="bg-[#1A1E24] rounded-3xl border border-dashed border-slate-700 p-20 flex flex-col items-center text-center">
          <BookOpen size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-slate-400 mb-1">아직 복기 데이터가 없습니다.</h3>
          <p className="text-slate-600 text-sm">경기 종료 다음날 자동 분석 후 데이터가 쌓입니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {feedbacks.map(fb => {
            const game = gameMap[fb.game_id];
            const pred = predMap[fb.game_id];
            const box = boxMap[fb.game_id];
            const homeName = game?.home?.name?.split(' ')[0] || '-';
            const awayName = game?.away?.name?.split(' ')[0] || '-';
            const lp = fb.learning_points || {};

            return (
              <div key={fb.id} className={`bg-[#1A1E24] rounded-3xl border overflow-hidden shadow-2xl ${fb.is_correct ? 'border-emerald-500/20 shadow-emerald-900/10' : 'border-red-500/10 shadow-red-900/5'}`}>

                {/* 카드 헤더 */}
                <div className={`flex items-center justify-between px-6 py-4 border-b border-white/5 ${fb.is_correct ? 'bg-emerald-900/20' : 'bg-red-900/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${fb.is_correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {fb.is_correct ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{formatDate(game?.game_date)}</p>
                      <h2 className="text-lg font-black text-white tracking-tighter">
                        {awayName} <span className="text-slate-600 font-normal">vs</span> {homeName}
                      </h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 mb-1">실제 스코어</p>
                    <p className="text-xl font-black text-white">{game?.away_score} <span className="text-slate-600 font-normal">:</span> {game?.home_score}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* 픽 적중 여부 */}
                  {pred && (
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> AI 픽 결과</p>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl">
                          <span className="text-[10px] text-slate-500">1순위</span>
                          <PickBadge pick={pred.pick_1} correct={fb.pick_1_correct} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl">
                          <span className="text-[10px] text-slate-500">2순위</span>
                          <PickBadge pick={pred.pick_2} correct={fb.pick_2_correct} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl">
                          <span className="text-[10px] text-slate-500">3순위</span>
                          <PickBadge pick={pred.pick_3} correct={fb.pick_3_correct} />
                        </div>
                        {fb.confidence_score !== null && (
                          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl ml-auto">
                            <span className="text-[10px] text-slate-500">예측 품질</span>
                            <span className="text-xs font-black text-indigo-400">{fb.confidence_score}점</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 박스스코어 */}
                  {box && (
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-1"><BarChart2 size={10} className="text-blue-400" /> 실제 경기 기록</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <BoxScoreCard
                          title={`${awayName} (원정)`}
                          starterStats={box.away_starter_stats}
                          bullpenStats={box.away_bullpen_stats}
                          battingStats={box.away_batting_stats}
                          accentColor="rose"
                        />
                        <BoxScoreCard
                          title={`${homeName} (홈)`}
                          starterStats={box.home_starter_stats}
                          bullpenStats={box.home_bullpen_stats}
                          battingStats={box.home_batting_stats}
                          accentColor="blue"
                        />
                      </div>
                    </div>
                  )}

                  {/* 복기 리포트 */}
                  {fb.feedback_content && (
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><BookOpen size={10} className="text-emerald-400" /> 복기 분석 리포트</p>
                      <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {fb.feedback_content}
                      </div>
                    </div>
                  )}

                  {/* 학습 포인트 */}
                  {(lp.pitching || lp.batting || lp.bullpen || lp.general) && (
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-1"><TrendingUp size={10} className="text-yellow-400" /> 다음 경기 반영 학습포인트</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { key: 'pitching', label: '⚾ 투수진', value: lp.pitching },
                          { key: 'batting', label: '🏏 타선', value: lp.batting },
                          { key: 'bullpen', label: '🔥 불펜', value: lp.bullpen },
                          { key: 'general', label: '📌 기타', value: lp.general },
                        ].filter(i => i.value).map(item => (
                          <div key={item.key} className="bg-slate-900/40 rounded-xl p-3 border border-yellow-500/10">
                            <p className="text-[11px] font-bold text-yellow-400 mb-1">{item.label}</p>
                            <p className="text-xs text-slate-400 leading-relaxed">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 하단 배너 */}
      <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-emerald-900/30 to-slate-900/30 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <Zap size={24} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">오늘의 AI 분석 픽 확인하기</h4>
            <p className="text-slate-400 text-sm">복기 학습이 반영된 우제트 AI의 오늘 경기 예측을 확인하세요.</p>
          </div>
        </div>
        <Link href="/predictions" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 shrink-0">
          우제트 픽 보기 <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
