'use client';

import { useState, useMemo } from 'react';
import { CalendarDays, CheckCircle, XCircle, BookOpen, TrendingUp, BarChart2, Zap, Target, Star } from 'lucide-react';

function formatDateLabel(dateStr) {
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
    <div className={`flex justify-between items-center py-1.5 border-b border-white/5 last:border-0`}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value !== undefined && value !== null ? `${value}${unit}` : '-'}
      </span>
    </div>
  );
}

function BoxScoreCard({ title, starterStats, battingStats, accentColor = 'blue' }) {
  const colors = {
    blue: { border: 'border-blue-500/20', label: 'text-blue-400' },
    rose: { border: 'border-rose-500/20', label: 'text-rose-400' }
  };
  const c = colors[accentColor];

  return (
    <div className={`bg-[#111418] rounded-2xl border ${c.border} p-4 space-y-4`}>
      <h4 className={`text-xs font-extrabold uppercase tracking-widest ${c.label}`}>{title}</h4>
      {starterStats && (
        <div>
          <div className={`text-[10px] font-bold ${c.label} mb-2 flex items-center gap-1`}>
            <Target size={10} /> 선발: {starterStats.name || '-'}
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
      {battingStats && (
        <div>
          <div className={`text-[10px] font-bold ${c.label} mb-2 flex items-center gap-1`}><BarChart2 size={10} /> 타선</div>
          <div className={`rounded-xl border ${c.border} p-3`}>
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

export default function ReviewList({ feedbacks, gameMap, predMap, boxMap }) {
  const [selectedDate, setSelectedDate] = useState('all');

  // 날짜 목록 추출 (최신순)
  const dates = useMemo(() => {
    const dateSet = new Set();
    feedbacks.forEach(fb => {
      const game = gameMap[fb.game_id];
      if (game?.game_date) {
        dateSet.add(game.game_date.split('T')[0]);
      }
    });
    return ['all', ...Array.from(dateSet).sort((a, b) => b.localeCompare(a))];
  }, [feedbacks, gameMap]);

  // 날짜 필터 적용
  const filtered = useMemo(() => {
    if (selectedDate === 'all') return feedbacks;
    return feedbacks.filter(fb => {
      const game = gameMap[fb.game_id];
      return game?.game_date?.startsWith(selectedDate);
    });
  }, [feedbacks, gameMap, selectedDate]);

  // 필터된 데이터 기준 통계 계산
  // 적중률 = pick_1_correct 기준 (1순위가 맞으면 적중)
  const totalReviews = filtered.length;
  const pick1HitCount = filtered.filter(f => f.pick_1_correct).length;
  const pick2HitCount = filtered.filter(f => f.pick_2_correct).length;
  const hitRate = totalReviews > 0 ? Math.round((pick1HitCount / totalReviews) * 100) : 0;
  const pick2Rate = totalReviews > 0 ? Math.round((pick2HitCount / totalReviews) * 100) : 0;
  const avgConfidence = totalReviews > 0
    ? Math.round(filtered.reduce((s, f) => s + (f.confidence_score || 0), 0) / totalReviews)
    : 0;

  return (
    <>
      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '복기 경기 수', value: `${totalReviews}`, unit: '경기', icon: <CalendarDays size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '1순위 픽 적중률', value: `${hitRate}`, unit: '%', icon: <Star size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '2순위 픽 적중률', value: `${pick2Rate}`, unit: '%', icon: <Target size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
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

      {/* 날짜 필터 탭 */}
      <div className="flex gap-2 flex-wrap mb-8 pb-4 border-b border-white/5">
        {dates.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDate === d
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {d === 'all' ? `전체 (${feedbacks.length})` : `${d.replace(/-/g, '.')} (${feedbacks.filter(fb => gameMap[fb.game_id]?.game_date?.startsWith(d)).length})`}
          </button>
        ))}
      </div>

      {/* 복기 리스트 */}
      {filtered.length === 0 ? (
        <div className="bg-[#1A1E24] rounded-3xl border border-dashed border-slate-700 p-20 flex flex-col items-center text-center">
          <BookOpen size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-slate-400 mb-1">해당 날짜 복기 데이터가 없습니다.</h3>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map(fb => {
            const game = gameMap[fb.game_id];
            const pred = predMap[fb.game_id];
            const box = boxMap[fb.game_id];
            const homeName = game?.home?.name?.split(' ')[0] || '-';
            const awayName = game?.away?.name?.split(' ')[0] || '-';
            const lp = fb.learning_points || {};
            // 적중 여부는 1순위 픽 기준
            const isHit = fb.pick_1_correct;

            return (
              <div key={fb.id} className={`bg-[#1A1E24] rounded-3xl border overflow-hidden shadow-2xl ${isHit ? 'border-emerald-500/20 shadow-emerald-900/10' : 'border-red-500/10 shadow-red-900/5'}`}>

                {/* 카드 헤더 */}
                <div className={`flex items-center justify-between px-6 py-4 border-b border-white/5 ${isHit ? 'bg-emerald-900/20' : 'bg-red-900/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isHit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {isHit ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{formatDateLabel(game?.game_date)}</p>
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
                        {fb.confidence_score != null && (
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
                        <BoxScoreCard title={`${awayName} (원정)`} starterStats={box.away_starter_stats} battingStats={box.away_batting_stats} accentColor="rose" />
                        <BoxScoreCard title={`${homeName} (홈)`} starterStats={box.home_starter_stats} battingStats={box.home_batting_stats} accentColor="blue" />
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
    </>
  );
}
