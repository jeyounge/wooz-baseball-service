'use client';

import { useState, useEffect } from 'react';
import { Bot, Swords, TrendingUp, User, Users, CheckCircle2, Award, AlertCircle } from 'lucide-react';

export default function PredictionClient({ gameId }) {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const loadingMessages = [
    "상대 전적 및 최근 기세를 분석 중입니다...",
    "양 팀 선발 투수의 데이터를 비교 중입니다...",
    "주요 불펜과 타격 지표를 종합하고 있습니다...",
    "Wooz AI의 최종 승부 예측을 생성 중입니다..."
  ];

  useEffect(() => {
    let msgInterval;
    if (loading) {
      msgInterval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 1000);
    }
    return () => clearInterval(msgInterval);
  }, [loading]);

  useEffect(() => {
    async function fetchPrediction() {
      try {
        // Enforce fake loading UI constraint 
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3500));
        
        // Background AI Task / DB Check
        const apiCall = fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId })
        }).then(res => res.json());

        const [, result] = await Promise.all([minLoadingTime, apiCall]);

        if (result.error) {
          throw new Error(result.error);
        }

        setPrediction(result.data);
      } catch (err) {
        console.error(err);
        setError('분석 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchPrediction();
  }, [gameId]);

  if (error) {
    return (
      <div className="bg-[#1A1E24] border border-red-900/50 rounded-b-xl p-8 flex flex-col items-center justify-center text-red-400 gap-4 min-h-[400px]">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (loading || !prediction) {
    return (
      <div className="bg-[#1A1E24] border border-gray-800 rounded-b-xl p-8 flex flex-col items-center justify-center text-gray-300 min-h-[400px] gap-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
        
        <Bot size={56} className="text-blue-400 animate-bounce" />
        <div className="text-xl font-bold tracking-tight z-10 transition-all duration-300">
          {loadingMessages[loadingStep]}
        </div>
        <div className="w-64 bg-gray-800 h-2 rounded-full overflow-hidden mt-2 z-10">
           <div className="bg-blue-500 h-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: "30%" }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#13161A] border-l border-r border-b border-gray-800 rounded-b-xl overflow-hidden">
      
      {/* Conclusion Banner */}
      <div className="bg-gradient-to-br from-[#1A237E]/40 to-[#000000] p-6 sm:p-8 border-b border-gray-800/80">
         <h2 className="text-xl text-blue-300 font-bold mb-3 flex items-center gap-2">
           <Bot size={24} /> Wooz AI 종합 분석
         </h2>
         <p className="text-gray-200 text-lg leading-relaxed font-medium">
           {prediction.conclusion}
         </p>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <Swords size={16} className="text-[#D32F2F]"/> 상황 (기세 및 분위기)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.situation}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <User size={16} className="text-blue-400"/> 투수 (선발)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.starter_pitcher}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <Users size={16} className="text-purple-400"/> 투수 (계투)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.bullpen}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <TrendingUp size={16} className="text-green-400"/> 타격 감각
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.batting}</p>
          </div>
        </div>

        {/* Picks Area */}
        <div className="bg-[#1A1E24] p-6 rounded-xl border border-gray-700/50 mt-8">
          <h3 className="text-center font-black text-xl text-white mb-6 flex justify-center items-center gap-2">
            <Award className="text-yellow-500" /> 오늘의 추천 PICK!
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-[#13161A] border border-blue-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">1순위</div>
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Primary Pick</span>
              <span className="text-white font-black text-lg group-hover:scale-105 transition-transform">{prediction.pick_1}</span>
            </div>

            <div className="bg-[#13161A] border border-purple-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">2순위</div>
              <span className="text-purple-400 text-xs font-bold uppercase tracking-widest">Secondary Pick</span>
              <span className="text-white font-black text-lg group-hover:scale-105 transition-transform">{prediction.pick_2}</span>
            </div>

            <div className="bg-[#13161A] border border-green-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">3순위</div>
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest">Alternative Pick</span>
              <span className="text-white font-black text-lg group-hover:scale-105 transition-transform">{prediction.pick_3}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
