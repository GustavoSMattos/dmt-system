import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista todos os produtos com suporte a fornecedores
export async function GET(req) {
  try {
    const { data: produtos, error } = await supabaseAdmin
      .from('produtos')
      .select('*, fornecedores(nome_empresa, cnpj)')
      .order('criado_em', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(produtos);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

// POST: Cadastra novo produto
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão' }, { status: 403 });
    }

    const body = await req.json();
    const { codigo, nome, categoria, unidade, quantidade, valor_unitario, estoque_minimo, id_fornecedor } = body;

    if (!codigo || !nome || !categoria || !unidade) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('produtos')
      .insert({
        codigo,
        nome,
        categoria,
        unidade,
        quantidade: parseFloat(quantidade) || 0,
        valor_unitario: parseFloat(valor_unitario) || 0,
        estoque_minimo: parseFloat(estoque_minimo) || 0,
        id_fornecedor: id_fornecedor || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um produto cadastrado com este código/SKU.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_PRODUTO',
      detalhes: { codigo, nome },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Atualiza produto cadastrado (Nome, Categoria, Estoque Mínimo, etc.)
export async function PUT(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para edição.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, nome, categoria, estoque_minimo, valor_unitario } = body;

    if (!id) return NextResponse.json({ error: 'ID do produto não informado.' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('produtos')
      .update({
        nome,
        categoria,
        estoque_minimo: parseFloat(estoque_minimo) || 0,
        ...(valor_unitario !== undefined && { valor_unitario: parseFloat(valor_unitario) || 0 }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EDICAO_PRODUTO',
      detalhes: { id_produto: id, nome_atualizado: nome },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Exclui produto cadastrado
export async function DELETE(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil !== 'admin') {
      return NextResponse.json({ error: 'Apenas Administradores podem excluir produtos.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do produto não informado.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('produtos').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Este produto não pode ser excluído pois está vinculado a movimentações ou BOM de trailers.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EXCLUSAO_PRODUTO',
      detalhes: { id_produto: id },
    });

    return NextResponse.json({ success: true, message: 'Produto excluído com sucesso.' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}