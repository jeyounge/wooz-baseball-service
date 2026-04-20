'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, RefreshCw, Trophy, Flame, AlertCircle } from 'lucide-react';

export default function WeeklyReviewPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const fetchLatestReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setReport(data);
    } catch (err) {
      console.error(err);
      setError('주간 리포트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const res = await fetch('/api/sync/weekly-report', { method: 'POST' });
      const result = await res.json();
      
      if (!res.ok || !result.success) {
         throw new Error(result.error || '동기화 실패');
      }
      
      if (result.status === 'already_exists') {
         alert('이번 주 리포트가 이미 존재합니다.');
      } else {
         alert('주간 리포트 분석이 완료되었습니다!');
         await fetchLatestReport();
      }
    } catch (err) {
      alert(err.message);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 pb-12">
        <div className="animate-spin text-fuchsia-500"><RefreshCw size={32} /></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/20">
                <TrendingUp size={20} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">KBO 주간 결산</h1>
            </div>
            <p className="text-slate-400 font-medium">지난 한 주간의 KBO 리그 흐름을 AI가 완벽하게 요약합니다.</p>
          </div>
          
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300 rounded-lg transition-colors border border-white/5"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'AI 분석 중...' : '최신 주간 동기화'}
          </button>
        </div>

        {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2 font-semibold">
              <AlertCircle size={18} /> {error}
            </div>
        )}

        {!report ? (
          <div className="w-full flex-col h-64 flex items-center justify-center bg-[#1A1E24] border border-white/5 rounded-2xl">
              <span className="text-slate-400 font-bold mb-4">아직 작성된 주간 리포트가 없습니다.</span>
              <button 
                onClick={handleSync}
                className="px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-fuchsia-600/30"
              >
                 최초 리포트 생성하기
              </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 타이틀 및 기간 */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-[#1A1E24] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
               <span className="inline-block px-3 py-1 bg-fuchsia-500/20 text-fuchsia-400 font-bold rounded-full text-xs mb-3 border border-fuchsia-500/20">
                  {report.year_week} ({report.start_date} ~ {report.end_date})
               </span>
               <h2 className="text-2xl md:text-3xl font-black text-white">{report.report_content?.title || '주간 KBO 분석 리포트'}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 왼쪽: 팀 순위 (크게) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-[#1A1E24] border border-white/5 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-6">
                    <Trophy className="text-amber-400" size={20} />
                    <h3 className="text-lg font-black text-white">주간 파워 랭킹</h3>
                  </div>
                  <div className="space-y-3">
                    {(report.report_content?.team_rankings || []).map((t, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row p-4 bg-slate-900/50 rounded-xl border border-white/5 gap-4 items-start md:items-center">
                        <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                          <span className={`text-2xl font-black w-8 text-center ${idx < 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {t.rank}
                          </span>
                          <span className="font-bold text-white w-20">{t.team}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded w-12 text-center
                             ${t.trend === '상승' ? 'bg-red-500/20 text-red-500' : 
                               t.trend === '하락' ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-700 text-slate-300'}`}>
                            {t.trend}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed md:ml-4">{t.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 하단: 주간 주요 이슈 */}
                <div className="bg-[#1A1E24] border border-white/5 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-6">
                    <AlertCircle className="text-red-400" size={20} />
                    <h3 className="text-lg font-black text-white">주간 KBO 핫 이슈</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {(report.report_content?.weekly_issues || []).map((issue, idx) => (
                        <div key={idx} className="p-4 bg-slate-900/50 rounded-xl border border-white/5 border-l-4 border-l-red-500">
                           <h4 className="font-bold text-white mb-2">{issue.issue}</h4>
                           <p className="text-sm text-slate-400 leading-relaxed">{issue.description}</p>
                        </div>
                     ))}
                  </div>
                </div>
              </div>

              {/* 오른쪽: 투타 핫 플레이어 */}
              <div className="flex flex-col gap-6">
                 
                 {/* 핫 타자 */}
                 <div className="bg-[#1A1E24] border border-white/5 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6">
                      <Flame className="text-orange-500" size={20} />
                      <h3 className="text-lg font-black text-white">주간 타자 MVP</h3>
                    </div>
                    <div className="space-y-4">
                       {(report.report_content?.hot_hitters || []).map((player, idx) => (
                          <div key={idx} className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                             <div className="flex items-baseline gap-2 mb-1">
                               <span className="font-black text-white text-lg">{player.name}</span>
                               <span className="text-xs font-bold text-slate-400">{player.team}</span>
                             </div>
                             <div className="text-orange-400 font-bold text-sm mb-2">{player.stats}</div>
                             <p className="text-xs text-slate-400 leading-relaxed">{player.reason}</p>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* 핫 투수 */}
                 <div className="bg-[#1A1E24] border border-white/5 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6">
                      <Flame className="text-blue-500" size={20} />
                      <h3 className="text-lg font-black text-white">주간 투수 MVP</h3>
                    </div>
                    <div className="space-y-4">
                       {(report.report_content?.hot_pitchers || []).map((player, idx) => (
                          <div key={idx} className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                             <div className="flex items-baseline gap-2 mb-1">
                               <span className="font-black text-white text-lg">{player.name}</span>
                               <span className="text-xs font-bold text-slate-400">{player.team}</span>
                             </div>
                             <div className="text-blue-400 font-bold text-sm mb-2">{player.stats}</div>
                             <p className="text-xs text-slate-400 leading-relaxed">{player.reason}</p>
                          </div>
                       ))}
                    </div>
                 </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}
