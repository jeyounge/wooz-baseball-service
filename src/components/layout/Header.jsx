import Link from 'next/link';
import { User, Activity, CalendarDays, Award, MessageSquare, Trophy } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#121212]/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Enhanced Wooz Emblem */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg rotate-3 group-hover:rotate-6 transition-transform shadow-lg shadow-indigo-500/20"></div>
            <div className="relative font-black text-white text-xl tracking-tighter">W</div>
          </div>
          <div className="flex flex-col -gap-1">
            <span className="text-xl font-black tracking-tighter text-white leading-none">Wooz</span>
            <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">우제트</span>
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link href="/schedule" className="hover:text-white transition-colors flex items-center gap-1 text-blue-400 font-bold">
            <CalendarDays size={16} /> 일정/결과
          </Link>
          <div className="h-4 w-px bg-gray-700 mx-1"></div>
          <Link href="/standings" className="hover:text-white transition-colors flex items-center gap-1">
            <Trophy size={16} /> 리그 순위
          </Link>
          <Link href="/predictions" className="hover:text-white transition-colors flex items-center gap-1 text-[#D32F2F] font-bold">
            <Award size={16} /> 우제트 픽
          </Link>
          <Link href="/community" className="hover:text-white transition-colors flex items-center gap-1">
            <MessageSquare size={16} /> 커뮤니티
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-gray-800">
            <User size={16} />
            <span>로그인</span>
          </button>
        </div>
      </div>
    </header>
  );
}
