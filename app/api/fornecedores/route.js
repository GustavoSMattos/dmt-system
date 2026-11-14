import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const { data: fornecedores, error } = await supabaseAdmin
      .from('fornecedores')
      .select('*')
      .order('nome_empresa', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(fornecedores);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para cadastrar fornecedores' }, { status: 403 });
    }

    const body = await req.json();

    const { data: fornecedor, error } = await supabaseAdmin
      .from('fornecedores')
      .insert(body)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Este CNPJ já está cadastrado.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Registrar log de auditoria
    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_FORNECEDOR',
      detalhes: { fornecedor_id: fornecedor.id, cnpj: fornecedor.cnpj, empresa: fornecedor.nome_empresa },
    });

    return NextResponse.json(fornecedor, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao cadastrar fornecedor' }, { status: 500 });
  }
}