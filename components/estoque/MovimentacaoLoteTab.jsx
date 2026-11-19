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

  const handleBuscaChange = (index, texto) => {
    const novosItens = [...itens];
    novosItens[index].termoBusca = texto;
    novosItens[index].codigo = '';
    novosItens[index].dropdownAberto = true;
    setItens(novosItens);
  };

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
      carregarProdutos();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
      <h3 style={{ marginBottom: '8px', color: '#f8fafc', fontSize: '18px' }}>Movimentação de Estoque em Lote</h3>
      <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '14px' }}>
        Digite o código (SKU) ou nome do produto para buscar e clique no item cadastrado desejado.
      </p>

      {mensagem.texto && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            backgroundColor: mensagem.tipo === 'sucesso' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(185, 28, 28, 0.15)',
            color: mensagem.tipo === 'sucesso' ? '#4ade80' : '#fca5a5',
            border: `1px solid ${mensagem.tipo === 'sucesso' ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            fontSize: '14px',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      {carregandoProdutos ? (
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Carregando catálogo de produtos...</p>
      ) : produtosDisponiveis.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
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
                <div style={{ flex: 2, minWidth: '260px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Digite o código ou nome do produto..."
                    value={item.termoBusca}
                    onChange={(e) => handleBuscaChange(index, e.target.value)}
                    onFocus={() => handleFieldChange(index, 'dropdownAberto', true)}
                    onBlur={() => {
                      setTimeout(() => handleFieldChange(index, 'dropdownAberto', false), 180);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: item.codigo ? '1px solid #d4af37' : undefined,
                      fontSize: '14px',
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
                        backgroundColor: '#111216',
                        border: '1px solid rgba(212, 175, 55, 0.45)',
                        borderRadius: '6px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                        zIndex: 50,
                        marginTop: '4px',
                      }}
                    >
                      {sugestoes.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>
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
                              borderBottom: '1px solid rgba(212, 175, 55, 0.12)',
                              fontSize: '13px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              color: '#f8fafc',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e2028')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span>
                              <strong style={{ color: '#e5c158', fontFamily: 'monospace' }}>
                                {prod.codigo}
                              </strong>{' '}
                              - {prod.nome}
                            </span>
                            <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>
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
                  style={{ width: '130px', padding: '10px', borderRadius: '6px' }}
                />

                <select
                  value={item.tipo}
                  onChange={(e) => handleFieldChange(index, 'tipo', e.target.value)}
                  style={{ width: '130px', padding: '10px', borderRadius: '6px' }}
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
                      backgroundColor: '#991b1b',
                      color: '#fff',
                      border: '1px solid #ef4444',
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
                backgroundColor: '#1e2028',
                color: '#e5c158',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              + Adicionar Item
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)',
                color: '#0c0d10',
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