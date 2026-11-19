import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista todos os serviços cadastrados
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('servicos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar serviços.' }, { status: 500 });
  }
}

// POST: Cadastra um novo serviço
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const body = await req.json();
    const codigo = String(body.codigo || '').trim();
    const nome = String(body.nome || '').trim();
    const descricao = String(body.descricao || '').trim();
    const unidade = String(body.unidade || '').trim();
    const valor = parseFloat(String(body.valor || 0).replace(',', '.')) || 0;

    if (!codigo || !nome || !unidade) {
      return NextResponse.json(
        { error: 'Código, Nome do serviço e Unidade de serviço são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('servicos')
      .insert({
        codigo,
        nome,
        descricao,
        unidade,
        valor,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um serviço cadastrado com este código.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_SERVICO',
      detalhes: { codigo, nome, valor },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Edita um serviço existente
export async function PUT(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;
    const codigo = String(body.codigo || '').trim();
    const nome = String(body.nome || '').trim();
    const descricao = String(body.descricao || '').trim();
    const unidade = String(body.unidade || '').trim();
    const valor = parseFloat(String(body.valor || 0).replace(',', '.')) || 0;

    if (!id || !codigo || !nome || !unidade) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes para edição.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('servicos')
      .update({ codigo, nome, descricao, unidade, valor })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe outro serviço com este código.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EDICAO_SERVICO',
      detalhes: { id_servico: id, codigo, nome, valor },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Exclui um serviço
export async function DELETE(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem excluir serviços.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do serviço não informado.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('servicos').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Este serviço não pode ser excluído pois está vinculado a uma Estrutura BOM.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EXCLUSAO_SERVICO',
      detalhes: { id_servico: id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}