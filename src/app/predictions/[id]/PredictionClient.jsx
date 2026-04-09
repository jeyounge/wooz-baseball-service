'use client';

import { useState, useEffect } from 'react';
import { Bot, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import PredictionDetailView from '@/components/predictions/PredictionDetailView';

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
      const startTime = Date.now();
      try {
        setLoading(true);
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId }),
        });
        const result = await response.json();
        
        if (!isMounted) return;

        // 최소 2초는 분석 중 화면을 보여주기 위한 지연 시간 계산
        const duration = Date.now() - startTime;
        const minDelay = 1500; 
        if (duration < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - duration));
        }

        if (result.error) {
          if (result.error === 'AI_BUSY') {
            setErrorCode('AI_BUSY');
            setError('분석 요청이 많아 지연되고 있습니다.');
            setRetryCountdown(10);
          } else {
            // 상세 에러(details)가 있으면 함께 표시
            const detailMsg = result.details ? `: ${result.details}` : '';
            setErrorCode(result.error);
            setError(`${result.error}${detailMsg}`);
          }
        } else {
          setPrediction(result.data);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || '알 수 없는 로딩 오류가 발생했습니다.');
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

  if (loading) {
    return (
      <div className="bg-[#1A1E24] border border-gray-800 rounded-b-xl p-20 flex flex-col items-center justify-center min-h-[400px] gap-6 text-center">
        <div className="relative mb-2">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={24} />
        </div>
        <h2 className="text-xl font-bold text-white underline decoration-indigo-500/50 underline-offset-8">우제트 AI 전문가 분석 중...</h2>
        <p className="text-slate-400 text-sm">실시간 데이터와 전용 추론 로직을 가동하고 있습니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1A1E24] border border-gray-800 rounded-b-xl p-8 flex flex-col items-center justify-center min-h-[400px] gap-8 text-center animate-in fade-in duration-500">
        {errorCode === 'AI_BUSY' ? (
          <>
            <div className="relative">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <Bot size={48} className="text-yellow-500 opacity-80" />
              </div>
              <AlertCircle size={24} className="text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">AI 엔진 일시적 과부하</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                현재 분석 요청이 몰려 엔진이 매우 바쁩니다.<br/>
                잠시 후 다시 시도해 주세요.
              </p>
            </div>
            <button
              onClick={handleRetry}
              disabled={retryCountdown > 0}
              className={`px-10 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                retryCountdown > 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
              }`}
            >
              {retryCountdown > 0 ? `${retryCountdown}초 후 재시도` : '지금 다시 분석하기'}
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white">분석 리포트 로딩 실패</h3>
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                 <p className="text-red-400 text-sm font-medium">{error}</p>
                 {errorCode && <p className="text-red-500/50 text-[10px] mt-1 font-mono uppercase tracking-tighter">ERROR_CODE: {errorCode}</p>}
              </div>
              <button 
                onClick={handleRetry}
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors py-2 px-4 rounded-xl hover:bg-white/5"
              >
                다시 시도하기
              </button>
            </div>
          </>
        )}
        <Link href="/predictions" className="text-slate-500 text-sm font-bold hover:text-slate-300 transition-colors">
          우제트 픽 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return <PredictionDetailView prediction={prediction} />;
}
