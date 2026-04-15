import { supabase } from '@/lib/supabase';
import { BookOpen, AlertCircle } from 'lucide-react';
import ReviewTrigger from '@/components/review/ReviewTrigger';
import ReviewList from '@/components/review/ReviewList';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '우제트 AI 복기 아카이브 | WooZ Baseball',
  description: '우제트 AI의 경기 예측과 실제 결과를 대조한 복기 리포트 및 자기 학습 데이터를 확인하세요.',
};

export default async function ReviewPage() {
  // 1단계: predictions_feedback 단독 조회 (FK 조인 없이)
  const { data: feedbacks, error } = await supabase
    .from('predictions_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);

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

  // 3단계: JS에서 머지용 맵 생성
  const gameMap = {};
  (games || []).forEach(g => { gameMap[g.id] = g; });
  const predMap = {};
  (predictions || []).forEach(p => { predMap[p.game_id] = p; });
  const boxMap = {};
  (boxScores || []).forEach(b => { boxMap[b.game_id] = b; });

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

      {/* 복기 실행 패널 */}
      <ReviewTrigger />

      {/* 날짜 필터 + 통계 + 복기 리스트 (클라이언트 컴포넌트) */}
      {!feedbacks || feedbacks.length === 0 ? (
        <div className="bg-[#1A1E24] rounded-3xl border border-dashed border-slate-700 p-20 flex flex-col items-center text-center">
          <BookOpen size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-slate-400 mb-1">아직 복기 데이터가 없습니다.</h3>
          <p className="text-slate-600 text-sm">위 패널에서 복기 실행을 눌러주세요.</p>
        </div>
      ) : (
        <ReviewList
          feedbacks={feedbacks}
          gameMap={gameMap}
          predMap={predMap}
          boxMap={boxMap}
        />
      )}

      {/* 하단 배너 */}
      <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-emerald-900/30 to-slate-900/30 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <BookOpen size={24} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">오늘의 AI 분석 픽 확인하기</h4>
            <p className="text-slate-400 text-sm">복기 학습이 반영된 우제트 AI의 오늘 경기 예측을 확인하세요.</p>
          </div>
        </div>
        <a href="/predictions" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 shrink-0">
          우제트 픽 보기 →
        </a>
      </div>
    </div>
  );
}
