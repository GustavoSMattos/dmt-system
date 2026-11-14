import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

// Garante que a rota seja tratada dinamicamente sem cache estático no build
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Sessão não encontrada ou expirada. Faça login novamente.' }, { status: 401 });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
    }

    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para importar NF-e.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('xml');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo XML foi enviado.' }, { status: 400 });
    }

    const xmlText = await file.text();
    if (!xmlText || (!xmlText.includes('nfeProc') && !xmlText.includes('infNFe'))) {
      return NextResponse.json({ error: 'O arquivo enviado não possui uma estrutura válida de NF-e.' }, { status: 400 });
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    
    const parsedXml = parser.parse(xmlText);
    const nfeProc = parsedXml.nfeProc || parsedXml.NFe || parsedXml;
    const infNFe = nfeProc?.NFe?.infNFe || nfeProc?.infNFe;

    if (!infNFe) {
      return NextResponse.json({ error: 'Não foi possível ler as informações (<infNFe>) da Nota Fiscal.' }, { status: 400 });
    }

    const emitente = infNFe.emit;
    const chaveNFe = infNFe['@_Id'] ? infNFe['@_Id'].replace('NFe', '') : 'N/A';

    let detList = infNFe.det;
    if (!Array.isArray(detList)) detList = [detList];

    // Fornecedor
    let idFornecedor = null;
    if (emitente?.CNPJ) {
      const { data: fornExistente } = await supabaseAdmin
        .from('fornecedores')
        .select('id')
        .eq('cnpj', emitente.CNPJ)
        .maybeSingle();

      if (fornExistente) {
        idFornecedor = fornExistente.id;
      } else {
        const { data: novoForn } = await supabaseAdmin
          .from('fornecedores')
          .insert({
            nome_empresa: emitente.xNome || 'Fornecedor NF-e',
            cnpj: emitente.CNPJ,
            telefone: emitente.enderEmit?.fone || '',
            email: '',
          })
          .select('id')
          .single();

        if (novoForn) idFornecedor = novoForn.id;
      }
    }

    const resultados = [];

    for (const item of detList) {
      const prod = item.prod;
      if (!prod) continue;

      const codigoProduto = (prod.cEAN && prod.cEAN !== 'SEM GTIN') ? String(prod.cEAN) : String(prod.cProd);
      const quantidade = parseFloat(prod.qCom) || 0;
      const valorUnitario = parseFloat(prod.vUnCom) || 0;

      const { data: produtoExistente } = await supabaseAdmin
        .from('produtos')
        .select('id, quantidade')
        .eq('codigo', codigoProduto)
        .maybeSingle();

      if (produtoExistente) {
        const novaQtd = Number(produtoExistente.quantidade) + quantidade;

        await supabaseAdmin
          .from('produtos')
          .update({
            quantidade: novaQtd,
            valor_unitario: valorUnitario,
            ...(idFornecedor && { id_fornecedor: idFornecedor }),
          })
          .eq('id', produtoExistente.id);

        await supabaseAdmin.from('movimentacoes_estoque').insert({
          id_produto: produtoExistente.id,
          tipo: 'ENTRADA',
          origem: 'NOTA_FISCAL',
          quantidade,
          id_usuario: user.id,
        });

        resultados.push({ codigo: codigoProduto, nome: prod.xProd, status: 'Atualizado (+ Qtd)', quantidade });
      } else {
        const { data: novoProduto } = await supabaseAdmin
          .from('produtos')
          .insert({
            codigo: codigoProduto,
            nome: prod.xProd || 'Produto sem nome',
            id_fornecedor: idFornecedor,
            categoria: 'NF-e Importada',
            unidade: prod.uCom || 'UN',
            quantidade,
            valor_unitario: valorUnitario,
          })
          .select('id')
          .single();

        if (novoProduto) {
          await supabaseAdmin.from('movimentacoes_estoque').insert({
            id_produto: novoProduto.id,
            tipo: 'ENTRADA',
            origem: 'NOTA_FISCAL',
            quantidade,
            id_usuario: user.id,
          });

          resultados.push({ codigo: codigoProduto, nome: prod.xProd, status: 'Novo Produto Cadastrado', quantidade });
        }
      }
    }

    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'IMPORTACAO_XML_NFE',
      detalhes: { chave_nfe: chaveNFe, fornecedor: emitente?.xNome, total_itens: resultados.length },
    });

    return NextResponse.json({
      success: true,
      message: `NF-e importada! ${resultados.length} produto(s) processado(s).`,
      itens: resultados,
    });
  } catch (err) {
    return NextResponse.json({ error: `Erro ao processar NF-e: ${err.message}` }, { status: 500 });
  }
}