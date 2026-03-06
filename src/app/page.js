import DashboardGrid from '@/components/layout/DashboardGrid';
import Link from 'next/link';
import { Award, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <DashboardGrid>
      <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">오늘의 주요 경기</h1>
        <p className="text-gray-400">AI가 예측한 오늘의 KBO 승부 결과를 확인하세요.</p>
      </div>

      {/* Widget Placeholder 1: Matchup (Future Prediction Phase) */}
      <Link href="/predictions" className="col-span-1 lg:col-span-2 bg-gradient-to-br from-[#1E1E1E] to-[#1A237E]/20 rounded-xl border border-[#1A237E]/30 hover:border-[#1A237E] p-6 flex flex-col justify-between h-64 shadow-lg relative overflow-hidden group transition-all">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Award size={100} />
        </div>
        <div>
           <div className="text-xs font-bold px-2 py-1 rounded bg-[#1A237E] text-white inline-flex items-center gap-1 mb-2">
             <TrendingUp size={12}/> AI PREVIEW
           </div>
           <h3 className="text-2xl font-bold text-white mb-1">오늘의 매치업 프리뷰</h3>
           <p className="text-gray-400 text-sm">팀 전력, 선발 투수, 최근 흐름 기반 예측</p>
        </div>
        <div className="flex justify-end text-sm text-[#1A237E] font-bold group-hover:underline">
          자세히 보기 →
        </div>
      </Link>

      {/* Widget Placeholder 2: Predictions (Future Prediction Phase) */}
      <Link href="/predictions" className="col-span-1 bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 flex flex-col items-center justify-center h-64 shadow-lg border-t-4 border-t-[#D32F2F] hover:bg-gray-800/80 transition-all cursor-pointer group">
        <Award className="w-12 h-12 text-[#D32F2F] mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-xl font-bold text-white mb-1">우제트 픽</h3>
        <p className="text-gray-400 text-sm text-center">AI 승리 확률 분석<br/>결과 보러가기</p>
      </Link>

      {/* Live Center Widget */}
      <Link href="/live" className="col-span-1 bg-[#1A237E]/10 hover:bg-[#1A237E]/20 rounded-xl border border-[#1A237E]/30 hover:border-[#1A237E] p-6 flex flex-col items-center justify-center h-64 shadow-lg transition-all group">
        <div className="w-12 h-12 rounded-full bg-[#1A237E]/20 flex items-center justify-center mb-4 text-[#1A237E]">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D32F2F] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#D32F2F]"></span>
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">라이브 스코어보드</h3>
        <p className="text-sm text-gray-400 text-center">현재 진행중인 KBO 경기</p>
      </Link>
      
      {/* Standings Widget */}
      <Link href="/standings" className="col-span-1 md:col-span-2 lg:col-span-4 bg-[#1E1E1E] hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-gray-600 p-6 flex flex-col items-center justify-center h-32 md:h-48 shadow-lg transition-all mt-4">
        <h3 className="text-xl font-bold text-white mb-2">2026 KBO 정규시즌 순위표</h3>
        <p className="text-gray-400">팀별 실시간 순위 및 승률 보러가기 →</p>
      </Link>
    </DashboardGrid>
  );
}
