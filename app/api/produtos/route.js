import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista todos os produtos cadastrados
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar produtos.' }, { status: 500 });
  }
}

// POST: Cadastra um novo produto
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    const perfil = String(user.perfil || '').toLowerCase();
    if (!['admin', 'operador'].includes(perfil)) {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const body = await req.json();
    const codigo = String(body.codigo || '').trim();
    const nome = String(body.nome || '').trim();
    const categoria = String(body.categoria || '').trim();
    const unidade = String(body.unidade || 'UN').trim();
    const quantidade = parseFloat(String(body.quantidade || 0).replace(',', '.')) || 0;
    const estoque_minimo = parseFloat(String(body.estoque_minimo || 0).replace(',', '.')) || 0;
    const valor_unitario = parseFloat(String(body.valor_unitario || 0).replace(',', '.')) || 0;
    const id_fornecedor = body.id_fornecedor || null;

    if (!codigo || !nome) {
      return NextResponse.json({ error: 'Código e Nome do produto são obrigatórios.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('produtos')
      .insert({
        codigo,
        nome,
        categoria,
        unidade,
        quantidade,
        estoque_minimo,
        valor_unitario,
        id_fornecedor,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um produto cadastrado com este código.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_PRODUTO',
      detalhes: { codigo, nome, quantidade },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Edita um produto existente
export async function PUT(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    const perfil = String(user.perfil || '').toLowerCase();
    if (!['admin', 'operador'].includes(perfil)) {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;
    const codigo = String(body.codigo || '').trim();
    const nome = String(body.nome || '').trim();
    const categoria = String(body.categoria || '').trim();
    const unidade = String(body.unidade || 'UN').trim();
    const quantidade = parseFloat(String(body.quantidade ?? 0).replace(',', '.')) || 0;
    const estoque_minimo = parseFloat(String(body.estoque_minimo ?? 0).replace(',', '.')) || 0;
    const valor_unitario = parseFloat(String(body.valor_unitario ?? 0).replace(',', '.')) || 0;
    const id_fornecedor = body.id_fornecedor || null;

    if (!id || !codigo || !nome) {
      return NextResponse.json({ error: 'ID, Código e Nome são obrigatórios para edição.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('produtos')
      .update({
        codigo,
        nome,
        categoria,
        unidade,
        quantidade,
        estoque_minimo,
        valor_unitario,
        id_fornecedor,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe outro produto com este código.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EDICAO_PRODUTO',
      detalhes: { id_produto: id, codigo, nome },
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Exclui um produto (Admin e Operador)
export async function DELETE(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    const perfil = String(user.perfil || '').toLowerCase();

    if (!['admin', 'operador'].includes(perfil)) {
      return NextResponse.json({ error: 'Perfil sem permissão para excluir produtos.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do produto não informado.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('produtos').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Este produto não pode ser excluído pois está vinculado a uma Estrutura BOM ou movimentação.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EXCLUSAO_PRODUTO',
      detalhes: { id_produto: id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}