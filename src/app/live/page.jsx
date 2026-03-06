import { supabase } from '@/lib/supabase';
import { Activity, Clock, MapPin, CheckCircle } from 'lucide-react';

export const revalidate = 0;

export default async function LiveCenterPage() {
  const { data: games, error } = await supabase
    .from('games')
    .select(`
      *,
      home:home_team_id(id, name),
      away:away_team_id(id, name)
    `)
    .order('status', { ascending: true }) // live -> scheduled -> finished
    .order('game_date', { ascending: false });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg">
          경기 정보를 불러오는 데 실패했습니다. ({error.message})
        </div>
      </div>
    );
  }

  const liveGames = games?.filter(g => g.status === 'live');
  const finishedGames = games?.filter(g => g.status === 'finished');
  const scheduledGames = games?.filter(g => g.status === 'scheduled');

  const GameCard = ({ game }) => {
    let statusConfig = { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-800', label: '예정' };
    
    if (game.status === 'live') {
      statusConfig = { icon: Activity, color: 'text-[#D32F2F]', bg: 'bg-[#D32F2F]/20', label: '진행중' };
    } else if (game.status === 'finished') {
      statusConfig = { icon: CheckCircle, color: 'text-[#1A237E]', bg: 'bg-[#1A237E]/20', label: '종료' };
    }
    
    const Icon = statusConfig.icon;

    return (
      <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 shadow-lg relative overflow-hidden group hover:border-[#D32F2F]/50 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin size={14} />
            <span>{game.stadium}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
            <Icon size={12} className={game.status === 'live' ? 'animate-pulse' : ''} />
            {statusConfig.label}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex flex-col items-center">
            {/* Away Team */}
            <h3 className="text-lg font-bold text-gray-300">{game.away?.name || 'Away'}</h3>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <span className={`text-3xl font-black ${game.status !== 'scheduled' ? 'text-white' : 'text-gray-600'}`}>
              {game.status !== 'scheduled' ? game.away_score : '-'}
            </span>
            <span className="text-gray-600 font-bold">:</span>
            <span className={`text-3xl font-black ${game.status !== 'scheduled' ? 'text-white' : 'text-gray-600'}`}>
              {game.status !== 'scheduled' ? game.home_score : '-'}
            </span>
          </div>

          <div className="flex flex-col items-center">
             {/* Home Team */}
            <h3 className="text-lg font-bold text-gray-300">{game.home?.name || 'Home'}</h3>
          </div>
        </div>
        
        {game.status === 'scheduled' && (
          <div className="mt-6 text-center text-sm text-gray-500 font-medium">
            {new Date(game.game_date).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })} 시작
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
          <Activity className="h-8 w-8 text-[#D32F2F]" />
          라이브 센터
        </h1>
        <p className="text-gray-400">실시간 KBO 경기 스코어보드를 확인하세요.</p>
      </div>

      <div className="space-y-12">
        {liveGames?.length > 0 && (
          <section>
             <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-800 pb-2 text-[#D32F2F] flex items-center gap-2">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D32F2F] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D32F2F]"></span>
                </span>
                진행중인 경기
             </h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {liveGames.map(game => <GameCard key={game.id} game={game} />)}
             </div>
          </section>
        )}

        {scheduledGames?.length > 0 && (
          <section>
             <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-800 pb-2 text-gray-300">예정된 경기</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {scheduledGames.map(game => <GameCard key={game.id} game={game} />)}
             </div>
          </section>
        )}

        {finishedGames?.length > 0 && (
          <section>
             <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-800 pb-2 text-gray-300">종료된 경기</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
               {finishedGames.map(game => <GameCard key={game.id} game={game} />)}
             </div>
          </section>
        )}
      </div>
    </div>
  );
}
