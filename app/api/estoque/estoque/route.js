import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.perfil === 'visualizador') {
      return NextResponse.json({ error: 'Perfil sem permissão para dar entrada via NF-e' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('xml');

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo XML foi enviado' }, { status: 400 });

    const xmlText = await file.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsedXml = parser.parse(xmlText);

    const nfeProc = parsedXml.nfeProc || parsedXml.NFe;
    if (!nfeProc?.NFe?.infNFe) {
      return NextResponse.json({ error: 'Estrutura do XML de NF-e é inválida' }, { status: 400 });
    }

    const infNFe = nfeProc.NFe.infNFe;
    const emitente = infNFe.emit;
    const chaveNFe = infNFe['@_Id'] ? infNFe['@_Id'].replace('NFe', '') : 'N/A';

    let detList = infNFe.det;
    if (!Array.isArray(detList)) detList = [detList];

    // Busca ou insere fornecedor automaticamente
    let idFornecedor = null;
    if (emitente?.CNPJ) {
      const { data: fornExistente } = await supabaseAdmin
        .from('fornecedores')
        .select('id')
        .eq('cnpj', emitente.CNPJ)
        .single();

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
      const codigoProduto = (prod.cEAN && prod.cEAN !== 'SEM GTIN') ? prod.cEAN : prod.cProd;
      const quantidade = parseFloat(prod.qCom);
      const valorUnitario = parseFloat(prod.vUnCom);

      const { data: produtoExistente } = await supabaseAdmin
        .from('produtos')
        .select('id, quantidade')
        .eq('codigo', codigoProduto)
        .single();

      if (produtoExistente) {
        // Incrementa saldo do produto existente
        const novaQtd = Number(produtoExistente.quantidade) + quantidade;

        await supabaseAdmin
          .from('produtos')
          .update({
            quantidade: novaQtd,
            valor_unitario: valorUnitario,
            id_fornecedor: idFornecedor || undefined,
          })
          .eq('id', produtoExistente.id);

        await supabaseAdmin.from('movimentacoes_estoque').insert({
          id_produto: produtoExistente.id,
          tipo: 'ENTRADA',
          origem: 'NOTA_FISCAL',
          quantidade,
          id_usuario: user.id,
        });

        resultados.push({ codigo: codigoProduto, nome: prod.xProd, status: 'Atualizado (Incrementado)', quantidade });
      } else {
        // Cadastra novo produto
        const { data: novoProduto } = await supabaseAdmin
          .from('produtos')
          .insert({
            codigo: codigoProduto,
            nome: prod.xProd,
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

    // Registrar log de auditoria
    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'IMPORTACAO_XML_NFE',
      detalhes: { chave_nfe: chaveNFe, fornecedor: emitente?.xNome, total_itens: resultados.length },
    });

    return NextResponse.json({
      success: true,
      message: `NF-e processada com sucesso! ${resultados.length} item(ns) atualizado(s).`,
      itens: resultados,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao processar arquivo XML da Nota Fiscal' }, { status: 500 });
  }
}