import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('xml');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo XML enviado.' }, { status: 400 });
    }

    const xmlText = await file.text();
    if (!xmlText || (!xmlText.includes('nfeProc') && !xmlText.includes('infNFe'))) {
      return NextResponse.json({ error: 'Estrutura de XML/NF-e inválida.' }, { status: 400 });
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

    const produtos = detList.map((item, index) => {
      const prod = item.prod || {};
      const codigoProduto = (prod.cEAN && prod.cEAN !== 'SEM GTIN') ? String(prod.cEAN) : String(prod.cProd || '');
      
      return {
        id_temp: index + 1,
        codigo: codigoProduto,
        nome: prod.xProd || '',
        categoria: 'NF-e Importada',
        unidade: prod.uCom || 'UN',
        quantidade: parseFloat(prod.qCom) || 0,
        valor_unitario: parseFloat(prod.vUnCom) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      chave_nfe: chaveNFe,
      fornecedor: {
        nome_empresa: emitente?.xNome || 'Fornecedor NF-e',
        cnpj: emitente?.CNPJ || '',
        telefone: emitente?.enderEmit?.fone || '',
      },
      produtos,
    });
  } catch (err) {
    return NextResponse.json({ error: `Erro ao processar prévia do XML: ${err.message}` }, { status: 500 });
  }
}