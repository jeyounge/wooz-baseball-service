import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. 게시글 상세 조회 (GET)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) throw new Error('ID가 유효하지 않습니다.');

    // 1. 조회수 직접 증가 (RPC 대신 직접 UPDATE 사용하여 확실하게 처리)
    const { error: viewErr } = await supabase
      .from('community_posts')
      .update({ views: supabase.rpc('increment') }) // 이 방식이 안될 경우 대비 아래 raw update 시도
      .eq('id', id);
    
    // 만약 위의 rpc 헬퍼가 안깔려있다면 가장 확실한 쿼리 방식 시도
    if (viewErr) {
       await supabase.from('community_posts')
         .select('views')
         .eq('id', id)
         .single()
         .then(async ({data: cur}) => {
            if(cur) await supabase.from('community_posts').update({ views: (cur.views || 0) + 1 }).eq('id', id);
         });
    }

    // 2. 게시글 정보 가져오기
    const { data, error } = await supabase
      .from('community_posts')
      .select('*, game_id') // game_id 포함
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. 게시글 삭제 (DELETE)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { password } = await request.json();
    
    // 1단계: 작성 시 비밀번호와 맞는지 확인
    const { data: post, error: fetchError } = await supabase
      .from('community_posts')
      .select('password')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (post.password !== password) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 2단계: 삭제 진행
    const { error: deleteError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    return NextResponse.json({ message: '삭제되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
