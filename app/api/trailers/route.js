import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista todas as BOMs trazendo produtos e serviços vinculados
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('trailers')
      .select(`
        *,
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
      `)
      .order('criado_em', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar estruturas BOM.' }, { status: 500 });
  }
}

// POST: Cria nova Estrutura BOM com Produtos e/ou Serviços
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const { nome, categoria, descricao, componentes } = await req.json();

    if (!nome || !categoria || !Array.isArray(componentes) || componentes.length === 0) {
      return NextResponse.json(
        { error: 'Nome, categoria e pelo menos um item (produto ou serviço) são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data: bomCriada, error: errBom } = await supabaseAdmin
      .from('trailers')
      .insert({ nome: nome.trim(), categoria: categoria.trim(), descricao: descricao || '' })
      .select()
      .single();

    if (errBom) return NextResponse.json({ error: errBom.message }, { status: 500 });

    const itensInserir = componentes.map((c) => ({
      id_trailer: bomCriada.id,
      id_produto: c.tipo === 'SERVICO' ? null : c.id_item,
      id_servico: c.tipo === 'SERVICO' ? c.id_item : null,
      quantidade_necessaria: parseFloat(c.quantidade_necessaria) || 1,
    }));

    const { error: errComp } = await supabaseAdmin
      .from('trailer_componentes')
      .insert(itensInserir);

    if (errComp) {
      await supabaseAdmin.from('trailers').delete().eq('id', bomCriada.id);
      return NextResponse.json({ error: 'Erro ao vincular itens na BOM: ' + errComp.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_BOM',
      detalhes: { nome: bomCriada.nome, categoria: bomCriada.categoria, total_itens: itensInserir.length },
    });

    return NextResponse.json(bomCriada);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Atualiza Estrutura BOM existente
export async function PUT(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const { id, nome, categoria, descricao, componentes } = await req.json();

    if (!id || !nome || !categoria || !Array.isArray(componentes) || componentes.length === 0) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes para atualizar BOM.' }, { status: 400 });
    }

    const { data: bomAtualizada, error: errUpdate } = await supabaseAdmin
      .from('trailers')
      .update({ nome: nome.trim(), categoria: categoria.trim(), descricao: descricao || '' })
      .eq('id', id)
      .select()
      .single();

    if (errUpdate) return NextResponse.json({ error: errUpdate.message }, { status: 500 });

    await supabaseAdmin.from('trailer_componentes').delete().eq('id_trailer', id);

    const itensInserir = componentes.map((c) => ({
      id_trailer: id,
      id_produto: c.tipo === 'SERVICO' ? null : c.id_item,
      id_servico: c.tipo === 'SERVICO' ? c.id_item : null,
      quantidade_necessaria: parseFloat(c.quantidade_necessaria) || 1,
    }));

    const { error: errComp } = await supabaseAdmin
      .from('trailer_componentes')
      .insert(itensInserir);

    if (errComp) {
      return NextResponse.json({ error: 'Erro ao atualizar itens da BOM: ' + errComp.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EDICAO_BOM',
      detalhes: { id_bom: id, nome: bomAtualizada.nome },
    });

    return NextResponse.json(bomAtualizada);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}