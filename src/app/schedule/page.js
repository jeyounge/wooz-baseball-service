import { supabase } from '@/lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, MapPin } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Opt out of static generation for real-time

export default async function SchedulePage({ searchParams }) {
  // Determine which year and month to show. Default to 2026-03 or today's month if provided
  const params = await searchParams; // searchParams is a promise in Next.js 15+
  
  const currentYear = params?.year ? parseInt(params.year) : 2026;
  let currentMonth = params?.month ? parseInt(params.month) : 3;

  // Fetch games for the selected month
  // Create start and end date properly
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00+09:00`;
  
  // Calculate end of month
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const endDate = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`;

  const { data: games, error } = await supabase
    .from('games')
    .select(`
      *,
      home:home_team_id(id, name),
      away:away_team_id(id, name)
    `)
    .gte('game_date', startDate)
    .lt('game_date', endDate)
    .order('game_date', { ascending: true });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          일정 데이터를 불러오는 데 실패했습니다. ({error.message})
        </div>
      </div>
    );
  }

  // Navigation logic
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  const nextMonthLink = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYearLink = currentMonth === 12 ? currentYear + 1 : currentYear;

  // Group games by Date
  const gamesByDate = {};
  if (games) {
    games.forEach(game => {
      // Assuming ISO format from DB: "2026-03-24T18:30:00+09:00"
      const dateObj = new Date(game.game_date);
      // Format as YYYY-MM-DD for grouping
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      if (!gamesByDate[dateKey]) {
        gamesByDate[dateKey] = [];
      }
      gamesByDate[dateKey].push(game);
    });
  }

  // Get sorted unique dates
  const sortedDates = Object.keys(gamesByDate).sort();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header & Navigation */}
      <div className="mb-8 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
          <Calendar className="h-8 w-8 text-[#1A237E]" />
          KBO 정규시즌 일정
        </h1>
        
        <div className="flex items-center justify-between bg-[#1E1E1E] rounded-xl p-4 border border-gray-800">
          <Link 
            href={`/schedule?year=${prevYear}&month=${prevMonth}`}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ChevronLeft size={24} />
          </Link>
          
          <h2 className="text-2xl font-bold text-white">
            {currentYear}년 {currentMonth}월
          </h2>
          
          <Link 
            href={`/schedule?year=${nextYearLink}&month=${nextMonthLink}`}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ChevronRight size={24} />
          </Link>
        </div>
      </div>

      {/* Schedule List */}
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
            
            // Highlight weekends/today visually
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            
            return (
              <div key={dateKey} className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                <div className={`px-6 py-3 border-b border-gray-800 font-bold text-lg flex items-center gap-2
                  ${dateObj.getDay() === 0 ? 'text-red-400 bg-red-900/10' : ''}
                  ${dateObj.getDay() === 6 ? 'text-blue-400 bg-blue-900/10' : ''}
                  ${!isWeekend ? 'text-gray-200 bg-gray-800/20' : ''}
                `}>
                  {currentMonth}월 {dateObj.getDate()}일 ({dayOfWeek})
                </div>
                
                <div className="divide-y divide-gray-800/50">
                  {dateGames.map(game => {
                    // Time extraction
                    const gameTimeObj = new Date(game.game_date);
                    const timeStr = `${String(gameTimeObj.getHours()).padStart(2, '0')}:${String(gameTimeObj.getMinutes()).padStart(2, '0')}`;
                    
                    const isFinished = game.status === 'finished';
                    const isCanceled = game.status === 'canceled';
                    const isLive = game.status === 'live';
                    
                    return (
                      <div key={game.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                        
                        {/* Time & Stadium */}
                        <div className="flex items-center gap-4 sm:w-1/4">
                          <div className={`font-mono font-bold text-lg ${isLive ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                            {isLive ? 'LIVE' : timeStr}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={14} /> {game.stadium}
                          </div>
                        </div>
                        
                        {/* Matchup & Score */}
                        <div className="flex items-center justify-center gap-4 sm:w-1/2">
                          <div className={`text-right w-1/3 font-bold text-lg ${game.home_score < game.away_score && isFinished ? 'text-white' : 'text-gray-400'}`}>
                            {game.away?.name}
                          </div>
                          
                          <div className="flex flex-col items-center justify-center w-24">
                            {isCanceled ? (
                              <span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-500/30">
                                {game.cancel_reason || '취소'}
                              </span>
                            ) : (isFinished || isLive) ? (
                              <div className="flex items-center gap-2 font-black text-2xl">
                                <span className={game.home_score < game.away_score ? 'text-white' : 'text-gray-500'}>{game.away_score}</span>
                                <span className="text-gray-600 text-sm font-normal">:</span>
                                <span className={game.home_score > game.away_score ? 'text-white' : 'text-gray-500'}>{game.home_score}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-gray-600 bg-gray-800 px-3 py-1 rounded-full">VS</span>
                            )}
                          </div>
                          
                          <div className={`text-left w-1/3 font-bold text-lg ${game.home_score > game.away_score && isFinished ? 'text-white' : 'text-gray-400'}`}>
                            {game.home?.name}
                          </div>
                        </div>
                        
                        {/* Action / Future Predict Link (Stub) */}
                        <div className="sm:w-1/4 flex justify-end">
                           {isFinished && (
                              <button className="text-xs bg-gray-800 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded transition-colors font-medium">
                                결과 상세
                              </button>
                           )}
                        </div>
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
