import { supabase } from '@/lib/supabase';
import { CalendarDays, Trophy, MapPin } from 'lucide-react';

export const revalidate = 0; // Disable cache for MVP to see instant DB changes

export default async function RecordsPage() {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-[#D32F2F]" />
          역대 기록실
        </h1>
        <p className="text-gray-400">KBO 구단 및 선수들의 통산 기록을 확인하세요.</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-800 pb-2">KBO 10개 구단</h2>
        {error ? (
          <div className="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded-lg">
            데이터를 불러오는 데 실패했습니다. ({error.message})
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {teams?.map((team) => (
              <div key={team.id} className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-5 hover:border-[#1A237E] transition-colors group">
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-[#D32F2F] transition-colors">{team.name}</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-500" />
                    <span>{team.city} ({team.home_stadium})</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Trophy size={14} className="text-gray-500" />
                    <span>창단: {team.founded_year}년</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
