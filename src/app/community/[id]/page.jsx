'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, User, Clock, Eye, MessageSquare, 
  Trash2, Send, Lock, AlertCircle, ChevronRight,
  ShieldAlert, Bot
} from 'lucide-react';
import Link from 'next/link';
import PredictionDetailView from '@/components/predictions/PredictionDetailView';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [prediction, setPrediction] = useState(null); // 추가
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 상태 관리: 글 삭제 팝업
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 상태 관리: 댓글 작성
  const [commentForm, setCommentForm] = useState({
    nickname: '',
    password: '',
    content: ''
  });

  useEffect(() => {
    fetchPostData();
  }, [params.id]);

  const fetchPostData = async () => {
    try {
      // 1. 게시글 정보 가져오기
      const pResp = await fetch(`/api/community/posts/${params.id}`);
      const pData = await pResp.json();
      console.log('[DEBUG] Community Post Data:', pData); // 게시글 데이터 확인용 로그
      if (pData.error) throw new Error(pData.error);
      setPost(pData);

      // 1.1 만약 game_id가 존재한다면 (경량 GET API 사용으로 광속 조회)
      if (pData.game_id && pData.game_id !== 'null') {
        const predResp = await fetch(`/api/predictions/${pData.game_id}`);
        const predData = await predResp.json();
        
        if (!predData.error) {
          setPrediction(predData.data);
        } else {
          setPrediction(null);
        }
      } else {
        setPrediction(null);
      }

      // 2. 댓글 목록 가져오기
      const cResp = await fetch(`/api/community/comments?postId=${params.id}`);
      const cData = await cResp.json();
      setComments(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostDelete = async () => {
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/community/posts/${params.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await resp.json();
      if (resp.ok) {
        alert('게시글이 삭제되었습니다.');
        router.push('/community');
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentForm.nickname || !commentForm.password || !commentForm.content) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const resp = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commentForm, postId: params.id })
      });
      if (resp.ok) {
        setCommentForm({ nickname: '', password: '', content: '' });
        fetchPostData(); // 댓글 목록 새로고침
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0D0F12] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-[#0D0F12] flex flex-col items-center justify-center gap-4">
      <AlertCircle size={48} className="text-red-500" />
      <h3 className="text-white font-bold">게시글을 찾을 수 없습니다.</h3>
      <Link href="/community" className="text-indigo-400 font-bold">목록으로 돌아가기</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0F12] text-slate-200">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Nav */}
        <Link href="/community" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-tight">커뮤니티 목록</span>
        </Link>

        {/* Post Content Area */}
        <article className="bg-[#1A1E24] rounded-3xl border border-white/5 overflow-hidden shadow-2xl mb-8">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-white/5">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tighter">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-slate-400">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                    <User size={14} className="text-indigo-400" />
                    <span className="font-semibold text-slate-300">{post.nickname}</span>
                    <span className="text-slate-600 text-[10px] ml-1">({post.ip_address})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 py-1.5 px-1">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="opacity-50" />
                      <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye size={14} className="opacity-50" />
                      <span>{post.views || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-all font-bold text-xs shrink-0 self-end md:self-start group"
              >
                <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
                게시글 삭제
              </button>
            </div>
            
            {/* AI Report View or Text Content */}
            {prediction ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-3 text-indigo-300 text-sm font-bold mb-6">
                  <Bot size={20} className="animate-pulse" />
                  이 게시글은 우제트 AI에 의해 자동 생성된 정밀 분석 리포트입니다.
                </div>
                <PredictionDetailView prediction={prediction} />
              </div>
            ) : (
              <div className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap min-h-[200px]">
                {post.content}
              </div>
            )}
          </div>
        </article>

        {/* Comments Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <MessageSquare size={20} className="text-indigo-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">댓글 <span className="text-indigo-500">{comments.length}</span></h2>
          </div>

          {/* Comment Write Form */}
          <form onSubmit={handleCommentSubmit} className="bg-[#1A1E24] rounded-2xl border border-white/5 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="닉네임"
                value={commentForm.nickname}
                onChange={(e) => setCommentForm({...commentForm, nickname: e.target.value})}
                className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
              />
              <input 
                type="password" 
                placeholder="비밀번호"
                value={commentForm.password}
                onChange={(e) => setCommentForm({...commentForm, password: e.target.value})}
                className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
              />
            </div>
            <div className="relative">
              <textarea 
                rows={3}
                placeholder="댓글을 남겨보세요..."
                value={commentForm.content}
                onChange={(e) => setCommentForm({...commentForm, content: e.target.value})}
                className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none pr-12"
              ></textarea>
              <button 
                type="submit"
                className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* Comment List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-[#1A1E24]/60 rounded-2xl border border-white/5 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-indigo-400">{comment.nickname}</span>
                    <span className="text-[10px] text-slate-600 font-bold bg-slate-900 px-2 py-0.5 rounded-full">{comment.ip_address}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{comment.content}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1A1E24] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
               <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <ShieldAlert size={32} />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-white">게시글 삭제</h3>
                  <p className="text-slate-500 text-sm mt-1">삭제하시려면 작성 시 설정한 비밀번호를 입력해주세요.</p>
               </div>
            </div>
            
            <input 
              type="password" 
              placeholder="비밀번호 입력"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-center text-white focus:ring-2 focus:ring-red-500/30 outline-none mb-6 font-black tracking-widest"
              autoFocus
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-2xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handlePostDelete}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? '삭제 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
