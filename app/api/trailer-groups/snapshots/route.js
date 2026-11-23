import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// GET: Lista snapshots salvos (de todos os trailers ou filtrado por id_trailer_group)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const idTrailerGroup = searchParams.get('id_trailer_group');

    let query = supabaseAdmin
      .from('trailer_snapshots')
      .select(`
        *,
        usuarios ( nome )
      `)
      .order('criado_em', { ascending: false });

    if (idTrailerGroup) {
      query = query.eq('id_trailer_group', idTrailerGroup);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar histórico de snapshots.' }, { status: 500 });
  }
}

// POST: Calcula os custos atuais do Trailer no servidor e grava o snapshot histórico
export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para gerar snapshots.' }, { status: 403 });
    }

    const { id_trailer_group, observacao } = await req.json();
    if (!id_trailer_group) {
      return NextResponse.json({ error: 'ID do Trailer não informado.' }, { status: 400 });
    }

    // Busca dados atualizados do trailer e suas BOMs/itens direto do banco
    const { data: tg, error: errBusca } = await supabaseAdmin
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
            trailer_componentes (
              id,
              id_produto,
              id_servico,
              quantidade_necessaria,
              produtos ( codigo, nome, unidade, valor_unitario ),
              servicos ( codigo, nome, unidade, valor )
            )
          )
        )
      `)
      .eq('id', id_trailer_group)
      .single();

    if (errBusca || !tg) {
      return NextResponse.json({ error: 'Trailer não encontrado para snapshot.' }, { status: 404 });
    }

    const mapaCategorias = new Map();
    let custoTotal = 0;
    let custoProdutos = 0;
    let custoServicos = 0;

    (tg.trailer_group_boms || []).forEach((vinculo) => {
      const bom = vinculo.trailers;
      if (!bom) return;

      const cat = bom.categoria || 'Sem Categoria';
      const qtdBom = Number(vinculo.quantidade || 1);

      let bomProd = 0;
      let bomServ = 0;

      (bom.trailer_componentes || []).forEach((comp) => {
        const isServ = Boolean(comp.id_servico || comp.servicos);
        const valUnit = Number(isServ ? comp.servicos?.valor || 0 : comp.produtos?.valor_unitario || 0);
        const sub = valUnit * Number(comp.quantidade_necessaria || 0);
        if (isServ) bomServ += sub;
        else bomProd += sub;
      });

      const subProd = bomProd * qtdBom;
      const subServ = bomServ * qtdBom;
      const subTotal = subProd + subServ;

      custoProdutos += subProd;
      custoServicos += subServ;
      custoTotal += subTotal;

      if (!mapaCategorias.has(cat)) {
        mapaCategorias.set(cat, {
          categoria: cat,
          custo_produtos: 0,
          custo_servicos: 0,
          custo_total: 0,
        });
      }

      const registroCat = mapaCategorias.get(cat);
      registroCat.custo_produtos += subProd;
      registroCat.custo_servicos += subServ;
      registroCat.custo_total += subTotal;
    });

    const detalhesCategorias = Array.from(mapaCategorias.values()).map((c) => ({
      categoria: c.categoria,
      custo_produtos: Number(c.custo_produtos.toFixed(2)),
      custo_servicos: Number(c.custo_servicos.toFixed(2)),
      custo_total: Number(c.custo_total.toFixed(2)),
    }));

    const { data: snapshotCriado, error: errInsert } = await supabaseAdmin
      .from('trailer_snapshots')
      .insert({
        id_trailer_group: tg.id,
        codigo_trailer: tg.codigo,
        nome_trailer: tg.nome,
        modelo_trailer: tg.modelo || '',
        custo_produtos: Number(custoProdutos.toFixed(2)),
        custo_servicos: Number(custoServicos.toFixed(2)),
        custo_total: Number(custoTotal.toFixed(2)),
        detalhes_categorias: detalhesCategorias,
        observacao: String(observacao || '').trim(),
        criado_por: user.id,
      })
      .select()
      .single();

    if (errInsert) {
      return NextResponse.json({ error: errInsert.message }, { status: 500 });
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'SNAPSHOT_CUSTO_TRAILER',
      detalhes: {
        codigo: tg.codigo,
        nome: tg.nome,
        custo_total: snapshotCriado.custo_total,
        observacao: snapshotCriado.observacao,
      },
    });

    return NextResponse.json(snapshotCriado);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Exclui um snapshot (Admin e Operador)
export async function DELETE(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'operador'].includes(user.perfil)) {
      return NextResponse.json({ error: 'Perfil sem permissão.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do snapshot não informado.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('trailer_snapshots').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}