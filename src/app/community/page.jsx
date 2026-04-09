'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, User, Eye, Clock, Edit3, Search, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const resp = await fetch('/api/community/posts');
      const data = await resp.json();
      if (Array.isArray(data)) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F12] text-slate-200">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              우제트 <span className="bg-gradient-to-r from-indigo-500 to-blue-600 bg-clip-text text-transparent uppercase font-system">Community</span>
            </h1>
            <p className="text-slate-500 font-medium">자유로운 승부 예측 토론과 야구 이야기를 나누는 익명 공간</p>
          </div>
          <Link 
            href="/community/write" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 group"
          >
            <Edit3 size={18} />
            게시글 작성하기
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Board Search & Meta Info (Placeholder) */}
        <div className="flex items-center justify-between mb-6 px-4 py-3 bg-[#1A1E24]/50 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1"><MessageSquare size={14} className="text-indigo-400"/> 전체글 {posts.length}</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="제목, 내용 검색..." 
              className="bg-slate-900 border-none rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500/50 w-48 md:w-64"
            />
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-[#1A1E24] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-600">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium">데이터를 불러오는 중...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <AlertCircle size={48} className="text-slate-800 mb-4" />
              <h3 className="text-xl font-bold text-slate-500 mb-1">등록된 게시글이 없습니다.</h3>
              <p className="text-slate-600 text-sm">첫 번째 주인공이 되어 오늘의 야구 이야기를 들려주세요!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {posts.map((post) => (
                <Link 
                  key={post.id} 
                  href={`/community/${post.id}`}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-indigo-500/5 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1 text-slate-400">
                        <User size={12} className="text-indigo-400/70" /> 
                        {post.nickname} <span className="text-[10px] text-slate-600">({post.ip_address})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(post.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 md:mt-0 text-slate-500">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Views</span>
                      <span className="text-sm font-bold text-slate-400">{post.views || 0}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] uppercase font-black text-slate-600 tracking-wider">Comments</span>
                      <span className="text-sm font-bold text-indigo-500">
                        {post.comments?.[0]?.count || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Support Footer */}
        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-indigo-900/20 to-slate-900/20 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
               <MessageSquare size={24} />
            </div>
            <div>
               <h4 className="text-lg font-bold text-white italic tracking-tight">Wooz Community Rule</h4>
               <p className="text-slate-500 text-sm">타인에 대한 비방 대신, 즐거운 야구 토론 문화를 만들어주세요.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
