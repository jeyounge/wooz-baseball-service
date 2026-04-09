'use client';

import { Bot, Swords, User, Users, TrendingUp, Award } from 'lucide-react';

// 추천별 색상 매핑
const PRIORITY_COLORS = {
  priority_1: 'bg-indigo-500',
  priority_2: 'bg-emerald-500',
  priority_3: 'bg-amber-500'
};

export default function PredictionDetailView({ prediction }) {
  if (!prediction) return null;

  // 데이터 필드 정규화 (DB 저장 형식 vs API 응답 형식 대응)
  const conclusion = prediction.final_summary || prediction.conclusion || prediction.analysis_report?.summary;
  const sit = prediction.analysis_report?.situation || prediction.situation;
  const starter = prediction.analysis_report?.starting_pitcher || prediction.starter_pitcher;
  const bullpen = prediction.analysis_report?.bullpen || prediction.bullpen_pitcher;
  const bat = prediction.analysis_report?.batting || prediction.batting;

  return (
    <div className="bg-[#13161A] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Conclusion Banner */}
      <div className="bg-gradient-to-br from-[#1A237E]/40 to-[#000000] p-6 sm:p-8 border-b border-gray-800/80">
         <h2 className="text-xl text-blue-300 font-bold mb-3 flex items-center gap-2">
           <Bot size={24} /> Wooz AI 종합 분석
         </h2>
         <p className="text-gray-200 text-lg leading-relaxed font-medium">
           {conclusion}
         </p>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <Swords size={16} className="text-[#D32F2F]"/> 상황 (기세 및 분위기)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{sit}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <User size={16} className="text-blue-400"/> 투수 (선발)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{starter}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <Users size={16} className="text-purple-400"/> 투수 (계투)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{bullpen}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <TrendingUp size={16} className="text-green-400"/> 타격 감각
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{bat}</p>
          </div>
        </div>

        {/* Picks Area */}
        <div className="bg-[#1A1E24] p-6 rounded-xl border border-gray-700/50 mt-8">
          <h3 className="text-center font-black text-xl text-white mb-6 flex justify-center items-center gap-2 text-indigo-400 uppercase tracking-tighter italic">
            <Award className="text-yellow-500" /> 오늘 우제트의 추천 픽
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-[#13161A] border border-blue-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold uppercase">1st</div>
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                {prediction.home_win_prob > prediction.away_win_prob ? 'Home Adv' : 'Away Adv'}
              </span>
              <span className="text-white font-black text-lg group-hover:scale-110 transition-transform">
                {prediction.pick_1}
              </span>
            </div>

            <div className="bg-[#13161A] border border-purple-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold uppercase">2nd</div>
              <span className="text-purple-400 text-xs font-bold uppercase tracking-widest">
                Prob Score: {prediction.predicted_score}
              </span>
              <span className="text-white font-black text-lg group-hover:scale-110 transition-transform">
                {prediction.pick_2}
              </span>
            </div>

            <div className="bg-[#13161A] border border-green-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold uppercase">3rd</div>
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                High Value
              </span>
              <span className="text-white font-black text-lg group-hover:scale-110 transition-transform">
                {prediction.pick_3}
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
