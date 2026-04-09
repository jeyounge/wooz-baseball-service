import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// IP 마스킹 함수 (중복 선언 방지를 위해 유틸로 빼는 게 좋으나 편의상 재선언)
function maskIp(ip) {
  if (!ip) return '0.0.*.*';
  const parts = ip.split('.');
  if (parts.length < 2) return ip;
  return `${parts[0]}.${parts[1]}.*.*`;
}

// 1. 특정 게시물의 댓글 조회 (GET)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) return NextResponse.json({ error: 'postId가 필요합니다.' }, { status: 400 });

  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. 댓글 작성 (POST)
export async function POST(request) {
  try {
    const { postId, content, nickname, password } = await request.json();
    
    // IP 추출
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    const maskedIp = maskIp(ip);

    if (!postId || !content || !nickname || !password) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('community_comments')
      .insert([
        { 
          post_id: postId,
          content, 
          nickname, 
          password, 
          ip_address: maskedIp 
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
