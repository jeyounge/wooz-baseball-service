import { supabase } from '@/lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, MapPin } from 'lucide-react';
import Link from 'next/link';
import ScrollToToday from './ScrollToToday';

export const dynamic = 'force-dynamic';

function getKstDate() {
  const d = new Date();
  d.setHours(d.getHours() + 9);
  return d;
}

export default async function SchedulePage({ searchParams }) {
  const params = await searchParams;
  const todayKst = getKstDate();
  
  const currentYear = params?.year ? parseInt(params.year) : todayKst.getFullYear();
  const currentMonth = params?.month ? parseInt(params.month) : (todayKst.getMonth() + 1);

  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00+09:00`;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const endDate = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`;

  const { data: games, error } = await supabase
    .from('games')
    .select(`*, home:home_team_id(id, name), away:away_team_id(id, name)`)
    .gte('game_date', startDate)
    .lt('game_date', endDate)
    .order('game_date', { ascending: true });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> 일정 데이터를 불러오는 데 실패했습니다. ({error.message})
        </div>
      </div>
    );
  }

  // Sync Logic: If we are viewing the current month, sync for today and yesterday
  if (currentYear === todayKst.getFullYear() && currentMonth === (todayKst.getMonth() + 1)) {
    const { syncGameStatusWithKbo } = await import('@/lib/kbo-sync');
    
    // Calculate yesterday's date string
    const yesterday = new Date(todayKst);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + 
                         String(yesterday.getMonth() + 1).padStart(2, '0') + 
                         String(yesterday.getDate()).padStart(2, '0');
    const todayStr = todayKst.getFullYear() + 
                     String(todayKst.getMonth() + 1).padStart(2, '0') + 
                     String(todayKst.getDate()).padStart(2, '0');

    await syncGameStatusWithKbo(games, yesterdayStr);
    await syncGameStatusWithKbo(games, todayStr);
  }

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const nextMonthLink = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYearLink = currentMonth === 12 ? currentYear + 1 : currentYear;

  const gamesByDate = {};
  if (games) {
    games.forEach(game => {
      // Use toLocaleDateString to get the date parts in KST
      const d = new Date(game.game_date);
      const year = d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Seoul' });
      const month = d.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Seoul' });
      const day = d.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Seoul' });
      const dateKey = `${year}-${month}-${day}`;
      if (!gamesByDate[dateKey]) gamesByDate[dateKey] = [];
      gamesByDate[dateKey].push(game);
    });
  }

  const sortedDates = Object.keys(gamesByDate).sort();
  
  // Format today's date prefix for scrolling
  const todayKey = `${todayKst.getFullYear()}-${String(todayKst.getMonth() + 1).padStart(2, '0')}-${String(todayKst.getDate()).padStart(2, '0')}`;
  // Only scroll if we are looking at the current month
  const shouldScroll = (currentYear === todayKst.getFullYear() && currentMonth === (todayKst.getMonth() + 1));

  return (
    <div className="container mx-auto px-4 py-8">
      {shouldScroll && <ScrollToToday todayKey={todayKey} />}

      <div className="mb-8 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
          <Calendar className="h-8 w-8 text-[#1A237E]" />
          KBO 정규시즌 일정
        </h1>
        
        <div className="flex items-center justify-between bg-[#1E1E1E] rounded-xl p-4 border border-gray-800">
          <Link href={`/schedule?year=${prevYear}&month=${prevMonth}`} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="text-2xl font-bold text-white">{currentYear}년 {currentMonth}월</h2>
          <Link href={`/schedule?year=${nextYearLink}&month=${nextMonthLink}`} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
            <ChevronRight size={24} />
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-[#1E1E1E] rounded-xl border border-gray-800">
            해당 월에 배정된 경기 일정이 없습니다.
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const dateGames = gamesByDate[dateKey];
            const dateObj = new Date(dateKey);
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            
            return (
              <div id={`date-${dateKey}`} key={dateKey} className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-lg scroll-mt-24">
                <div className={`px-6 py-3 border-b border-gray-800 font-bold text-lg flex items-center justify-between
                  ${dateObj.getDay() === 0 ? 'text-red-400 bg-red-900/10' : ''}
                  ${dateObj.getDay() === 6 ? 'text-blue-400 bg-blue-900/10' : ''}
                  ${!isWeekend ? 'text-gray-200 bg-gray-800/20' : ''}
                `}>
                  <span>{currentMonth}월 {dateObj.getDate()}일 ({dayOfWeek})</span>
                  {dateKey === todayKey && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full animate-pulse">오늘</span>}
                </div>
                
                <div className="divide-y divide-gray-800/50">
                  {dateGames.map(game => {
                    const timeStr = new Date(game.game_date).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: false, 
                      timeZone: 'Asia/Seoul' 
                    });
                    const isFinished = game.status === 'finished';
                    const isCanceled = game.status === 'canceled';
                    const isLive = game.status === 'live';
                    
                    return (
                      <div key={game.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center gap-4 sm:w-1/4">
                          <div className={`font-mono font-bold text-lg ${isLive ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                            {isLive ? 'LIVE' : timeStr}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={14} /> {game.stadium}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-1">
                          <div className={`text-right flex-1 font-bold text-base sm:text-lg ${(game.home_score < game.away_score && isFinished) ? 'text-white' : 'text-gray-400'} truncate`}>
                            {game.away?.name?.split(' ')[0]}
                          </div>
                          <div className="flex flex-col items-center justify-center w-16 sm:w-24 shrink-0">
                            {isCanceled ? (
                              <span className="text-[10px] sm:text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-500/30">취소</span>
                            ) : (isFinished || isLive) ? (
                              <div className="flex items-center gap-1 sm:gap-2 font-black text-xl sm:text-2xl">
                                <span className={game.home_score < game.away_score ? 'text-white' : 'text-gray-500'}>{game.away_score}</span>
                                <span className="text-gray-600 text-sm font-normal">:</span>
                                <span className={game.home_score > game.away_score ? 'text-white' : 'text-gray-500'}>{game.home_score}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] sm:text-sm font-bold text-gray-600 bg-gray-800 px-2 sm:px-3 py-1 rounded-full">VS</span>
                            )}
                          </div>
                          <div className={`text-left flex-1 font-bold text-base sm:text-lg ${(game.home_score > game.away_score && isFinished) ? 'text-white' : 'text-gray-400'} truncate`}>
                            {game.home?.name?.split(' ')[0]}
                          </div>
                        </div>
                        <div className="sm:w-1/4 flex justify-end"></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}
