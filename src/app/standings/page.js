"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";

export default function StandingsPage() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Available years from 2015 to 2024 (2025/2026 not played yet)
  const availableYears = Array.from({ length: 11 }, (_, i) => 2025 - i);

  useEffect(() => {
    async function fetchStandings() {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('standings')
        .select(`
          *,
          teams (
            name,
            logo_url
          )
        `)
        .eq('year', selectedYear)
        .order('rank', { ascending: true });

      if (error) {
        console.error("Error fetching standings:", error);
      } else {
        setStandings(data || []);
      }
      
      setLoading(false);
    }

    fetchStandings();
  }, [selectedYear]);

  return (
    <div className="min-h-screen bg-[#0F1115] text-white pt-20 pb-12">
      <Head>
        <title>KBO 팀 순위 - WOOZ Baseball</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#1A237E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            KBO 정규시즌 순위
          </h1>
          
          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-[#1A1E24] border border-gray-700 text-white font-medium py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:border-[#1A237E] focus:ring-1 focus:ring-[#1A237E] transition-colors"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년 시즌</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-[#1A1E24] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-center whitespace-nowrap">
              <thead className="bg-[#13161A] text-gray-400 text-sm border-b border-gray-800">
                <tr>
                  <th className="py-4 px-3 font-medium">순위</th>
                  <th className="py-4 px-4 text-left font-medium">팀명</th>
                  <th className="py-4 px-3 font-medium">경기</th>
                  <th className="py-4 px-3 font-medium">승</th>
                  <th className="py-4 px-3 font-medium">무</th>
                  <th className="py-4 px-3 font-medium">패</th>
                  <th className="py-4 px-4 font-bold text-gray-300">승률</th>
                  <th className="py-4 px-4 font-medium">게임차</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-5 px-3"><div className="h-4 bg-gray-700 rounded w-4 mx-auto"></div></td>
                      <td className="py-5 px-4"><div className="h-6 bg-gray-700 rounded w-24"></div></td>
                      <td className="py-5 px-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
                      <td className="py-5 px-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
                      <td className="py-5 px-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
                      <td className="py-5 px-3"><div className="h-4 bg-gray-700 rounded w-6 mx-auto"></div></td>
                      <td className="py-5 px-4"><div className="h-4 bg-gray-700 rounded w-10 mx-auto"></div></td>
                      <td className="py-5 px-4"><div className="h-4 bg-gray-700 rounded w-8 mx-auto"></div></td>
                    </tr>
                  ))
                ) : standings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-gray-500 font-medium text-lg">
                      해당 연도의 순위 데이터가 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  standings.map((team, idx) => {
                    // Highlight top 5 teams (Postseason spots)
                    const isTop5 = team.rank <= 5;
                    const rankColor = team.rank === 1 ? "text-yellow-400 font-bold" 
                                      : team.rank <= 3 ? "text-gray-200 font-semibold"
                                      : isTop5 ? "text-gray-300 font-medium" 
                                      : "text-gray-500";
                    
                    return (
                      <tr key={team.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className={`py-4 px-3 text-lg ${rankColor}`}>
                          {team.rank}
                        </td>
                        <td className="py-4 px-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                              {team.teams.name}
                              {team.rank === 1 && (
                                <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                  1st
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-gray-300 font-medium">{team.games}</td>
                        <td className="py-4 px-3 text-red-400 font-bold">{team.wins}</td>
                        <td className="py-4 px-3 text-gray-500">{team.draws}</td>
                        <td className="py-4 px-3 text-blue-400 font-medium">{team.losses}</td>
                        <td className="py-4 px-4 text-white font-bold text-lg bg-gray-800/20">
                          {team.win_rate.toFixed(3)}
                        </td>
                        <td className="py-4 px-4 text-gray-400 font-medium">
                          {team.game_behind === 0 ? "-" : team.game_behind.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Footnote */}
        <div className="mt-4 text-right text-xs text-gray-500">
          * 순위 데이터는 KBO 공식 기록을 참고하여 제공됩니다. KBO 포스트시즌 진출 기준은 1위~5위입니다.
        </div>
      </div>
    </div>
  );
}
