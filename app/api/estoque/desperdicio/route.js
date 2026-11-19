import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const CLASSIFICACOES_PERMITIDAS = ['Acidente', 'Defeito de fabrica', 'Mau uso'];

// GET: Lista o histórico de desperdícios registrados com os dados do produto
export async function GET(req) {
  try {
    const { data, error } = await supabaseAdmin
      .from('desperdicios')
      .select(`
        *,
        produtos (
          id,
          codigo,
          nome,
          unidade,
          valor_unitario
        )
      `)
      .order('criado_em', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar registros de desperdício.' }, { status: 500 });
  }
}

// POST: Registra baixa por desperdício e subtrai do saldo do produto
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
      return NextResponse.json({ error: 'Perfil sem permissão para registrar baixas.' }, { status: 403 });
    }

    const body = await req.json();
    const { id_produto, quantidade, colaborador_responsavel, classificacao, descricao } = body;

    const qtdNum = parseFloat(quantidade);
    const colabLimpo = String(colaborador_responsavel || '').trim();
    const classifLimpa = String(classificacao || '').trim();
    const descLimpa = String(descricao || '').trim();

    // Validação obrigatória de todos os campos
    if (!id_produto || !qtdNum || qtdNum <= 0 || !colabLimpo || !classifLimpa || !descLimpa) {
      return NextResponse.json(
        { error: 'Todos os campos são de preenchimento obrigatório.' },
        { status: 400 }
      );
    }

    if (!CLASSIFICACOES_PERMITIDAS.includes(classifLimpa)) {
      return NextResponse.json(
        { error: 'Classificação inválida. Selecione Acidente, Defeito de fabrica ou Mau uso.' },
        { status: 400 }
      );
    }

    if (descLimpa.length > 1000) {
      return NextResponse.json(
        { error: 'A descrição do ocorrido deve ter no máximo 1000 caracteres.' },
        { status: 400 }
      );
    }

    // 1. Verifica se o produto existe e possui saldo suficiente para baixa
    const { data: produto, error: errProd } = await supabaseAdmin
      .from('produtos')
      .select('id, codigo, nome, unidade, quantidade')
      .eq('id', id_produto)
      .single();

    if (errProd || !produto) {
      return NextResponse.json({ error: 'Produto não encontrado na base de dados.' }, { status: 404 });
    }

    const saldoAtual = Number(produto.quantidade || 0);
    if (saldoAtual < qtdNum) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente para baixa do produto "${produto.nome}" (${produto.codigo}). Saldo atual: ${saldoAtual} ${produto.unidade}.`,
        },
        { status: 400 }
      );
    }

    const novoSaldo = saldoAtual - qtdNum;

    // 2. Atualiza o saldo na tabela produtos (apenas baixa)
    const { error: errUpdate } = await supabaseAdmin
      .from('produtos')
      .update({ quantidade: novoSaldo })
      .eq('id', produto.id);

    if (errUpdate) {
      return NextResponse.json({ error: 'Erro ao atualizar saldo do produto: ' + errUpdate.message }, { status: 500 });
    }

    // 3. Grava o registro detalhado na tabela desperdicios
    const { data: registroDesperdicio, error: errInsert } = await supabaseAdmin
      .from('desperdicios')
      .insert({
        id_produto: produto.id,
        quantidade: qtdNum,
        colaborador_responsavel: colabLimpo,
        classificacao: classifLimpa,
        descricao: descLimpa,
        id_usuario_registro: user.id,
      })
      .select()
      .single();

    if (errInsert) {
      // Reverte o saldo caso falhe ao salvar o registro
      await supabaseAdmin.from('produtos').update({ quantidade: saldoAtual }).eq('id', produto.id);
      return NextResponse.json({ error: 'Erro ao registrar desperdício: ' + errInsert.message }, { status: 500 });
    }

    // 4. Registra na movimentação geral e no log de auditoria
    await supabaseAdmin.from('movimentacoes_estoque').insert({
      id_produto: produto.id,
      tipo: 'SAIDA',
      origem: 'DESPERDICIO',
      quantidade: qtdNum,
      id_usuario: user.id,
    });

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'REGISTRO_DESPERDICIO',
      detalhes: {
        codigo: produto.codigo,
        produto: produto.nome,
        quantidade: qtdNum,
        colaborador_responsavel: colabLimpo,
        classificacao: classifLimpa,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Baixa por desperdício registrada com sucesso (${qtdNum} ${produto.unidade} de ${produto.nome}).`,
      registro: registroDesperdicio,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 });
  }
}