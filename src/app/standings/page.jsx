import { supabase } from '@/lib/supabase';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const revalidate = 0;

export default async function StandingsPage() {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name');
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg">
          순위 정보를 불러오는 데 실패했습니다. ({error.message})
        </div>
      </div>
    );
  }

  // MVP Mock Data Generation for Standings
  // In a real app, this would be computed by SQL query or fetched from a 'standings' table synced via API
  const generateMockStandings = () => {
    let mockStandings = teams.map((team, index) => {
      // Create reasonable fictional stats
      const wins = 80 - (index * 4) + Math.floor(Math.random() * 8);
      const losses = 60 + (index * 4) - Math.floor(Math.random() * 8);
      const draws = Math.floor(Math.random() * 5);
      const games = wins + losses + draws;
      const pct = (wins / (wins + losses)).toFixed(3);
      
      const streakTypes = ['W', 'L'];
      const streakType = streakTypes[Math.floor(Math.random() * streakTypes.length)];
      const streakCount = Math.floor(Math.random() * 5) + 1;
      
      return {
        ...team,
        games,
        wins,
        losses,
        draws,
        pct: parseFloat(pct),
        streak: `${streakCount}${streakType}`,
        l10: `${Math.floor(Math.random()*6)+3}-${Math.floor(Math.random()*6)+3}-${Math.floor(Math.random()*2)}`
      };
    });

    // Sort by win percentage descending
    mockStandings.sort((a, b) => b.pct - a.pct);
    
    // Add Game Behind (GB) relative to the 1st place team
    const topTeam = mockStandings[0];
    mockStandings = mockStandings.map((team, idx) => {
      let gb = 0;
      if (idx > 0) {
        gb = ((topTeam.wins - team.wins) + (team.losses - topTeam.losses)) / 2;
      }
      return { ...team, gb: gb > 0 ? gb.toFixed(1).replace('.0', '') : '-' };
    });

    return mockStandings;
  };

  const standings = teams ? generateMockStandings() : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
          <Trophy className="h-8 w-8 text-[#D32F2F]" />
          2026 정규시즌 순위
        </h1>
        <p className="text-gray-400">팀별 승패 기록과 승률, 게임차 등을 제공합니다.</p>
      </div>

      <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-[#1A237E]/20 border-b border-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-center w-16">순위</th>
                <th scope="col" className="px-6 py-4 font-bold">팀명</th>
                <th scope="col" className="px-4 py-4 text-center">경기</th>
                <th scope="col" className="px-4 py-4 text-center">승</th>
                <th scope="col" className="px-4 py-4 text-center">무</th>
                <th scope="col" className="px-4 py-4 text-center">패</th>
                <th scope="col" className="px-4 py-4 text-center font-bold text-white">승률</th>
                <th scope="col" className="px-4 py-4 text-center">게임차</th>
                <th scope="col" className="px-4 py-4 text-center">연속</th>
                <th scope="col" className="px-4 py-4 text-center">최근 10경기</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr key={team.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className={`px-6 py-4 text-center font-bold ${idx < 5 ? 'text-white' : 'text-gray-500'}`}>{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 font-black">
                      {team.name[0]}
                    </div>
                    {team.name}
                  </td>
                  <td className="px-4 py-4 text-center">{team.games}</td>
                  <td className="px-4 py-4 text-center">{team.wins}</td>
                  <td className="px-4 py-4 text-center">{team.draws}</td>
                  <td className="px-4 py-4 text-center">{team.losses}</td>
                  <td className="px-4 py-4 text-center font-bold text-[#D32F2F]">
                    {team.pct.toFixed(3).replace(/^0+/, '')}
                  </td>
                  <td className="px-4 py-4 text-center">{team.gb}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 font-medium ${team.streak.includes('W') ? 'text-green-500' : 'text-red-500'}`}>
                      {team.streak.includes('W') ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                      {team.streak}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">{team.l10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
