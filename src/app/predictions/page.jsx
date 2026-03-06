import { supabase } from '@/lib/supabase';
import { Award, TrendingUp, AlertCircle, Percent } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function PredictionsPage() {
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select(`
      *,
      game:game_id (
        id,
        status,
        game_date,
        stadium,
        home_score,
        away_score,
        home:home_team_id(id, name),
        away:away_team_id(id, name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          예측 데이터를 불러오는 데 실패했습니다. ({error.message})
        </div>
      </div>
    );
  }

  const upcomingPredictions = predictions?.filter(p => p.game?.status !== 'finished') || [];
  const pastPredictions = predictions?.filter(p => p.game?.status === 'finished') || [];

  const PredictionCard = ({ prediction, isPast = false }) => {
    const game = prediction.game;
    const homeWinProb = Number(prediction.home_win_prob);
    const awayWinProb = Number(prediction.away_win_prob);
    const isHomeFavored = homeWinProb > awayWinProb;
    
    // Determine accuracy for past games
    let isCorrect = null;
    if (isPast) {
      const homeWon = game.home_score > game.away_score;
      const predictedHomeWin = homeWinProb > awayWinProb;
      const isTie = game.home_score === game.away_score;
      if (!isTie) {
        isCorrect = homeWon === predictedHomeWin;
      }
    }

    return (
      <Link href={`/predictions/${prediction.id}`} className={`block bg-[#1E1E1E] rounded-xl border ${isPast ? 'border-gray-800 opacity-80' : 'border-[#1A237E]/50 hover:border-[#D32F2F]/70'} p-6 shadow-lg overflow-hidden relative group transition-all`}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {/* Status Badge */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="text-xs font-semibold px-2 py-1 rounded bg-gray-800 text-gray-400">
            {new Date(game.game_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric'})} • {game.stadium}
          </div>
          {isPast && isCorrect !== null && (
            <div className={`text-xs font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {isCorrect ? '적중' : '미적중'}
            </div>
          )}
          {!isPast && (
            <div className="text-xs font-bold px-2 py-1 rounded bg-[#D32F2F]/20 text-[#D32F2F] flex items-center gap-1">
               <TrendingUp size={12}/> AI 분석 완료
            </div>
          )}
        </div>

        {/* Teams & Scores */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col items-center w-1/3 text-center">
            <span className={`text-lg font-bold mb-1 ${!isHomeFavored && !isPast ? 'text-[#D32F2F]' : 'text-gray-300'}`}>
              {game.away?.name}
            </span>
            {isPast && <span className="text-2xl font-black text-gray-500">{game.away_score}</span>}
          </div>

          <div className="flex flex-col items-center justify-center w-1/3">
            <span className="text-sm font-bold text-gray-600 mb-1">VS</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
               예상: {prediction.predicted_score}
            </span>
          </div>

          <div className="flex flex-col items-center w-1/3 text-center">
            <span className={`text-lg font-bold mb-1 ${isHomeFavored && !isPast ? 'text-[#1A237E]' : 'text-gray-300'}`}>
              {game.home?.name}
            </span>
            {isPast && <span className="text-2xl font-black text-gray-500">{game.home_score}</span>}
          </div>
        </div>

        {/* Probability Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm font-bold mb-2">
            <span className={!isHomeFavored ? 'text-[#D32F2F]' : 'text-gray-500'}>{awayWinProb}%</span>
            <span className="text-gray-400 text-xs flex items-center gap-1"><Percent size={12}/> AI 승리 확률</span>
            <span className={isHomeFavored ? 'text-[#1A237E]' : 'text-gray-500'}>{homeWinProb}%</span>
          </div>
          <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-[#D32F2F] transition-all duration-1000 ease-out"
              style={{ width: `${awayWinProb}%` }}
            ></div>
            <div 
              className="h-full bg-gradient-to-l from-blue-600 to-[#1A237E] transition-all duration-1000 ease-out"
              style={{ width: `${homeWinProb}%` }}
            ></div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <Award className="h-8 w-8 text-[#D32F2F]" />
            우제트 픽 <span className="text-sm font-normal bg-[#D32F2F] text-white px-2 py-0.5 rounded mb-1 ml-1">Beta</span>
          </h1>
          <p className="text-gray-400">자체 머신러닝 알고리즘이 분석한 KBO 승부 예측 데이터입니다.</p>
        </div>
        <div className="text-sm text-gray-500 hidden md:block">
          Model: v1.0.0-mvp
        </div>
      </div>

      <div className="space-y-12">
        {/* Upcoming Predictions */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-[#1A237E]" /> 오늘의 예측 매치업
          </h2>
          {upcomingPredictions.length === 0 ? (
            <div className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-8 text-center text-gray-400">
              분석 대기중인 경기가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingPredictions.map(p => <PredictionCard key={p.id} prediction={p} />)}
            </div>
          )}
        </section>

        {/* Past Predictions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-300 mb-6">지난 예측 결과</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastPredictions.map(p => <PredictionCard key={p.id} prediction={p} isPast={true} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
