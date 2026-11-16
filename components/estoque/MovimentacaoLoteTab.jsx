'use client';

import { useState, useEffect } from 'react';

export default function MovimentacaoLoteTab() {
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [itens, setItens] = useState([
    { codigo: '', termoBusca: '', dropdownAberto: false, quantidade: 1, tipo: 'ENTRADA' },
  ]);
  const [loading, setLoading] = useState(false);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const carregarProdutos = async () => {
    setCarregandoProdutos(true);
    try {
      const res = await fetch('/api/produtos');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProdutosDisponiveis(data);
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar produtos cadastrados.' });
    } finally {
      setCarregandoProdutos(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const handleAddItem = () => {
    setItens([
      ...itens,
      { codigo: '', termoBusca: '', dropdownAberto: false, quantidade: 1, tipo: 'ENTRADA' },
    ]);
  };

  const handleRemoveItem = (index) => {
    const novosItens = itens.filter((_, i) => i !== index);
    setItens(
      novosItens.length > 0
        ? novosItens
        : [{ codigo: '', termoBusca: '', dropdownAberto: false, quantidade: 1, tipo: 'ENTRADA' }]
    );
  };

  // Atualiza o texto digitado e limpa o código selecionado caso o texto seja alterado manualmente
  const handleBuscaChange = (index, texto) => {
    const novosItens = [...itens];
    novosItens[index].termoBusca = texto;
    novosItens[index].codigo = ''; // Obriga a selecionar um produto válido da lista
    novosItens[index].dropdownAberto = true;
    setItens(novosItens);
  };

  // Seleciona oficialmente um produto cadastrado da lista
  const handleSelecionarProduto = (index, prod) => {
    const novosItens = [...itens];
    novosItens[index].codigo = prod.codigo;
    novosItens[index].termoBusca = `${prod.codigo} - ${prod.nome}`;
    novosItens[index].dropdownAberto = false;
    setItens(novosItens);
  };

  const handleFieldChange = (index, field, value) => {
    const novosItens = [...itens];
    novosItens[index][field] = value;
    setItens(novosItens);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    // Valida se todos os itens possuem um SKU válido selecionado da base
    const itemInvalido = itens.find((it) => !it.codigo);
    if (itemInvalido) {
      return setMensagem({
        tipo: 'erro',
        texto: 'Selecione um produto válido da lista suspensa para todas as linhas antes de confirmar.',
      });
    }

    setLoading(true);
    try {
      const payloadItens = itens.map((it) => ({
        codigo: it.codigo,
        quantidade: parseFloat(it.quantidade) || 0,
        tipo: it.tipo,
      }));

      const res = await fetch('/api/estoque/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: payloadItens, origem: 'LOTE' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar movimentação.');

      setMensagem({ tipo: 'sucesso', texto: data.message });
      setItens([{ codigo: '', termoBusca: '', dropdownAberto: false, quantidade: 1, tipo: 'ENTRADA' }]);
      carregarProdutos(); // Atualiza saldos exibidos na busca
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>Movimentação de Estoque em Lote</h3>
      <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
        Digite o código (SKU) ou nome do produto para buscar e clique no item cadastrado desejado.
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

      {carregandoProdutos ? (
        <p style={{ color: '#64748b', fontSize: '14px' }}>Carregando catálogo de produtos...</p>
      ) : produtosDisponiveis.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Nenhum produto cadastrado no banco. Cadastre produtos primeiro.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {itens.map((item, index) => {
            const termo = item.termoBusca.trim().toLowerCase();
            const sugestoes = produtosDisponiveis.filter(
              (p) =>
                p.codigo?.toLowerCase().includes(termo) ||
                p.nome?.toLowerCase().includes(termo)
            );

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {/* Campo de Busca Autocomplete Restrito aos Produtos da Base */}
                <div style={{ flex: 2, minWidth: '260px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Digite o código ou nome do produto..."
                    value={item.termoBusca}
                    onChange={(e) => handleBuscaChange(index, e.target.value)}
                    onFocus={() => handleFieldChange(index, 'dropdownAberto', true)}
                    onBlur={() => {
                      // Pequeno atraso para permitir o clique na opção da lista antes de fechar
                      setTimeout(() => handleFieldChange(index, 'dropdownAberto', false), 180);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: item.codigo ? '1px solid #16a34a' : '1px solid #cbd5e1',
                      backgroundColor: item.codigo ? '#f0fdf4' : '#fff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />

                  {item.dropdownAberto && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '220px',
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 50,
                        marginTop: '4px',
                      }}
                    >
                      {sugestoes.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
                          Nenhum produto cadastrado encontrado para "{item.termoBusca}".
                        </div>
                      ) : (
                        sugestoes.map((prod) => (
                          <div
                            key={prod.id}
                            onMouseDown={() => handleSelecionarProduto(index, prod)}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '13px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                          >
                            <span>
                              <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>
                                {prod.codigo}
                              </strong>{' '}
                              - {prod.nome}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>
                              Saldo: {prod.quantidade} {prod.unidade}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Quantidade"
                  value={item.quantidade}
                  onChange={(e) => handleFieldChange(index, 'quantidade', e.target.value)}
                  required
                  style={{ width: '130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />

                <select
                  value={item.tipo}
                  onChange={(e) => handleFieldChange(index, 'tipo', e.target.value)}
                  style={{ width: '130px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                >
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="SAIDA">SAÍDA</option>
                </select>

                {itens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleAddItem}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              + Adicionar Item
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}