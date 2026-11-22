import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista todos os Trailers (Trailer Groups) trazendo suas BOMs, itens e custos completos
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('trailer_groups')
      .select(`
        *,
        trailer_group_boms (
          id,
          id_bom,
          quantidade,
          trailers (
            id,
            nome,
            categoria,
            descricao,
            trailer_componentes (
              id,
              id_produto,
              id_servico,
              quantidade_necessaria,
              produtos (
                id,
                codigo,
                nome,
                unidade,
                quantidade,
                valor_unitario
              ),
              servicos (
                id,
                codigo,
                nome,
                unidade,
                valor
              )
            )
          )
        )
      `)
      .order('criado_em', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar trailers.' }, { status: 500 });
  }
}

// POST: Cadastra um novo Trailer Group (BOM das BOMs)
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const { codigo, nome, modelo, descricao, boms } = await req.json();

    if (!codigo || !nome || !Array.isArray(boms) || boms.length === 0) {
      return NextResponse.json(
        { error: 'Código, Nome do Trailer e pelo menos uma Estrutura BOM são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data: trailerCriado, error: errInsert } = await supabaseAdmin
      .from('trailer_groups')
      .insert({
        codigo: String(codigo).trim(),
        nome: String(nome).trim(),
        modelo: String(modelo || '').trim(),
        descricao: String(descricao || '').trim(),
      })
      .select()
      .single();

    if (errInsert) {
      if (errInsert.code === '23505') {
        return NextResponse.json({ error: 'Já existe um trailer cadastrado com este código.' }, { status: 400 });
      }
      return NextResponse.json({ error: errInsert.message }, { status: 500 });
    }

    const vinculos = boms.map((b) => ({
      id_trailer_group: trailerCriado.id,
      id_bom: b.id_bom,
      quantidade: parseFloat(b.quantidade) || 1,
    }));

    const { error: errVinculo } = await supabaseAdmin
      .from('trailer_group_boms')
      .insert(vinculos);

    if (errVinculo) {
      await supabaseAdmin.from('trailer_groups').delete().eq('id', trailerCriado.id);
      if (errVinculo.code === '23505') {
        return NextResponse.json(
          { error: 'Não adicione a mesma Estrutura BOM duplicada no mesmo trailer. Ajuste a quantidade.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Erro ao vincular BOMs ao trailer: ' + errVinculo.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_TRAILER_GROUP',
      detalhes: { codigo: trailerCriado.codigo, nome: trailerCriado.nome, total_boms: vinculos.length },
    });

    return NextResponse.json(trailerCriado);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Atualiza um Trailer Group existente
export async function PUT(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const { id, codigo, nome, modelo, descricao, boms } = await req.json();

    if (!id || !codigo || !nome || !Array.isArray(boms) || boms.length === 0) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes para atualizar trailer.' }, { status: 400 });
    }

    const { data: trailerAtualizado, error: errUpdate } = await supabaseAdmin
      .from('trailer_groups')
      .update({
        codigo: String(codigo).trim(),
        nome: String(nome).trim(),
        modelo: String(modelo || '').trim(),
        descricao: String(descricao || '').trim(),
      })
      .eq('id', id)
      .select()
      .single();

    if (errUpdate) {
      if (errUpdate.code === '23505') {
        return NextResponse.json({ error: 'Já existe outro trailer com este código.' }, { status: 400 });
      }
      return NextResponse.json({ error: errUpdate.message }, { status: 500 });
    }

    await supabaseAdmin.from('trailer_group_boms').delete().eq('id_trailer_group', id);

    const vinculos = boms.map((b) => ({
      id_trailer_group: id,
      id_bom: b.id_bom,
      quantidade: parseFloat(b.quantidade) || 1,
    }));

    const { error: errVinculo } = await supabaseAdmin
      .from('trailer_group_boms')
      .insert(vinculos);

    if (errVinculo) {
      return NextResponse.json({ error: 'Erro ao atualizar BOMs do trailer: ' + errVinculo.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EDICAO_TRAILER_GROUP',
      detalhes: { id_trailer_group: id, codigo: trailerAtualizado.codigo, nome: trailerAtualizado.nome },
    });

    return NextResponse.json(trailerAtualizado);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Exclui um Trailer Group (Admin e Operador)
export async function DELETE(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'operador'].includes(user.perfil)) {
      return NextResponse.json({ error: 'Perfil sem permissão para excluir trailers.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do trailer não informado.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('trailer_groups').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EXCLUSAO_TRAILER_GROUP',
      detalhes: { id_trailer_group: id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}