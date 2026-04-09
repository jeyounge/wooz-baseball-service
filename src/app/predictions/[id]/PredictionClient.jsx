'use client';

import { useState, useEffect } from 'react';
import { Bot, Swords, TrendingUp, User, Users, CheckCircle2, Award, AlertCircle } from 'lucide-react';

// 추천별 색상 매핑
const PRIORITY_COLORS = {
  priority_1: 'bg-indigo-500',
  priority_2: 'bg-emerald-500',
  priority_3: 'bg-amber-500'
};

export default function PredictionClient({ gameId }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchPrediction() {
      try {
        setLoading(true);
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId }),
        });
        const result = await response.json();
        
        if (!isMounted) return;

        if (result.error) {
          if (result.error === 'AI_BUSY') {
            setErrorCode('AI_BUSY');
            setError('분석 요청이 많아 지연되고 있습니다.');
            setRetryCountdown(10);
          } else {
            throw new Error(result.error);
          }
        } else {
          setPrediction(result.data);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('분석 데이터를 불러오는데 실패했습니다.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPrediction();
    return () => { isMounted = false; };
  }, [gameId, retryCount]);

  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  const handleRetry = () => {
    setError(null);
    setErrorCode(null);
    setRetryCount(prev => prev + 1);
  };

  // 렌더링 도우미: 분석 카드
  const AnalysisCard = ({ title, content, icon }) => (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-indigo-500/30 transition-all">
      <div className="flex items-center gap-2 mb-3 text-indigo-400">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-slate-100">{title}</h3>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );

  // 렌더링 도우미: 추천 픽 카드
  const PickCard = ({ title, data, type }) => (
    <div className="bg-slate-800/80 rounded-2xl p-6 border-l-4 border-l-indigo-500 shadow-lg mb-4">
      <div className="flex justify-between items-start mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${PRIORITY_COLORS[type]} text-white`}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-tighter">Confidence</span>
          <span className="text-lg font-black text-indigo-400 font-mono">{data?.confidence}</span>
        </div>
      </div>
      <div className="text-2xl font-black text-white mb-2">{data?.pick}</div>
      <p className="text-slate-400 text-sm">{data?.description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-500 text-xl tracking-tighter">WOOZ</div>
        </div>
        <h2 className="text-2xl font-black text-white mb-2 underline decoration-indigo-500/50 underline-offset-8">우제트 AI 전문가 분석 중...</h2>
        <p className="text-slate-400">실시간 KBO 데이터와 PhD 수준의 독자적인 추론 로직을 가동하고 있습니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1A1E24] border border-gray-800 rounded-b-xl p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 text-center">
        {errorCode === 'AI_BUSY' ? (
          <>
            <div className="relative">
              <Bot size={56} className="text-yellow-500 opacity-50" />
              <AlertCircle size={24} className="text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">AI 엔진 과부하 안내</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                현재 분석 요청이 많아 모든 AI 엔진이 바쁩니다.<br/>
                잠시 후 다시 시도해 주세요.
              </p>
            </div>
            
            <button
              onClick={handleRetry}
              disabled={retryCountdown > 0}
              className={`px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 ${
                retryCountdown > 0 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95'
              }`}
            >
              {retryCountdown > 0 ? `${retryCountdown}초 후 재시도 가능` : '지금 다시 분석하기'}
            </button>
          </>
        ) : (
          <>
            <AlertCircle size={48} className="text-red-500" />
            <div className="space-y-2">
              <p className="text-gray-300 font-medium">{error}</p>
              <button 
                onClick={handleRetry}
                className="text-blue-400 hover:text-blue-300 underline text-sm"
              >
                다시 시도하기
              </button>
            </div>
          </>
        )}
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
           {prediction.final_summary}
         </p>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <Swords size={16} className="text-[#D32F2F]"/> 상황 (기세 및 분위기)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.analysis_report?.situation}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <User size={16} className="text-blue-400"/> 투수 (선발)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.analysis_report?.starting_pitcher}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <Users size={16} className="text-purple-400"/> 투수 (계투)
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.analysis_report?.bullpen}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
              <TrendingUp size={16} className="text-green-400"/> 타격 감각
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{prediction.analysis_report?.batting}</p>
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
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                {prediction.recommendations?.priority_1?.confidence}% 신뢰
              </span>
              <span className="text-white font-black text-lg group-hover:scale-105 transition-transform">
                {prediction.recommendations?.priority_1?.pick}
              </span>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{prediction.recommendations?.priority_1?.description}</p>
            </div>

            <div className="bg-[#13161A] border border-purple-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">2순위</div>
               <span className="text-purple-400 text-xs font-bold uppercase tracking-widest">
                {prediction.recommendations?.priority_2?.confidence}% 신뢰
              </span>
              <span className="text-white font-black text-lg group-hover:scale-105 transition-transform">
                {prediction.recommendations?.priority_2?.pick}
              </span>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{prediction.recommendations?.priority_2?.description}</p>
            </div>

            <div className="bg-[#13161A] border border-green-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">3순위</div>
               <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                {prediction.recommendations?.priority_3?.confidence}% 신뢰
              </span>
              <span className="text-white font-black text-lg group-hover:scale-105 transition-transform">
                {prediction.recommendations?.priority_3?.pick}
              </span>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{prediction.recommendations?.priority_3?.description}</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
