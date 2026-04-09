'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, User, Lock, ArrowLeft, Send, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CommentWritePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nickname: '',
    password: '',
    title: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.title || !formData.content || !formData.nickname || !formData.password) {
      setError('모든 필드(닉네임, 비번, 제목, 내용)를 입력해주세요.');
      setIsSubmitting(false);
      return;
    }

    try {
      const resp = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (resp.ok) {
        router.push('/community');
        router.refresh();
      } else {
        const data = await resp.json();
        setError(data.error || '저장에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F12] text-slate-200">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        
        {/* Navigation */}
        <Link href="/community" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">목록으로 돌아가기</span>
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            새 게시글 <span className="text-indigo-500">작성하기</span>
          </h1>
          <p className="text-slate-500 mt-2">오늘의 야구 이야기, 승부 예측 팁을 자유롭게 들려주세요.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-head-shake">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nickname */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <User size={12} className="text-indigo-500" /> 닉네임
              </label>
              <input 
                type="text" 
                placeholder="익명 닉네임"
                value={formData.nickname}
                onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                className="w-full bg-[#1A1E24] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
                maxLength={20}
              />
            </div>
            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} className="text-indigo-500" /> 비밀번호 (삭제용)
              </label>
              <input 
                type="password" 
                placeholder="4자리 이상"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-[#1A1E24] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">글 제목</label>
            <input 
              type="text" 
              placeholder="제목을 입력해주세요"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-[#1A1E24] border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">상세 내용</label>
            <textarea 
              rows={12}
              placeholder="자유롭게 내용을 작성해주세요..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full bg-[#1A1E24] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none resize-none"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="pt-6 flex justify-end">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send size={18} />
              {isSubmitting ? '글 올리는 중...' : '게시글 등록하기'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
