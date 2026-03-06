import Link from 'next/link';
import { User, Activity, CalendarDays, Award, MessageSquare, Trophy } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#121212]/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo Placeholder */}
          <div className="w-8 h-8 rounded-md bg-[#1A237E] flex items-center justify-center font-bold text-white">W</div>
          <span className="text-xl font-bold tracking-tight text-white">Woozet</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link href="/live" className="hover:text-white transition-colors flex items-center gap-1">
            <Activity size={16} /> 라이브 센터
          </Link>
          <div className="h-4 w-px bg-gray-700 mx-1"></div>
          <Link href="/records" className="hover:text-white transition-colors flex items-center gap-1">
            <CalendarDays size={16} /> 역대 기록실
          </Link>
          <Link href="/standings" className="hover:text-white transition-colors flex items-center gap-1">
            <Trophy size={16} /> 리그 순위
          </Link>
          <div className="h-4 w-px bg-gray-700 mx-1"></div>
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
