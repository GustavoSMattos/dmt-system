import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    
    // Regra estrita de perfil: Apenas Administradores podem visualizar os logs
    if (user.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { data: logs, error } = await supabaseAdmin
      .from('logs_atividade')
      .select('*, usuarios(nome, email)')
      .order('criado_em', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar logs de auditoria' }, { status: 500 });
  }
}