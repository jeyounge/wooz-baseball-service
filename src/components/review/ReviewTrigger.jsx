'use client';

import { useState } from 'react';
import { Play, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ReviewTrigger() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runReview = async (mode) => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const url = mode === 'all'
        ? '/api/sync/kbo-feedback?all=true'
        : `/api/sync/kbo-feedback`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || '알 수 없는 오류');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1E24] rounded-3xl border border-yellow-500/20 p-6 mb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">
            <RefreshCw size={16} /> 복기 실행 패널
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">예측 분석된 경기의 복기를 수동으로 실행합니다.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => runReview('yesterday')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            어제 경기 복기
          </button>
          <button
            onClick={() => runReview('all')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-yellow-900/30"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            미처리 전체 소급 실행
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/60 rounded-xl p-4">
          <Loader2 size={16} className="animate-spin text-yellow-400" />
          AI가 경기 기록을 수집하고 복기 분석 중입니다... (경기 수에 따라 1~3분 소요)
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="bg-slate-900/60 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-bold mb-3">
            <CheckCircle size={16} /> 복기 실행 완료
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: '성공', value: result.summary?.success ?? 0, color: 'text-emerald-400' },
              { label: '캐시(스킵)', value: result.summary?.cached ?? 0, color: 'text-blue-400' },
              { label: '예측없음', value: result.summary?.skipped ?? 0, color: 'text-slate-400' },
              { label: '실패', value: result.summary?.failed ?? 0, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="text-center bg-slate-800/60 rounded-lg p-2">
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
          {result.message && <p className="text-xs text-slate-400">{result.message}</p>}
          {result.logs && result.logs.length > 0 && (
            <details className="mt-2">
              <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300">상세 로그 보기</summary>
              <div className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                {result.logs.map((log, i) => (
                  <p key={i} className={`text-[10px] font-mono ${log.includes('FAILED') ? 'text-red-400' : 'text-slate-500'}`}>{log}</p>
                ))}
              </div>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <RefreshCw size={12} /> 페이지 새로고침해서 결과 확인
          </button>
        </div>
      )}
    </div>
  );
}
