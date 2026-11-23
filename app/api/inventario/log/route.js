import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);
    const body = await req.json();
    const categoria = String(body.categoria || '').trim();
    const totalItens = Number(body.total_itens || 0);

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria não informada.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'DOWNLOAD_CONTAGEM_INVENTARIO',
      detalhes: {
        categoria,
        total_itens: totalItens,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}