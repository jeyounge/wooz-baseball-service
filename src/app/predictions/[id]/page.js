import { supabase } from '@/lib/supabase';
import PredictionClient from './PredictionClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PredictionPage({ params }) {
  // In Next.js 14, params is an object directly. In 15, it's a promise.
  // Using React.use to unwrap if necessary safely is complex here, 
  // so we safely support both by checking if it resolves or if id is directly available.
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  // Fetch the game information for the header
  const { data: game, error } = await supabase
    .from('games')
    .select(`
      id, game_date, stadium, status, home_pitcher, away_pitcher,
      home:teams!home_team_id(id, name),
      away:teams!away_team_id(id, name)
    `)
    .eq('id', id)
    .single();

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-gray-400">
        <p>경기를 찾을 수 없습니다.</p>
        <Link href="/" className="mt-4 text-blue-400 underline inline-block">메인으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors w-fit">
        <ArrowLeft size={20} />
        매치업 목록으로 돌아가기
      </Link>
      
      {/* Game Header Area */}
      <div className="bg-[#1A1E24] rounded-t-xl border border-gray-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg border-b-0">
         <div className="flex flex-col items-center flex-1 w-full gap-2">
            <span className="text-2xl font-black text-gray-200">{game.away?.name}</span>
            <span className="text-sm px-3 py-1 bg-gray-800 text-gray-400 rounded-full">선발: {game.away_pitcher || '미정'}</span>
         </div>
         
         <div className="flex flex-col items-center justify-center p-4">
            <span className="text-sm font-bold text-gray-600 mb-1">{new Date(game.game_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
            <span className="text-2xl font-black italic text-gray-700">VS</span>
            <span className="text-xs text-gray-500 mt-2">{game.stadium}</span>
         </div>

         <div className="flex flex-col items-center flex-1 w-full gap-2">
            <span className="text-2xl font-black text-gray-200">{game.home?.name}</span>
            <span className="text-sm px-3 py-1 bg-gray-800 text-gray-400 rounded-full">선발: {game.home_pitcher || '미정'}</span>
         </div>
      </div>

      {/* Prediction Core */}
      <PredictionClient gameId={id} />
    </div>
  );
}
