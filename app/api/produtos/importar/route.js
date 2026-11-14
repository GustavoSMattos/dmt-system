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

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para importar produtos.' }, { status: 403 });
    }

    const { produtos } = await req.json();

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto válido enviado para importação.' }, { status: 400 });
    }

    // Carrega fornecedores para mapear CNPJ -> id_fornecedor
    const { data: fornecedores } = await supabaseAdmin
      .from('fornecedores')
      .select('id, cnpj');

    const mapaFornecedores = new Map();
    if (fornecedores) {
      fornecedores.forEach((f) => {
        const cnpjLimpo = String(f.cnpj || '').replace(/\D/g, '');
        if (cnpjLimpo) mapaFornecedores.set(cnpjLimpo, f.id);
      });
    }

    const resultados = [];

    for (const item of produtos) {
      const codigo = String(item.codigo || '').trim();
      const nome = String(item.nome || '').trim();
      const categoria = String(item.categoria || 'Geral').trim();
      const unidade = String(item.unidade || 'UN').trim().toUpperCase();
      const quantidade = parseFloat(String(item.quantidade || 0).replace(',', '.')) || 0;
      const valorUnitario = parseFloat(String(item.valor_unitario || 0).replace(',', '.')) || 0;
      const estoqueMinimo = parseFloat(String(item.estoque_minimo || 0).replace(',', '.')) || 0;
      const leadtime = parseInt(item.leadtime, 10) || 0;

      const cnpjLimpo = String(item.cnpj_fornecedor || '').replace(/\D/g, '');
      const idFornecedor = cnpjLimpo ? mapaFornecedores.get(cnpjLimpo) || null : null;

      if (!codigo || !nome) continue;

      // Verifica se o produto já existe pelo código único
      const { data: existente } = await supabaseAdmin
        .from('produtos')
        .select('id, quantidade')
        .eq('codigo', codigo)
        .maybeSingle();

      if (existente) {
        const novaQtd = Number(existente.quantidade) + quantidade;

        const { error: errUpdate } = await supabaseAdmin
          .from('produtos')
          .update({
            nome,
            categoria,
            unidade,
            quantidade: novaQtd,
            valor_unitario: valorUnitario,
            estoque_minimo: estoqueMinimo,
            leadtime,
            ...(idFornecedor && { id_fornecedor: idFornecedor }),
          })
          .eq('id', existente.id);

        if (!errUpdate) {
          if (quantidade > 0) {
            await supabaseAdmin.from('movimentacoes_estoque').insert({
              id_produto: existente.id,
              tipo: 'ENTRADA',
              origem: 'LOTE',
              quantidade,
              id_usuario: user.id,
            });
          }
          resultados.push({ codigo, nome, status: 'Atualizado (+ Saldo)', quantidade });
        }
      } else {
        const { data: novoProduto, error: errInsert } = await supabaseAdmin
          .from('produtos')
          .insert({
            codigo,
            nome,
            categoria,
            unidade,
            quantidade,
            valor_unitario: valorUnitario,
            estoque_minimo: estoqueMinimo,
            leadtime,
            id_fornecedor: idFornecedor,
          })
          .select('id')
          .single();

        if (!errInsert && novoProduto) {
          if (quantidade > 0) {
            await supabaseAdmin.from('movimentacoes_estoque').insert({
              id_produto: novoProduto.id,
              tipo: 'ENTRADA',
              origem: 'LOTE',
              quantidade,
              id_usuario: user.id,
            });
          }
          resultados.push({ codigo, nome, status: 'Novo Cadastrado', quantidade });
        }
      }
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'IMPORTACAO_PLANILHA_PRODUTOS',
      detalhes: { total_processados: resultados.length },
    });

    return NextResponse.json({
      success: true,
      message: `${resultados.length} produto(s) processado(s) com sucesso!`,
      itens: resultados,
    });
  } catch (err) {
    return NextResponse.json({ error: `Erro ao importar planilha: ${err.message}` }, { status: 500 });
  }
}