import { supabase } from '@/lib/supabase';
import { ArrowLeft, BrainCircuit, Activity, Users, Zap, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function PredictionDetailPage({ params }) {
  const { id } = await params;

  const { data: prediction, error } = await supabase
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
    .eq('id', id)
    .single();

  if (error || !prediction) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-white">
        예측 정보를 찾을 수 없습니다.
        <br/>
        <Link href="/predictions" className="text-[#1A237E] underline mt-4 inline-block">목록으로 돌아가기</Link>
      </div>
    );
  }

  const game = prediction.game;
  const homeWinProb = Number(prediction.home_win_prob);
  const awayWinProb = Number(prediction.away_win_prob);
  const isHomeFavored = homeWinProb > awayWinProb;
  const favoredTeam = isHomeFavored ? game.home.name : game.away.name;

  // Mock Analysis Data Generation (In real app, this comes from the DB prediction record)
  const getMockAnalysis = () => {
    return {
      situation: `최근 10경기 흐름을 보았을 때, ${favoredTeam}의 연승 기세가 매우 매섭습니다. 반면 상대 팀은 투타 밸런스 붕괴로 3연패 늪에 빠져 있어 분위기 반전이 절실한 상황입니다. 홈/원정 스플릿 데이터에서도 ${favoredTeam}의 우세가 점쳐집니다.`,
      pitching: `양 팀 선발투수의 최근 3경기 구위와 상대 전적을 바탕으로 분석한 결과, ${favoredTeam}의 선발투수가 이닝 소화력 및 위기 관리 능력에서 월등히 앞섭니다. 특히 상대 중심 타선 피안타율이 0.180대에 불과합니다.`,
      bullpen: `불펜 평균자책점(ERA) 및 기출루자 득점 허용률(IRS) 데이터 분석 결과, 전반적인 계투진의 안정감은 팽팽하나 필승조의 최근 혹사 지수가 상대 팀 쪽에 더 높게 나타나 후반부 득점 확률이 벌어질 것으로 보입니다.`,
      batting: `타선 집중력 지표(OPS, WPA)에서 ${favoredTeam}가 압도적입니다. 테이블세터의 출루율이 상승 곡선을 그리고 있으며, 클러치 상황에서의 팀 배팅 능력이 승부를 결정지을 핵심 요소입니다.`,
      summary: `**${favoredTeam}의 우세가 예상됩니다.** 선발 투수의 안정감과 타선의 응집력 차이가 최종 ${prediction.predicted_score} 스코어를 만들어낼 확률이 ${Math.max(homeWinProb, awayWinProb)}% 입니다.`
    };
  };

  const analysis = getMockAnalysis();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/predictions" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} className="mr-2" /> 목록으로 돌아가기
      </Link>

      {/* Header Section */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-gray-800 p-8 shadow-xl mb-8">
        <div className="text-center mb-6">
          <div className="text-sm font-semibold px-3 py-1 bg-gray-800 rounded-full inline-block text-gray-300 mb-4">
            {new Date(game.game_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short'})} 
            {' • '} {game.stadium}
          </div>
          <h1 className="text-3xl font-black text-white flex justify-center items-center gap-4">
            <span>{game.away.name}</span>
            <span className="text-gray-600 text-lg mx-2">VS</span>
            <span>{game.home.name}</span>
          </h1>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-[#121212] rounded-xl p-6 border border-gray-800/50">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">AI 예상 스코어</p>
            <p className="text-4xl font-black text-white px-6 py-2 bg-gray-800 rounded-xl border border-gray-700">
              {prediction.predicted_score}
            </p>
          </div>
          <div className="h-16 w-px bg-gray-800 hidden md:block"></div>
          <div className="flex-1 w-full max-w-sm">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className={!isHomeFavored ? 'text-[#D32F2F]' : 'text-gray-500'}>{game.away.name} {awayWinProb}%</span>
              <span className={isHomeFavored ? 'text-[#1A237E]' : 'text-gray-500'}>{game.home.name} {homeWinProb}%</span>
            </div>
            <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-red-600 to-[#D32F2F]" style={{ width: `${awayWinProb}%` }}></div>
              <div className="h-full bg-gradient-to-l from-blue-600 to-[#1A237E]" style={{ width: `${homeWinProb}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Details Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white mb-6">
          <BrainCircuit className="text-[#D32F2F]" /> AI 분석 리포트
        </h2>

        {/* Situation */}
        <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 flex gap-4 items-start hover:border-gray-600 transition-colors">
          <div className="p-3 bg-gray-800 rounded-lg text-gray-300 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">현재 상황 및 기세</h3>
            <p className="text-gray-400 leading-relaxed">{analysis.situation}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pitching */}
          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 flex flex-col hover:border-gray-600 transition-colors">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-gray-800 rounded-md"><Users size={16} className="text-blue-400" /></span> 
              선발 투수 
            </h3>
            <p className="text-gray-400 leading-relaxed text-sm flex-1">{analysis.pitching}</p>
          </div>

          {/* Bullpen */}
          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 flex flex-col hover:border-gray-600 transition-colors">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-gray-800 rounded-md"><Users size={16} className="text-emerald-400" /></span> 
              계투진
            </h3>
            <p className="text-gray-400 leading-relaxed text-sm flex-1">{analysis.bullpen}</p>
          </div>
        </div>

        {/* Batting */}
        <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 flex gap-4 items-start hover:border-gray-600 transition-colors">
          <div className="p-3 bg-gray-800 rounded-lg text-amber-400 shrink-0">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">타격 및 집중력</h3>
            <p className="text-gray-400 leading-relaxed">{analysis.batting}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-[#1A237E]/20 to-[#D32F2F]/20 rounded-xl border border-gray-700 p-6 flex gap-4 items-start shadow-lg mt-8">
          <div className="p-3 bg-black/30 rounded-full text-white shrink-0">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white mb-2">AI 총평</h3>
            {/* Simple markdown parsing for bold text */}
            <p className="text-gray-200 text-lg leading-relaxed font-medium">
              {analysis.summary.split('**').map((text, i) => 
                i % 2 === 1 ? <span key={i} className="text-white font-black">{text}</span> : text
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
