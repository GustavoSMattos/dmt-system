'use client';

import { useState } from 'react';

export default function LeituraNFTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState('upload'); // 'upload' | 'preview' | 'concluido'
  const [fornecedor, setFornecedor] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [chaveNFe, setChaveNFe] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [resultadoFinal, setResultadoFinal] = useState(null);

  // 1. Faz o upload e busca a prévia sem salvar no banco
  const handleGerarPreview = async (e) => {
    e.preventDefault();
    if (!file) return setMensagem({ tipo: 'erro', texto: 'Selecione um arquivo XML.' });

    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
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

  // 2. Altera um campo específico de um produto na prévia
  const handleProdutoChange = (index, field, value) => {
    const novosProdutos = [...produtos];
    novosProdutos[index][field] = value;
    setProdutos(novosProdutos);
  };

  // 3. Remove um produto da prévia
  const handleRemoverProduto = (index) => {
    const novosProdutos = produtos.filter((_, i) => i !== index);
    setProdutos(novosProdutos);
  };

  // 4. Confirma e envia a lista editada final para o banco de dados
  const handleConfirmarImportacao = async () => {
    if (produtos.length === 0) {
      return setMensagem({ tipo: 'erro', texto: 'Todos os itens foram removidos. Adicione ou envie outro XML.' });
    }

    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        fornecedor,
        chave_nfe: chaveNFe,
        produtos: produtos.map((p) => ({
          codigo: p.codigo,
          nome: p.nome,
          categoria: p.categoria,
          unidade: p.unidade,
          quantidade: parseFloat(p.quantidade) || 0,
          valor_unitario: parseFloat(p.valor_unitario) || 0,
        })),
      };

      const res = await fetch('/api/estoque/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: payload.produtos.map(p => ({
          codigo: p.codigo,
          nome: p.nome,
          quantidade: p.quantidade,
          valor_unitario: p.valor_unitario,
          unidade: p.unidade,
          categoria: p.categoria,
          tipo: 'ENTRADA'
        })), origem: 'NOTA_FISCAL' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gravar produtos no estoque.');

      setResultadoFinal(data);
      setEtapa('concluido');
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
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: mensagem.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          fontSize: '14px'
        }}>
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
            style={{ padding: '10px 24px', backgroundColor: loading || !file ? '#94a3b8' : '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading || !file ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Lendo XML...' : 'Carregar Prévia da NF-e'}
          </button>
        </form>
      )}

      {/* ETAPA 2: EDICÃO E CONFIRMAÇÃO */}
      {etapa === 'preview' && (
        <div>
          {fornecedor && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: 0, color: '#0f172a' }}>Fornecedor Identificado: {fornecedor.nome_empresa}</h4>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>CNPJ: {fornecedor.cnpj} | Telefone: {fornecedor.telefone || '-'}</p>
            </div>
          )}

          <h4 style={{ marginBottom: '12px', color: '#0f172a' }}>Produtos da NF-e ({produtos.length} item(ns))</h4>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
            Altere os dados diretamente nos campos da tabela ou clique no botão vermelho para excluir um item.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '13px' }}>
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
                  <tr key={index}>
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
              disabled={loading || produtos.length === 0}
              style={{ padding: '10px 24px', backgroundColor: loading ? '#15803d' : '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
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
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{resultadoFinal?.message || 'Os itens foram adicionados/atualizados no banco de dados.'}</p>
          </div>
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