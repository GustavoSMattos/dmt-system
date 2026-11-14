import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para movimentação de estoque' }, { status: 403 });
    }

    const { itens, origem } = await req.json();

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado para movimentação em lote' }, { status: 400 });
    }

    for (const item of itens) {
      const { data: produto } = await supabaseAdmin
        .from('produtos')
        .select('id, quantidade')
        .eq('codigo', item.codigo)
        .single();

      if (!produto) {
        return NextResponse.json({ error: `Produto com código ${item.codigo} não encontrado.` }, { status: 404 });
      }

      const qtdAlteracao = Number(item.quantidade);
      const novaQtd = item.tipo === 'ENTRADA'
        ? Number(produto.quantidade) + qtdAlteracao
        : Number(produto.quantidade) - qtdAlteracao;

      if (novaQtd < 0) {
        return NextResponse.json({ error: `Estoque insuficiente para o código ${item.codigo}` }, { status: 400 });
      }

      // Atualiza o saldo do produto existente
      await supabaseAdmin
        .from('produtos')
        .update({ quantidade: novaQtd })
        .eq('id', produto.id);

      // Registra no histórico de movimentações
      await supabaseAdmin.from('movimentacoes_estoque').insert({
        id_produto: produto.id,
        tipo: item.tipo,
        origem: origem || 'LOTE',
        quantidade: qtdAlteracao,
        id_usuario: user.id,
      });
    }

    // Registrar log de auditoria
    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'MOVIMENTACAO_ESTOQUE_LOTE',
      detalhes: { total_itens: itens.length, origem: origem || 'LOTE' },
    });

    return NextResponse.json({ success: true, message: 'Movimentação em lote concluída com sucesso!' });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao processar movimentação em lote' }, { status: 500 });
  }
}