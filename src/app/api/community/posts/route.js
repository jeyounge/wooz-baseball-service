import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// IP 마스킹 함수 (121.162.34.56 -> 121.162.*.*)
function maskIp(ip) {
  if (!ip) return '0.0.*.*';
  const parts = ip.split('.');
  if (parts.length < 2) return ip;
  return `${parts[0]}.${parts[1]}.*.*`;
}

// 1. 게시글 목록 조회 (GET)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*, comments:community_comments(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. 게시글 작성 (POST)
export async function POST(request) {
  try {
    const { title, content, nickname, password } = await request.json();
    
    // IP 추출 (Next.js 헬퍼 이용)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    const maskedIp = maskIp(ip);

    if (!title || !content || !nickname || !password) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert([
        { 
          title, 
          content, 
          nickname, 
          password, // 실제 서비스 시 해싱 처리가 권장되나 MVP 단계에선 단순 저장
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
