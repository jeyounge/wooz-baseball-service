'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Activity, CalendarDays, Award, MessageSquare, Trophy, Menu, X, FlaskConical, TrendingUp } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { href: '/schedule', label: '일정/결과', icon: <CalendarDays size={18} />, color: 'text-blue-400' },
    { href: '/standings', label: '리그 순위', icon: <Trophy size={18} />, color: 'text-amber-400' },
    { href: '/predictions', label: '우제트 픽', icon: <Award size={18} />, color: 'text-rose-500' },
    { href: '/review', label: 'AI 복기', icon: <FlaskConical size={18} />, color: 'text-emerald-400' },
    { href: '/weekly', label: '위클리 분석', icon: <TrendingUp size={18} />, color: 'text-fuchsia-400' },
    { href: '/community', label: '커뮤니티', icon: <MessageSquare size={18} />, color: 'text-indigo-400' },
  ];

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[#121212]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2.5 group mr-12 shrink-0">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg rotate-3 group-hover:rotate-6 transition-transform shadow-lg shadow-indigo-500/30"></div>
            <div className="relative font-black text-white text-xl tracking-tighter">W</div>
          </div>
          <div className="flex flex-col -gap-1">
            <span className="text-xl font-black tracking-tighter text-white leading-none italic">Wooz</span>
            <span className="text-[10px] font-extrabold text-indigo-400 tracking-widest uppercase">우제트</span>
          </div>
        </Link>
        
        {/* Desktop Navigation - Grouped on the left */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`text-sm font-bold flex items-center gap-2 transition-all hover:text-white ${link.color || 'text-slate-300 hover:text-white'}`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button & Right-side actions */}
        <div className="ml-auto">
          <button 
            onClick={toggleMenu}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Drawer (Overlay) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleMenu}
      >
        <div 
          className={`absolute top-0 right-0 h-full w-72 bg-[#1A1E24] border-l border-white/10 p-6 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-black text-white text-lg">W</div>
               <span className="font-black text-white text-xl">NAVIGATION</span>
            </div>
            <button onClick={toggleMenu} className="p-1 hover:bg-white/5 rounded-lg text-slate-400">
               <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={toggleMenu}
                className={`flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all group`}
              >
                <div className={`p-2 rounded-lg bg-slate-900 group-hover:scale-110 transition-transform ${link.color}`}>
                   {link.icon}
                </div>
                <span className="font-bold text-slate-200">{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Wooz AI Baseball Archive</p>
          </div>
        </div>
      </div>
    </header>
  );
}
