import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
    }

    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para movimentar estoque.' }, { status: 403 });
    }

    const body = await req.json();
    const { itens, origem = 'LOTE', fornecedor = null, chave_nfe = null } = body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item enviado para movimentação.' }, { status: 400 });
    }

    // Se vier dados de fornecedor da NF-e, busca ou cadastra automaticamente
    let idFornecedor = null;
    if (fornecedor?.cnpj) {
      const { data: fornExistente } = await supabaseAdmin
        .from('fornecedores')
        .select('id')
        .eq('cnpj', fornecedor.cnpj)
        .maybeSingle();

      if (fornExistente) {
        idFornecedor = fornExistente.id;
      } else {
        const { data: novoForn } = await supabaseAdmin
          .from('fornecedores')
          .insert({
            nome_empresa: fornecedor.nome_empresa || 'Fornecedor NF-e',
            cnpj: fornecedor.cnpj,
            telefone: fornecedor.telefone || '',
            email: '',
          })
          .select('id')
          .single();

        if (novoForn) idFornecedor = novoForn.id;
      }
    }

    const resultados = [];

    for (const item of itens) {
      const codigo = String(item.codigo || '').trim();
      const quantidade = parseFloat(item.quantidade) || 0;
      const tipo = item.tipo || 'ENTRADA';

      if (!codigo || quantidade <= 0) continue;

      const { data: produtoExistente } = await supabaseAdmin
        .from('produtos')
        .select('id, nome, quantidade')
        .eq('codigo', codigo)
        .maybeSingle();

      if (produtoExistente) {
        const saldoAtual = Number(produtoExistente.quantidade || 0);
        if (tipo === 'SAIDA' && saldoAtual < quantidade) {
          return NextResponse.json(
            { error: `Saldo insuficiente para o produto "${produtoExistente.nome}" (${codigo}). Atual: ${saldoAtual}` },
            { status: 400 }
          );
        }

        const novoSaldo = tipo === 'ENTRADA' ? saldoAtual + quantidade : saldoAtual - quantidade;

        const updatePayload = { quantidade: novoSaldo };
        if (origem === 'NOTA_FISCAL') {
          if (item.valor_unitario !== undefined) updatePayload.valor_unitario = parseFloat(item.valor_unitario) || 0;
          if (idFornecedor) updatePayload.id_fornecedor = idFornecedor;
        }

        await supabaseAdmin
          .from('produtos')
          .update(updatePayload)
          .eq('id', produtoExistente.id);

        await supabaseAdmin.from('movimentacoes_estoque').insert({
          id_produto: produtoExistente.id,
          tipo,
          origem,
          quantidade,
          id_usuario: user.id,
        });

        resultados.push({
          codigo,
          nome: produtoExistente.nome,
          quantidade,
          status: tipo === 'ENTRADA' ? 'Saldo Atualizado (+ Entrada)' : 'Saldo Atualizado (- Saída)',
        });
      } else if (origem === 'NOTA_FISCAL' && tipo === 'ENTRADA') {
        // Cadastra automaticamente o produto novo vindo da NF-e
        const { data: novoProduto, error: errInsert } = await supabaseAdmin
          .from('produtos')
          .insert({
            codigo,
            nome: item.nome || 'Produto NF-e',
            categoria: item.categoria || 'NF-e Importada',
            unidade: item.unidade || 'UN',
            quantidade,
            valor_unitario: parseFloat(item.valor_unitario) || 0,
            estoque_minimo: 0,
            leadtime: 0,
            id_fornecedor: idFornecedor,
          })
          .select('id, nome')
          .single();

        if (errInsert) {
          return NextResponse.json(
            { error: `Erro ao cadastrar novo produto "${item.nome || codigo}": ${errInsert.message}` },
            { status: 500 }
          );
        }

        await supabaseAdmin.from('movimentacoes_estoque').insert({
          id_produto: novoProduto.id,
          tipo: 'ENTRADA',
          origem: 'NOTA_FISCAL',
          quantidade,
          id_usuario: user.id,
        });

        resultados.push({
          codigo,
          nome: novoProduto.nome,
          quantidade,
          status: 'Novo Produto Cadastrado',
        });
      } else {
        return NextResponse.json(
          { error: `Produto com código/SKU "${codigo}" não encontrado na base de dados.` },
          { status: 404 }
        );
      }
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: origem === 'NOTA_FISCAL' ? 'IMPORTACAO_XML_NFE' : 'MOVIMENTACAO_LOTE',
      detalhes: {
        origem,
        ...(chave_nfe && { chave_nfe }),
        total_itens: resultados.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${resultados.length} item(ns) processado(s) com sucesso!`,
      itens: resultados,
    });
  } catch (err) {
    return NextResponse.json({ error: `Erro interno: ${err.message}` }, { status: 500 });
  }
}