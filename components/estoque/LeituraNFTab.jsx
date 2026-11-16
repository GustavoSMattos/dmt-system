'use client';

import { useState, useEffect } from 'react';

export default function LeituraNFTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState('upload'); // 'upload' | 'preview' | 'concluido'
  const [fornecedor, setFornecedor] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [codigosExistentes, setCodigosExistentes] = useState(new Set());
  const [chaveNFe, setChaveNFe] = useState('');
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [resultadoFinal, setResultadoFinal] = useState(null);

  // Carrega os SKUs existentes na base para revalidar dinamicamente caso o usuário edite o código na tabela
  const carregarCodigosBase = async () => {
    try {
      const res = await fetch('/api/produtos');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCodigosExistentes(new Set(data.map((p) => String(p.codigo || '').trim().toLowerCase())));
      }
    } catch {
      // Silencioso; o preview já faz a checagem inicial no servidor
    }
  };

  useEffect(() => {
    carregarCodigosBase();
  }, []);

  // 1. Faz o upload e busca a prévia sem salvar no banco
  const handleGerarPreview = async (e) => {
    e.preventDefault();
    if (!file) return setMensagem({ tipo: 'erro', texto: 'Selecione um arquivo XML.' });

    setLoading(true);
    setMensagem({ tipo: '', texto: '' });
    setTextoConfirmacao('');

    try {
      await carregarCodigosBase();

      const formData = new FormData();
      formData.append('xml', file);

      const res = await fetch('/api/estoque/xml/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao ler arquivo XML.');

      setFornecedor(data.fornecedor);
      setProdutos(data.produtos);
      setChaveNFe(data.chave_nfe);
      setEtapa('preview');
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 2. Altera um campo específico de um produto na prévia e reavalia se é novo na base
  const handleProdutoChange = (index, field, value) => {
    const novosProdutos = [...produtos];
    novosProdutos[index][field] = value;

    if (field === 'codigo') {
      const codigoLimpo = String(value || '').trim().toLowerCase();
      novosProdutos[index].is_novo = !codigosExistentes.has(codigoLimpo);
    }

    setProdutos(novosProdutos);
  };

  // 3. Remove um produto da prévia
  const handleRemoverProduto = (index) => {
    const novosProdutos = produtos.filter((_, i) => i !== index);
    setProdutos(novosProdutos);
  };

  // Identifica os produtos novos presentes na lista atual da prévia
  const produtosNovos = produtos.filter((p) => p.is_novo);
  const exigeConfirmacao = produtosNovos.length > 0;
  const confirmacaoValida = !exigeConfirmacao || textoConfirmacao.trim() === 'Confirmo';

  // 4. Confirma e envia a lista editada final para o banco de dados
  const handleConfirmarImportacao = async () => {
    if (produtos.length === 0) {
      return setMensagem({ tipo: 'erro', texto: 'Todos os itens foram removidos. Adicione ou envie outro XML.' });
    }

    if (exigeConfirmacao && textoConfirmacao.trim() !== 'Confirmo') {
      return setMensagem({
        tipo: 'erro',
        texto: 'Digite exatamente "Confirmo" para autorizar o cadastro dos novos produtos na base.',
      });
    }

    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const itensFormatados = produtos.map((p) => ({
        codigo: p.codigo,
        nome: p.nome,
        quantidade: parseFloat(p.quantidade) || 0,
        valor_unitario: parseFloat(p.valor_unitario) || 0,
        unidade: p.unidade,
        categoria: p.categoria,
        tipo: 'ENTRADA',
      }));

      const res = await fetch('/api/estoque/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: itensFormatados,
          origem: 'NOTA_FISCAL',
          fornecedor,
          chave_nfe: chaveNFe,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gravar produtos no estoque.');

      setResultadoFinal(data);
      setEtapa('concluido');
      carregarCodigosBase();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReiniciar = () => {
    setFile(null);
    setEtapa('upload');
    setFornecedor(null);
    setProdutos([]);
    setTextoConfirmacao('');
    setMensagem({ tipo: '', texto: '' });
    setResultadoFinal(null);
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>Entrada por NF-e (XML) com Pré-visualização</h3>
      <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
        Envie o arquivo XML da NF-e para conferir, editar ou remover produtos antes de dar entrada no estoque.
      </p>

      {mensagem.texto && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
            color: mensagem.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
            fontSize: '14px',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      {/* ETAPA 1: UPLOAD DO XML */}
      {etapa === 'upload' && (
        <form onSubmit={handleGerarPreview}>
          <div style={{ border: '2px dashed #cbd5e1', padding: '32px', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '16px' }}>
            <input
              type="file"
              accept=".xml"
              onChange={(e) => setFile(e.target.files[0] || null)}
              id="xml-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="xml-upload" style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 'bold' }}>
              {file ? `Arquivo selecionado: ${file.name}` : 'Clique aqui para escolher o arquivo XML'}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              padding: '10px 24px',
              backgroundColor: loading || !file ? '#94a3b8' : '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Lendo XML...' : 'Carregar Prévia da NF-e'}
          </button>
        </form>
      )}

      {/* ETAPA 2: EDIÇÃO E CONFIRMAÇÃO */}
      {etapa === 'preview' && (
        <div>
          {fornecedor && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: 0, color: '#0f172a' }}>Fornecedor Identificado: {fornecedor.nome_empresa}</h4>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                CNPJ: {fornecedor.cnpj} | Telefone: {fornecedor.telefone || '-'}
              </p>
            </div>
          )}

          <h4 style={{ marginBottom: '12px', color: '#0f172a' }}>Produtos da NF-e ({produtos.length} item(ns))</h4>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
            Altere os dados diretamente nos campos da tabela ou clique no botão vermelho para excluir um item.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '120px' }}>Situação</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Código / SKU *</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Nome do Produto *</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Categoria</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Unid.</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '90px' }}>Qtd</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '110px' }}>Valor Unit.</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '60px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((prod, index) => (
                  <tr key={index} style={{ backgroundColor: prod.is_novo ? '#fffbeb' : '#fff' }}>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {prod.is_novo ? (
                        <span
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'inline-block',
                          }}
                        >
                          NOVO NA BASE
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'inline-block',
                          }}
                        >
                          JÁ CADASTRADO
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={prod.codigo}
                        onChange={(e) => handleProdutoChange(index, 'codigo', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={prod.nome}
                        onChange={(e) => handleProdutoChange(index, 'nome', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={prod.categoria}
                        onChange={(e) => handleProdutoChange(index, 'categoria', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={prod.unidade}
                        onChange={(e) => handleProdutoChange(index, 'unidade', e.target.value)}
                        style={{ width: '50px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={prod.quantidade}
                        onChange={(e) => handleProdutoChange(index, 'quantidade', e.target.value)}
                        style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={prod.valor_unitario}
                        onChange={(e) => handleProdutoChange(index, 'valor_unitario', e.target.value)}
                        style={{ width: '100px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoverProduto(index)}
                        style={{ padding: '6px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        title="Excluir produto da lista"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ALERTA DE NOVOS PRODUTOS EXIGINDO DIGITAÇÃO DE "Confirmo" */}
          {exigeConfirmacao && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', color: '#b45309', fontSize: '15px' }}>
                Atenção: {produtosNovos.length} produto(s) novo(s) identificado(s) na base de dados
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#78350f' }}>
                Os seguintes produtos ainda não estão cadastrados e serão criados automaticamente no estoque:
              </p>
              <ul style={{ margin: '0 0 14px 20px', padding: 0, color: '#92400e', fontSize: '14px', fontWeight: '600' }}>
                {produtosNovos.map((p, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {p.nome || '(Produto sem nome)'} <span style={{ fontWeight: 'normal', fontSize: '13px' }}>(SKU: {p.codigo})</span>
                  </li>
                ))}
              </ul>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#78350f', marginBottom: '6px' }}>
                Para autorizar o cadastro destes produtos na base, digite <span style={{ textDecoration: 'underline' }}>Confirmo</span> abaixo:
              </label>
              <input
                type="text"
                placeholder="Digite Confirmo"
                value={textoConfirmacao}
                onChange={(e) => setTextoConfirmacao(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '280px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #f59e0b',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleReiniciar}
              style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancelar / Outro XML
            </button>
            <button
              type="button"
              onClick={handleConfirmarImportacao}
              disabled={loading || produtos.length === 0 || !confirmacaoValida}
              style={{
                padding: '10px 24px',
                backgroundColor: loading || produtos.length === 0 || !confirmacaoValida ? '#86efac' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: loading || produtos.length === 0 || !confirmacaoValida ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Gravando no Estoque...' : `Confirmar e Salvar ${produtos.length} Item(ns)`}
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: CONCLUÍDO */}
      {etapa === 'concluido' && (
        <div>
          <div style={{ padding: '16px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '16px' }}>
            <h4 style={{ margin: 0 }}>Importação concluída com sucesso!</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {resultadoFinal?.message || 'Os itens foram adicionados/atualizados no banco de dados.'}
            </p>
          </div>

          {resultadoFinal?.itens && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Código / SKU</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Produto</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Qtd</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {resultadoFinal.itens.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{item.codigo}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.nome}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.quantidade}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button
            type="button"
            onClick={handleReiniciar}
            style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Importar Nova NF-e
          </button>
        </div>
      )}
    </div>
  );
}