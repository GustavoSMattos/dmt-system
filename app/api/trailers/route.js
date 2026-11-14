import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista todas as BOMs com os detalhes completos dos produtos vinculados
export async function GET(req) {
  try {
    const { data: boms, error } = await supabaseAdmin
      .from('trailers')
      .select(`
        *,
        trailer_componentes (
          id,
          id_produto,
          quantidade_necessaria,
          produtos (
            id,
            codigo,
            nome,
            categoria,
            unidade,
            quantidade,
            valor_unitario
          )
        )
      `)
      .order('criado_em', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(boms);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar estruturas BOM.' }, { status: 500 });
  }
}

// POST: Cadastra uma nova estrutura BOM
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para cadastrar BOM.' }, { status: 403 });
    }

    const body = await req.json();
    const { nome, categoria, descricao, componentes } = body;

    if (!nome || !categoria || !Array.isArray(componentes) || componentes.length === 0) {
      return NextResponse.json({ error: 'Nome, categoria e ao menos um componente são obrigatórios.' }, { status: 400 });
    }

    // 1. Cria o cabeçalho da BOM
    const { data: novaBom, error: errBom } = await supabaseAdmin
      .from('trailers')
      .insert({
        nome,
        categoria,
        descricao: descricao || '',
      })
      .select()
      .single();

    if (errBom) return NextResponse.json({ error: errBom.message }, { status: 500 });

    // 2. Insere os itens vinculados à BOM
    const itensParaInserir = componentes.map((comp) => ({
      id_trailer: novaBom.id,
      id_produto: comp.id_produto,
      quantidade_necessaria: parseFloat(comp.quantidade_necessaria) || 1,
    }));

    const { error: errItens } = await supabaseAdmin
      .from('trailer_componentes')
      .insert(itensParaInserir);

    if (errItens) {
      await supabaseAdmin.from('trailers').delete().eq('id', novaBom.id);
      return NextResponse.json({ error: 'Erro ao vincular componentes à BOM: ' + errItens.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'CADASTRO_BOM',
      detalhes: { id_bom: novaBom.id, nome, categoria, total_itens: itensParaInserir.length },
    });

    return NextResponse.json(novaBom);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Edita uma BOM existente (cabeçalho e lista de componentes)
export async function PUT(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para editar BOM.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, nome, categoria, descricao, componentes } = body;

    if (!id || !nome || !categoria || !Array.isArray(componentes) || componentes.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos para atualização da BOM.' }, { status: 400 });
    }

    // 1. Atualiza o cabeçalho
    const { data: bomAtualizada, error: errUpdate } = await supabaseAdmin
      .from('trailers')
      .update({
        nome,
        categoria,
        descricao: descricao || '',
      })
      .eq('id', id)
      .select()
      .single();

    if (errUpdate) return NextResponse.json({ error: errUpdate.message }, { status: 500 });

    // 2. Remove os componentes antigos e insere a nova lista editada
    const { error: errDelete } = await supabaseAdmin
      .from('trailer_componentes')
      .delete()
      .eq('id_trailer', id);

    if (errDelete) return NextResponse.json({ error: errDelete.message }, { status: 500 });

    const novosItens = componentes.map((comp) => ({
      id_trailer: id,
      id_produto: comp.id_produto,
      quantidade_necessaria: parseFloat(comp.quantidade_necessaria) || 1,
    }));

    const { error: errInsert } = await supabaseAdmin
      .from('trailer_componentes')
      .insert(novosItens);

    if (errInsert) return NextResponse.json({ error: errInsert.message }, { status: 500 });

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'EDICAO_BOM',
      detalhes: { id_bom: id, nome, categoria, total_itens: novosItens.length },
    });

    return NextResponse.json(bomAtualizada);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}